import { expect, test, type Page } from "@playwright/test";
import { createPublicInformationSearchResponse } from "../../src/lib/search/create-public-information-search-response";
import { generatePublicInformationAnswer } from "../../src/lib/ai/generate-public-information-answer";
import type { PublicInformationSearchResponse } from "../../src/types/public-information-search";

const QUERY = "장애인 콜택시 이용하려면 어떻게 해야 해?";
function fixture(query = QUERY): PublicInformationSearchResponse {
  const response = createPublicInformationSearchResponse({ query });
  if (!("results" in response.body)) throw new Error("Invalid fixture");
  return response.body;
}
async function submit(page: Page, query = QUERY) {
  await page.getByRole("textbox", { name: "글자로 질문하기" }).fill(query);
  await page.getByRole("textbox", { name: "글자로 질문하기" }).press("Enter");
}

test("생성 답변을 키보드로 요청하고 원문·출처·확인일·상태를 보존한다", async ({ page }) => {
  const search = fixture();
  const generated = await generatePublicInformationAnswer(search, async () => ({ introduction: "friendly", layout: "document_sections" }));
  await page.route("**/api/public-information/search", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ query: QUERY });
    await route.fulfill({ json: { ...search, ...generated } });
  });
  await page.goto("/");
  await submit(page);
  const answer = page.getByRole("region", { name: "공식 자료 안내", exact: true });
  await expect(answer.getByText(generated.answer.plainLanguageSummary, { exact: true })).toBeVisible();
  await expect(answer.getByRole("status")).toContainText("안내가 준비되었습니다");
  await expect(answer).not.toContainText("constrained_presentation");
  await expect(answer).not.toContainText("answerGeneration");
  await expect(answer).not.toContainText("검색 점수");
  for (const source of generated.answer.sources) {
    const link = answer.getByRole("link", { name: `${source.title} (새 창)`, exact: true });
    await expect(link).toHaveAttribute("href", source.url);
    await link.focus();
    await expect(link).toBeFocused();
    const item = link.locator("..");
    await expect(item).toContainText(source.organizationName);
    await expect(item).toContainText(source.checkedAt?.slice(0, 10) ?? "미확인");
    await expect(item).toContainText("최신성 미확인");
    await expect(item).toContainText("안내에 사용 중");
  }
  await expect(answer).toContainText("일부 정보의 최신성을 추가로 확인해야 합니다");
});

test("AI 비활성 상태의 실제 API 답변도 UI에 표시한다", async ({ page }) => {
  await page.goto("/");
  const response = page.waitForResponse("**/api/public-information/search");
  await submit(page);
  const body = await (await response).json();
  expect(body.answerGeneration).toEqual({ status: "skipped", reason: "disabled" });
  await expect(page.getByText(body.answer.plainLanguageSummary, { exact: true })).toBeVisible();
});

test("AI 실패 fallback을 정상 안내로 표시하며 내부 오류를 노출하지 않는다", async ({ page }) => {
  const search = fixture();
  const fallback = await generatePublicInformationAnswer(search, async () => { throw new Error("private-provider-error"); });
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: { ...search, ...fallback } }));
  await page.goto("/");
  await submit(page);
  await expect(page.getByText(search.answer.plainLanguageSummary, { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "공식 자료 안내", exact: true })).not.toContainText(/provider_error|private-provider-error|fallback/);
});

test("빈 결과, 확인일 null 및 알 수 없는 최신성을 분명히 안내한다", async ({ page }) => {
  const search = fixture("프로야구 경기 일정");
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: search }));
  await page.goto("/");
  await submit(page, "프로야구 경기 일정");
  await expect(page.getByRole("status")).toContainText("관련 정보를 찾지 못했습니다");
  await expect(page.getByText("확인일: 미확인", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "공식 자료 안내", exact: true }).getByRole("link")).toHaveCount(0);
});

test("로딩·서버 오류·429 안내를 상태 영역으로 전달하며 다시 질문할 수 있다", async ({ page }) => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/public-information/search", async (route) => {
    await wait;
    await route.fulfill({ status: 500, json: { error: { code: "internal_error" } } });
  });
  await page.goto("/");
  await submit(page);
  await expect(page.getByRole("status")).toContainText("안내를 준비하고 있습니다");
  await expect(page.getByRole("button", { name: "공식 자료 검색 중" })).toBeDisabled();
  release();
  await expect(page.getByRole("status")).toContainText("검색 중 문제가 생겼습니다");
  await page.unroute("**/api/public-information/search");
  await page.route("**/api/public-information/search", (route) => route.fulfill({ status: 429, headers: { "Retry-After": "12" }, json: {} }));
  await submit(page);
  await expect(page.getByRole("status")).toContainText("약 12초 후");
  await expect(page.getByRole("button", { name: "질문 보내기" })).toBeEnabled();
});

test("입력 변경으로 취소된 요청의 결과를 표시하지 않는다", async ({ page }) => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/public-information/search", async (route) => {
    await wait;
    await route.fulfill({ json: fixture() });
  });
  await page.goto("/");
  await submit(page);
  await expect(page.getByRole("status")).toContainText("안내를 준비하고 있습니다");
  await page.getByRole("textbox").fill("새 질문");
  release();
  await expect(page.getByRole("status")).toContainText("질문하면 관련 공식 자료와 출처");
  await expect(page.getByRole("region", { name: "공식 자료 안내", exact: true }).getByRole("link")).toHaveCount(0);
});

