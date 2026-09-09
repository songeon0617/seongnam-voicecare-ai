import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "@/app/api/public-information/search/route";
import { createPublicInformationSearchHandler } from "./handle-public-information-search";
import { createPublicInformationSearchResponse } from "./create-public-information-search-response";
import { createPublicInformationResponseWithAnswer as run } from "./create-public-information-response-with-answer";
import { createOpenAIIntentRouter } from "@/lib/ai/openai-intent-router";
import { createServiceCatalog, getRoutingDocuments } from "@/lib/ai/service-catalog";
import { ROUTER_EVALUATION_CASES, matchesExpectedRoute } from "@/lib/ai/intent-router-evaluation";
import { mapDocumentsToPublicInformationAnswer as map } from "@/lib/public-information/map-documents-to-answer";
import { CLARIFICATIONS, type IntentRoute } from "@/types/public-information-router";
import type { PublicInformationSearchResponse } from "@/types/public-information-search";

const QUERY = ROUTER_EVALUATION_CASES[0].question;
const DIRECT = ROUTER_EVALUATION_CASES[0].expected;
const ENV = { PUBLIC_INFORMATION_AI_ENABLED: "true", OPENAI_API_KEY: "test-only-key", OPENAI_MODEL: "test-model" };
const result = (response: Awaited<ReturnType<typeof run>>): PublicInformationSearchResponse => {
  assert.equal(response.status, 200);
  assert.ok("results" in response.body);
  return response.body;
};

test("13개 공식 문서와 카탈로그는 일대일이며 본문·전화·자격 세부를 보내지 않는다", () => {
  const documents = getRoutingDocuments();
  const catalog = createServiceCatalog();
  assert.equal(catalog.length, 13);
  assert.deepEqual(catalog.map((entry) => entry.serviceId), documents.map((doc) => doc.id));
  const text = JSON.stringify(catalog);
  for (const document of documents) assert.ok(!text.includes(document.content));
  assert.doesNotMatch(text, /\d{2,4}-\d{3,4}-\d{4}|originalUrl|targetAudiences|lastVerifiedAt/);
  assert.throws(() => createServiceCatalog([documents[0], documents[0]]));
  assert.throws(() => createServiceCatalog([{ ...documents[0], id: "invented" }]));
});

test("명확한 keyword는 AI 구성조차 하지 않고 안전 매핑 한 건만 반환한다", async () => {
  for (const query of ["노인맞춤돌봄 신청하고 싶어요", "장애인 콜택시 이용하려면 어떻게 해야 해?", "장애인 택시바우처 신청", "방문건강관리 신청", "치매안심센터 문의", "긴급복지 신청", ...getRoutingDocuments().map((doc) => `${doc.title} 안내`)]) {
    const body = result(await run({ query }, () => { assert.fail(`AI 호출 금지: ${query}`); }));
    assert.equal(body.routing?.source, "keyword");
    assert.equal(body.results.length, 1);
    assert.deepEqual(body.answer, map(query, [body.results[0].document]));
  }
});

test("명시적 제도명이 있어도 부정·복수 서비스 조건은 AI로 분기한다", async () => {
  for (const query of ["노인맞춤돌봄 말고 다른 도움", "방문건강관리와 노인맞춤돌봄 중 어떤 것?"]) {
    let calls = 0;
    await run({ query }, () => ({ status: "ready", route: async () => { calls++; return { route: "CLARIFY", serviceIds: [], intent: "other", clarificationId: "service_required" }; } }));
    assert.equal(calls, 1);
  }
});

test("keyword 실패 + AI DIRECT는 공식 문서만 재조회하고 입력 주입/변경을 격리한다", async () => {
  const before = createPublicInformationSearchResponse({ query: QUERY });
  assert.ok("results" in before.body && before.body.results.length === 0);
  let calls = 0;
  const body = result(await run({ query: QUERY, documents: [{ content: "가짜 정책" }], answer: { contacts: ["010-9999-9999"] } }, () => ({ status: "ready", route: async (input) => {
    calls++;
    assert.doesNotMatch(JSON.stringify(input), /가짜 정책|010-9999-9999/);
    input.catalog[0].name = "주입된 제목";
    return DIRECT;
  } })));
  assert.equal(calls, 1);
  assert.equal(body.kind, "answer");
  assert.deepEqual(body.answer, map(QUERY, getRoutingDocuments().filter((doc) => doc.id === DIRECT.serviceIds[0])));
  assert.ok(body.answer.contacts?.every(contact => !contact.phone?.startsWith("010")));
  assert.doesNotMatch(JSON.stringify(body.answer.requiredItems), /가짜 정책/);
  assert.equal(body.answer.locations, undefined);
  assert.doesNotMatch(JSON.stringify(body), /가짜 정책|주입된 제목/);
});

