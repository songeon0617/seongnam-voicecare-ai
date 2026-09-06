/** 공식 데이터 출처의 운영 주체 유형 */
export type PublicDataSourceType =
  | "seongnam_city"
  | "public_agency"
  | "central_government"
  | "other_official";

/** 동일한 최신성의 자료가 충돌할 때 참고할 단순 출처 우선순위 */
export type PublicDataSourcePriority =
  | "highest"
  | "high"
  | "normal"
  | "low";

export interface PublicDataSource {
  id: string;
  organizationName: string;
  sourceType: PublicDataSourceType;
  baseUrl: string;
  isOfficial: boolean;
  priority: PublicDataSourcePriority;
  description: string;
  /** 출처 자체를 마지막으로 점검한 ISO 8601 날짜·시각. 미확인 시 null */
  lastCheckedAt: string | null;
  enabled: boolean;
}

export type PublicInformationCategory =
  | "disability_welfare"
  | "senior_welfare"
  | "welfare_support"
  | "mobility_support"
  | "administrative_service"
  | "welfare_facility"
  | "other";

/** 문서가 현재 답변 근거로 사용 가능한지 나타내는 검토 상태 */
export type PublicDocumentStatus =
  | "active"
  | "review_required"
  | "expired"
  | "superseded"
  | "excluded";

/** 날짜와 출처 우선순위로 판별할 최신성 상태 */
export type PublicDocumentFreshnessStatus =
  | "current"
  | "possibly_outdated"
  | "superseded"
  | "unknown";

export interface PublicDocumentFreshness {
  /** 수집 시에는 보통 unknown이며, 향후 최신성 판별 단계에서 갱신한다. */
  status: PublicDocumentFreshnessStatus;
  /** 최신성을 마지막으로 판별한 ISO 8601 날짜·시각. 미판별 시 null */
  evaluatedAt: string | null;
  reason?: string;
  supersededByDocumentId?: string;
}

/**
 * 검색·RAG에 투입할 공식 원자료 문서다.
 * 사용자에게 표시할 최종 답변인 PublicInformationAnswer와 역할이 다르다.
 */
export interface PublicInformationDocument {
  id: string;
  title: string;
  content: string;
  category: PublicInformationCategory;
  sourceId: PublicDataSource["id"];
  sourceOrganizationName: string;
  originalUrl: string;
  /** 공식 사이트가 종합 안내를 개별 사업 페이지로 나눈 경우 함께 검토한 근거. */
  supportingSources?: readonly { title: string; url: string }[];
  /** 원문 게시일. 원문에 날짜가 없으면 null */
  publishedAt: string | null;
  /** 원문 수정일. 원문에 날짜가 없으면 null */
  updatedAt: string | null;
  /** 데이터를 수집한 날짜·시각. 아직 수집하지 않았다면 null */
  fetchedAt: string | null;
  /** 원문과 내용 일치를 마지막으로 확인한 날짜·시각. 미확인 시 null */
  lastVerifiedAt: string | null;
  status: PublicDocumentStatus;
  freshness: PublicDocumentFreshness;
  relatedRegions: string[];
  targetAudiences: string[];
  searchTags: string[];
}
