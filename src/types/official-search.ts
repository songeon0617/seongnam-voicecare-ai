/** New evidence is never represented as one of the curated service IDs. */
export const SEARCH_FAILURES = ["disabled", "not_configured", "budget_limited", "rate_limited", "timeout", "provider_error", "invalid_output", "no_results", "source_unavailable", "source_unverified"] as const;
export type SearchFailure = typeof SEARCH_FAILURES[number];
export interface OfficialEvidence {
  id: string;
  url: string;
  title: string;
  publisher: "성남시청";
  region: "성남시";
  checkedAt: string;
  publishedAt: string | null;
  updatedAt: string | null;
  applicationPeriod: string | null;
  effectivePeriod: string | null;
  excerpt: string;
  collection: "openai_web_search+https_original";
  freshness: "unknown";
  fromCache: boolean;
}
export interface SearchUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  estimatedUsd: number;
  durationMs: number;
  cacheHit?: boolean;
}
export interface SearchDiagnostics {
  phase: "configuration" | "budget" | "provider" | "sources" | "extraction" | "complete";
  reason?: string;
  discovered?: number;
  rejected?: number;
  findings?: number;
  pages?: {url:string;status:string;errorCode?:string;textLength?:number;sections?:number;omittedSections?:number}[];
}
export interface OfficialSearchResult {
  status: "evidence" | "partial" | "links" | SearchFailure;
  evidence: OfficialEvidence[];
  links: { url: string; title: string }[];
  usage?: SearchUsage;
  diagnostics?: SearchDiagnostics;
}
export interface OfficialSearchProvider {
  search(query: string, signal: AbortSignal): Promise<OfficialSearchResult>;
}
export interface OfficialSearchPresentation extends OfficialSearchResult {
  region: "성남시";
  searched: boolean;
}
