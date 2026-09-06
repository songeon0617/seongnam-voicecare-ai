import type { PublicInformationSearchResult } from "@/types/public-information-search";
import type { IntentRoute, PublicInformationIntent, ServiceId } from "@/types/public-information-router";

export function inferKeywordIntent(query: string): PublicInformationIntent {
  if (/서류|준비물/.test(query)) return "documents";
  if (/자격|대상|조건/.test(query)) return "eligibility";
  if (/신청|접수|등록/.test(query)) return "application";
  if (/연락|전화|문의/.test(query)) return "contact";
  if (/어디|위치|주소|장소/.test(query)) return "location";
  if (/시간|운영|몇 시/.test(query)) return "hours";
  if (/요금|비용|얼마/.test(query)) return "cost";
  return "overview";
}

export function locationGuard(query: string): IntentRoute | null {
  if (!/가까|근처|주변|인근|거리순|도보/.test(query)) return null;
  const hasRegion = /[가-힣]+(?:시|구|동)(?:에|의|에서|은|는|요|입니다)?(?:\s|$)/.test(query);
  return hasRegion
    ? { route: "UNSUPPORTED", serviceIds: [], intent: "location", clarificationId: null }
    : { route: "CLARIFY", serviceIds: [], intent: "location", clarificationId: "region_required" };
}

export function serviceScopeGuard(query: string, decision: IntentRoute): IntentRoute | null {
  if (decision.route !== "DIRECT") return null;
  const requestedDistricts = ["수정구", "중원구", "분당구"].filter((region) => query.includes(region));
  const facilityDistrict = decision.serviceIds[0] === "seongnam-bundang-senior-welfare-center" ? "분당구"
    : decision.serviceIds[0] === "seongnam-dementia-center" ? "중원구" : null;
  if (facilityDistrict && requestedDistricts.some((region) => region !== facilityDistrict)) {
    return { route: "UNSUPPORTED", serviceIds: [], intent: "location", clarificationId: null };
  }
  return null;
}

const compact = (value: string) => value.normalize("NFKC").replace(/[^0-9a-zA-Z가-힣]/g, "").toLowerCase();
/** 점수만 신뢰하지 않고 기존 검색의 명시적 제도명만 단일 선택한다. */
export function confidentKeywordResult(query: string, results: readonly PublicInformationSearchResult[]) {
  if (locationGuard(query)) return undefined;
  const text = compact(query);
  const named = results.filter(({ document, matchedTerms }) => {
    const title = compact(document.title);
    const stem = compact(document.title.replace(/서비스$| 운영$| 이용 안내$| 사업$/, ""));
    // 기존 태그 중 공식 이름의 일부인 충분히 긴 표현만 인정한다. alias 추가 없음.
    const namedTag = document.searchTags.some((tag) => {
      const name = compact(tag);
      return name.length >= 4 && title.includes(name) && text.includes(name);
    });
    return text.includes(stem) || namedTag ||
      (document.id === "seongnam-special-transportation" && matchedTerms.includes("특별교통수단"));
  });
  if (named.length !== 1) return undefined;
  const result = named[0];
  if (/말고|아닌|아니|제외|무시|추천|진단|확정|서울|부산|수원|용인|광주|경기도 외/.test(query)) return undefined;
  if (result.document.id === "seongnam-bundang-senior-welfare-center" && /수정|중원/.test(query)) return undefined;
  return result;
}

export function keywordDecision(query: string, id: ServiceId): IntentRoute {
  return { route: "DIRECT", serviceIds: [id], intent: inferKeywordIntent(query), clarificationId: null };
}
