/** Reviewed routes, not a claim that every administrative question can be answered. */
export const LIFE_CATEGORIES = [
  {id:'welfare',label:'복지',items:[
    {label:'어르신·돌봄',query:'혼자 사는 어머니 안부를 챙겨주는 도움 있나요?'},
    {label:'장애인 지원',query:'장애인 보조기구·보장구 지원은 어디서 신청해요?'},
    {label:'긴급지원',query:'긴급복지지원 사업은 어디서 신청하나요?'},
  ]},
  {id:'transportation',label:'이동·교통',items:[
    {label:'교통약자 이동',query:'장애인 이동지원'},
    {label:'택시·교통비',query:'장애인 택시바우처 신청하려면 어떻게 해요?'},
    {label:'버스·교통',query:'성남 버스 도착정보는 어디서 확인해요?'},
    {label:'공영주차장',query:'성남 공영주차장 위치와 요금을 확인하고 싶어요.'},
  ]},
  {id:'health',label:'건강',items:[
    {label:'보건소',query:'성남 보건소 이용 안내를 보고 싶어요.'},
    {label:'치매',query:'중원구보건소 치매안심센터 연락처가 어떻게 되나요?'},
    {label:'방문건강',query:'맞춤형 방문건강관리 대상과 비용을 알려주세요.'},
    {label:'어르신 건강관리',query:'AI IoT 어르신 건강관리 어떻게 이용해요?'},
  ]},
  {id:'daily-life',label:'민원·생활',items:[
    {label:'민원서류',query:'무인민원발급기 이용 안내와 설치 장소를 알려주세요.'},
    {label:'여권',query:'성남 여권 신청 안내를 보고 싶어요.'},
    {label:'쓰레기·재활용',query:'성남 쓰레기 분리배출 방법을 확인하고 싶어요.'},
    {label:'도서관',query:'성남 도서관 위치와 이용시간을 확인하고 싶어요.'},
  ]},
  {id:'other',label:'기타',items:[
    {label:'청년지원',query:'성남 청년지원센터 안내를 보고 싶어요.'},
    {label:'일자리',query:'성남 일자리 정보를 어디서 찾나요?'},
    {label:'공공시설 예약',query:'성남 공공시설 예약은 어디서 하나요?'},
    {label:'정부 민원 상담',query:'정부 민원 상담은 어디서 받나요?'},
  ]},
] as const;
export type LifeCategoryId = typeof LIFE_CATEGORIES[number]['id'];