test("본문의 HTML을 실행하지 않고 텍스트로 표시한다", async ({ page }) => {
  const search = fixture();
  search.answer.plainLanguageSummary = '<img src=x onerror="alert(1)">';
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: search }));
  await page.goto("/");
  await submit(page);
  await expect(page.getByText(search.answer.plainLanguageSummary, { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "공식 자료 안내", exact: true }).locator("img")).toHaveCount(0);
});

test("생성 상태라도 미확인 날짜와 재검토·변경 가능성 표시를 유지한다", async ({ page }) => {
  const search = fixture();
  search.answerGeneration = { status: "generated", mode: "constrained_presentation" };
  search.answer.verification = { status: "unverified", checkedAt: null, details: "최신 자료인지 확인이 필요합니다." };
  search.answer.sources = [{ ...search.answer.sources[0], checkedAt: null, documentStatus: "review_required", freshnessStatus: "possibly_outdated" }];
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: search }));
  await page.goto("/");
  await submit(page);
  const answer = page.getByRole("region", { name: "공식 자료 안내", exact: true });
  await expect(answer.getByText("확인일: 미확인", { exact: true })).toHaveCount(2);
  await expect(answer).toContainText("재검토 필요");
  await expect(answer).toContainText("변경 가능성 있음");
  await expect(answer).toContainText("자료의 확인 상태를 추가로 확인해야 합니다");
  await expect(answer).not.toContainText("공식 자료 확인됨");
});

test("15초 네트워크 지연 후 로딩을 해제하고 재시도를 안내한다", async ({ page }) => {
  await page.goto("/");
  await page.clock.install();
  await page.route("**/api/public-information/search", () => {});
  await submit(page);
  await expect(page.getByRole("status")).toContainText("안내를 준비하고 있습니다");
  await page.clock.fastForward(15_000);
  await expect(page.getByRole("status")).toContainText("응답이 지연되고 있습니다");
  await expect(page.getByRole("button", { name: "질문 보내기" })).toBeEnabled();
});

test("손상된 성공 응답은 화면을 깨뜨리지 않고 텍스트 재시도로 복구한다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: { results: [], hasResults: true, answer: {} } }));
  await page.goto("/");
  await submit(page);
  await expect(page.getByRole("status")).toContainText("검색 중 문제가 생겼습니다");
  await page.unroute("**/api/public-information/search");
  await submit(page);
  await expect(page.getByRole("status")).toContainText("안내가 준비되었습니다");
  expect(errors).toEqual([]);
});

test("같은 이벤트 턴의 중복 제출도 API를 한 번만 호출한다", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/public-information/search", () => { requests++; });
  await page.goto("/");
  await page.getByRole("textbox").fill(QUERY);
  await page.locator("form").evaluate((form: HTMLFormElement) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await expect.poll(() => requests).toBe(1);
  await page.getByRole("textbox").fill("새 질문");
  expect(requests).toBe(1);
});

test("네트워크 실패 후 동일 텍스트 질문을 다시 보낼 수 있다", async ({ page }) => {
  await page.route("**/api/public-information/search", (route) => route.abort("internetdisconnected"));
  await page.goto("/");
  await submit(page);
  await expect(page.getByRole("status")).toContainText("검색 중 문제가 생겼습니다");
  await page.unroute("**/api/public-information/search");
  await page.getByRole("button", { name: "질문 보내기" }).click();
  await expect(page.getByRole("status")).toContainText("안내가 준비되었습니다");
});

test("응답 헤더 뒤 본문이 멈춰도 15초 후 텍스트 재시도가 가능하다", async ({ page }) => {
  await page.goto("/");
  await page.clock.install();
  await page.evaluate(() => {
    const original = window.fetch;
    let first = true;
    window.fetch = async (...args) => {
      if (!first) return original(...args);
      first = false;
      const signal = args[1]?.signal;
      return new Response(new ReadableStream({
        start(controller) {
          signal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")), { once: true });
        },
      }), { headers: { "Content-Type": "application/json" } });
    };
  });
  await submit(page);
  await page.clock.fastForward(15_000);
  await expect(page.getByRole("status")).toContainText("응답이 지연되고 있습니다");
  await page.getByRole("button", { name: "질문 보내기" }).click();
  await expect(page.getByRole("status")).toContainText("안내가 준비되었습니다");
});

test("대표 돌봄 질문의 실제 API·출처 바로가기·모바일 표시를 확인한다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const query = "노인맞춤돌봄서비스 신청하려면 어떻게 해야 하나요?";
  const response = page.waitForResponse("**/api/public-information/search");
  await submit(page, query);
  const body = await (await response).json();
  expect(body.results[0].document.id).toBe("seongnam-senior-tailored-care");
  await expect(page.getByText(body.answer.plainLanguageSummary, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /출처 .*건과 확인 상태 보기/ }).click();
  await expect(page.locator("#answer-sources")).toBeInViewport();
  await expect(page.getByRole("link", { name: "노인맞춤돌봄서비스 (새 창)", exact: true })).toHaveAttribute("href", "https://www.seongnam.go.kr/wf-pm020101/22001");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await page.getByRole("textbox").boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(48);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  }
  expect(errors).toEqual([]);
});
