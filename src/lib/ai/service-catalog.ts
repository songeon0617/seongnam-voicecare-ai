import "server-only";
import { PUBLIC_INFORMATION_DOCUMENTS } from "@/data/public-data/documents";
import { PUBLIC_DATA_SOURCES } from "@/data/public-data/sources";
import type { PublicInformationDocument } from "@/types/public-data";
import type { PublicInformationIntent, ServiceId } from "@/types/public-information-router";

export interface ServiceCatalogEntry {
  serviceId: ServiceId;
  name: string;
  description: string;
  situations: readonly string[];
  intents: readonly PublicInformationIntent[];
  distinction: string;
  regions: readonly string[];
}
type Description = Pick<ServiceCatalogEntry, "description" | "situations" | "intents" | "distinction">;
// 기존 검색 alias와 독립적이다. 세부 자격, 전화번호, 원문을 넣지 않는다.
const DESCRIPTIONS = {
  "seongnam-special-transportation": { description: "교통약자를 위한 탑승 지원 차량", situations: ["휠체어로 이동할 차량이 필요함", "몸이 불편해 일반 대중교통에 타기 어려움"], intents: ["overview", "eligibility", "application", "documents", "contact", "hours"], distinction: "차량 탑승 지원. 요금 환급이나 병원 동행 인력과 다름. 이용 자격 확정 금지." },
  "seongnam-disabled-taxi-voucher": { description: "장애인 택시 이용요금 지원", situations: ["택시비 부담을 줄이고 싶음"], intents: ["overview", "eligibility", "application", "cost", "contact"], distinction: "택시요금 할인. 장애인 택시라는 말만 있으면 특장 차량과 구분 확인." },
  "seongnam-senior-tailored-care": { description: "어르신의 안전·안부 확인과 일상생활 지원", situations: ["부모님이 홀로 지내셔서 돌봐줄 도움이 필요함", "어르신 외출에 동행할 도움이 필요함"], intents: ["overview", "eligibility", "application", "documents", "contact"], distinction: "노인 돌봄. 병원 동행은 이 서비스의 일부이며 일반 시민 전용 병원동행 사업이 아님. 대상 불명확한 동행 요청은 elderly_care_type 확인." },
  "seongnam-bundang-senior-welfare-center": { description: "어르신 교육·상담 등 복지시설 안내", situations: ["어르신이 프로그램에 참여할 시설을 찾음"], intents: ["overview", "location", "contact"], distinction: "등록된 복지관은 분당구 정자동 시설 한 곳. 다른 구의 시설이나 가장 가까운 시설로 추천 불가." },
  "seongnam-senior-ai-iot-health-care": { description: "앱과 스마트기기를 활용한 어르신 비대면 건강관리", situations: ["스마트폰으로 건강습관을 관리하고 싶음"], intents: ["overview", "eligibility", "application", "contact", "hours"], distinction: "어르신 대상 비대면 건강관리. 방문간호와 다름." },
  "seongnam-disabled-assistive-devices": { description: "장애인 보조기구·보장구 지원 안내", situations: ["생활을 돕는 보행차나 보조기기를 구하고 싶음"], intents: ["overview", "eligibility", "application", "cost", "contact"], distinction: "기구 지원이며 차량 호출이나 교통요금 지원과 다름." },
  "seongnam-developmental-disability-support": { description: "발달장애인과 가족 상담·활동 등 지원", situations: ["발달장애 자녀의 낮 활동이나 가족 상담이 필요함"], intents: ["overview", "eligibility", "application", "contact"], distinction: "발달장애인과 가족 대상. 개별 서비스마다 대상이 다름." },
  "seongnam-disabled-medical-support": { description: "장애 관련 의료비·검사비 등 지원 안내", situations: ["장애 관련 진단 검사 비용이 부담됨"], intents: ["overview", "eligibility", "application", "cost", "contact"], distinction: "등록장애인 등 사업별 대상 구분. 진단이나 일반 병원 동행이 아님." },
  "seongnam-dementia-center": { description: "기억력 저하·치매 관련 상담과 검진 안내", situations: ["기억이 예전 같지 않아 상담처를 찾음"], intents: ["overview", "contact", "location", "documents"], distinction: "등록 자료는 중원구보건소 치매안심센터. 기억력 걱정에 상담 후보로 연결하되 치매 진단 금지. 다른 구 시설이나 가까운 곳으로 단정 금지." },
  "seongnam-home-health-care": { description: "간호사 가정방문을 통한 건강관리", situations: ["집에서 건강상태 점검이나 간호 상담을 받고 싶음"], intents: ["overview", "eligibility", "application", "cost"], distinction: "의료취약계층 방문건강관리. 일상 돌봄이나 비대면 앱 서비스와 구분." },
  "seongnam-unmanned-civil-service-kiosk": { description: "무인 기기를 통한 민원서류 발급 안내", situations: ["주민등록 서류를 기계에서 뽑고 싶음"], intents: ["overview", "documents", "location", "hours"], distinction: "설치현황은 공식 페이지에서 확인. 저장 자료에 개별 기기 위치·시간이 없어 특정 가까운 기기나 지금 열린 기기를 추측 불가." },
  "seongnam-emergency-welfare-support": { description: "위기가구의 생계·의료·주거 등 긴급복지 지원 안내", situations: ["식생활을 유지할 돈이 부족함", "수입이 끊겨 당장 생활이 막막함"], intents: ["overview", "eligibility", "application", "contact"], distinction: "생계 곤란은 긴급복지 상담 후보로 연결 가능. 위기사유 심사가 필요하며 지원 확정이나 쌀 배달 사업으로 안내 금지." },
  "seongnam-disabled-bus-fare-support": { description: "장애인의 버스 이용 교통비 환급", situations: ["버스를 이용한 교통비를 돌려받고 싶음"], intents: ["overview", "eligibility", "application", "cost"], distinction: "버스에 탑승해 사용한 요금 지원. 신체 불편으로 버스를 타지 못하는 상황은 이 서비스로 연결 금지." },
} as const satisfies Record<ServiceId, Description>;

export function getRoutingDocuments(): readonly PublicInformationDocument[] {
  const sources = new Set(PUBLIC_DATA_SOURCES.filter((source) => source.enabled && source.isOfficial).map((source) => source.id));
  return PUBLIC_INFORMATION_DOCUMENTS.filter((document) => document.status === "active" && sources.has(document.sourceId));
}

export function createServiceCatalog(documents = getRoutingDocuments()): ServiceCatalogEntry[] {
  const seen = new Set<string>();
  return documents.map((document) => {
    if (!Object.hasOwn(DESCRIPTIONS, document.id) || seen.has(document.id)) throw new Error("Invalid service catalog");
    seen.add(document.id);
    const serviceId = document.id as ServiceId;
    return { serviceId, name: document.title, ...DESCRIPTIONS[serviceId], regions: [...document.relatedRegions] };
  });
}