for (const entry of ROUTER_EVALUATION_CASES) {
  test(`평가 계약(mock; 모델 정확도 아님): ${entry.question}`, async () => {
    let calls = 0;
    const body = result(await run({ query: entry.question }, () => ({ status: "ready", route: async () => { calls++; return entry.expected; } })));
    assert.ok(matchesExpectedRoute(body.routing?.decision, entry.expected));
    assert.equal(calls, entry.question.startsWith("노인맞춤돌봄") ? 0 : 1);
    if (entry.expected.route === "DIRECT") assert.deepEqual(body.answer, map(entry.question, body.results.map((entry) => entry.document)));
    else {
      assert.equal(body.hasResults, false);
      assert.deepEqual(body.answer.sources, []);
      assert.equal(body.answer.eligibility, undefined);
      assert.equal(body.answer.verification.status, "insufficient_data");
      if (entry.expected.route === "CLARIFY") assert.equal(body.answer.plainLanguageSummary, CLARIFICATIONS[entry.expected.clarificationId].question);
    }
  });
}

test("invalid ID·모양·enum·추가 사실·조합·중복은 모두 거부한다", async () => {
  for (const output of [null, [], "DIRECT", {}, { ...DIRECT, serviceIds: ["invented"] }, { ...DIRECT, serviceIds: [] },
    { ...DIRECT, intent: "diagnosis" }, { ...DIRECT, answer: "무조건 지원, 전화 010-9999-9999" },
    { ...DIRECT, serviceIds: [DIRECT.serviceIds[0], DIRECT.serviceIds[0]] }, { ...DIRECT, route: "UNSUPPORTED" },
    { ...DIRECT, route: "CLARIFY", clarificationId: "invented" }, { ...DIRECT, clarificationId: "service_required" }]) {
    const body = result(await run({ query: QUERY }, () => ({ status: "ready", route: async () => output })));
    assert.equal(body.routing?.reason, "invalid_output");
    assert.equal(body.clarification?.id, "service_required");
    assert.deepEqual(body.answer.sources, []);
    assert.doesNotMatch(JSON.stringify(body), /010-9999-9999|무조건 지원|invented/);
  }
});

test("현재 카탈로그 밖 ID는 이전에 존재했던 ID여도 거부한다", async () => {
  const { isIntentRoute } = await import("@/lib/ai/intent-router");
  assert.equal(isIntentRoute(DIRECT, ["seongnam-disabled-taxi-voucher"]), false);
});

test("CLARIFY 후 짧은 답에 직전 문맥을 제공하며 공식 답변을 생성한다", async () => {
  const context = { question: "병원에 동행할 사람이 없어요", clarificationId: "elderly_care_type" as const };
  const body = result(await run({ query: "어르신이에요", context }, () => ({ status: "ready", route: async (input) => {
    assert.deepEqual(input.context, context);
    return DIRECT;
  } })));
  assert.equal(body.kind, "answer");
});

test("확인 질문에 해당하지 않는 과잉 후보는 제거하되 새로운 후보를 만들지 않는다", async () => {
  const expected = ROUTER_EVALUATION_CASES[1].expected;
  const body = result(await run({ query: ROUTER_EVALUATION_CASES[1].question }, () => ({ status: "ready", route: async () => ({
    ...expected, serviceIds: ["seongnam-senior-tailored-care", "seongnam-home-health-care"],
  }) })));
  assert.deepEqual(body.routing?.decision, expected);
  assert.deepEqual(body.answer.sources, []);
});

test("지역 후속 답변과 시설의 다른 구 요청에서도 잘못된 DIRECT를 차단한다", async () => {
  for (const payload of [
    { query: "수정구요", context: { question: "가까운 복지관 알려줘", clarificationId: "region_required" } },
    { query: "수정구 복지관 알려줘" },
  ]) {
    const body = result(await run(payload, () => ({ status: "ready", route: async () => ({ ...DIRECT, serviceIds: ["seongnam-bundang-senior-welfare-center"] }) })));
    assert.equal(body.kind, "unsupported");
    assert.deepEqual(body.answer.sources, []);
  }
});

