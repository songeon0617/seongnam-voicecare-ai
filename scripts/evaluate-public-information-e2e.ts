import { writeFile } from "node:fs/promises";

type Route = "DIRECT" | "CLARIFY" | "UNSUPPORTED";

type Case = {
  id: string;
  group: string;
  question: string;
  expectedRoute: Route;
  expectedServiceIds: string[];
  expectedClarificationId?: string;
  context?: { question: string; clarificationId: string };
  asksForUnregisteredInformation?: boolean;
};

type ApiBody = {
  routing?: {
    decision?: { route?: Route; serviceIds?: unknown; clarificationId?: unknown };
    source?: unknown;
    reason?: unknown;
  };
  answer?: {
    title?: unknown;
    plainLanguageSummary?: unknown;
    eligibility?: unknown;
    sources?: unknown;
    steps?: unknown;
    nextAction?: unknown;
    requiredItems?: unknown;
    contacts?: unknown;
    locations?: unknown;
  };
  results?: Array<{
    document?: {
      id?: unknown;
      title?: unknown;
      content?: unknown;
      targetAudiences?: unknown;
    };
  }>;
};

const cases: Case[] = [
  { id: "special-name", group: "특별교통수단 운영", question: "특별교통수단 운영 신청에 필요한 서류가 뭐예요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-special-transportation"] },
  { id: "special-colloquial", group: "특별교통수단 운영", question: "휠체어 타는데 부를 수 있는 차 있어요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-special-transportation"] },
  { id: "special-situation", group: "특별교통수단 운영", question: "버스를 타기 어려운 휠체어 이용자가 이동할 차량이 필요해요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-special-transportation"] },

  { id: "taxi-name", group: "장애인 택시바우처", question: "장애인 택시바우처 신청하려면 어떻게 해요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-taxi-voucher"] },
  { id: "taxi-colloquial", group: "장애인 택시바우처", question: "장애인이 택시비 할인받는 거 있어요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-taxi-voucher"] },
  { id: "taxi-situation", group: "장애인 택시바우처", question: "장애가 심한데 택시 탈 때 요금 지원받고 싶어요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-taxi-voucher"] },

  { id: "care-name", group: "노인맞춤돌봄서비스", question: "노인맞춤돌봄서비스는 어디서 신청하나요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-senior-tailored-care"] },
  { id: "care-colloquial", group: "노인맞춤돌봄서비스", question: "혼자 사는 어머니 안부를 챙겨주는 도움 있나요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-senior-tailored-care"] },
  { id: "care-situation", group: "노인맞춤돌봄서비스", question: "70세 기초연금 수급자인 아버지가 병원 갈 때 동행이 필요해요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-senior-tailored-care"] },

  { id: "center-name", group: "분당노인종합복지관", question: "분당노인종합복지관 주소와 연락처 알려주세요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-bundang-senior-welfare-center"] },
  { id: "center-colloquial", group: "분당노인종합복지관", question: "정자동에 어르신 교육이랑 상담하는 복지관 있어요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-bundang-senior-welfare-center"] },
  { id: "center-situation", group: "분당노인종합복지관", question: "부모님이 분당에서 프로그램에 참여할 만한 노인복지시설을 찾고 있어요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-bundang-senior-welfare-center"] },

  { id: "iot-name", group: "AI·IoT 기반 어르신 건강관리", question: "AI·IoT 기반 어르신 건강관리 신청 대상이 누구예요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-senior-ai-iot-health-care"] },
  { id: "iot-colloquial", group: "AI·IoT 기반 어르신 건강관리", question: "스마트폰으로 어르신 건강 챙겨주는 서비스 있나요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-senior-ai-iot-health-care"] },
  { id: "iot-situation", group: "AI·IoT 기반 어르신 건강관리", question: "70세이고 만성질환이 있는데 앱이랑 스마트기기로 건강관리를 받고 싶어요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-senior-ai-iot-health-care"] },

  { id: "device-name", group: "장애인 보조기구·보장구 지원", question: "장애인 보조기구·보장구 지원은 어디서 신청해요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-assistive-devices"] },
  { id: "device-colloquial", group: "장애인 보조기구·보장구 지원", question: "장애인 보행차 지원받을 수 있나요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-assistive-devices"] },
  { id: "device-situation", group: "장애인 보조기구·보장구 지원", question: "차상위 등록장애인인데 욕창 방석을 마련할 때 도움받을 수 있을까요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-assistive-devices"] },

  { id: "developmental-name", group: "발달장애인 지원", question: "발달장애인 지원 서비스 신청 방법을 알려주세요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-developmental-disability-support"] },
  { id: "developmental-colloquial", group: "발달장애인 지원", question: "발달장애 자녀가 방과 후에 도움받을 곳이 있나요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-developmental-disability-support"] },
  { id: "developmental-situation", group: "발달장애인 지원", question: "성인 발달장애인 가족인데 낮 활동과 부모상담을 함께 알아보고 싶어요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-developmental-disability-support"] },

  { id: "medical-name", group: "장애인 보건·의료서비스 지원", question: "장애인 보건·의료서비스 지원에는 어떤 항목이 있나요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-medical-support"] },
  { id: "medical-colloquial", group: "장애인 보건·의료서비스 지원", question: "장애검사비 지원받는 제도 있어요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-medical-support"] },
  { id: "medical-situation", group: "장애인 보건·의료서비스 지원", question: "등록장애인인데 진단 검사와 의료비가 부담돼요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-medical-support"] },

  { id: "dementia-name", group: "중원구보건소 치매안심센터", question: "중원구보건소 치매안심센터 연락처가 어떻게 되나요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-dementia-center"] },
  { id: "dementia-colloquial", group: "중원구보건소 치매안심센터", question: "기억력 검사 어디서 받을 수 있어요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-dementia-center"] },
  { id: "dementia-situation", group: "중원구보건소 치매안심센터", question: "요즘 자꾸 깜빡해서 치매 검사와 상담을 받아보고 싶어요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-dementia-center"] },

  { id: "home-health-name", group: "맞춤형 방문건강관리", question: "맞춤형 방문건강관리 대상과 비용을 알려주세요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-home-health-care"] },
  { id: "home-health-colloquial", group: "맞춤형 방문건강관리", question: "간호사가 집에 와서 건강 봐주는 거 있나요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-home-health-care"] },
  { id: "home-health-situation", group: "맞춤형 방문건강관리", question: "성남에 사는 차상위 만성질환자인데 집에서 건강상담을 받고 싶어요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-home-health-care"] },

  { id: "kiosk-name", group: "무인민원발급기 이용 안내", question: "무인민원발급기 이용 안내와 설치 장소를 알려주세요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-unmanned-civil-service-kiosk"] },
  { id: "kiosk-colloquial", group: "무인민원발급기 이용 안내", question: "등본을 기계로 뽑으려면 어디서 확인해요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-unmanned-civil-service-kiosk"] },
  { id: "kiosk-situation", group: "무인민원발급기 이용 안내", question: "주민센터가 닫았는데 무인으로 가족관계증명서를 발급하고 싶어요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-unmanned-civil-service-kiosk"] },

  { id: "emergency-name", group: "긴급복지지원 사업", question: "긴급복지지원 사업은 어디서 신청하나요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-emergency-welfare-support"] },
  { id: "emergency-colloquial", group: "긴급복지지원 사업", question: "실직해서 당장 생계비가 없는데 받을 수 있는 도움 있나요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-emergency-welfare-support"] },
  { id: "emergency-situation", group: "긴급복지지원 사업", question: "가장의 수입이 끊겨서 월세와 의료비를 감당하기 막막해요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-emergency-welfare-support"] },

  { id: "bus-name", group: "장애인 버스요금 지원", question: "장애인 버스요금 지원 한도가 얼마예요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-bus-fare-support"] },
  { id: "bus-colloquial", group: "장애인 버스요금 지원", question: "장애인 버스비 환급받을 수 있어요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-bus-fare-support"] },
  { id: "bus-situation", group: "장애인 버스요금 지원", question: "성남 등록장애인인데 버스 타고 다닌 비용을 지원받고 싶어요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-bus-fare-support"] },

  { id: "edge-mobility-clarify", group: "경계: 복수 후보", question: "장애인이 이동할 때 차량을 불러야 할지 택시비 지원을 받아야 할지 모르겠어요.", expectedRoute: "CLARIFY", expectedServiceIds: ["seongnam-special-transportation", "seongnam-disabled-taxi-voucher"], expectedClarificationId: "mobility_vehicle_or_fare" },
  { id: "edge-mobility-followup", group: "경계: clarification 후속", question: "휠체어로 탈 수 있는 차량이 필요해요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-special-transportation"], context: { question: "장애인이 이동할 때 차량을 불러야 할지 택시비 지원을 받아야 할지 모르겠어요.", clarificationId: "mobility_vehicle_or_fare" } },
  { id: "edge-region-missing", group: "경계: 지역 필요", question: "가까운 노인복지관이 어디예요?", expectedRoute: "CLARIFY", expectedServiceIds: [], expectedClarificationId: "region_required" },
  { id: "edge-too-broad", group: "경계: 너무 넓음", question: "성남시 복지 지원은 뭐가 있어요?", expectedRoute: "CLARIFY", expectedServiceIds: [], expectedClarificationId: "service_required" },
  { id: "edge-nonexistent", group: "경계: 존재하지 않는 지원", question: "성남시에서 반려동물 수술비를 지원받고 싶어요.", expectedRoute: "UNSUPPORTED", expectedServiceIds: [] },
  { id: "edge-unregistered-phone", group: "경계: 미등록 전화번호", question: "장애인 버스요금 지원 담당 전화번호 알려주세요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-bus-fare-support"], asksForUnregisteredInformation: true },
  { id: "edge-unregistered-documents", group: "경계: 미등록 서류", question: "맞춤형 방문건강관리 신청 서류를 전부 알려주세요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-home-health-care"], asksForUnregisteredInformation: true },
  { id: "edge-unregistered-amount", group: "경계: 미등록 금액", question: "발달장애인 지원은 매달 얼마를 지급해요?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-developmental-disability-support"], asksForUnregisteredInformation: true },
  { id: "edge-typo", group: "경계: 오타·구어체", question: "장애인 택시바우쳐 어케 신청해?", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-disabled-taxi-voucher"] },
  { id: "edge-unrelated", group: "경계: 무관 질문", question: "오늘 성남 날씨 어때?", expectedRoute: "UNSUPPORTED", expectedServiceIds: [] },
  { id: "edge-region-unavailable", group: "경계: 지역 범위 밖", question: "수정구에서 가까운 치매안심센터가 어디예요?", expectedRoute: "UNSUPPORTED", expectedServiceIds: [] },
  { id: "edge-elderly-clarify", group: "경계: 복수 후보", question: "혼자 사는 아버지가 돌봄을 받을지 복지관 프로그램을 다닐지 모르겠어요.", expectedRoute: "CLARIFY", expectedServiceIds: ["seongnam-senior-tailored-care", "seongnam-bundang-senior-welfare-center"], expectedClarificationId: "elderly_care_type" },
  { id: "edge-elderly-followup", group: "경계: clarification 후속", question: "안부를 확인해 주고 병원 갈 때 동행해 주는 쪽이요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-senior-tailored-care"], context: { question: "혼자 사는 아버지가 돌봄을 받을지 복지관 프로그램을 다닐지 모르겠어요.", clarificationId: "elderly_care_type" } },
  { id: "edge-health-clarify", group: "경계: 복수 후보", question: "집으로 와서 건강관리를 받는 것과 기억력 검사를 어디서 받을지 둘 다 궁금해요.", expectedRoute: "CLARIFY", expectedServiceIds: ["seongnam-home-health-care", "seongnam-dementia-center"], expectedClarificationId: "health_visit_or_dementia" },
  { id: "edge-health-followup", group: "경계: clarification 후속", question: "간호사가 집에 와서 건강 상태를 봐주는 쪽이요.", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-home-health-care"], context: { question: "집으로 와서 건강관리를 받는 것과 기억력 검사를 어디서 받을지 둘 다 궁금해요.", clarificationId: "health_visit_or_dementia" } },
  { id: "region-bucheon", group: "추가: 지역 경계", question: "부천시 노인맞춤돌봄서비스 신청하는 곳 알려주세요", expectedRoute: "UNSUPPORTED", expectedServiceIds: [] },
  { id: "region-suwon", group: "추가: 지역 경계", question: "수원시 장애인 택시", expectedRoute: "UNSUPPORTED", expectedServiceIds: [] },
  { id: "region-seoul", group: "추가: 지역 경계", question: "서울에서 노인 돌봄", expectedRoute: "UNSUPPORTED", expectedServiceIds: [] },
  { id: "region-unspecified", group: "추가: 지역 경계", question: "노인맞춤돌봄서비스 신청", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-senior-tailored-care"] },
  { id: "region-seongnam", group: "추가: 지역 경계", question: "성남시 노인맞춤돌봄서비스 신청", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-senior-tailored-care"] },
  { id: "region-bundang", group: "추가: 지역 경계", question: "분당구 장애인 이동지원 특별교통수단 안내", expectedRoute: "DIRECT", expectedServiceIds: ["seongnam-special-transportation"] },
  { id: "region-followup", group: "추가: 지역 경계", question: "부천시요", expectedRoute: "UNSUPPORTED", expectedServiceIds: [], context: { question: "가까운 노인복지관이 어디예요?", clarificationId: "region_required" } },
];

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sameMembers(actual: string[], expected: string[]) {
  return actual.length === expected.length && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

function factsAreDocumentBacked(body: ApiBody, actualRoute: Route | undefined) {
  const answer = body?.answer;
  if (!answer || typeof answer !== "object") return false;
  if (actualRoute !== "DIRECT") {
    return Array.isArray(answer.sources) && answer.sources.length === 0 && Array.isArray(answer.steps) && answer.steps.length === 0 && answer.nextAction === null;
  }
  if (!Array.isArray(body.results) || body.results.length !== 1) return false;
  const document = body.results[0]?.document;
  if (!document) return false;
  const sourceIds = Array.isArray(answer.sources)
    ? answer.sources.flatMap((source) => typeof source === "object" && source !== null && "id" in source && typeof source.id === "string" ? [source.id] : [])
    : [];
  const eligibility = Array.isArray(answer.eligibility) ? answer.eligibility.filter((value): value is string => typeof value === "string") : [];
  const targetAudiences = Array.isArray(document.targetAudiences) ? document.targetAudiences.filter((value): value is string => typeof value === "string") : [];
  return answer.title === document.title
    && answer.plainLanguageSummary === document.content
    && typeof document.id === "string"
    && sameMembers(sourceIds, [document.id])
    && sameMembers(eligibility, targetAudiences)
    && Array.isArray(answer.steps) && answer.steps.length === 0
    && answer.nextAction === null
    && answer.requiredItems === undefined
    && answer.contacts === undefined
    && answer.locations === undefined;
}

async function main() {
  const baseUrl = argument("--base-url") ?? "http://127.0.0.1:3100";
  const from = Math.max(1, Number(argument("--from") ?? "1"));
  const to = Math.min(cases.length, Number(argument("--to") ?? String(cases.length)));
  const output = argument("--output");
  const selected = cases.slice(from - 1, to);
  const results = [];

  for (const testCase of selected) {
    const response = await fetch(`${baseUrl}/api/public-information/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: testCase.question, ...(testCase.context ? { context: testCase.context } : {}) }),
    });
    const body = await response.json() as ApiBody;
    const decision = body?.routing?.decision;
    const actualRoute = decision?.route as Route | undefined;
    const actualServiceIds = Array.isArray(decision?.serviceIds) ? decision.serviceIds.filter((value): value is string => typeof value === "string") : [];
    const actualClarificationId = typeof decision?.clarificationId === "string" ? decision.clarificationId : null;
    const wrongRoute = response.status !== 200 || actualRoute !== testCase.expectedRoute;
    const wrongService = !wrongRoute && !sameMembers(actualServiceIds, testCase.expectedServiceIds);
    const wrongClarification = testCase.expectedRoute === "CLARIFY"
      ? actualClarificationId !== testCase.expectedClarificationId
      : actualRoute === "CLARIFY";
    const documentBacked = response.status === 200 && factsAreDocumentBacked(body, actualRoute);
    const hallucination = !documentBacked;
    const unsupportedInformation = Boolean(testCase.asksForUnregisteredInformation && !documentBacked);
    const pass = !wrongRoute && !wrongService && !wrongClarification && !hallucination && !unsupportedInformation;
    const failureReasons = [
      wrongRoute ? `wrong_route: expected ${testCase.expectedRoute}, got ${actualRoute ?? `HTTP ${response.status}`}` : null,
      wrongService ? `wrong_service: expected [${testCase.expectedServiceIds.join(", ")}], got [${actualServiceIds.join(", ")}]` : null,
      wrongClarification ? `wrong_clarification: expected ${testCase.expectedClarificationId ?? "none"}, got ${actualClarificationId ?? "none"}` : null,
      hallucination ? "hallucination: answer fields were not an exact deterministic mapping of the returned official document" : null,
      unsupportedInformation ? "unsupported_information: generated information absent from the registered document" : null,
    ].filter(Boolean);
    results.push({
      ...testCase,
      httpStatus: response.status,
      actualRoute: actualRoute ?? null,
      actualServiceIds,
      actualClarificationId,
      routingSource: body?.routing?.source ?? null,
      routingReason: body?.routing?.reason ?? null,
      answerTitle: body?.answer?.title ?? null,
      hallucination,
      unsupportedInformation,
      wrongRoute,
      wrongService,
      wrongClarification,
      pass,
      failureReason: failureReasons.join("; "),
    });
  }

  const payload = { generatedAt: new Date().toISOString(), baseUrl, from, to, totalDefinedCases: cases.length, results };
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  if (output) await writeFile(output, json, "utf8");
  else process.stdout.write(json);
  // 실패한 평가를 CI/셸에서 성공으로 오인하지 않도록 한다.
  if (results.some((result) => !result.pass)) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
