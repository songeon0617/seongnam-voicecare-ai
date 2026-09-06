import type { PublicInformationDocument } from "@/types/public-data";
import type { PublicInformationAnswer } from "@/types/public-information";
import type { ClarificationContext, ClarificationId, RoutingMetadata } from "@/types/public-information-router";
import type { PublicInformationSafetyResponse } from "@/types/public-information-safety";

export const PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH = 300;

export interface PublicInformationSearchRequest {
  query: string;
  context?: ClarificationContext;
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
  | { status: "skipped"; reason: "no_results" | "disabled" | "not_configured" | "deterministic" }
  | { status: "fallback"; reason: "invalid_output" | "provider_error" };

export interface PublicInformationSearchResponse {
  query: string;
  results: PublicInformationSearchResult[];
  hasResults: boolean;
  /** 사실은 공식 데이터에서만 매핑. 비답변 상태에서는 사실 없는 호환 객체다. */
  answer: PublicInformationAnswer;
  /** 기존 동기 검색/클라이언트 호환을 위한 점진적 응답 확장. */
  kind?: "answer" | "clarification" | "unsupported" | "safety";
  clarification?: { id: ClarificationId };
  safety?: PublicInformationSafetyResponse;
  routing?: RoutingMetadata;
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
