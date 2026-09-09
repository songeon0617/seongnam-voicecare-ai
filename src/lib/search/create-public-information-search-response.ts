import { mapDocumentsToPublicInformationAnswer } from "@/lib/public-information/map-documents-to-answer";
import { PUBLIC_INFORMATION_DOCUMENTS } from '@/data/public-data/documents';
import { searchPublicInformation } from "@/lib/search/search-public-information";
import { isClarificationId, type ClarificationId } from "@/types/public-information-router";
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

export type ValidatedPublicInformationSearchRequest = {
  query: string;
  context?: { question: string; clarificationId: ClarificationId };
  serviceContext?: { serviceId: string };
};

export function createPublicInformationSearchError(
  code: PublicInformationSearchErrorCode,
  message: string,
): PublicInformationSearchErrorResponse {
  return { error: { code, message } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validatePublicInformationSearchRequest(payload: unknown):
  | { valid: true; request: ValidatedPublicInformationSearchRequest }
  | { valid: false; response: PublicInformationSearchServiceResult } {
  if (!isRecord(payload) || typeof payload.query !== "string") {
    return { valid: false, response: { status: 400, body: createPublicInformationSearchError("invalid_request", "query 문자열이 필요합니다.") } };
  }
  const query = payload.query.trim();
  if (!query) return { valid: false, response: { status: 400, body: createPublicInformationSearchError("empty_query", "질문을 입력해 주세요.") } };
  if (query.length > PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH) {
    return { valid: false, response: { status: 413, body: createPublicInformationSearchError("query_too_long", `질문은 ${PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH}자 이하로 입력해 주세요.`) } };
  }
  if (payload.context !== undefined && (!isRecord(payload.context) || Object.keys(payload.context).length !== 2 ||
    !isClarificationId(payload.context.clarificationId) || typeof payload.context.question !== "string" ||
    !payload.context.question.trim() || payload.context.question.length > PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH)) {
    return { valid: false, response: { status: 400, body: createPublicInformationSearchError("invalid_request", "확인 질문의 문맥이 올바르지 않습니다.") } };
  }
  const context = payload.context as { question: string; clarificationId: ClarificationId } | undefined;
  const service = payload.serviceContext;
  if (service !== undefined && (context !== undefined || !isRecord(service) || Object.keys(service).length !== 1 ||
    typeof service.serviceId !== 'string' || !PUBLIC_INFORMATION_DOCUMENTS.some(d=>d.id===service.serviceId))) {
    return {valid:false,response:{status:400,body:createPublicInformationSearchError('invalid_request','이전 서비스의 문맥이 올바르지 않습니다.')}};
  }
  return { valid: true, request: { query, ...(context ? { context: { question: context.question, clarificationId: context.clarificationId } } : {}),
    ...(service ? {serviceContext:{serviceId:(service as {serviceId:string}).serviceId}} : {}) } };
}

/** Route Handler와 분리해 입력 검증과 응답 구성을 단위 테스트할 수 있게 한다. */
export function createPublicInformationSearchResponse(
  payload: unknown,
  searcher: typeof searchPublicInformation = searchPublicInformation,
): PublicInformationSearchServiceResult {
  const validation = validatePublicInformationSearchRequest(payload);
  if (!validation.valid) return validation.response;
  const { query } = validation.request;

  try {
    const results = searcher(query);
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
