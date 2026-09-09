import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { installSpeechMock } from "./speech-mock";
import { SEARCH_MESSAGES } from "../../src/types/search-messages";
const dir="test-results/submission-panel";
for(const width of [360,390,430])test(`submission ${width}px: full answer, source, speech and keyboard details`,async({page})=>{
  await installSpeechMock(page);await page.setViewportSize({width,height:900});await page.goto("/");
  const input=page.getByRole("textbox");await input.fill("특별교통수단 신청 방법");await input.press("Enter");
  await expect(page.getByRole("heading",{name:"특별교통수단 운영",exact:true})).toBeVisible();
  const summary=page.getByText("자세한 내용 보기",{exact:true});await summary.focus();await summary.press("Space");
  await expect(page.getByRole("button",{name:"상세 안내 전체 듣기",exact:true})).toBeVisible();
  expect((await page.getByRole("button",{name:"상세 안내 전체 듣기",exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await summary.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe("none");
  await page.getByRole("button",{name:"상세 안내 전체 듣기",exact:true}).click();
  await expect(page.getByRole("button",{name:"답변 읽기 중지",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"답변 읽기 중지",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("중지");
  await expect(page.getByText("최신성: 최신성 미확인",{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  mkdirSync(dir,{recursive:true});await page.screenshot({path:`${dir}/answer-${width}.png`,fullPage:true});
  await page.addStyleTag({content:"html{font-size:200% !important}"});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test("shared quota explains continued structured use without a misleading retry loop",async({page})=>{
  await page.route("**/api/public-information/search",route=>{
    const query=route.request().postDataJSON().query;
    if(query!=="여권")return route.continue();
    return route.fulfill({json:{query,kind:"search_unavailable",results:[],hasResults:false,
      answer:{userQuestion:query,title:"검색 제한",plainLanguageSummary:SEARCH_MESSAGES.budget_limited,steps:[],sources:[],nextAction:null,verification:{status:"insufficient_data",checkedAt:null}},
      officialSearch:{region:"성남시",status:"budget_limited",searched:false,evidence:[],links:[]}}});
  });
  await page.goto("/");await page.getByRole("textbox").fill("여권");await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("status")).toContainText("하루 20회");await expect(page.getByRole("status")).toContainText("계속 이용");
  await expect(page.getByRole("button",{name:"다시 시도",exact:true})).toHaveCount(0);
  await page.getByRole("textbox").fill("노인맞춤돌봄서비스");await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("heading",{name:"노인맞춤돌봄서비스",exact:true})).toBeVisible();
});
test("journey refusal can be heard and opens only a reviewed official navigation link",async({page})=>{
  await installSpeechMock(page);await page.goto("/");
  await page.getByRole("textbox").fill("판교역에서 성남시청 가는 대중교통 알려줘");await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("status")).toContainText("정확한 경로");
  await expect(page.getByRole("link",{name:"성남시 공식 버스 안내 (새 창)"})).toHaveAttribute("href","https://www.seongnam.go.kr/tr-cn010201");
  await page.getByRole("button",{name:"지원 범위 안내 듣기"}).click();
  expect(await page.evaluate(()=>window.voiceTest.spoken.map(s=>s.text).join(""))).toContain("정확한 경로");
});
test("outside-region refusal does not acquire local food-waste links",async({page})=>{
  await page.goto("/");await page.getByRole("textbox").fill("서울 음식물쓰레기 버리는 법");await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("status")).toContainText("다른 지역");
  await expect(page.getByRole("link",{name:/성남시 음식물/})).toHaveCount(0);
});