test("입력/문맥 오류는 AI를 호출하지 않는다", async () => {
  for (const payload of [null, {}, { query: 123 }, { query: " " }, { query: "가".repeat(301) },
    { query: QUERY, context: {} }, { query: QUERY, context: { question: "x", clarificationId: "invented" } },
    { query: QUERY, context: { question: "가".repeat(301), clarificationId: "service_required" } }]) {
    const response = await run(payload, () => { assert.fail("invalid input must not invoke AI"); });
    assert.ok(response.status === 400 || response.status === 413);
  }
});

test("비활성·미설정·설정/제공자 실패는 사실 없는 확인 질문으로 복귀한다", async () => {
  for (const status of ["disabled", "not_configured"] as const) {
    assert.equal(result(await run({ query: QUERY }, () => ({ status }))).routing?.reason, status);
  }
  for (const configure of [() => { throw new Error("private key"); }, () => ({ status: "ready" as const, route: async () => { throw new Error("private provider"); } })]) {
    const body = result(await run({ query: QUERY }, configure));
    assert.equal(body.routing?.reason, "provider_error");
    assert.equal(body.kind, "clarification");
    assert.doesNotMatch(JSON.stringify(body), /private/);
  }
});

test("기존 keyword fallback: 문맥 때문에 AI를 시도한 명시적 제도명은 실패해도 복구한다", async () => {
  const query = "노인맞춤돌봄 신청하고 싶어요";
  const body = result(await run({ query, context: { question: "돌봄", clarificationId: "service_required" } }, () => ({ status: "ready", route: async () => { throw new Error(); } })));
  assert.equal(body.routing?.source, "fallback");
  assert.equal(body.kind, "answer");
  assert.deepEqual(body.answer, map(query, body.results.map((entry) => entry.document)));
});

test("애매한 keyword를 fallback에서 확정하지 않으며 거리 제한은 잘못된 DIRECT도 막는다", async () => {
  const body = result(await run({ query: "다리가 불편해서 버스를 못 타요" }, () => ({ status: "disabled" })));
  assert.equal(body.kind, "clarification");
  assert.deepEqual(body.answer.sources, []);
  for (const query of ["수정구에 가까운 복지관 알려줘", "가까운 복지관 알려줘"]) {
    const guarded = result(await run({ query }, () => ({ status: "ready", route: async () => ({ ...DIRECT, serviceIds: ["seongnam-bundang-senior-welfare-center"] }) })));
    assert.equal(guarded.routing?.source, "guard");
    assert.equal(guarded.kind, query.startsWith("수정") ? "unsupported" : "clarification");
    assert.deepEqual(guarded.answer.sources, []);
  }
});

test("8초 timeout은 abort 후 HTTP 200의 확인 질문으로 연결된다", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let signal: AbortSignal | null | undefined;
  let calls = 0;
  const pending = run({ query: QUERY }, () => createOpenAIIntentRouter(ENV, async (_, init) => {
    calls++; signal = init?.signal; return new Promise(() => {});
  }));
  context.mock.timers.tick(8_000);
  const body = result(await pending);
  assert.equal(body.routing?.reason, "timeout");
  assert.equal(body.kind, "clarification");
  assert.equal(signal?.aborted, true);
  assert.equal(calls, 1);
});

test("Route Handler 통합: DIRECT·CLARIFY·UNSUPPORTED·변조·실패·입력 오류", async () => {
  let output: unknown = DIRECT;
  let status = 200;
  let calls = 0;
  const handler = createPublicInformationSearchHandler((payload) => run(payload, () => createOpenAIIntentRouter(ENV, async () => {
    calls++;
    return Response.json({ status: "completed", output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(output) }] }] }, { status });
  })));
  const send = (body: string) => handler(new Request("http://localhost/api/public-information/search", { method: "POST", headers: { "Content-Type": "application/json" }, body }));
  for (const entry of [DIRECT, ROUTER_EVALUATION_CASES[1].expected, ROUTER_EVALUATION_CASES[8].expected] satisfies IntentRoute[]) {
    output = entry;
    const response = await send(JSON.stringify({ query: QUERY }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal((await response.json()).routing.decision.route, entry.route);
  }
  output = { ...DIRECT, serviceIds: ["invented"] };
  assert.equal((await (await send(JSON.stringify({ query: QUERY }))).json()).routing.reason, "invalid_output");
  status = 500;
  assert.equal((await (await send(JSON.stringify({ query: QUERY }))).json()).routing.reason, "provider_error");
  assert.equal((await send("{")).status, 400);
  assert.equal(calls, 5);
  // 실제 route export도 명확한 keyword에서는 외부 통신하지 않는다.
  const actual = await POST(new Request("http://localhost/api/public-information/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "노인맞춤돌봄 신청" }) }));
  assert.equal((await actual.json()).routing.source, "keyword");
});
