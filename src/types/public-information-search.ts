import type { PublicInformationDocument } from "@/types/public-data";
import type { PublicInformationAnswer } from "@/types/public-information";

export const PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH = 300;

export interface PublicInformationSearchRequest {
  query: string;
}

export interface PublicInformationSearchResult {
  document: PublicInformationDocument;
  score: number;
  matchedTerms: string[];
}

export interface PublicInformationSearchOptions {
  topK?: number;
  threshold?: number;
}

export type AnswerGenerationMetadata =
  | { status: "generated"; mode: "constrained_presentation" }
  | { status: "skipped"; reason: "no_results" | "disabled" | "not_configured" }
  | { status: "fallback"; reason: "invalid_output" | "provider_error" };

export interface PublicInformationSearchResponse {
  query: string;
  results: PublicInformationSearchResult[];
  hasResults: boolean;
  /** 공식 원문 기반 매핑. AI는 요약의 안내 표현·문단 형식만 변경할 수 있다. */
  answer: PublicInformationAnswer;
  /** 동기 검색 서비스와 기존 클라이언트의 호환성을 위해 선택 필드로 유지한다. */
  answerGeneration?: AnswerGenerationMetadata;
}

export type PublicInformationSearchErrorCode =
  | "invalid_json"
  | "invalid_request"
  | "empty_query"
  | "query_too_long"
  | "rate_limited"
  | "body_too_large"
  | "unsupported_media_type"
  | "request_timeout"
  | "internal_error";

export interface PublicInformationSearchErrorResponse {
  error: {
    code: PublicInformationSearchErrorCode;
    message: string;
  };
}

export type PublicInformationSearchApiResponse =
  | PublicInformationSearchResponse
  | PublicInformationSearchErrorResponse;
