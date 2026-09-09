import { expect, test, type Page } from "@playwright/test";
import { createPublicInformationSearchResponse } from "../../src/lib/search/create-public-information-search-response";
import { generatePublicInformationAnswer } from "../../src/lib/ai/generate-public-information-answer";
import type { PublicInformationSearchResponse } from "../../src/types/public-information-search";
import { CLARIFICATIONS, type ClarificationId } from "../../src/types/public-information-router";
import { SAFETY_GUIDANCE } from "../../src/types/public-information-safety";

const QUERY = "장애인 콜택시 이용하려면 어떻게 해야 해?";
test("지원 분야에서 검증 질문을 고르면 기존 검색 흐름으로 바로 실행한다", async ({ page }) => {
  const query = "중원구보건소 치매안심센터 연락처가 어떻게 되나요?";
  let payload: unknown;
  await page.route("**/api/public-information/search", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: fixture(query) });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", {name:"지원 분야",exact:true})).toBeVisible();

  const healthCategory = page.getByRole("button", { name: "건강", exact: true });
  await expect(healthCategory).toHaveAttribute("aria-pressed", "false");
  await healthCategory.click();
  await expect(healthCategory).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "건강에서 찾기" })).toBeVisible();

  await page.getByRole("button", { name: "치매", exact: true }).click();
  await expect(page.locator("#question")).toHaveValue(query);
  await expect(page.getByRole("status")).toContainText("안내가 준비되었습니다");
  expect(payload).toEqual({ query });
});

test("종합 안내의 분리된 공식 근거도 실제 API에서 링크로 표시한다", async ({ page }) => {
  await page.goto("/");
  await submit(page, "장애인 보조기구·보장구 지원");
  await expect(page.getByRole("link", { name: "추가 근거: 장애인 보장구 지원 (새 창)" }))
    .toHaveAttribute("href", "https://www.seongnam.go.kr/wf-pm020101/23004");
});
function fixture(query = QUERY): PublicInformationSearchResponse {
  const response = createPublicInformationSearchResponse({ query });
  if (!("results" in response.body)) throw new Error("Invalid fixture");
  return response.body;
}

function clarificationFixture(id: ClarificationId = "mobility_vehicle_or_fare"): PublicInformationSearchResponse {
  const search = fixture("자료 없는 질문");
  return { ...search, results: [], hasResults: false, kind: "clarification", clarification: { id },
    answer: { ...search.answer, plainLanguageSummary: CLARIFICATIONS[id].question,
      sources: [], steps: [], nextAction: null, eligibility: undefined,
      verification: { status: "insufficient_data", checkedAt: null } } };
}

test("확인 질문은 사실 없이 표시하고 짧은 후속 답에 직전 문맥을 전달한다", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/public-information/search", async (route) => {
    calls++;
    if (calls === 1) await route.fulfill({ json: clarificationFixture() });
    else {
      expect(route.request().postDataJSON()).toEqual({ query: "차량이 필요해요", context: { question: "장애인 택시 지원 있어?", clarificationId: "mobility_vehicle_or_fare" } });
      await route.fulfill({ json: fixture() });
    }
  });
  await page.goto("/");
  await submit(page, "장애인 택시 지원 있어?");
  await expect(page.getByText(CLARIFICATIONS.mobility_vehicle_or_fare.question, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "특별교통수단 운영 안내", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue("");
  const clarification = page.getByRole("region", { name: "핵심 안내", exact: true });
  await expect(clarification.getByRole("button", { name: "답변 듣기" })).toHaveCount(0);
  await expect(clarification.getByRole("link")).toHaveCount(0);
  await expect(clarification.getByText(/출처/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "자료에 안내된 대상" })).toHaveCount(0);
  await submit(page, "차량이 필요해요");
  await expect(page.getByRole("status")).toContainText("안내가 준비되었습니다");
  expect(calls).toBe(2);
});

test("자유입력 확인 질문은 모름·새 질문 선택과 사실 없는 상태를 제공한다", async ({ page }) => {
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: clarificationFixture("service_required") }));
  await page.goto("/");
  await submit(page, "성남시 복지 지원은 뭐가 있어요?");
  await expect(page.getByRole("status")).toHaveText("도움의 종류를 확인해 주세요. 입력란에 답해 주세요.");
  const question = page.getByText(CLARIFICATIONS.service_required.question, { exact: true });
  await expect(question).toBeVisible();
  await expect(question.locator("..").getByRole("button")).toHaveCount(2);
  await expect(question.locator("..").getByRole("button", {name:"잘 모르겠어요"})).toBeVisible();
  const clarification = page.getByRole("region", { name: "핵심 안내", exact: true });
  await expect(clarification.getByRole("button", { name: "답변 듣기" })).toHaveCount(0);
  await expect(clarification.getByRole("link")).toHaveCount(0);
  await expect(clarification.getByText(/출처/)).toHaveCount(0);
});

