import type { SearchFailure } from "./official-search";
/** Shared constants ensure unavailable states cannot contain invented policy facts. */
export const SEARCH_MESSAGES:Record<SearchFailure,string>={
  disabled:"공식 웹 검색이 현재 꺼져 있어 새 자료를 검색하지 못했습니다. 등록된 주요 서비스 안내는 계속 이용할 수 있습니다.",
  not_configured:"공식 웹 검색 연결이 아직 준비되지 않았습니다. 검색을 수행하지 못한 상태입니다.",
  budget_limited:"공식 웹 검색은 모두가 함께 하루 20회까지 이용합니다. 오늘 한도를 다 썼거나 검색 연결을 확인할 수 없어 이번 검색을 실행하지 못했습니다. 한도는 한국시간 오전 9시에 새로 시작합니다. 아래 예시와 등록된 돌봄·교통약자·복지 안내는 계속 이용할 수 있습니다.",
  rate_limited:"검색 요청이 많아 이번 검색을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  timeout:"자료 확인 시간이 초과되었습니다. 잠시 후 다시 시도하거나 공식 홈페이지에서 확인해 주세요.",
  provider_error:"검색 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  invalid_output:"검색 결과의 형식이나 실제 검색 실행을 확인하지 못했습니다. 다시 시도해 주세요.",
  no_results:"이번 공식 검색에서 사용할 수 있는 근거를 찾지 못했습니다. 제도가 없다는 뜻은 아닙니다. 질문을 더 구체적으로 적어 주세요.",
  source_unavailable:"검색 결과의 공식 원문을 열지 못했습니다. 사이트 장애나 페이지 변경일 수 있습니다. 나중에 다시 확인해 주세요.",
  source_unverified:"검색 결과와 원문 근거를 대조하지 못해 상세 안내를 보류했습니다.",
};
