import {regionBoundaryGuard} from '@/lib/search/region-boundary';

export interface OfficialHandoff {title:string;summary:string;links:{title:string;url:string}[];phone?:string;checkedAt:string}
// Manually reviewed official navigation. These links do not expand the server fetch allowlist.
const checkedAt='2026-09-09';
/** Navigation requests can finish for free; detailed policy questions keep their evidence path. */
export function freeOfficialNavigation(query:string):OfficialHandoff|undefined {
  const q=query.replace(/\s+/g,'');
  return /안내(?:를)?보고싶|(?:도착정보|위치와요금|분리배출방법|위치와이용시간)(?:을|는)?(?:어디서)?확인|일자리정보.*어디서찾|공공시설예약.*어디서|정부민원상담/.test(q) ? officialHandoff(query) : undefined;
}
export function officialHandoff(query:string):OfficialHandoff|undefined {
  if(regionBoundaryGuard(query))return;
  const result=(title:string,summary:string,links:OfficialHandoff['links'],phone?:string)=>({title,summary,links,phone,checkedAt});
  if(/주차/.test(query))return result('성남 공영주차장','주차장 지도에서 위치를 찾고 해당 주차장의 이용안내에서 요금을 확인하세요. 빈자리와 개인별 감면 적용은 여기서 확정하지 않습니다.',[{title:'주차장 위치 보기',url:'https://park.isdc.co.kr/parkmap.do'},{title:'주차장 이용안내',url:'https://park.isdc.co.kr/'}],'031-725-9400');
  if(/도서관/.test(query))return result('성남 도서관','성남시 도서관 현황에서 이용할 도서관을 고른 뒤 이용시간·휴관일을 확인하세요. 오늘의 개관 여부는 각 도서관 공지에서 확인해야 합니다.',[{title:'도서관 위치·목록 보기',url:'https://www.snlib.go.kr/intro/menu/10017/contents/40016/contents.do'},{title:'도서관 이용안내',url:'https://www.snlib.go.kr/intro/index.do'}]);
  if(/여권/.test(query))return result('여권 신청','성남시 여권신청접수 안내에서 본인에게 맞는 준비물과 접수 방법을 확인하세요. 신규·재발급·미성년자 여부에 따라 서류와 신청 방법이 다릅니다.',[{title:'여권 신청·준비물 확인',url:'https://www.seongnam.go.kr/cn02040801'}]);
  if(/전입|정부24|온라인.*(?:등본|민원)|민원서류.*온라인/.test(query))return result('정부24 민원','정부24에서 필요한 민원명을 검색해 온라인 신청 가능 여부와 준비물을 확인하세요. 본인 인증과 실제 신청은 정부24에서 직접 진행합니다.',[{title:'정부24에서 민원 찾기',url:'https://www.gov.kr/'}]);
  if(/쓰레기|폐기물|재활용|분리배출/.test(query))return result('쓰레기·재활용','배출하려는 물건의 종류에 맞는 공식 배출 안내를 확인하세요. 대형폐기물은 별도 신고 경로를 이용하고, 수거일·수수료는 해당 안내에서 확인하세요.',[{title:'분리배출 안내',url:'https://recycle.seongnam.go.kr/'},{title:'대형폐기물 신고 안내',url:'https://waste.isdc.co.kr/'}]);
  if(/버스|지하철|대중교통|길찾기/.test(query)&&!/장애인|교통약자|특별교통|바우처|환급/.test(query))return result('버스·교통','성남시 버스 안내에서 경기버스정보로 이동해 정류소·노선과 도착정보를 확인하세요. 여기서는 실시간 도착 시각이나 환승 경로를 계산하지 않습니다.',[{title:'성남시 버스 안내',url:'https://www.seongnam.go.kr/tr-cn010201'}]);
  if(/상품권|지역화폐/.test(query))return result('성남사랑상품권','성남사랑상품권 가맹점 조회에서 상호와 결제방법을 확인하세요. 현재 할인율이나 구매 한도는 최신 공지에서 확인해야 합니다.',[{title:'상품권 가맹점 조회',url:'https://www.seongnam.go.kr/ec-pm010203'}]);
  if(/일자리|취업|채용/.test(query))return result('성남 일자리','성남시 일자리센터에서 채용정보와 상담 경로를 확인하세요. 모집 조건과 접수 마감은 각각의 공고에서 확인합니다.',[{title:'일자리·채용정보 보기',url:'https://job.seongnam.go.kr/'}]);
  if(/청년/.test(query))return result('청년지원','성남시 청년지원센터에서 현재 모집하는 지원사업을 확인하세요. 연령·거주·소득 조건과 신청기간은 사업마다 다릅니다.',[{title:'청년지원사업 확인',url:'https://www.snspring.or.kr/'}]);
  if(/공공시설|체육시설|시설.*예약/.test(query))return result('공공시설 예약','성남시 통합예약에서 시설과 날짜를 선택해 이용 조건과 예약 가능 여부를 확인하세요. 예약 신청은 공식 페이지에서 직접 진행합니다.',[{title:'성남시 통합예약',url:'https://www.seongnam.go.kr/apply/index'}]);
  if(/보건소|건강|진단|치매|의료|금연/.test(query))return result('보건소 안내','성남시 보건소에서 거주 구와 필요한 진료·건강사업을 선택해 담당 연락처를 확인하세요. 진단이나 개인별 서비스 이용 여부는 보건소·의료진과 상담해야 합니다.',[{title:'성남시 보건소 안내',url:'https://www.seongnam.go.kr/health/index'}]);
  if(/정부.*민원|민원.*상담|담당.*(?:몰라|모르)|어디.*민원/.test(query))return result('정부 민원 상담','어느 기관에 문의할지 모르겠다면 국번 없이 110에서 정부 민원을 상담할 수 있습니다. 전화가 어렵다면 110 홈페이지의 채팅·수어상담 경로를 확인하세요.',[{title:'110 채팅·수어상담 안내',url:'https://www.110.go.kr/consult/manual.do'}],'110');
  if(/복지|돌봄|수급|성남.*행정/.test(query))return result('성남시 행정 안내','개인별 자격과 실제 신청 결과는 담당 기관에서 확인해야 합니다. 성남시청에서 필요한 복지·행정업무의 안내와 담당 부서를 찾아 상담하세요.',[{title:'성남시청에서 담당 안내 찾기',url:'https://www.seongnam.go.kr/'}]);
}
