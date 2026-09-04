import { mapDocumentsToPublicInformationAnswer } from "@/lib/public-information/map-documents-to-answer";
import { searchPublicInformation } from "@/lib/search/search-public-information";
import {
  PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH,
  type PublicInformationSearchApiResponse,
  type PublicInformationSearchErrorCode,
  type PublicInformationSearchErrorResponse,
  type PublicInformationSearchResponse,
} from "@/types/public-information-search";

export interface PublicInformationSearchServiceResult {
  status: 200 | 400 | 413 | 500;
  body: PublicInformationSearchApiResponse;
}

export function createPublicInformationSearchError(
  code: PublicInformationSearchErrorCode,
  message: string,
): PublicInformationSearchErrorResponse {
  return { error: { code, message } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Route Handler와 분리해 입력 검증과 응답 구성을 단위 테스트할 수 있게 한다. */
export function createPublicInformationSearchResponse(
  payload: unknown,
): PublicInformationSearchServiceResult {
  if (!isRecord(payload) || typeof payload.query !== "string") {
    return {
      status: 400,
      body: createPublicInformationSearchError(
        "invalid_request",
        "query 문자열이 필요합니다.",
      ),
    };
  }

  const query = payload.query.trim();

  if (!query) {
    return {
      status: 400,
      body: createPublicInformationSearchError(
        "empty_query",
        "질문을 입력해 주세요.",
      ),
    };
  }

  if (query.length > PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH) {
    return {
      status: 413,
      body: createPublicInformationSearchError(
        "query_too_long",
        `질문은 ${PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH}자 이하로 입력해 주세요.`,
      ),
    };
  }

  try {
    const results = searchPublicInformation(query);
    const body: PublicInformationSearchResponse = {
      query,
      results,
      hasResults: results.length > 0,
      answer: mapDocumentsToPublicInformationAnswer(
        query,
        results.map((result) => result.document),
      ),
    };

    return { status: 200, body };
  } catch {
    return {
      status: 500,
      body: createPublicInformationSearchError(
        "internal_error",
        "검색 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      ),
    };
  }
}
