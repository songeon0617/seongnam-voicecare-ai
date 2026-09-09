import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';

for (const width of [360,390,430]) test(`mobile ${width}: menu → category → example → follow-up without finding a separate submit button`,async({page})=>{
  await page.setViewportSize({width,height:844});
  const sent:Record<string,unknown>[]=[];
  page.on('request',r=>{if(r.url().endsWith('/api/public-information/search'))sent.push(r.postDataJSON());});
  await page.goto('/');
  await expect(page.getByRole('textbox')).toBeVisible();
  await expect(page.getByRole('button',{name:/음성으로 질문하기/})).toBeInViewport();
  await expect(page.getByRole('button',{name:'생활정보 찾기',exact:true})).toBeInViewport();
  await expect(page.getByRole('button',{name:'민원·생활'})).toHaveCount(0);
  await page.getByRole('button',{name:'생활정보 찾기',exact:true}).click();
  await page.getByRole('button',{name:'민원·생활'}).click();
  await page.getByRole('button',{name:'민원서류',exact:true}).click();
  await expect(page.getByTestId('answer-summary')).toContainText('증명 종류');
  await expect(page.getByRole('heading',{name:'핵심 안내',exact:true})).toBeFocused();
  expect(sent).toHaveLength(1);
  await page.getByRole('button',{name:'요금은?',exact:true}).click();
  await expect(page.getByTestId('answer-summary')).toContainText('등·초본은 무료');
  await expect(page.getByTestId('answer-summary')).toContainText('500원');
  expect(sent).toHaveLength(2);
  expect(sent[1]).toEqual({query:'요금은?',serviceContext:{serviceId:'seongnam-unmanned-civil-service-kiosk'}});
  await expect(page.getByTestId('answer-summary')).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  mkdirSync('test-results/competition-flow',{recursive:true});
  await page.screenshot({path:`test-results/competition-flow/followup-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'처음으로',exact:true}).click();
  await expect(page.getByRole('button',{name:'음성으로 질문하기',exact:true})).toBeFocused();
  await expect(page.getByRole('textbox')).toHaveValue('');
  await expect(page.getByRole('heading',{name:'지원 분야',exact:true})).toHaveCount(0);
});

test('생활정보 드로어: Escape·닫기·배경 닫기와 키보드 포커스',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 const opener=page.getByRole('button',{name:'생활정보 찾기',exact:true});
 await opener.click();const drawer=page.getByRole('dialog',{name:'생활정보 찾기'});
 await expect(drawer.getByRole('button',{name:'닫기',exact:true})).toBeFocused();
 for(let i=0;i<9;i++){await page.keyboard.press('Tab');expect(await drawer.evaluate(e=>e.contains(document.activeElement))).toBe(true);}
 await drawer.getByRole('button',{name:'이동·교통',exact:true}).click();
 await expect(drawer.getByRole('button',{name:'← 분야 목록',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(drawer).not.toBeVisible();await expect(opener).toBeFocused();
 await opener.click();await drawer.getByRole('button',{name:'닫기',exact:true}).click();await expect(opener).toBeFocused();
 await opener.click();await page.mouse.click(385,400);await expect(drawer).not.toBeVisible();await expect(opener).toBeFocused();
 expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
});

test('공식기관 행동 버튼과 답변 바로 아래 글자·음성 재질문',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('button',{name:'생활정보 찾기',exact:true}).click();
 const drawer=page.getByRole('dialog');await drawer.getByRole('button',{name:'기타',exact:true}).click();
 await drawer.getByRole('button',{name:'정부 민원 상담',exact:true}).click();
 await expect(page.getByRole('link',{name:'110 전화하기',exact:true})).toHaveAttribute('href','tel:110');
 await expect(page.getByRole('link',{name:'110 채팅·수어상담 안내 (새 창)'})).toHaveAttribute('href','https://www.110.go.kr/consult/manual.do');
 await page.getByRole('button',{name:'글자로 다시 질문',exact:true}).click();
 await expect(page.getByRole('textbox')).toBeFocused();await expect(page.getByRole('textbox')).toBeInViewport();
 await expect(page.getByRole('button',{name:/음성으로 질문하기/})).toBeInViewport();
 await page.getByRole('textbox').fill('무인민원발급기 이용 방법은?');await page.getByRole('textbox').press('Enter');
 await expect(page.getByTestId('answer-summary')).toContainText('증명 종류');
 const details=page.getByText('자세히 보기 · 대상·준비물·이용 방법',{exact:true});await details.click();
 await expect(page.getByRole('heading',{name:'진행 순서',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'처음으로',exact:true}).click();
 await expect(page.getByRole('textbox')).toHaveValue('');await expect(page.getByTestId('answer-summary')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'생활정보 찾기',exact:true})).toBeInViewport();
});

test('200% 글자 확대에서도 메뉴·입력·공식 연결에 가로 넘침 없음',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.addStyleTag({content:'html {font-size:200% !important}'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'생활정보 찾기',exact:true}).click();
 const drawer=page.getByRole('dialog');expect(await drawer.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
 await drawer.getByRole('button',{name:'이동·교통',exact:true}).click();await drawer.getByRole('button',{name:'공영주차장',exact:true}).click();
 await expect(page.getByRole('link',{name:'주차장 위치 보기 (새 창)'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
