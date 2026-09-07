import {test,expect} from "@playwright/test";

test("real text API, clarification, keyboard selection, source popup and another question",async({page})=>{
  await page.goto("/");
  await page.getByRole("textbox").fill("장애인 이동지원");
  await page.getByRole("button",{name:"질문 보내기",exact:true}).click();
  const option=page.getByRole("button",{name:"장애인 택시바우처 안내",exact:true});
  await expect(option).toBeVisible();await option.focus();await expect(option).toBeFocused();await option.press("Enter");
  await expect(page.getByRole("heading",{name:"장애인 택시바우처",exact:true})).toBeVisible();
  const official=page.locator('a[href="https://www.seongnam.go.kr/wf-pm020101/23019"]');
  await expect(official).toBeVisible();
  const [popup]=await Promise.all([page.waitForEvent("popup"),official.click()]);
  await popup.waitForLoadState("domcontentloaded");
  expect(new URL(popup.url()).hostname).toBe("www.seongnam.go.kr");
  await expect(popup).toHaveTitle(/성남시청/);await popup.close();
  await page.getByRole("textbox").fill("무인민원발급기");await page.getByRole("button",{name:"질문 보내기",exact:true}).click();
  await expect(page.getByRole("heading",{name:"무인민원발급기 이용 안내",exact:true})).toBeVisible();
});

for(const width of [320,390,1440])test(`mobile/desktop ${width}px with 200% text, labels and focus`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:900});await page.goto("/");
  await page.addStyleTag({content:"html{font-size:200% !important}"});
  const box=page.getByRole("textbox");await box.focus();await expect(box).toBeFocused();
  await expect(box).toHaveAccessibleName(/질문/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`docs/voicecare-evaluation/final-expanded-20260907/${process.env.VOICECARE_AUDIT_URL?'production':'local'}-${testInfo.project.name}-${width}.png`,fullPage:true});
});

test("loading and network error are announced and recoverable",async({page})=>{
  let release!:()=>void; const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route("**/api/public-information/search",async route=>{await gate;await route.abort("failed");});
  await page.goto("/");await page.getByRole("textbox").fill("여권");await page.getByRole("button",{name:"질문 보내기",exact:true}).click();
  await expect(page.getByRole("status")).toContainText(/찾|확인|검색/);
  release();await expect(page.getByRole("status")).toContainText(/문제|실패|오류|연결/);
  await expect(page.getByRole("button",{name:"질문 보내기",exact:true})).toBeEnabled();
});
