import type { PublicInformationDocument } from "@/types/public-data";

/**
 * 데이터 구조 확인 전용 샘플이다.
 * 실제 정책 정보가 아니며 status가 excluded이므로 답변 근거로 사용하면 안 된다.
 */
export const DEVELOPMENT_SAMPLE_DOCUMENTS = [
  {
    id: "dev-sample-document",
    title: "[개발용 예시] 공식 자료 문서 구조 확인",
    content:
      "이 문서는 타입과 저장 구조를 확인하기 위한 개발용 예시입니다. 실제 정책 내용, 지원 자격, 금액, 연락처를 포함하지 않습니다.",
    category: "other",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl: "https://www.seongnam.go.kr",
    publishedAt: null,
    updatedAt: null,
    fetchedAt: null,
    lastVerifiedAt: null,
    status: "excluded",
    freshness: {
      status: "unknown",
      evaluatedAt: null,
      reason: "개발용 예시이며 공식 자료 내용을 수집하거나 검증하지 않았습니다.",
    },
    relatedRegions: ["성남시"],
    targetAudiences: [],
    searchTags: ["개발용 예시"],
  },
] as const satisfies readonly PublicInformationDocument[];
