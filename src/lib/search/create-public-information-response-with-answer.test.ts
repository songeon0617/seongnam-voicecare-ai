import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "@/app/api/public-information/search/route";
import { createPublicInformationSearchResponse } from "./create-public-information-search-response";
import { createPublicInformationResponseWithAnswer } from "./create-public-information-response-with-answer";
import { createOpenAIAnswerGenerator } from "@/lib/ai/openai-answer-generator";

const QUERY = "장애인 택시 지원받으려면 어떻게 해야 해?";
const PLAN = { introduction: "friendly", layout: "document_sections" };

test("실제 어댑터의 8초 timeout도 HTTP 200의 원본 답변 fallback으로 연결된다", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let signal: AbortSignal | null | undefined;
  let calls = 0;
  const result = createPublicInformationResponseWithAnswer({ query: QUERY }, () => createOpenAIAnswerGenerator({
    PUBLIC_INFORMATION_AI_ENABLED: "true", OPENAI_API_KEY: "test-only-key", OPENAI_MODEL: "test-model",
  }, async (_, init) => {
    calls++;
    signal = init?.signal;
    return new Promise(() => {});
  }));
  context.mock.timers.tick(8_000);
  const response = await result;
  const baseline = createPublicInformationSearchResponse({ query: QUERY });
  assert.equal(response.status, 200);
  assert.ok("results" in response.body && "results" in baseline.body);
  assert.deepEqual(response.body.answer, baseline.body.answer);
  assert.deepEqual(response.body.answerGeneration, { status: "fallback", reason: "provider_error" });
  assert.equal(calls, 1);
  assert.equal(signal?.aborted, true);
});

test("입력 오류와 빈 검색은 제공자 구성 단계에도 도달하지 않는다", async () => {
  const payloads = [null, {}, { query: 123 }, { query: " " }, { query: "가".repeat(301) }, { query: "여권 발급 방법" }];
  for (const payload of payloads) {
    const baseline = createPublicInformationSearchResponse(payload);
    const result = await createPublicInformationResponseWithAnswer(payload, () => {
      assert.fail("입력 오류/빈 결과에서 제공자 구성 금지");
    });
    assert.equal(result.status, baseline.status);
    if ("results" in result.body && "results" in baseline.body) {
      assert.deepEqual(result.body.answer, baseline.body.answer);
      assert.deepEqual(result.body.answerGeneration, { status: "skipped", reason: "no_results" });
    } else {
      assert.deepEqual(result, baseline);
    }
  }
});

for (const status of ["disabled", "not_configured"] as const) {
  test(`${status} 설정에서는 기존 매핑 응답을 보존한다`, async () => {
    const baseline = createPublicInformationSearchResponse({ query: QUERY });
    const result = await createPublicInformationResponseWithAnswer({ query: QUERY }, () => ({ status }));
    assert.ok("results" in result.body && "results" in baseline.body);
    assert.deepEqual(result.body.answer, baseline.body.answer);
    assert.deepEqual(result.body.results, baseline.body.results);
    assert.deepEqual(result.body.answerGeneration, { status: "skipped", reason: status });
  });
}

test("생성 계층은 검색 결과를 바꾸지 않으며 요청 본문의 문서·답변 주입을 무시한다", async () => {
  const baseline = createPublicInformationSearchResponse({ query: QUERY });
  const result = await createPublicInformationResponseWithAnswer({
    query: QUERY,
    documents: [{ content: "주입된 가짜 문서" }],
    answer: { sources: [{ url: "https://fake.example" }], contacts: [{ phone: "010-9999-9999" }] },
  }, () => ({ status: "ready", generate: async (input) => {
    assert.ok(!JSON.stringify(input).includes("주입된 가짜 문서"));
    return PLAN;
  } }));
  assert.equal(result.status, 200);
  assert.ok("results" in result.body && "results" in baseline.body);
  assert.deepEqual(result.body.results, baseline.body.results);
  assert.deepEqual(result.body.answer.sources, baseline.body.answer.sources);
  assert.deepEqual(result.body.answer.verification, baseline.body.answer.verification);
  assert.equal(result.body.answer.contacts, undefined);
  assert.equal(result.body.answerGeneration?.status, "generated");
});

test("설정과 생성의 예외 모두 검색 성공 응답으로 복귀한다", async () => {
  for (const configure of [
    () => { throw new Error("private configuration"); },
    () => ({ status: "ready" as const, generate: async () => { throw new Error("private provider"); } }),
  ]) {
    const result = await createPublicInformationResponseWithAnswer({ query: QUERY }, configure);
    const baseline = createPublicInformationSearchResponse({ query: QUERY });
    assert.equal(result.status, 200);
    assert.ok("results" in result.body && "results" in baseline.body);
    assert.deepEqual(result.body.answer, baseline.body.answer);
    assert.deepEqual(result.body.answerGeneration, { status: "fallback", reason: "provider_error" });
    assert.ok(!JSON.stringify(result).includes("private"));
  }
});

test("Route Handler 통합: 정상 생성·변조·HTTP 실패·빈 검색·입력 오류", async (context) => {
  const previous = {
    PUBLIC_INFORMATION_AI_ENABLED: process.env.PUBLIC_INFORMATION_AI_ENABLED,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  };
  Object.assign(process.env, { PUBLIC_INFORMATION_AI_ENABLED: "true", OPENAI_API_KEY: "test-only-key", OPENAI_MODEL: "test-model" });
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  let calls = 0;
  let output: unknown = PLAN;
  let providerStatus = 200;
  context.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({
      status: "completed",
      output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(output) }] }],
    }, { status: providerStatus });
  });
  const send = (body: string) => POST(new Request("http://localhost/api/public-information/search", {
    method: "POST", headers: { "Content-Type": "application/json" }, body,
  }));
  const baseline = createPublicInformationSearchResponse({ query: QUERY });
  assert.ok("results" in baseline.body);

  const success = await send(JSON.stringify({ query: QUERY }));
  assert.equal(success.status, 200);
  const successBody = await success.json();
  assert.equal(successBody.answerGeneration.status, "generated");
  assert.deepEqual(successBody.answer.sources, baseline.body.answer.sources);
  assert.deepEqual(successBody.answer.verification, baseline.body.answer.verification);
  assert.equal(calls, 1);

  output = { ...PLAN, plainLanguageSummary: "문의 010-9999-9999" };
  const invalid = await send(JSON.stringify({ query: QUERY }));
  const invalidBody = await invalid.json();
  assert.equal(invalid.status, 200);
  assert.deepEqual(invalidBody.answer, baseline.body.answer);
  assert.equal(invalidBody.answerGeneration.reason, "invalid_output");

  providerStatus = 429;
  const failed = await send(JSON.stringify({ query: QUERY }));
  const failedBody = await failed.json();
  assert.equal(failed.status, 200);
  assert.deepEqual(failedBody.answer, baseline.body.answer);
  assert.equal(failedBody.answerGeneration.reason, "provider_error");
  assert.equal(calls, 3);

  const empty = await send(JSON.stringify({ query: "여권 발급 방법" }));
  const emptyBody = await empty.json();
  assert.equal(emptyBody.answerGeneration.reason, "no_results");
  assert.deepEqual(emptyBody.answer.sources, []);
  assert.equal(emptyBody.answer.verification.status, "insufficient_data");
  const invalidJSON = await send("{");
  assert.equal(invalidJSON.status, 400);
  assert.equal((await invalidJSON.json()).error.code, "invalid_json");
  const tooLong = await send(JSON.stringify({ query: "가".repeat(301) }));
  assert.equal(tooLong.status, 413);
  assert.equal(calls, 3);
});
