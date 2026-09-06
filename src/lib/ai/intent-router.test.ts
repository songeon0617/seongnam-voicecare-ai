import assert from "node:assert/strict";
import test from "node:test";
import { guardClarificationMeaning, constrainClarificationCandidates } from "./intent-router";
import { createPublicInformationResponseWithAnswer as run } from "@/lib/search/create-public-information-response-with-answer";
import type { IntentRoute, ServiceId } from "@/types/public-information-router";

const clarify = (clarificationId: Extract<IntentRoute, { route: "CLARIFY" }>["clarificationId"], serviceIds: ServiceId[]): IntentRoute =>
  ({ route: "CLARIFY", serviceIds, intent: "overview", clarificationId });

const cases: readonly { name: string; query: string; raw: IntentRoute; expected: IntentRoute }[] = [
  {
    name: "차량 지원인지 요금 지원인지 모호",
    query: "장애인 택시를 탈 차량이 필요한 건지 택시 요금 지원이 필요한 건지 모르겠어요",
    raw: clarify("mobility_vehicle_or_fare", ["seongnam-special-transportation", "seongnam-disabled-taxi-voucher"]),
    expected: clarify("mobility_vehicle_or_fare", ["seongnam-special-transportation", "seongnam-disabled-taxi-voucher"]),
  },
  {
    name: "노인 돌봄인지 복지관 시설인지 모호",
    query: "어르신 안부 돌봄을 원하는지 복지관 시설 정보를 원하는지 아직 모르겠어요",
    raw: clarify("elderly_care_type", ["seongnam-senior-tailored-care", "seongnam-bundang-senior-welfare-center"]),
    expected: clarify("elderly_care_type", ["seongnam-senior-tailored-care", "seongnam-bundang-senior-welfare-center"]),
  },
  {
    name: "치매 상담인지 방문건강관리인지 모호",
    query: "기억력 상담이 필요한지 집에서 방문 건강관리를 받아야 할지 모르겠어요",
    raw: clarify("health_visit_or_dementia", ["seongnam-home-health-care", "seongnam-dementia-center"]),
    expected: clarify("health_visit_or_dementia", ["seongnam-home-health-care", "seongnam-dementia-center"]),
  },
  {
    name: "지역이 없어 시설 안내 불가능",
    query: "가까운 복지시설을 찾고 있어요",
    raw: clarify("region_required", []),
    expected: clarify("region_required", []),
  },
  {
    name: "서비스 자체가 불명확",
    query: "도움을 받고 싶은데 무엇을 말해야 하나요?",
    raw: clarify("service_required", []),
    expected: clarify("service_required", []),
  },
  {
    name: "일반 이동 도움은 좁은 교통 clarification 금지",
    query: "이동할 때 받을 수 있는 도움이 뭐가 있나요?",
    raw: clarify("mobility_vehicle_or_fare", ["seongnam-special-transportation", "seongnam-disabled-taxi-voucher", "seongnam-disabled-bus-fare-support"]),
    expected: clarify("service_required", []),
  },
  {
    name: "일반 돌봄 대 건강관리는 치매 축 추정 금지",
    query: "집에서 돌봄을 받을지 건강관리를 받을지 잘 모르겠어요",
    raw: clarify("health_visit_or_dementia", ["seongnam-senior-tailored-care", "seongnam-home-health-care"]),
    expected: clarify("service_required", []),
  },
  {
    name: "일반 어르신 건강은 치매 축 추정 금지",
    query: "어르신 건강을 챙겨주는 방식이 여러 가지라던데 어떤 걸 말해야 하나요?",
    raw: clarify("health_visit_or_dementia", ["seongnam-senior-ai-iot-health-care", "seongnam-home-health-care", "seongnam-dementia-center"]),
    expected: clarify("service_required", []),
  },
];

for (const entry of cases) {
  test(`clarification 원칙: ${entry.name}`, () => {
    assert.deepEqual(constrainClarificationCandidates(guardClarificationMeaning(entry.query, entry.raw)), entry.expected);
  });
}

test("특정 서비스를 말하고 준비물·문의처를 함께 물으면 서비스는 DIRECT로 유지한다", async () => {
  const query = "장애인 보조기구·보장구 지원 준비물과 문의처를 알고 싶어요";
  const response = await run({ query }, () => { assert.fail("명확한 서비스는 AI를 호출하지 않는다"); });
  assert.equal(response.status, 200);
  assert.ok("results" in response.body);
  assert.equal(response.body.kind, "answer");
  assert.equal(response.body.routing?.source, "keyword");
  assert.deepEqual(response.body.routing?.decision, {
    route: "DIRECT", serviceIds: ["seongnam-disabled-assistive-devices"], intent: "documents", clarificationId: null,
  });
});
