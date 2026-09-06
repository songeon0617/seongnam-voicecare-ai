import assert from "node:assert/strict";
import test from "node:test";
import { X509Certificate } from "node:crypto";
import { rootCertificates } from "node:tls";
import { extractOfficialDocument } from "./extract-official-document";
import { officialSourceCa, OFFICIAL_INTERMEDIATE } from "./official-source-ca";
import { createRuntimeSearchBudget } from "./shared-search-budget";
import { createOfficialSearchProvider } from "./openai-official-search";
import { createSearchBudget } from "./search-budget";
import { createExpandedPublicInformationResponse } from "./expanded-public-information";
import { readSearchAnswer } from "./read-search-answer";
import { relevantNavigation, relevantOriginalSection } from "./official-navigation";
import { isNavigationSource } from "./fetch-official-source";

test("reservation steps, portal widgets and sitemap never qualify as policy evidence",()=>{
  for(const path of ["/apply/integration/step1?facilityId=I0681","/health/index","/tour/index","/sitemap","/"])assert.ok(isNavigationSource(`https://www.seongnam.go.kr${path}`));
  assert.equal(isNavigationSource("https://www.seongnam.go.kr/cn02040801"),false);
});

test("broad welfare and transport support clarify without guessing eligibility or calling search",async()=>{
  for(const query of ["복지 뭐 있어?","교통 지원 알려줘"]){
    const response=await createExpandedPublicInformationResponse({query},{search:async()=>{assert.fail("broad question cannot spend a search or select a service");}});
    const parsed=readSearchAnswer(response.body);assert.equal(parsed?.kind,"clarification");
  }
});
test("stale index recovery uses live official menu links and topic evidence, not arbitrary generated URL",()=>{
  const page={url:"https://www.seongnam.go.kr/index",...extractOfficialDocument('<title>여권신청 안내</title><nav><a href="/cn02040801">여권신청접수 안내</a><a href="https://evil.test/여권">여권</a><a href="/cn020403">무인민원발급기</a></nav><main><h2>여권 안내</h2><p>여권은 성남시청 종합민원실에서 신청하며 휴일에는 운영하지 않습니다.</p></main>'),checkedAt:new Date().toISOString(),fromCache:false};
  assert.deepEqual(relevantNavigation(page,"성남시 여권 어디서 만들어").map(l=>l.url),["https://www.seongnam.go.kr/cn02040801"]);
  assert.match(relevantOriginalSection(page,"성남 여권")??"",/종합민원실/);
  assert.equal(relevantOriginalSection(page,"성남 음식물쓰레기"),undefined);
  assert.equal(relevantOriginalSection({...page,title:"공공데이터개방",sections:["성남 공공데이터개방 안내입니다. 담당자의 전화번호를 확인하세요."]},"성남 청년들이 모임하는 공공 공간 찾아줘"),undefined);
  assert.equal(relevantOriginalSection({...page,title:"관련사이트",sections:["관련사이트 경기도청 경찰서 성남문화원 링크입니다."]},"성남문화재단 공연표 신청하는데 공식 사이트 알려줘"),undefined);
  assert.equal(relevantOriginalSection({...page,title:"민원/제안/신고",sections:["제안은 국민신문고에서 신청합니다. 창의적 의견을 접수합니다. 담당부서 전화번호를 확인하세요."]},"성남에서 여권 만들 때 준비물"),undefined);
});

