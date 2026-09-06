import type { IntentRoute } from "@/types/public-information-router";

/** 기대값 전용 평가셋. 런타임 프롬프트/검색에는 import하지 않는다. */
export const ROUTER_EVALUATION_CASES: readonly { question: string; expected: IntentRoute }[] = [
  { question: "어머니가 혼자 계시는데 누가 안부 좀 봐줄 수 있나요?", expected: { route: "DIRECT", serviceIds: ["seongnam-senior-tailored-care"], intent: "overview", clarificationId: null } },
  { question: "병원 갈 때 같이 가줄 사람이 없어요", expected: { route: "CLARIFY", serviceIds: ["seongnam-senior-tailored-care"], intent: "overview", clarificationId: "elderly_care_type" } },
  { question: "요즘 자꾸 깜빡하는데 어디에 물어보면 돼요?", expected: { route: "DIRECT", serviceIds: ["seongnam-dementia-center"], intent: "contact", clarificationId: null } },
  { question: "집에 쌀이 떨어졌고 생활비가 없어요", expected: { route: "DIRECT", serviceIds: ["seongnam-emergency-welfare-support"], intent: "overview", clarificationId: null } },
  { question: "다리가 불편해서 버스를 못 타요", expected: { route: "DIRECT", serviceIds: ["seongnam-special-transportation"], intent: "overview", clarificationId: null } },
  { question: "장애인 택시 지원 있어?", expected: { route: "CLARIFY", serviceIds: ["seongnam-special-transportation", "seongnam-disabled-taxi-voucher"], intent: "overview", clarificationId: "mobility_vehicle_or_fare" } },
  { question: "노인맞춤돌봄 신청하고 싶어요", expected: { route: "DIRECT", serviceIds: ["seongnam-senior-tailored-care"], intent: "application", clarificationId: null } },
  { question: "수정구에 가까운 복지관 알려줘", expected: { route: "UNSUPPORTED", serviceIds: [], intent: "location", clarificationId: null } },
  { question: "오늘 점심 메뉴 추천해줘", expected: { route: "UNSUPPORTED", serviceIds: [], intent: "other", clarificationId: null } },
];

export function matchesExpectedRoute(actual: IntentRoute | undefined, expected: IntentRoute) {
  return actual?.route === expected.route && actual.clarificationId === expected.clarificationId &&
    actual.serviceIds.length === expected.serviceIds.length && expected.serviceIds.every((id) => actual.serviceIds.some((candidate) => candidate === id));
}
