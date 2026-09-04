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

export interface PublicInformationSearchResponse {
  query: string;
  results: PublicInformationSearchResult[];
  hasResults: boolean;
  /** 아직 LLM을 거치지 않은 공식 원문 기반 매핑 결과 */
  answer: PublicInformationAnswer;
}

export type PublicInformationSearchErrorCode =
  | "invalid_json"
  | "invalid_request"
  | "empty_query"
  | "query_too_long"
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