test("고정 선택지는 직전 문맥을 보내고 새 질문 버튼은 이전 문맥을 비운다", async ({ page }) => {
  const payloads: unknown[] = [];
  await page.route("**/api/public-information/search", async (route) => {
    payloads.push(route.request().postDataJSON());
    await route.fulfill({ json: clarificationFixture() });
  });
  await page.goto("/");
  await submit(page, "장애인 택시 지원 있어?");
  await page.getByRole("button", { name: "특별교통수단 운영 안내", exact: true }).click();
  await expect.poll(() => payloads.length).toBe(2);
  expect(payloads[1]).toEqual({ query: "특별교통수단 운영 안내", context: {question:"장애인 택시 지원 있어?",clarificationId:"mobility_vehicle_or_fare"} });
  await page.getByRole("button", { name: "새 질문하기" }).click();
  await submit(page, "긴급복지지원 신청");
  await expect.poll(() => payloads.length).toBe(3);
  expect(payloads[2]).toEqual({ query: "긴급복지지원 신청" });
});

test("미지원 안내는 사실·출처 없이 표시하고 다시 질문할 수 있다", async ({ page }) => {
  const search = clarificationFixture();
  const message = "현재 등록된 성남시 공식 서비스 자료 범위에서는 이 요청을 지원하지 않습니다. 다른 도움이 필요하면 다시 질문해 주세요.";
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: {
    ...search, kind: "unsupported", clarification: undefined, answer: { ...search.answer, plainLanguageSummary: message },
  } }));
  await page.goto("/");
  await submit(page, "오늘 점심 메뉴 추천해줘");
  await expect(page.getByRole("status")).toHaveText(message);
  const unsupported = page.getByRole("region", { name: "핵심 안내", exact: true });
  await expect(unsupported.getByText(message, { exact: true })).toHaveCount(1);
  await expect(unsupported.getByRole("button", { name: "답변 듣기" })).toHaveCount(0);
  await expect(unsupported.getByRole("link")).toHaveCount(0);
  await expect(unsupported.getByText(/출처/)).toHaveCount(0);
  await page.unroute("**/api/public-information/search");
  await submit(page, "노인맞춤돌봄 신청하고 싶어요");
  await expect(page.getByRole("status")).toContainText("안내가 준비되었습니다");
});

test("safety 응답은 일반 카드와 구분하고 직접 전화 링크를 표시한다", async ({ page }) => {
  const search = fixture("자료 없는 질문");
  const guidance = SAFETY_GUIDANCE.self_harm_immediate;
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: {
    ...search, results: [], hasResults: false, kind: "safety",
    safety: { category: "self_harm_immediate", phoneNumbers: [...guidance.phoneNumbers], requiresUserAction: true },
    answer: { ...search.answer, title: guidance.title, plainLanguageSummary: guidance.summary,
      sources: [], steps: [], nextAction: null, eligibility: undefined,
      verification: { status: "insufficient_data", checkedAt: null } },
  } }));
  await page.goto("/");
  await submit(page, "죽고 싶어요");
  const answer = page.getByRole("region", { name: "긴급 안전 안내", exact: true });
  await expect(answer.getByRole("alert")).toContainText(guidance.summary);
  for (const phone of guidance.phoneNumbers) {
    await expect(answer.getByRole("link", { name: `${phone} 전화하기` })).toHaveAttribute("href", `tel:${phone}`);
  }
  await expect(answer).toContainText("자동으로 전화하거나 신고하지 않습니다");
  await expect(answer.getByRole("button", { name: "답변 듣기" })).toBeVisible();
});
async function submit(page: Page, query = QUERY) {
  if(await page.getByRole("button", {name:"다시 질문",exact:true}).isVisible()) await page.getByRole("button", {name:"다시 질문",exact:true}).click();
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
  const answer = page.getByRole("region", { name: "핵심 안내", exact: true });
  await expect(page.getByRole("status")).toContainText("안내가 준비되었습니다");
  const answerDetails = page.getByText("자세한 내용 보기", { exact: true });
  if (await answerDetails.count()) await answerDetails.click();
  await expect(answer.getByText(generated.answer.plainLanguageSummary, { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("안내가 준비되었습니다");
  await expect(answer.getByRole("button", { name: "답변 듣기" })).toBeVisible();
  await expect(answer).toContainText("출처와 확인 상태도 확인해 주세요");
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

test("명확한 keyword의 실제 API는 AI 호출 없이 UI에 표시한다", async ({ page }) => {
  await page.goto("/");
  const response = page.waitForResponse("**/api/public-information/search");
  await submit(page);
  const body = await (await response).json();
  expect(body.answerGeneration).toEqual({ status: "skipped", reason: "deterministic" });
  expect(body.routing.source).toBe("keyword");
  if (await page.getByText("자세한 내용 보기", { exact: true }).count()) await page.getByText("자세한 내용 보기", { exact: true }).click();
  await expect(page.getByTestId("answer-summary")).toBeVisible();
});

test("AI 실패 fallback을 정상 안내로 표시하며 내부 오류를 노출하지 않는다", async ({ page }) => {
  const search = fixture();
  const fallback = await generatePublicInformationAnswer(search, async () => { throw new Error("private-provider-error"); });
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: { ...search, ...fallback } }));
  await page.goto("/");
  await submit(page);
  await expect(page.getByRole("status")).toContainText("안내가 준비되었습니다");
  if (await page.getByText("자세한 내용 보기", { exact: true }).count()) await page.getByText("자세한 내용 보기", { exact: true }).click();
  await expect(page.getByText(search.answer.plainLanguageSummary, { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "핵심 안내", exact: true })).not.toContainText(/provider_error|private-provider-error|fallback/);
});

test("빈 결과, 확인일 null 및 알 수 없는 최신성을 분명히 안내한다", async ({ page }) => {
  const search = fixture("프로야구 경기 일정");
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: search }));
  await page.goto("/");
  await submit(page, "프로야구 경기 일정");
  await expect(page.getByRole("status")).toContainText("관련 정보를 찾지 못했습니다");
  await expect(page.getByText("확인일: 미확인", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "핵심 안내", exact: true }).getByRole("link")).toHaveCount(0);
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
  await expect(page.getByRole("status")).toHaveText("");
  await expect(page.getByRole("region", { name: "핵심 안내", exact: true }).getByRole("link")).toHaveCount(0);
});

