import assert from "node:assert/strict";
import test from "node:test";
import { createSearchRequestLimit } from "./search-request-limit";
import { createPublicInformationSearchHandler } from "./handle-public-information-search";
import { createPublicInformationSearchResponse } from "./create-public-information-search-response";

function request(body = JSON.stringify({ query: "장애인 콜택시" }), headers = {}) {
  return new Request("http://localhost/api/public-information/search", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body,
  });
}

test("분당 30건 허용 후 차단하고 창 만료 시 다시 허용한다", () => {
  let time = 0;
  const limit = createSearchRequestLimit({}, () => time);
  for (let i = 0; i < 30; i++) {
    const lease = limit.acquire();
    assert.ok(lease.allowed);
    lease.release();
  }
  assert.deepEqual(limit.acquire(), { allowed: false, retryAfter: 60 });
  time = 59_001;
  assert.deepEqual(limit.acquire(), { allowed: false, retryAfter: 1 });
  time = 60_000;
  assert.equal(limit.acquire().allowed, true);
});

test("동시 3건 제한은 창 만료로 초기화되지 않고 release는 중복 호출에 안전하다", () => {
  let time = 0;
  const limit = createSearchRequestLimit({}, () => time);
  const leases = [limit.acquire(), limit.acquire(), limit.acquire()];
  assert.deepEqual(limit.acquire(), { allowed: false, retryAfter: 1 });
  time = 60_000;
  assert.equal(limit.acquire().allowed, false);
  const first = leases[0];
  assert.ok(first.allowed);
  first.release();
  first.release();
  assert.equal(limit.acquire().allowed, true);
  assert.equal(limit.acquire().allowed, false);
});

test("429와 Retry-After를 반환하고 IP 헤더를 바꿔도 검색/AI에 도달하지 않는다", async () => {
  let calls = 0;
  const post = createPublicInformationSearchHandler(async (payload) => {
    calls++;
    return createPublicInformationSearchResponse(payload);
  }, createSearchRequestLimit({ maxRequests: 1 }));
  const success = await post(request());
  assert.equal(success.status, 200);
  assert.equal(success.headers.get("cache-control"), "no-store");
  const blocked = await post(request(undefined, { "x-forwarded-for": "1.2.3.4" }));
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json()).error.code, "rate_limited");
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  assert.equal(blocked.headers.get("cache-control"), "no-store");
  assert.equal(calls, 1);
});

test("진행 중 요청은 동시 제한을 점유하고 완료/실패 후 해제한다", async () => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  const post = createPublicInformationSearchHandler(async () => {
    await pending;
    throw new Error("private provider detail");
  }, createSearchRequestLimit({ maxConcurrent: 1 }));
  const first = post(request());
  assert.equal((await post(request())).status, 429);
  finish();
  const failed = await first;
  assert.equal(failed.status, 500);
  assert.ok(!(await failed.text()).includes("private"));
  assert.equal((await post(request())).status, 500);
});

test("과대 본문·JSON 이외 요청·잘못된 JSON은 검색/AI 호출 전 거부한다", async () => {
  const post = createPublicInformationSearchHandler(async () => { assert.fail("service must not run"); });
  assert.equal((await post(request("{", { "content-length": "5000" }))).status, 413);
  // UTF-8 실제 바이트 제한이며 Content-Length를 신뢰하지 않는다.
  assert.equal((await post(request(JSON.stringify({ query: "가".repeat(1500) }), { "content-length": "1" }))).status, 413);
  assert.equal((await post(request("{}", { "content-type": "text/plain" }))).status, 415);
  assert.equal((await post(request("{"))).status, 400);
});

test("느린 본문은 5초 후 중단하고 슬롯을 해제한다", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let cancelled = false;
  const post = createPublicInformationSearchHandler(async () => { assert.fail("service must not run"); }, createSearchRequestLimit({ maxConcurrent: 1 }));
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const pending = post(new Request("http://localhost", {
    method: "POST", headers: { "Content-Type": "application/json" }, body,
    duplex: "half",
  } as RequestInit));
  context.mock.timers.tick(5_000);
  assert.equal((await pending).status, 408);
  assert.equal(cancelled, true);
  assert.equal((await post(request("{"))).status, 400);
});
