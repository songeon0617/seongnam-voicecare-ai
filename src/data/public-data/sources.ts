import type { PublicDataSource } from "@/types/public-data";

/**
 * 초기 MVP에서 허용하는 공식 출처 목록이다.
 * enabled가 false인 출처는 향후 검색 대상에 포함하지 않는다.
 */
export const PUBLIC_DATA_SOURCES = [
  {
    id: "seongnam-city",
    organizationName: "성남시청",
    sourceType: "seongnam_city",
    baseUrl: "https://www.seongnam.go.kr",
    isOfficial: true,
    priority: "highest",
    description:
      "성남시 복지, 행정복지센터, 복지시설, 담당 부서와 신청 안내의 우선 공식 출처",
    lastCheckedAt: "2026-09-06T21:27:42+09:00",
    enabled: true,
  },
] as const satisfies readonly PublicDataSource[];
