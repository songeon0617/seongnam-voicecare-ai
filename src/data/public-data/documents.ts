import type { PublicInformationDocument } from "@/types/public-data";

const VERIFIED_AT = "2026-09-05T00:49:35+09:00";

/**
 * MVP 질문 범위에 맞춰 성남시청 공식 페이지에서 직접 확인한 원자료다.
 * 원문에 게시일·수정일이 없으면 추정하지 않고 null로 유지한다.
 */
export const PUBLIC_INFORMATION_DOCUMENTS = [
  {
    id: "seongnam-special-transportation",
    title: "특별교통수단 운영",
    content:
      "사업기간은 연중이다. 대상은 중증 보행장애인(심한 장애) 또는 대중교통 이용이 어려운 휠체어 탑승자다. 중증 보행장애인은 복지카드 또는 장애인증명서가 필요하며, 보행상 장애 표준 기준에 따라 장애정도 심사결과 통보서나 보행상 장애판정을 증명하는 공공기관 발급 서류가 추가로 필요할 수 있다. 대중교통 이용이 어려운 휠체어 탑승자는 종합병원급 이상 진단서에 휠체어 이용, 대중교통 이용이 어렵다는 문구, 이용 불가기간이 명시되어야 한다. 진단서의 이용 불가기간은 최대 5년이며 기간이 없으면 발급일부터 6개월 이용할 수 있다. 차량은 슬로프 장착 카니발 특장 차량 84대이고 24시간 운영하며, 22시부터 다음 날 06시 30분까지는 4대를 운영한다. 즉시콜은 전화·문자 1666-0420 또는 경기도 광역이동지원 시스템 앱·홈페이지로 24시간 접수한다. 성남 관내·경기·서울·인천 사전예약은 이용 목적과 시간 조건에 따라 하루 전에 접수한다. 문의는 성남시 대중교통과 031-729-3723이다.",
    category: "mobility_support",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl: "https://www.seongnam.go.kr/wf-pm020101/23018",
    publishedAt: null,
    updatedAt: null,
    fetchedAt: VERIFIED_AT,
    lastVerifiedAt: VERIFIED_AT,
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: VERIFIED_AT,
      reason:
        "현재 성남시청 복지사업 안내 페이지에서 내용을 확인했으나 게시일과 수정일이 표시되지 않는다.",
    },
    relatedRegions: ["성남시"],
    targetAudiences: [
      "중증 보행장애인",
      "대중교통 이용이 어려운 휠체어 탑승자",
    ],
    searchTags: [
      "특별교통수단",
      "교통약자",
      "장애인 이동지원",
      "휠체어",
      "이용등록",
    ],
  },
  {
    id: "seongnam-disabled-taxi-voucher",
    title: "장애인 택시바우처",
    content:
      "사업기간은 연중이다. 지원대상은 14세 이상 장애 정도가 심한 장애인(기존 1~3급)이다. 택시 이용요금의 75%를 지원하며 일 4회, 월 40회, 1회 1만원 한도다. 콜센터 접수 후 택시를 이용하고 금융형 장애인 복지카드로 결제하면 할인 청구된다. 거주지 동 행정복지센터에서 신청한다. 문의는 성남시 장애인복지과 031-729-2884이다.",
    category: "mobility_support",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl: "https://www.seongnam.go.kr/wf-pm020101/23019",
    publishedAt: null,
    updatedAt: null,
    fetchedAt: VERIFIED_AT,
    lastVerifiedAt: VERIFIED_AT,
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: VERIFIED_AT,
      reason:
        "현재 성남시청 복지사업 안내 페이지에서 내용을 확인했으나 게시일과 수정일이 표시되지 않는다.",
    },
    relatedRegions: ["성남시"],
    targetAudiences: ["14세 이상 장애 정도가 심한 장애인"],
    searchTags: [
      "장애인 택시바우처",
      "택시요금 지원",
      "장애인 복지카드",
      "행정복지센터 신청",
    ],
  },
  {
    id: "seongnam-senior-tailored-care",
    title: "노인맞춤돌봄서비스",
    content:
      "사업기간은 연중이다. 대상은 65세 이상 기초생활수급자 또는 기초연금 수급자 가운데 독거·조손·고령부부 가구 등 돌봄이 필요하거나 신체·인지기능 저하로 돌봄이 필요한 노인이다. 욕구에 따라 안전·안부 확인, 병원·외출 동행 등 일상생활 지원, 건강운동·낙상예방 등 생활교육, 지역 서비스 연계를 제공한다. 주소지 동 행정복지센터 방문, 전화·우편·팩스·온라인 또는 읍·면·동 공무원 직권으로 신청할 수 있으며 제출서류는 신청서다. 신청 후 동 행정복지센터가 소득과 유사서비스 이용현황을 확인하고, 수행기관이 가정방문해 필요한 서비스를 조사한 뒤 시청이 대상자를 선정·승인한다. 문의는 성남시 노인복지과 031-729-2906이다.",
    category: "senior_welfare",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl: "https://www.seongnam.go.kr/wf-pm020101/22001",
    publishedAt: null,
    updatedAt: null,
    fetchedAt: VERIFIED_AT,
    lastVerifiedAt: VERIFIED_AT,
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: VERIFIED_AT,
      reason:
        "현재 성남시청 복지사업 안내 페이지에서 내용을 확인했으나 게시일과 수정일이 표시되지 않는다.",
    },
    relatedRegions: ["성남시"],
    targetAudiences: [
      "돌봄이 필요한 65세 이상 기초생활수급자",
      "돌봄이 필요한 65세 이상 기초연금 수급자",
    ],
    searchTags: [
      "노인맞춤돌봄서비스",
      "어르신 돌봄",
      "안부 확인",
      "외출 동행",
      "행정복지센터 신청",
    ],
  },
  {
    id: "seongnam-bundang-senior-welfare-center",
    title: "분당노인종합복지관",
    content:
      "분당구 정자동에 있는 노인종합복지관으로 교육 프로그램, 상담, 일자리 지원 등 어르신을 위한 종합적인 복지서비스를 제공한다. 주소는 경기 성남시 분당구 불정로 50이며, 연락처는 031-785-9200이다. 시설 홈페이지는 https://www.bdsenior.or.kr/ 이다.",
    category: "welfare_facility",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl: "https://www.seongnam.go.kr/wf-bbs05010303/403121",
    publishedAt: "2026-06-18",
    updatedAt: "2026-06-18",
    fetchedAt: VERIFIED_AT,
    lastVerifiedAt: VERIFIED_AT,
    status: "active",
    freshness: {
      status: "current",
      evaluatedAt: VERIFIED_AT,
      reason:
        "성남시청 시설정보 페이지의 등록일과 수정일이 2026-06-18로 표시되고 현재 페이지에서 직접 확인했다.",
    },
    relatedRegions: ["성남시", "분당구", "정자동"],
    targetAudiences: ["어르신", "노인복지관 이용 희망자"],
    searchTags: [
      "분당노인종합복지관",
      "노인복지시설",
      "어르신 교육",
      "상담",
      "일자리지원",
      "분당구",
    ],
  },
] as const satisfies readonly PublicInformationDocument[];
