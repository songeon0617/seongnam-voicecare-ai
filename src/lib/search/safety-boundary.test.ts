import assert from "node:assert/strict";
import test from "node:test";
import { createPublicInformationResponseWithAnswer } from "./create-public-information-response-with-answer";
import { SAFETY_GUIDANCE, type SafetyCategory } from "@/types/public-information-safety";
import { matchSafetyBoundary } from "@/lib/safety/safety-boundary";
import { createExpandedPublicInformationResponse } from "./expanded-public-information";

const UNSUPPORTED = { route: "UNSUPPORTED", serviceIds: [], intent: "other", clarificationId: null } as const;

test("현재 실행 의사는 공식 검색 전에 고정 안전 안내로 처리하고 부정·과거·인용과 구분한다", async () => {
  const response = await createExpandedPublicInformationResponse({ query: "지금 자살하려고 해요" }, {
    search: async () => { assert.fail("직접적인 현재 위험은 공식 검색으로 보내지 않는다"); },
  });
  assert.equal(response.status, 200);
  assert.ok("answer" in response.body);
  assert.equal(response.body.kind, "safety");
  assert.equal(response.body.safety?.category, "self_harm_immediate");
  assert.equal(response.body.answer.plainLanguageSummary, SAFETY_GUIDANCE.self_harm_immediate.summary);
  assert.equal(response.body.officialSearch, undefined);
  for (const query of ["지금 자살하려고 하는 건 아니에요", "작년에 자살하려고 했어요", "예시: 지금 자살하려고 해요", "지금 자살하려고 해요라는 말을 들었어요"]) {
    assert.equal(matchSafetyBoundary(query), null, query);
  }
});

function body(response: Awaited<ReturnType<typeof createPublicInformationResponseWithAnswer>>) {
  assert.equal(response.status, 200);
  assert.ok("results" in response.body);
  return response.body;
}

for (const [query, category] of [
  ["사람이 의식이 없어요", "immediate_emergency"],
  ["숨을 못 쉬어요", "immediate_emergency"],
  ["쓰러졌어요", "immediate_emergency"],
  ["지금 쓰러질 것 같아요", "immediate_emergency"],
  ["반응이 없어요", "immediate_emergency"],
  ["죽고 싶어요", "self_harm_immediate"],
  ["자살하고 싶어요", "self_harm_immediate"],
  ["지금 나를 해칠 것 같아요", "self_harm_immediate"],
] as const satisfies readonly (readonly [string, SafetyCategory])[]) {
  test(`즉시 safety는 검색과 AI 전에 중단한다: ${query}`, async () => {
    let searches = 0;
    const response = body(await createPublicInformationResponseWithAnswer(
      { query },
      () => { assert.fail("safety 요청은 AI를 구성하지 않아야 한다"); },
      () => { searches++; return []; },
    ));
    assert.equal(searches, 0);
    assert.equal(response.kind, "safety");
    assert.deepEqual(response.results, []);
    assert.equal(response.hasResults, false);
    assert.deepEqual(response.safety, { category, phoneNumbers: [...SAFETY_GUIDANCE[category].phoneNumbers], requiresUserAction: true });
    assert.equal(response.answer.title, SAFETY_GUIDANCE[category].title);
    assert.equal(response.answer.plainLanguageSummary, SAFETY_GUIDANCE[category].summary);
    assert.deepEqual(response.answer.sources, []);
    assert.equal(response.routing, undefined);
  });
}

for (const query of [
  "작년에 쓰러졌는데 지원받을 수 있나요?",
  "예전에 숨이 안 쉬어진 적이 있어요",
  "숨을 못 쉬는 증상이 있었어요",
  "죽고 싶다는 생각이 들었던 적이 있어요",
  "의식이 없는 사람을 발견하면 어떻게 해야 하나요?",
  "죽고 싶다는 말을 들었는데 어떤 상담기관이 있나요?",
  "119 지원금이 있나요?",
  "예시 문장: “죽고 싶어요”",
]) {
  test(`과거·일반·인용 문맥은 safety로 오탐하지 않는다: ${query}`, async () => {
    let searches = 0;
    let aiCalls = 0;
    const response = body(await createPublicInformationResponseWithAnswer(
      { query },
      () => ({ status: "ready", route: async () => { aiCalls++; return UNSUPPORTED; } }),
      () => { searches++; return []; },
    ));
    assert.equal(searches, 1);
    assert.equal(aiCalls, 1);
    assert.notEqual(response.kind, "safety");
    assert.equal(response.kind, "unsupported");
  });
}

test("긴급 생활지원 표현은 safety가 아니라 기존 긴급복지 라우팅을 유지한다", async () => {
  let searches = 0;
  let aiCalls = 0;
  const response = body(await createPublicInformationResponseWithAnswer(
    { query: "오늘 당장 잘 곳이 없고 먹을 것도 하나도 없어요" },
    () => ({ status: "ready", route: async () => { aiCalls++; return {
      route: "DIRECT", serviceIds: ["seongnam-emergency-welfare-support"], intent: "overview", clarificationId: null,
    }; } }),
    () => { searches++; return []; },
  ));
  assert.equal(searches, 1);
  assert.equal(aiCalls, 1);
  assert.equal(response.kind, "answer");
  assert.deepEqual(response.routing?.decision.serviceIds, ["seongnam-emergency-welfare-support"]);
});
