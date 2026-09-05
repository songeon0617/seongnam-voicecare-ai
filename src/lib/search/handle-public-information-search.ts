import "server-only";
import type { PublicInformationSearchErrorCode } from "@/types/public-information-search";
import { createPublicInformationSearchError } from "./create-public-information-search-response";
import { createPublicInformationResponseWithAnswer } from "./create-public-information-response-with-answer";
import { createSearchRequestLimit } from "./search-request-limit";

const MAX_BODY_BYTES = 4096;
const BODY_TIMEOUT_MS = 5_000;

function error(code: PublicInformationSearchErrorCode, message: string, status: number, retryAfter?: number) {
  return Response.json(createPublicInformationSearchError(code, message), {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(retryAfter === undefined ? {} : { "Retry-After": String(retryAfter) }),
    },
  });
}

class BodyLimitError extends Error {}
class BodyTimeoutError extends Error {}

/** Content-Length 누락/위조에도 실제 수신 바이트 수로 제한한다. */
async function readPayload(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw new BodyLimitError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const decoder = new TextDecoder("utf-8", { fatal: true });
        let size = 0;
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > MAX_BODY_BYTES) throw new BodyLimitError();
          text += decoder.decode(value, { stream: true });
        }
        return JSON.parse(text + decoder.decode()) as unknown;
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new BodyTimeoutError()), BODY_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    // 느리거나 악의적인 stream의 cancel 완료를 기다리며 슬롯을 붙잡지 않는다.
    void reader.cancel().catch(() => {});
  }
}

export function createPublicInformationSearchHandler(
  service = createPublicInformationResponseWithAnswer,
  limit = createSearchRequestLimit(),
) {
  return async (request: Request) => {
    const lease = limit.acquire();
    if (!lease.allowed) {
      return error("rate_limited", "요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429, lease.retryAfter);
    }
    try {
      if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
        return error("unsupported_media_type", "JSON 형식의 요청이 필요합니다.", 415);
      }
      let payload: unknown;
      try {
        payload = await readPayload(request);
      } catch (cause) {
        if (cause instanceof BodyLimitError) return error("body_too_large", "요청 크기가 너무 큽니다. 질문을 줄여 주세요.", 413);
        if (cause instanceof BodyTimeoutError) return error("request_timeout", "요청 시간이 초과되었습니다. 다시 시도해 주세요.", 408);
        return error("invalid_json", "올바른 JSON 요청 본문이 필요합니다.", 400);
      }
      const response = await service(payload);
      return Response.json(response.body, { status: response.status, headers: { "Cache-Control": "no-store" } });
    } catch {
      return error("internal_error", "검색 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.", 500);
    } finally {
      lease.release();
    }
  };
}
