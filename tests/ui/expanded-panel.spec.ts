import {expect,test} from "@playwright/test";
import {mkdirSync} from "node:fs";
import {SEARCH_MESSAGES} from "../../src/types/search-messages";
import {CLARIFICATIONS} from "../../src/types/public-information-router";
import {installSpeechMock} from "./speech-mock";

test("long policy stays intact behind details and default speech matches visible concise guidance",async({page})=>{
  await installSpeechMock(page);
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await page.getByRole("textbox").fill("특별교통수단 신청 방법");
  const response=page.waitForResponse("**/api/public-information/search");
  await page.getByRole("button",{name:"질문 보내기"}).click();
  const body=await (await response).json();
  expect(body.answer.plainLanguageSummary.length).toBeGreaterThan(240);
  await expect(page.getByText(body.answer.plainLanguageSummary,{exact:true})).toBeHidden();
  const concise=page.getByText("특별교통수단 운영 관련 공식 자료를 찾았습니다. 대상과 이용 방법은 상세 안내에서 확인해 주세요. 현재 운영 여부와 개인별 자격은 추가 확인이 필요합니다.",{exact:true});
  await expect(concise).toBeVisible();
  await page.getByRole("button",{name:"답변 듣기",exact:true}).click();
  const spoken=await page.evaluate(()=>{
    for(let i=0;i<20&&window.voiceTest.spoken.at(-1)?.onend;i++)window.voiceTest.finishSpeech();
    return window.voiceTest.spoken.map(s=>s.text).join("");
  });
  expect(spoken).toBe(await concise.textContent());
  await page.locator("details > summary").press("Enter");
  await expect(page.getByText(body.answer.plainLanguageSummary,{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"상세 안내 전체 듣기",exact:true})).toBeVisible();
  mkdirSync("docs/voicecare-visual",{recursive:true});
  await page.screenshot({path:"docs/voicecare-visual/details-390.png",fullPage:true});
});

test("real offline API: broad mobility, numbered reply and recovery are distinct from no official data",async({page})=>{
  await page.goto("/");await page.getByRole("textbox").fill("이동수단 알려줘");await page.getByRole("button",{name:"질문 보내기"}).click();
  await expect(page.getByRole("button",{name:"일반 버스·지하철 이용",exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"잘 모르겠어요",exact:true})).toBeVisible();
  await page.getByRole("textbox").fill("1번");await page.getByRole("button",{name:"질문 보내기"}).click();
  await expect(page.getByRole("status")).toContainText(SEARCH_MESSAGES.disabled);
  await expect(page.getByRole("button",{name:"다시 시도",exact:true})).toBeVisible();
  await expect(page.getByText("현재 등록된 공식 자료에서 관련 정보를 찾지 못했습니다.",{exact:true})).toHaveCount(0);
});
test("real offline API: wheelchair purpose selection preserves question and reaches curated service",async({page})=>{
  await page.goto("/");await page.getByRole("textbox").fill("휠체어 타고 병원 가야 해");await page.getByRole("button",{name:"질문 보내기"}).click();
  await page.getByRole("button",{name:"휠체어로 탈 차량",exact:true}).click();
  await expect(page.getByRole("heading",{name:"특별교통수단 운영",exact:true})).toBeVisible();
});
test("search evidence is shown only after a complete validated response with source and unknown dates",async({page})=>{
  const quote="공공시설마다 이용 대상과 방법이 다르므로 해당 시설의 공식 안내를 확인하세요. 이 문장은 오프라인 UI 시험용입니다.";
  const url="https://www.seongnam.go.kr/cn020101";
  await page.route("**/api/public-information/search",route=>route.fulfill({json:{query:"시설",kind:"partial_answer",results:[],hasResults:false,
    answer:{userQuestion:"시설",title:"확인한 공식 원문과 남은 확인 사항",plainLanguageSummary:"원문 일부를 확인했습니다.",steps:[],sources:[],nextAction:null,verification:{status:"insufficient_data",checkedAt:null}},
    officialSearch:{region:"성남시",status:"partial",searched:true,links:[{url,title:"시설 안내"}],evidence:[{id:"web-1",url,title:"시설 안내",publisher:"성남시청",region:"성남시",checkedAt:"2026-09-06T12:00:00.000Z",publishedAt:null,updatedAt:null,applicationPeriod:null,effectivePeriod:null,excerpt:quote,collection:"openai_web_search+https_original",freshness:"unknown",fromCache:false}]}}}));
  await page.goto("/");await page.getByRole("textbox").fill("시설");await page.getByRole("button",{name:"질문 보내기"}).click();
  await expect(page.getByRole("blockquote")).toHaveText(quote);
  await expect(page.getByRole("link",{name:"시설 안내 (공식 원문)"})).toHaveAttribute("href",url);
  await expect(page.getByText(/게시·수정일: 미확인/)).toBeVisible();
});
for(const width of [360,390,768,1440])test(`layout ${width}px, focus, clarification/recovery and 200 percent text`,async({page})=>{
  // Layout checks use fixtures; the two tests above cover the real offline API.
  // Repeating all viewport requests would intentionally exceed its 30/minute limit.
  await page.route("**/api/public-information/search",route=>{
    const query=route.request().postDataJSON().query as string;
    const clarification=query==="이동수단 알려줘";
    const message=clarification?CLARIFICATIONS.mobility_general.question:SEARCH_MESSAGES.disabled;
    return route.fulfill({json:{query,kind:clarification?"clarification":"search_unavailable",results:[],hasResults:false,
      answer:{userQuestion:query,title:"안내",plainLanguageSummary:message,steps:[],sources:[],nextAction:null,verification:{status:"insufficient_data",checkedAt:null}},
      ...(clarification?{clarification:{id:"mobility_general"}}:{officialSearch:{region:"성남시",status:"disabled",searched:false,evidence:[],links:[]}})}});
  });
  await page.setViewportSize({width,height:900});await page.goto("/");
  await page.getByRole("textbox").focus();await expect(page.getByRole("textbox")).toBeFocused();
  await page.getByRole("textbox").fill("이동수단 알려줘");await page.getByRole("button",{name:"질문 보내기"}).click();
  await expect(page.getByRole("button",{name:"일반 버스·지하철 이용",exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  mkdirSync("docs/voicecare-visual",{recursive:true});await page.screenshot({path:`docs/voicecare-visual/clarify-${width}.png`,fullPage:true});
  await page.getByRole("button",{name:"일반 버스·지하철 이용",exact:true}).click();await expect(page.getByRole("status")).toContainText("검색이 현재 꺼져");
  await page.addStyleTag({content:"html{font-size:200% !important}"});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`docs/voicecare-visual/recovery-text200-${width}.png`,fullPage:true});
});