test("본문의 HTML을 실행하지 않고 텍스트로 표시한다", async ({ page }) => {
  const search = fixture();
  search.answer.plainLanguageSummary = '<img src=x onerror="alert(1)">';
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: search }));
  await page.goto("/");
  await submit(page);
  if (await page.getByText("자세한 내용 보기", { exact: true }).count()) await page.getByText("자세한 내용 보기", { exact: true }).click();
  await expect(page.getByText(search.answer.plainLanguageSummary, { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "핵심 안내", exact: true }).locator("img")).toHaveCount(0);
});

test("생성 상태라도 미확인 날짜와 재검토·변경 가능성 표시를 유지한다", async ({ page }) => {
  const search = fixture();
  search.answerGeneration = { status: "generated", mode: "constrained_presentation" };
  search.answer.verification = { status: "unverified", checkedAt: null, details: "최신 자료인지 확인이 필요합니다." };
  search.answer.sources = [{
    ...search.answer.sources[0],
    title: "성남시 교통약자 특별교통수단 이용 대상과 신청 절차 및 운행 범위에 관한 공식 안내",
    checkedAt: null,
    documentStatus: "review_required",
    freshnessStatus: "possibly_outdated",
  }];
  await page.route("**/api/public-information/search", (route) => route.fulfill({ json: search }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await submit(page);
  const answer = page.getByRole("region", { name: "핵심 안내", exact: true });
  await expect(answer.getByText("확인일: 미확인", { exact: true })).toHaveCount(2);
  await expect(answer).toContainText("재검토 필요");
  await expect(answer).toContainText("변경 가능성 있음");
  await expect(answer).toContainText("자료의 확인 상태를 추가로 확인해야 합니다");
  await expect(answer).not.toContainText("공식 자료 확인됨");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("30초 네트워크 지연 후 로딩을 해제하고 재시도를 안내한다", async ({ page }) => {
  await page.goto("/");
  await page.clock.install();
  await page.route("**/api/public-information/search", () => {});
  await submit(page);
  await expect(page.getByRole("status")).toContainText("안내를 준비하고 있습니다");
  await page.clock.fastForward(30_000);
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

test("응답 헤더 뒤 본문이 멈춰도 30초 후 텍스트 재시도가 가능하다", async ({ page }) => {
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
  await page.clock.fastForward(30_000);
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
  if (await page.getByText("자세한 내용 보기", { exact: true }).count()) await page.getByText("자세한 내용 보기", { exact: true }).click();
  await expect(page.getByTestId("answer-summary")).toBeVisible();
  await page.getByRole("link", { name: /출처 .*건과 확인 상태 보기/ }).click();
  await expect(page.locator("#answer-sources")).toBeInViewport();
  await expect(page.getByRole("link", { name: "노인맞춤돌봄서비스 (새 창)", exact: true })).toHaveAttribute("href", "https://www.seongnam.go.kr/wf-pm020101/22001");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", {name:"다시 질문",exact:true}).click();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await page.getByRole("textbox").boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(48);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  }
  expect(errors).toEqual([]);
});

test("1265px 제목 줄바꿈과 첫 화면 프로토타입·AI 개인정보 안내를 확인한다", async ({ page }) => {
  await page.setViewportSize({ width: 1265, height: 900 });
  await page.goto("/");
  await expect(page.getByText("Astra 팀", { exact: true })).toBeVisible();
  await page.getByText("개인정보·음성·질문 처리 방식", { exact: true }).click();
  await expect(page.getByText(/OpenAI의 공식 웹 검색으로 처리될 수 있습니다/)).toBeVisible();
  await expect(page.getByText(/개인정보는 입력하지 마세요/)).toBeVisible();
  await expect(page.getByText(/이름·주민등록번호/)).toBeVisible();
  await expect(page.getByText(/성남시가 운영하는 공식 서비스가 아닙니다/)).toBeVisible();
  const title = page.locator("#page-title");
  expect(await title.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getClientRects().length;
  })).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
