import "server-only";
import type { ClarificationContext, ClarificationId, IntentRoute, ServiceId } from "@/types/public-information-router";
import { namedKeywordDocuments, keywordDecision, locationGuard, serviceScopeGuard } from "./keyword-routing";
import { searchPublicInformation } from "./search-public-information";
import { needsLiveOfficialEvidence } from "./curated-query-policy";

const clarify = (id: ClarificationId, serviceIds: ServiceId[] = []): IntentRoute =>
  ({ route: "CLARIFY", serviceIds, intent: "overview", clarificationId: id });
const unsupported = (): IntentRoute => ({ route: "UNSUPPORTED", serviceIds: [], intent: "other", clarificationId: null });

// Purpose combinations for the existing catalog only. Never infer eligibility or new facts.
const purposes: [ServiceId, (q: string) => boolean][] = [
  ["seongnam-special-transportation", q => /장애인콜택시/.test(q) || /휠체어|교통약자/.test(q) && /차량|탈.{0,8}차|부를.{0,10}차|차.{0,4}부르/.test(q)],
  ["seongnam-disabled-taxi-voucher", q => /택시바우[처쳐]/.test(q) || !/콜택시|특별교통/.test(q) && /장애/.test(q) && /택시/.test(q) && /요금|택시비|비용|할인|지원/.test(q)],
  ["seongnam-senior-tailored-care", q => /어르신|노인|어머니|아버지|부모|기초연금/.test(q) && /안부|동행|돌봄|생활지원/.test(q)],
  ["seongnam-bundang-senior-welfare-center", q => /복지관|노인복지시설/.test(q) && /분당|정자동/.test(q)],
  ["seongnam-senior-ai-iot-health-care", q => /스마트폰|스마트기기|앱|IoT/i.test(q) && /건강/.test(q) && /어르신|노인|\d{2}세/.test(q)],
  ["seongnam-disabled-assistive-devices", q => /장애/.test(q) && /보행차|욕창.{0,3}방석|보조기구|보장구/.test(q)],
  ["seongnam-developmental-disability-support", q => /발달장애/.test(q) && /지원|활동|방과|상담/.test(q)],
  ["seongnam-disabled-medical-support", q => /장애/.test(q) && /검사비|의료비|진단.{0,3}검사/.test(q)],
  ["seongnam-dementia-center", q => /기억력|치매/.test(q) && /검사|상담|센터/.test(q)],
  ["seongnam-home-health-care", q => /집.{0,6}(와서|에서|으로)|방문/.test(q) && /건강|간호사/.test(q)],
  ["seongnam-unmanned-civil-service-kiosk", q => /무인|기계/.test(q) && /등본|증명서|민원|발급/.test(q)],
  ["seongnam-emergency-welfare-support", q => /실직|수입.{0,5}끊|위기/.test(q) && /생계|월세|의료비|생활비/.test(q)],
  ["seongnam-disabled-bus-fare-support", q => /장애/.test(q) && /버스/.test(q) && /환급|지원|요금|버스비/.test(q)],
];

/** undefined alone grants access to expanded retrieval. Guards/clarifications are terminal. */
export function structuredBoundary(query: string, context?: ClarificationContext): IntentRoute | undefined {
  const q = query.normalize("NFKC").replace(/\s+/g, "");
  const related = /장애|휠체어|노인|어르신|복지관|돌봄|치매|기억력|방문건강|무인|긴급복지/.test(q);
  if (related) {
    const location = locationGuard(query);
    if (location) return location;
  }
  // These requests have no supported live-data/animal-medical service contract.
  if (/날씨|반려동물.{0,8}수술비/.test(q)) return unsupported();
  if (/^(성남시?)?복지(지원)?(은|는|가)?(뭐가?있어요?|알려줘|종류|안내)[?.!]*$/.test(q)) return clarify("service_required");
  // The catalog does not contain live status, fault recovery or cross-scheme comparisons.
  if (needsLiveOfficialEvidence(q) || /말고/.test(q)) return undefined;
  const named = namedKeywordDocuments(query, searchPublicInformation(query));
  const candidates = purposes.filter(([, matches]) => matches(q)).map(([id]) => id);
  for (const document of named) if (!candidates.includes(document.id as ServiceId)) candidates.push(document.id as ServiceId);
  const mobility: ServiceId[] = ["seongnam-special-transportation", "seongnam-disabled-taxi-voucher", "seongnam-disabled-bus-fare-support"];
  if (candidates.length > 1 && candidates.every(id => mobility.includes(id))) return clarify("mobility_vehicle_or_fare", candidates);
  if (/장애/.test(q) && /이동/.test(q) && (!candidates.length || /차량/.test(q) && /택시/.test(q))) {
    return clarify("mobility_vehicle_or_fare", /버스/.test(q)
      ? ["seongnam-special-transportation", "seongnam-disabled-taxi-voucher", "seongnam-disabled-bus-fare-support"]
      : ["seongnam-special-transportation", "seongnam-disabled-taxi-voucher"]);
  }
  if (/돌봄|안부/.test(q) && /복지관/.test(q) && /어르신|아버지|어머니|노인/.test(q))
    return clarify("elderly_care_type", ["seongnam-senior-tailored-care", "seongnam-bundang-senior-welfare-center"]);
  if (candidates.includes("seongnam-home-health-care") && candidates.includes("seongnam-dementia-center"))
    return clarify("health_visit_or_dementia", ["seongnam-home-health-care", "seongnam-dementia-center"]);
  if (!candidates.length && context?.clarificationId === "elderly_care_type" && /안부|동행/.test(q))
    candidates.push("seongnam-senior-tailored-care");
  // Negations and multiple purposes must never silently select the first service.
  if (candidates.length > 1 || candidates.length && /말고|아닌|제외/.test(q)) return clarify("service_required", candidates);
  if (candidates.length === 1) {
    const decision = keywordDecision(query, candidates[0]);
    return serviceScopeGuard(query, decision) ?? decision;
  }
  return undefined;
}
