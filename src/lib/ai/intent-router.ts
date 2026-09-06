import { isRecord } from "./generate-public-information-answer";
import type { ServiceCatalogEntry } from "./service-catalog";
import { ROUTER_INTENTS, isClarificationId, type ClarificationContext, type ClarificationId, type IntentRoute, type ServiceId } from "@/types/public-information-router";

export interface IntentRoutingInput {
  question: string;
  catalog: readonly ServiceCatalogEntry[];
  context?: ClarificationContext;
}
export type IntentRouter = (input: IntentRoutingInput) => Promise<unknown>;
export type IntentRouterConfiguration = { status: "ready"; route: IntentRouter } | { status: "disabled" | "not_configured" };
export class RouterTimeoutError extends Error {}
export class InvalidRouterOutputError extends Error {}

/** 확인 질문의 의미와 관계없는 후보를 버린다. 새 후보/사실을 추가하지 않는다. */
const CLARIFICATION_SERVICES: Record<ClarificationId, readonly ServiceId[]> = {
  mobility_general: [], mobility_purpose: [], youth_purpose: [], library_required: [], referent_required: [],
  mobility_vehicle_or_fare: ["seongnam-special-transportation", "seongnam-disabled-taxi-voucher", "seongnam-disabled-bus-fare-support"],
  elderly_care_type: ["seongnam-senior-tailored-care", "seongnam-bundang-senior-welfare-center"],
  health_visit_or_dementia: ["seongnam-home-health-care", "seongnam-dementia-center"],
  region_required: [],
  service_required: [],
};
export function constrainClarificationCandidates(decision: IntentRoute): IntentRoute {
  if (decision.route !== "CLARIFY") return decision;
  return { ...decision, serviceIds: decision.serviceIds.filter((id) => CLARIFICATION_SERVICES[decision.clarificationId].includes(id)) };
}

const SERVICE_REQUIRED: IntentRoute = {
  route: "CLARIFY", serviceIds: [], intent: "overview", clarificationId: "service_required",
};

/** 질문에 없는 좁은 구분축을 AI가 추정했으면 일반 확인 질문으로 되돌린다. */
export function guardClarificationMeaning(question: string, decision: IntentRoute): IntentRoute {
  if (decision.route !== "CLARIFY") return decision;
  const broad = (): IntentRoute => ({ ...SERVICE_REQUIRED, intent: decision.intent });
  if (decision.clarificationId === "mobility_vehicle_or_fare" &&
    !/택시|차량|차가|이동수단|교통수단|교통비|요금|버스|타고\s*갈|탈\s*차/.test(question)) return broad();
  if (decision.clarificationId === "health_visit_or_dementia") {
    const hasCognitiveCue = /치매|기억|인지|깜빡|반복/.test(question);
    const hasVisitHealthCue = /방문|집에서|집으로|간호|건강관리|건강\s*관리/.test(question);
    if (!hasCognitiveCue || !hasVisitHealthCue) return broad();
  }
  return decision;
}

/** Schema 외에도 조합, 중복, 현재 요청의 허용 ID를 신뢰 경계에서 검증한다. */
export function isIntentRoute(value: unknown, allowedIds: readonly string[]): value is IntentRoute {
  if (!isRecord(value) || Object.keys(value).length !== 4 ||
    !["route", "serviceIds", "intent", "clarificationId"].every((key) => Object.hasOwn(value, key)) ||
    !ROUTER_INTENTS.some((intent) => intent === value.intent) || !Array.isArray(value.serviceIds) ||
    value.serviceIds.length > 3 || new Set(value.serviceIds).size !== value.serviceIds.length ||
    !value.serviceIds.every((id) => typeof id === "string" && allowedIds.includes(id))) return false;
  if (value.route === "DIRECT") return value.serviceIds.length === 1 && value.clarificationId === null;
  if (value.route === "CLARIFY") return isClarificationId(value.clarificationId);
  return value.route === "UNSUPPORTED" && value.serviceIds.length === 0 && value.clarificationId === null;
}
