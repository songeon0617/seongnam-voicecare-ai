/** Product limits and reviewed navigation only; never generated policy facts. */
export function isJourneyRequest(query: string): boolean {
  return /에서.{1,45}(?:까지|가는|가려|가야|가고|갈\s*때)/.test(query)
    && /대중교통|버스|지하철|경로|길찾기/.test(query)
    && !/특별교통|택시바우처|교통약자|지원|휠체어/.test(query);
}
export const JOURNEY_LIMIT = "출발지에서 목적지까지의 정확한 경로·환승·도착 시각은 안내하지 않습니다. 실시간 교통정보를 연결하지 않은 서비스입니다. 성남시 공식 버스 안내에서 연결하는 경기버스정보를 확인해 주세요.";
export function questionScope(query: string) {
  if(isJourneyRequest(query))return {message:JOURNEY_LIMIT,links:[{title:"성남시 공식 버스 안내",url:"https://www.seongnam.go.kr/tr-cn010201"}]};
  if(/음식물\s*(?:쓰레기|폐기물)/.test(query))return {message:"음식물쓰레기 공식 안내는 브라우저에서 열리지만 웹 검색의 자동 본문 대조가 지원되지 않습니다. 아래 ‘음식물쓰레기 분리배출 안내’에서 배출 방법과 제외 품목을 직접 확인해 주세요. 봉투·수거일·수수료를 추측하지 않습니다.",links:[{title:"성남시 음식물쓰레기 분리배출 안내",url:"https://recycle.seongnam.go.kr/platforminfo/foodwaste"}]};
  if(/전입\s*신고/.test(query))return {message:"현재 수집한 성남시 자료만으로 온라인 전입신고의 조건·인증·세대주 확인 절차를 확정하지 않습니다. 정부24에서 ‘전입신고’를 검색해 신청 가능 여부와 절차를 직접 확인해 주세요.",links:[{title:"정부24 공식 홈페이지",url:"https://www.gov.kr/"}]};
  if(/금연|담배/.test(query)&&/무료|비용|돈|유료/.test(query))return {message:"금연보조제 무료 지원과 상담 자체의 비용은 다른 항목입니다. 성남시 금연클리닉 자료는 보조제 무료 지원을 명시하지만 상담 비용은 명시하지 않아 무료라고 확정하지 않습니다. 아래 보건소 안내의 문의처에서 확인해 주세요.",links:[{title:"성남시 보건소 금연클리닉",url:"https://www.seongnam.go.kr/health/ht-pm020101/9016"}]};
  return null;
}
