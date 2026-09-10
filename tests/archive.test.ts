import assert from "node:assert/strict";
import test from "node:test";
import { createOpenAIIntentRouter } from "../src/lib/ai/openai-intent-router";
import { createOpenAIAnswerGenerator } from "../src/lib/ai/openai-answer-generator";
import { createOfficialSearchProvider } from "../src/lib/search/openai-official-search";
import { createRuntimeSearchBudget } from "../src/lib/search/shared-search-budget";
import { fetchOfficialSource } from "../src/lib/search/fetch-official-source";
import { assertVoiceCareActive } from "../src/lib/archive";
import { POST } from "../src/app/api/public-information/search/route";
import { proxy } from "../src/proxy";

test("archive cannot be reactivated by credentials, flags, or injected dependencies", async () => {
  let calls = 0;
  const blockedFetch: typeof fetch = async () => { calls++; throw new Error("unexpected outbound request"); };
  const env = {
    PUBLIC_INFORMATION_AI_ENABLED: "true", PUBLIC_INFORMATION_WEB_SEARCH_ENABLED: "true",
    OPENAI_API_KEY: "fake-test-key", OPENAI_MODEL: "fake-test-model",
    UPSTASH_REDIS_REST_URL: "https://fake-test.upstash.io", UPSTASH_REDIS_REST_TOKEN: "fake-test-token",
    PUBLIC_INFORMATION_SEARCH_DAILY_USD: "3", VERCEL: "1", NODE_ENV: "production",
  };
  assert.equal(createOpenAIIntentRouter(env, blockedFetch).status, "disabled");
  assert.equal(createOpenAIAnswerGenerator(env, blockedFetch).status, "disabled");
  const provider = createOfficialSearchProvider(env, blockedFetch,
    async () => { calls++; throw new Error("unexpected source request"); },
    () => { calls++; return { allowed: true, release() { calls++; } }; });
  assert.equal((await provider.search("성남시 여권 신청", AbortSignal.timeout(1000))).status, "disabled");
  assert.deepEqual(await createRuntimeSearchBudget(env, blockedFetch)(3), { allowed: false, reason: "budget_limited" });
  assert.throws(assertVoiceCareActive, /VOICECARE_ARCHIVED/);
  await assert.rejects(fetchOfficialSource("https://www.seongnam.go.kr/", AbortSignal.timeout(1000)), /VOICECARE_ARCHIVED/);
  assert.equal(calls, 0, "OpenAI, Redis, source and budget callbacks must never run");
});

test("direct API entry and proxy return inert, uncached 410 responses", async () => {
  const savedFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error("unexpected outbound request"); };
  try {
    const response = await POST(new Request("http://localhost/api/public-information/search", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: '{"query":"성남시 여권 신청"}',
    }));
    assert.equal(response.status, 410);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const boundary = proxy();
    assert.equal(boundary.status, 410);
    assert.match(boundary.headers.get("content-security-policy")!, /default-src 'none'/);
    assert.doesNotMatch(await boundary.text(), /<script|<link|<img/);
    assert.equal(calls, 0);
  } finally { globalThis.fetch = savedFetch; }
});
