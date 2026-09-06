import type { PUBLIC_INFORMATION_DOCUMENTS } from "@/data/public-data/documents";

export type ServiceId = (typeof PUBLIC_INFORMATION_DOCUMENTS)[number]["id"];
export const ROUTER_INTENTS = ["overview", "eligibility", "application", "documents", "contact", "location", "hours", "cost", "other"] as const;
export type PublicInformationIntent = (typeof ROUTER_INTENTS)[number];

/** 문장과 선택지는 서버 검토 코드이며 AI 출력 문자열을 표시하지 않는다. */
export const CLARIFICATIONS = {
  mobility_vehicle_or_fare: {
    question: "차량을 이용하는 이동지원과 교통비 지원 중 어떤 도움이 필요하세요?",
    options: ["특별교통수단 운영 안내", "장애인 택시바우처 안내", "장애인 버스요금 지원 안내"],
  },
  elderly_care_type: {
    question: "도움받을 분이 어르신인가요? 안부·생활지원이나 병원·외출 동행, 복지관 시설 정보 중 어떤 도움이 필요한지 알려주세요.",
    options: ["노인맞춤돌봄서비스 안내", "분당노인종합복지관 안내"],
  },
  health_visit_or_dementia: {
    question: "집에서 받는 건강관리와 기억력·치매 관련 상담 중 어떤 도움이 필요하세요?",
    options: ["맞춤형 방문건강관리 안내", "중원구보건소 치매안심센터 안내"],
  },
  region_required: {
    question: "어느 지역의 어떤 시설을 찾으세요? 현재 자료로는 거리순이나 가장 가까운 시설을 확인할 수 없습니다.",
    options: [],
  },
  service_required: {
    question: "필요한 도움이나 제도명을 조금 더 구체적으로 알려주세요. 이동, 돌봄, 건강, 생활지원 중 어떤 도움이 필요하세요?",
    options: [],
  },
} as const;
export type ClarificationId = keyof typeof CLARIFICATIONS;
export function isClarificationId(value: unknown): value is ClarificationId {
  return typeof value === "string" && Object.hasOwn(CLARIFICATIONS, value);
}

export type IntentRoute =
  | { route: "DIRECT"; serviceIds: [ServiceId]; intent: PublicInformationIntent; clarificationId: null }
  | { route: "CLARIFY"; serviceIds: ServiceId[]; intent: PublicInformationIntent; clarificationId: ClarificationId }
  | { route: "UNSUPPORTED"; serviceIds: []; intent: PublicInformationIntent; clarificationId: null };

export interface ClarificationContext {
  question: string;
  clarificationId: ClarificationId;
}
export type RoutingMetadata = {
  source: "keyword" | "ai" | "fallback" | "guard";
  reason?: "disabled" | "not_configured" | "invalid_output" | "provider_error" | "timeout";
  decision: IntentRoute;
};