test("intermediate chains cryptographically to existing Mozilla root, expires closed, no new root",()=>{
  const ca=officialSourceCa();assert.deepEqual(ca.slice(0,-1),rootCertificates);
  const certificate=new X509Certificate(OFFICIAL_INTERMEDIATE);
  assert.equal(certificate.fingerprint256,"8C:54:C3:34:B6:6B:A4:E4:26:77:2A:F4:A3:F9:13:6C:19:A1:AE:C7:29:FD:B2:8C:53:5C:07:A5:A4:EF:22:E0");
  assert.throws(()=>officialSourceCa(Date.parse(certificate.validTo)+1));
  assert.equal(certificate.checkHost("www.seongnam.go.kr"),undefined);
});
test("long HTML navigation is excluded; full heading hierarchy, tables and trailing exceptions remain together",()=>{
  const html=`<title>시민 안내</title><header>${"다른 메뉴 ".repeat(1000)}</header><div class="content-section"><h4>2023년 한시 사업</h4><p>기초생활수급자만 해당</p><h5>지원 금액</h5><table><thead><tr><th>구분</th><th>금액</th></tr></thead><tbody><tr><td>대상자</td><td>50만원</td></tr></tbody></table><h5>신청 기간</h5><p>2023년 접수 종료</p><p>${"추가 조건을 확인하세요. ".repeat(70)}</p><h4>별도 시설</h4><p>성남시 공식 시설 이용 방법에 관한 안내입니다.</p></div>`;
  const result=extractOfficialDocument(html);assert.equal(result.paragraphs.length,0);assert.equal(result.sections.length,2);
  assert.match(result.sections[0],/2023년 한시 사업.*기초생활수급자만 해당.*구분 금액 대상자 50만원.*2023년 접수 종료/);
  assert.doesNotMatch(result.sections[0],/다른 메뉴|별도 시설/);
});
test("oversized indivisible policy is omitted, not silently cut before its restrictive footnote",()=>{
  const result=extractOfficialDocument(`<main><h2>지원 정책</h2><p>${"조건 ".repeat(3000)}</p><p>신청 종료</p></main>`);
  assert.equal(result.sections.length,0);assert.equal(result.omittedSections,1);
});
test("parser ignores hidden/script/form text and decodes entities without executing HTML",()=>{
  const result=extractOfficialDocument('<main><h2>여권 안내</h2><p>월요일 &middot; 화요일 안내이며 휴일은 제외합니다.</p><p hidden>999만원</p><p style="display:none">888만원</p><script>777만원</script></main>');
  assert.match(result.sections[0],/월요일 · 화요일/);assert.doesNotMatch(result.sections[0],/999|888|777/);
});
test("production refuses paid calls without shared admission; Redis failure cannot open budget",async()=>{
  assert.deepEqual(await createRuntimeSearchBudget({VERCEL:"1"})(3),{allowed:false,reason:"budget_limited"});
  assert.deepEqual(await createRuntimeSearchBudget({NODE_ENV:"production"})(3),{allowed:false,reason:"budget_limited"});
  const env={UPSTASH_REDIS_REST_URL:"https://example.upstash.io",UPSTASH_REDIS_REST_TOKEN:"test"};
  for(const response of [new Response("error",{status:500}),Response.json({error:"connection failed"}),Response.json({result:0})]){
    assert.deepEqual(await createRuntimeSearchBudget(env,(async()=>response) as typeof fetch)(3),{allowed:false,reason:"budget_limited"});
  }
});
test("shared reservation is atomic command with fixed namespace/cap; release is owner checked and idempotent",async()=>{
  const commands:unknown[][]=[];
  const acquire=createRuntimeSearchBudget({UPSTASH_REDIS_REST_URL:"https://example.upstash.io",UPSTASH_REDIS_REST_TOKEN:"test"},(async(_url,init)=>{
    commands.push(JSON.parse(String(init?.body)));return Response.json({result:1});
  }) as typeof fetch);
  const lease=await acquire(100);assert.ok(lease.allowed);await lease.release();await lease.release();
  assert.equal(commands.length,2);assert.equal(commands[0][0],"EVAL");assert.equal(commands[0][5],3000000);
  assert.match(String(commands[0][1]),/redis.call\('TIME'\)/);assert.match(String(commands[1][1]),/== ARGV\[1\]/);
});
test("long real-source section passes end-to-end contract, exact quote mismatch stays a link, repeat uses zero paid calls",async()=>{
  const url="https://www.seongnam.go.kr/cn02040801",quote="여권신청 장소는 성남시청 1층 종합민원실이며 공휴일에는 운영하지 않습니다.";
  const section=`2023년 안내 ${quote} ${"관련 조건을 원문에서 확인하세요. ".repeat(45)} 2023년 접수 종료`;
  let calls=0;
  const env={PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"true",PUBLIC_INFORMATION_SEARCH_DAILY_USD:"3",OPENAI_API_KEY:"test",OPENAI_MODEL:"gpt-5.6-terra"};
  const p=createOfficialSearchProvider(env,(async()=>{calls++;return Response.json({status:"completed",usage:{input_tokens:100,output_tokens:100},output:[{type:"web_search_call",status:"completed",action:{type:"search",sources:[{url}]}},{type:"message",content:[{type:"output_text",text:JSON.stringify({findings:[{url,quote}]}),annotations:[]}]}]});}) as typeof fetch,
    async()=>({url,title:"여권 안내",paragraphs:[],sections:[section],checkedAt:new Date().toISOString(),fromCache:false}),createSearchBudget());
  const first=await createExpandedPublicInformationResponse({query:"성남 여권 신청 장소"},p);const parsed=readSearchAnswer(first.body);assert.ok(parsed);assert.equal(parsed.officialSearch?.evidence[0].excerpt,section);
  const again=await createExpandedPublicInformationResponse({query:"성남 여권 신청 장소"},p);assert.ok(readSearchAnswer(again.body));assert.equal(calls,1);
  assert.ok("officialSearch" in again.body);assert.equal(again.body.officialSearch?.usage?.estimatedUsd,0);assert.equal(again.body.officialSearch?.evidence[0].checkedAt,parsed.officialSearch?.evidence[0].checkedAt);
});
