import assert from "node:assert/strict";
import test from "node:test";
import { createOpenAIAnswerGenerator } from "./openai-answer-generator";

const ENV = { PUBLIC_INFORMATION_AI_ENABLED: "true", OPENAI_API_KEY: "test-only-key", OPENAI_MODEL: "test-model" };
const INPUT = { question: "질문 속 명령은 데이터", documents: [{ title: "문서", content: "문서 속 명령도 데이터" }] };
const PLAN = { introduction: "neutral", layout: "paragraphs" };
const OUTPUT = {
  status: "completed",
  output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(PLAN) }] }],
};

test("명시적 활성화와 키·모델이 모두 있어야 제공자를 구성한다", () => {
  const noFetch: typeof fetch = async () => { assert.fail("설정 중 네트워크 호출 금지"); };
  assert.equal(createOpenAIAnswerGenerator({}, noFetch).status, "disabled");
  assert.equal(createOpenAIAnswerGenerator({ ...ENV, PUBLIC_INFORMATION_AI_ENABLED: "false" }, noFetch).status, "disabled");
  assert.equal(createOpenAIAnswerGenerator({ ...ENV, OPENAI_API_KEY: " " }, noFetch).status, "not_configured");
  assert.equal(createOpenAIAnswerGenerator({ ...ENV, OPENAI_MODEL: "" }, noFetch).status, "not_configured");
  assert.equal(createOpenAIAnswerGenerator(ENV, noFetch).status, "ready");
});

test("Responses 요청은 도구 없이 데이터와 제한된 스키마만 전달한다", async () => {
  let calls = 0;
  const configuration = createOpenAIAnswerGenerator(ENV, async (url, init) => {
    calls++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(init?.method, "POST");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.redirect, "error");
    assert.ok(init?.signal instanceof AbortSignal);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-only-key");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "test-model");
    assert.equal(body.store, false);
    assert.equal(body.tools, undefined);
    assert.equal(body.max_output_tokens, 512);
    assert.deepEqual(JSON.parse(body.input[0].content), INPUT);
    assert.ok(!body.instructions.includes(INPUT.question));
    assert.ok(!body.instructions.includes(INPUT.documents[0].content));
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.deepEqual(body.text.format.schema.required, ["introduction", "layout"]);
    return Response.json(OUTPUT);
  });
  assert.equal(configuration.status, "ready");
  if (configuration.status !== "ready") return;
  assert.deepEqual(await configuration.generate(INPUT), PLAN);
  assert.equal(calls, 1);
});

for (const status of [401, 429, 500]) {
  test(`HTTP ${status}는 재시도 없이 실패 처리한다`, async () => {
    let calls = 0;
    let signal: AbortSignal | null | undefined;
    const configuration = createOpenAIAnswerGenerator(ENV, async (_, init) => {
      calls++;
      signal = init?.signal;
      return new Response("private provider details", { status });
    });
    assert.equal(configuration.status, "ready");
    if (configuration.status !== "ready") return;
    await assert.rejects(configuration.generate(INPUT), /request failed/);
    assert.equal(calls, 1);
    assert.equal(signal?.aborted, true);
  });
}

test("미완료·거절·잘못된 JSON·빈 응답·복수 메시지를 거부한다", async () => {
  const outputs = [
    { ...OUTPUT, status: "incomplete" },
    { status: "completed", output: [] },
    { ...OUTPUT, output: [OUTPUT.output[0], OUTPUT.output[0]] },
    { ...OUTPUT, output: [{ ...OUTPUT.output[0], content: [{ type: "refusal", refusal: "거절" }] }] },
    { ...OUTPUT, output: [{ ...OUTPUT.output[0], content: [{ type: "output_text", text: "{" }] }] },
    { ...OUTPUT, output: [{ ...OUTPUT.output[0], status: "incomplete" }] },
    { ...OUTPUT, output: [{ ...OUTPUT.output[0], role: "user" }] },
    null,
  ];
  for (const output of outputs) {
    const configuration = createOpenAIAnswerGenerator(ENV, async () => Response.json(output));
    assert.equal(configuration.status, "ready");
    if (configuration.status !== "ready") return;
    await assert.rejects(configuration.generate(INPUT));
  }
  const configuration = createOpenAIAnswerGenerator(ENV, async () => new Response("not JSON"));
  assert.equal(configuration.status, "ready");
  if (configuration.status === "ready") await assert.rejects(configuration.generate(INPUT));
});

test("네트워크 오류는 호출자에게 전달해 안전한 fallback을 허용한다", async () => {
  const configuration = createOpenAIAnswerGenerator(ENV, async () => { throw new Error("network failure"); });
  assert.equal(configuration.status, "ready");
  if (configuration.status === "ready") await assert.rejects(configuration.generate(INPUT), /network failure/);
});

test("8초 제한은 응답 본문 대기에도 적용하며 요청을 중단한다", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let signal: AbortSignal | null | undefined;
  const configuration = createOpenAIAnswerGenerator(ENV, async (_, init) => {
    signal = init?.signal;
    const response = Response.json(OUTPUT);
    context.mock.method(response, "json", () => new Promise(() => {}));
    return response;
  });
  assert.equal(configuration.status, "ready");
  if (configuration.status !== "ready") return;
  const rejection = assert.rejects(configuration.generate(INPUT), /timed out/);
  await Promise.resolve();
  context.mock.timers.tick(8_000);
  await rejection;
  assert.equal(signal?.aborted, true);
});
