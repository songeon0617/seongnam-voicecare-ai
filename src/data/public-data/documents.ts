import type { PublicInformationDocument } from "@/types/public-data";


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
    fetchedAt: "2026-09-09T09:47:40.518Z",
    lastVerifiedAt: "2026-09-09T09:47:40.518Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:47:40.518Z",
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
    fetchedAt: "2026-09-09T09:47:41.694Z",
    lastVerifiedAt: "2026-09-09T09:47:41.694Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:47:41.694Z",
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
    fetchedAt: "2026-09-09T09:47:42.807Z",
    lastVerifiedAt: "2026-09-09T09:47:42.807Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:47:42.807Z",
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
    fetchedAt: "2026-09-09T09:58:59.870Z",
    lastVerifiedAt: "2026-09-09T09:58:59.870Z",
    status: "active",
    freshness: {
      status: "current",
      evaluatedAt: "2026-09-09T09:58:59.870Z",
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
  {
    id: "seongnam-senior-ai-iot-health-care",
    title: "AI·IoT 기반 어르신 건강관리",
    content:
      "허약·만성질환 관리나 건강행태 개선이 필요한 65세 이상 성남시 어르신에게 스마트기술에 기반한 비대면 건강관리 서비스를 제공한다. AI·IoT 기술과 건강측정기기를 활용하며 대상자 등록, 1차 대면 참여, 6개월 건강관리, 2차 대면 사후평가 순으로 진행한다. 전화 또는 방문으로 신청하며 문의는 수정구보건소 031-729-3778, 중원구보건소 031-750-1413, 분당구보건소 031-729-3669다. 현재 등록한 공식 페이지에는 스마트폰 기종별 제한이나 중복 등록 조건이 명시되어 있지 않으므로 해당 조건은 담당 보건소에 확인해야 한다.",
    category: "senior_welfare",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl:
      "https://www.seongnam.go.kr/health/ht-pm020101/12062",
    publishedAt: null,
    updatedAt: null,
    fetchedAt: "2026-09-09T09:47:43.845Z",
    lastVerifiedAt: "2026-09-09T09:47:43.845Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:47:43.845Z",
      reason:
        "현재 성남시 보건소 공식 안내 페이지에서 내용을 확인했으나 게시일과 수정일이 표시되지 않는다.",
    },
    relatedRegions: ["성남시"],
    targetAudiences: ["건강관리가 필요한 65세 이상 성남시 어르신"],
    searchTags: ["AI IoT", "어르신 건강관리", "만성질환", "스마트폰"],
  },
  {
    id: "seongnam-disabled-assistive-devices",
    title: "장애인 보조기구·보장구 지원",
    content:
      "장애인 보조기구 지원대상은 국민기초생활수급자 및 차상위계층 중 등록장애인이다. 지원품목은 장애유형에 따라 욕창예방방석·매트리스, 음성유도장치, 음성시계, 영상확대시스템, 신호장치, 진동시계, 보행차 등으로 구분되며 각 동 행정복지센터에 신청한다. 보조기구 문의는 성남시 장애인복지과 031-729-2884다. 별도 보장구 지원은 해당 유형의 등록장애인을 대상으로 하며 건강보험·의료급여 등 구분에 따라 지원기준과 절차가 다르므로 추가 근거의 보장구 안내를 확인해야 한다. 보장구 페이지의 사업 본문 문의는 031-729-2885이며 하단 전화번호는 031-729-2884로 서로 다르게 표시되어 있어 담당 부서 확인이 필요하다.",
    category: "disability_welfare",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl:
      "https://www.seongnam.go.kr/wf-pm020101/23003",
    supportingSources: [{ title: "장애인 보장구 지원", url: "https://www.seongnam.go.kr/wf-pm020101/23004" }],
    publishedAt: null,
    updatedAt: null,
    fetchedAt: "2026-09-09T09:47:45.004Z",
    lastVerifiedAt: "2026-09-09T09:47:45.004Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:47:45.004Z",
      reason:
        "현재 성남시청 공식 안내 페이지에서 내용을 확인했으나 게시일과 수정일이 표시되지 않는다.",
    },
    relatedRegions: ["성남시"],
    targetAudiences: ["보조기구: 국민기초생활수급자 및 차상위계층 중 등록장애인", "보장구: 해당 보장구 유형의 등록장애인(건강보험·의료급여별 기준 확인 필요)"],
    searchTags: ["장애인 보조기구", "장애인 보장구", "보행차", "행정복지센터 신청"],
  },
  {
    id: "seongnam-developmental-disability-support",
    title: "발달장애인 지원",
    content:
      "발달장애인과 가족 관련 부모상담, 공공후견, 장애아동 발달재활서비스, 언어발달지원, 성인 주간활동, 청소년 방과후활동 서비스를 안내한다. 각 사업은 대상이 다르며 언어발달지원은 해당 장애가 있는 부모의 12세 미만 비장애아동 대상이다. 부모상담·발달재활·언어발달·주간활동·방과후활동은 주민등록상 거주지 동 행정복지센터에서 신청한다. 공공후견은 가정법원의 후견심판 절차가 있으므로 별도 공식 안내를 확인해야 한다. 문의는 성남시 장애인복지과 031-729-2885다.",
    category: "disability_welfare",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl:
      "https://www.seongnam.go.kr/wf-pm020101/23012",
    supportingSources: [
      { title: "발달장애인 부모상담지원", url: "https://www.seongnam.go.kr/wf-pm020101/23008" },
      { title: "발달장애인 공공후견인 지원", url: "https://www.seongnam.go.kr/wf-pm020101/23009" },
      { title: "장애아동 발달재활서비스 지원", url: "https://www.seongnam.go.kr/wf-pm020101/23010" },
      { title: "언어발달지원", url: "https://www.seongnam.go.kr/wf-pm020101/23011" },
      { title: "청소년 발달장애인 방과후활동 서비스", url: "https://www.seongnam.go.kr/wf-pm020101/23013" },
    ],
    publishedAt: null,
    updatedAt: null,
    fetchedAt: "2026-09-09T09:47:47.242Z",
    lastVerifiedAt: "2026-09-09T09:47:47.242Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:47:47.242Z",
      reason:
        "현재 성남시청 공식 안내 페이지에서 내용을 확인했으나 게시일과 수정일이 표시되지 않는다.",
    },
    relatedRegions: ["성남시"],
    targetAudiences: ["발달장애인 및 부모·보호자(세부 사업별 대상 상이)", "발달재활: 해당 장애아동 등 별도 대상 기준 확인 필요", "언어발달: 해당 등록장애가 있는 부모의 12세 미만 비장애아동"],
    searchTags: ["발달장애", "부모상담", "공공후견", "주간활동", "방과후활동"],
  },
  {
    id: "seongnam-disabled-medical-support",
    title: "장애인 보건·의료서비스 지원",
    content:
      "장애인의료비, 장애인등록 진단비, 장애검사비, 저소득세대 국민건강보험료, 저소득장애인 의료비, 장애인 대소변흡수용품 구입비 지원을 안내한다. 세부 사업별 지원대상과 범위가 다르다. 장애인의료비는 의료기관이 직접 신청하며 수급자 본인이 동 행정복지센터에 신청할 수도 있다. 진단비·검사비·저소득장애인 의료비·대소변흡수용품 지원은 각 동 행정복지센터에 신청한다. 성남시 장애인복지과 문의는 의료비 031-729-2885, 진단비·검사비 031-729-2884, 건강보험료·대소변흡수용품 031-729-2882다.",
    category: "disability_welfare",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl:
      "https://www.seongnam.go.kr/wf-pm020101/22018",
    supportingSources: [
      { title: "장애인등록 진단비 지원", url: "https://www.seongnam.go.kr/wf-pm020101/22013" },
      { title: "장애검사비 지원", url: "https://www.seongnam.go.kr/wf-pm020101/22014" },
      { title: "저소득세대 국민건강보험료 지원", url: "https://www.seongnam.go.kr/wf-pm020101/22015" },
      { title: "저소득 장애인 의료비 지원", url: "https://www.seongnam.go.kr/wf-pm020101/22016" },
      { title: "장애인 대소변흡수용품 구입비 지원", url: "https://www.seongnam.go.kr/wf-pm020101/23001" },
    ],
    publishedAt: null,
    updatedAt: null,
    fetchedAt: "2026-09-09T09:47:54.041Z",
    lastVerifiedAt: "2026-09-09T09:47:54.041Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:47:54.041Z",
      reason:
        "현재 성남시청 공식 안내 페이지에서 내용을 확인했으나 게시일과 수정일이 표시되지 않는다.",
    },
    relatedRegions: ["성남시"],
    targetAudiences: ["의료비·진단비·검사비·흡수용품: 사업별 장애·소득·연령 등 기준 확인 필요", "건강보험료: 성남시 지역가입자 중 최저보험료를 납부하는 등록장애인·한부모가족·만성질환세대"],
    searchTags: ["장애인의료비", "장애검사비", "건강보험료 지원", "대소변흡수용품"],
  },
  {
    id: "seongnam-dementia-center",
    title: "중원구보건소 치매안심센터",
    content:
      "치매안심센터는 치매 관련 상담과 조기검진, 환자 등록관리, 보호자 지원, 치매예방교육과 쉼터 등을 연중 운영한다. 중원구보건소 치매안심센터의 일반 문의는 031-739-3030이다. 치매 또는 경도인지장애를 진단받지 않은 주민은 인지선별검사 안내를 확인할 수 있다. 검진은 전화 신청 후 신분증을 지참하여 방문하며, 중원구 조기검진 문의는 031-739-3051~4다. 검진 장소와 절차는 추가 근거의 조기검진 안내와 담당 센터에서 확인해야 한다.",
    category: "senior_welfare",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl:
      "https://www.seongnam.go.kr/health/ht-pm020101/7034",
    supportingSources: [{ title: "치매 조기검진 사업", url: "https://www.seongnam.go.kr/health/ht-pm020101/7027" }],
    publishedAt: null,
    updatedAt: null,
    fetchedAt: "2026-09-09T09:48:00.653Z",
    lastVerifiedAt: "2026-09-09T09:48:00.653Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:48:00.653Z",
      reason:
        "현재 성남시 보건소 공식 안내 페이지에서 내용을 확인했으나 게시일과 수정일이 표시되지 않는다.",
    },
    relatedRegions: ["성남시", "중원구"],
    targetAudiences: ["치매검진을 원하는 주민", "치매환자와 가족"],
    searchTags: ["치매안심센터", "치매 조기검진", "인지선별검사", "치매 상담"],
  },
  {
    id: "seongnam-home-health-care",
    title: "맞춤형 방문건강관리",
    content:
      "방문 형태의 건강관리서비스가 필요한 성남시 지역주민을 위한 사업이다. 공식 안내 대상에는 65세 이상 노인, 의료요양 통합돌봄 연계 대상자, 기초생활보장수급자와 차상위계층, 독거노인·다문화가족·한부모가족, 관리되지 않은 만성질환자·장애인·재가암환자 등이 포함된다. 간호사가 가정 등을 방문하여 건강상태를 확인하고 개인 상태에 따라 만성질환 예방·관리, 일상과 계절·자연재난 안전관리, 허약 예방·관리를 제공한다. 전화·방문 상담 후 신청한다. 문의는 각 보건소 의료돌봄팀으로, 수정구 031-729-3778, 중원구 031-750-1413, 분당구 031-729-3669이며 추가 전화번호는 공식 원문에 안내되어 있다. 현재 등록한 공식 페이지에는 비용과 장기요양 등급별 제외 조건이 명시되어 있지 않아 담당 보건소 확인이 필요하다.",
    category: "welfare_support",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl:
      "https://www.seongnam.go.kr/health/ht-pm020101/12058",
    publishedAt: null,
    updatedAt: null,
    fetchedAt: "2026-09-09T09:48:02.804Z",
    lastVerifiedAt: "2026-09-09T09:48:02.804Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:48:02.804Z",
      reason:
        "현재 성남시 보건소 공식 안내 페이지에서 내용을 확인했으나 게시일과 수정일이 표시되지 않는다.",
    },
    relatedRegions: ["성남시"],
    targetAudiences: ["성남시 의료취약계층"],
    searchTags: ["방문건강관리", "간호사 방문", "의료취약계층", "건강상태 조사"],
  },
  {
    id: "seongnam-unmanned-civil-service-kiosk",
    title: "무인민원발급기 이용 안내",
    content:
      "성남시 무인민원발급기에서는 주민등록 등·초본, 토지·지적·건축, 차량, 보건복지, 병적, 지방세, 가족관계등록, 교육, 국세청, 건강보험, 여권, 교통 관련 증명 등 다양한 민원서류를 발급할 수 있다. 설치 장소마다 이용시간과 법원 발급 증명서 지원 여부, 장애인 접근 여부가 다르므로 공식 페이지의 설치현황표를 확인해야 한다. 공식 페이지에는 총 63대의 설치 장소와 위치가 안내되어 있다.",
    category: "administrative_service",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl: "https://www.seongnam.go.kr/cn020403",
    publishedAt: null,
    updatedAt: null,
    fetchedAt: "2026-09-09T09:48:03.045Z",
    lastVerifiedAt: "2026-09-09T09:48:03.045Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:48:03.045Z",
      reason:
        "현재 성남시청 공식 안내 페이지에서 내용을 확인했으나 게시일과 수정일이 표시되지 않는다.",
    },
    relatedRegions: ["성남시", "수정구", "중원구", "분당구"],
    targetAudiences: ["민원서류 발급이 필요한 시민", "무인민원발급기 이용자"],
    searchTags: ["무인민원발급기", "민원서류", "등본", "초본", "장애인 접근"],
  },
  {
    id: "seongnam-emergency-welfare-support",
    title: "긴급복지지원 사업",
    content:
      "갑작스러운 위기상황으로 생계유지가 어렵고 소득·재산 기준을 충족하는 저소득 가구에 생계비, 의료비, 교육비, 주거비, 사회복지시설 이용료 등을 단기적으로 지원한다. 주소득자의 소득 상실, 중한 질병·부상, 방임·유기·학대, 가족폭력·성폭력, 화재·자연재해, 실직·폐업 등 공식 페이지에 열거된 위기사유를 기준으로 확인한다. 현재 적용되는 소득·재산 기준과 지원액은 담당 부서 확인이 필요하며 지원 여부를 확정하지 않는다. 주소지 동 행정복지센터 맞춤형복지팀 또는 사회복지담당에 신청하며, 문의는 시 031-729-2894, 수정구 031-729-5551, 중원구 031-729-6552, 분당구 031-729-8052다.",
    category: "welfare_support",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl:
      "https://www.seongnam.go.kr/wf-pm020101/24011",
    publishedAt: null,
    updatedAt: null,
    fetchedAt: "2026-09-09T09:48:04.155Z",
    lastVerifiedAt: "2026-09-09T09:48:04.155Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:48:04.155Z",
      reason:
        "현재 성남시청 공식 안내 페이지에서 내용을 확인했으나 게시일과 수정일이 표시되지 않는다.",
    },
    relatedRegions: ["성남시", "수정구", "중원구", "분당구"],
    targetAudiences: ["위기상황으로 생계유지가 어렵고 소득·재산 기준을 충족하는 저소득 가구"],
    searchTags: ["긴급복지", "생계비", "의료비", "주거비", "위기가구"],
  },
  {
    id: "seongnam-disabled-bus-fare-support",
    title: "장애인 버스요금 지원",
    content:
      "성남시에 거주하는 모든 등록장애인에게 장애 정도와 무관하게 버스 이용요금 실비를 지원한다. 환급 대상은 성남시를 경유하는 시내·마을·광역버스이며 공항버스와 시외버스는 제외한다. 성남시 자체 제작 교통카드를 발급받아 충전·사용한 뒤 분기별로 정산하며 사용 분기 다음 달 말일에 환급한다. 지원 한도는 1인당 연 23만원 이내, 분기 57,500원이다. 성남시 장애인 대중교통비 지원시스템에서 온라인 신청하거나, 복지카드와 입금 계좌를 지참하여 거주지 동 행정복지센터에 방문 신청한다. 문의는 성남시 장애인복지과 031-729-2884다.",
    category: "mobility_support",
    sourceId: "seongnam-city",
    sourceOrganizationName: "성남시청",
    originalUrl:
      "https://www.seongnam.go.kr/wf-pm020101/23020",
    publishedAt: null,
    updatedAt: null,
    fetchedAt: "2026-09-09T09:48:05.324Z",
    lastVerifiedAt: "2026-09-09T09:48:05.324Z",
    status: "active",
    freshness: {
      status: "unknown",
      evaluatedAt: "2026-09-09T09:48:05.324Z",
      reason:
        "공약 이행 PDF 대신 현재 성남시청 장애인 버스요금 지원 안내에서 내용을 확인했다. 게시일과 수정일은 표시되지 않아 정책 최신성을 확정하지 않는다.",
    },
    relatedRegions: ["성남시"],
    targetAudiences: ["성남시 거주 등록장애인"],
    searchTags: ["장애인 버스요금", "버스 교통비", "충전형 교통카드", "교통비 환급"],
  },
] as const satisfies readonly PublicInformationDocument[];
