import type { IntentRoute } from "@/types/public-information-router";

const LOCAL_REGIONS = new Set(["성남시", "분당구", "수정구", "중원구"]);
// 행정구역 접미사와 같은 일상어. 전국 행정구역 목록이나 위치 추정은 사용하지 않는다.
const NON_REGIONS = new Set([
  "택시", "콜택시", "혹시", "다시", "즉시", "상시", "동시", "잠시", "예시", "표시", "게시", "실시",
  "가구", "기구", "보조기구", "보장구", "친구", "욕구", "문구", "입구", "출구", "창구", "청구", "연구", "도구", "신청서류",
  "증후군", "신청시", "방문시", "이용시", "접수시", "문의시",
]);
const REGION_END = "(?=$|[^가-힣]|(?:에서는|에서|에는|에|의|은|는|을|를|도|로|와|과|랑|요|입니다)(?:$|[^가-힣])|거주|주민|시민|노인|장애인|청|보건소)";
const ADMIN_REGION = new RegExp(`(?:^|[^가-힣])([가-힣]{2,8}?(?:특별자치시|특별시|광역시|시|군|구)|[중서동남북]구)${REGION_END}`, "g");
// 접미사를 생략하는 대표 광역 지명만 처리한다. 경기는 성남을 포함하므로 제외한다.
const OUTSIDE_METRO = new RegExp(`(?:^|[^가-힣])(?:서울|부산|대구|인천|광주|대전|울산|세종|제주|강원|충북|충남|전북|전남|경북|경남)(?:특별자치도|도)?${REGION_END}`);

/** 명시된 타 지역은 키워드·AI·fallback보다 먼저 거부한다. 지역 미지정은 기존 경로로 보낸다.
 * 혼합 지역/이동 경로의 적용 자격은 추정하지 않는다. 동·역명, 오타 등 모든 지명을 인식하는 엔진은 아니다.
 */
export function regionBoundaryGuard(question: string): IntentRoute | null {
  const query = question.normalize("NFKC");
  const outside = OUTSIDE_METRO.test(query) || [...query.matchAll(ADMIN_REGION)]
    .some(([, region]) => !LOCAL_REGIONS.has(region) && !NON_REGIONS.has(region) && !region.endsWith("택시"));
  return outside ? { route: "UNSUPPORTED", serviceIds: [], intent: "location", clarificationId: null } : null;
}
