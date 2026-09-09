import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {createHash} from "node:crypto";
import test from "node:test";
import {extractOfficialDocument} from "./extract-official-document";
import {isNavigationSource,type OriginalPage} from "./fetch-official-source";
import {createOfficialSearchProvider} from "./openai-official-search";
import {createExpandedPublicInformationResponse} from "./expanded-public-information";
import {readSearchAnswer} from "./read-search-answer";
import {officialPublisher,officialUrl} from "./official-source-policy";
import {relevantOriginalSection} from "./official-navigation";

const prior="tests/fixtures/voicecare/release";
const directory="tests/fixtures/voicecare/recovery-sources";
const index=JSON.parse(readFileSync(`${directory}/index.json`,"utf8"));
const rows=JSON.parse(readFileSync(`${prior}/summary.json`,"utf8")).stage1.rows;
const ledger=JSON.parse(readFileSync(`${prior}/paid-ledger.json`,"utf8"));
const facts:Record<string,RegExp[]>={
 "027":[/18~39세/,/첫.*방문|첫회방문/,/3박 4일/,/예산.*소진/],
 "031":[/세미나실/,/소모임/,/신흥역 3번 출구/],
 "052":[/건강진단결과서/,/수정구보건소 2층 민원실/,/분당구보건소 5층/],
 "053":[/금연상담/,/무료 지원/,/보건소 방문 등록/],
 "066":[/경기버스정보/,/노선/],
 "073":[/시청 주차장/,/2.1m/,/400원/,/토·일요일/],
 "075":[/신청 방법/,/회원가입 후 주차구역신청/,/주민등록등본/,/중복.*신청/],
 "081":[/성남시에 바란다/,/국민신문고/,/1577-3100/],
 "097":[/성남시청 1층 종합민원실/,/공휴일/],
 "098":[/여권발급신청서/,/사진2매|사진 2매/,/신분증/,/수수료/,/유효기간이 남아있는 여권/],
 "115":[/대형폐기물/,/신청/,/배출/],
 "130":[/관람료 : 무료/,/2026년 9월/,/우천/,/장 소/],
 "134":[/인터넷 예매/,/회원가입 및 로그인/,/성남아트센터 홈페이지/],
 "138":[/가입 대상/,/회원증 발급/,/신분증/,/14세 미만/],
 "140":[/PC나 모바일기기/,/정회원/,/14일/,/로그인/],
};
for(const row of rows)test(`captured Stage 1 replay: ${row.id} (${row.classification})`,async()=>{
 let missing=0,paid=0,store=0;const missingUrls:string[]=[];
 const original=async(url:string):Promise<OriginalPage>=>{
  // Add newly visited official pages without overwriting the historical snapshots.
  const additional=`tests/fixtures/voicecare/submission-sources/${createHash("sha256").update(url).digest("hex")}`;
  if(!index[url]&&existsSync(`${additional}.json`)){
   const saved=JSON.parse(readFileSync(`${additional}.json`,"utf8"));
   return {...saved,...extractOfficialDocument(readFileSync(`${additional}.html`,"utf8"),url)};
  }
  const entry=index[url];if(!entry){missing++;missingUrls.push(url);throw Error(`fixture_missing:${url}`);}
  if(entry.status!=="fetched")throw Error(entry.error);
  const saved=JSON.parse(readFileSync(`${directory}/${entry.file}.json`,"utf8"));
  const parsed={...saved,...extractOfficialDocument(readFileSync(`${directory}/${entry.file}.html`,"utf8"),saved.url)};
  if(isNavigationSource(parsed.url)){parsed.sections=[];parsed.paragraphs=[];}
  return parsed;
 };
 const number=ledger.attempts.findIndex((a:{id:string},i:number)=>a.id===row.id&&i!==0)+1;
 const provider=createOfficialSearchProvider({NODE_ENV:"production",PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"true",PUBLIC_INFORMATION_SEARCH_DAILY_USD:"3",OPENAI_API_KEY:"fixture",OPENAI_MODEL:"gpt-5.6-terra",UPSTASH_REDIS_REST_URL:"https://fixture.upstash.io",UPSTASH_REDIS_REST_TOKEN:"fixture"},
  (async(url)=>{if(String(url)==="https://fixture.upstash.io"){store++;return Response.json({result:1});}
   assert.equal(String(url),"https://api.openai.com/v1/responses");paid++;
   const saved=JSON.parse(readFileSync(`${prior}/${row.id}-provider-${number}.json`,"utf8"));return Response.json(saved.body,{status:saved.status});
  }) as typeof fetch,original);
 const response=await createExpandedPublicInformationResponse({query:row.question},provider);
 const parsed=readSearchAnswer(response.body);assert.ok(parsed);assert.equal(missing,0,missingUrls.join(", "));
 if(row.id==="domain-071"){
  assert.equal(parsed.kind,"unsupported");assert.equal(paid,0);assert.equal(store,0);
  assert.match(parsed.answer.plainLanguageSummary,/정확한 경로.*안내하지 않습니다/);
  assert.equal(parsed.answer.sources.length,0);return;
 }
 if(["domain-009","domain-068"].includes(row.id)){assert.equal(parsed.kind,"answer");assert.equal(paid,0);assert.equal(store,0);return;}
 assert.equal(paid,1);assert.equal(store,2);
 const evidence=parsed.officialSearch!.evidence;
 if(row.id==="domain-053"){
  // The former check wrongly treated free aids as evidence of free counselling.
  // Require the actual counselling-fee claim to be rejected, not just schema validity.
  assert.equal(evidence.length,0);assert.equal(parsed.kind,"official_links");
  assert.ok(parsed.officialSearch!.links.some(l=>l.url.includes("9016")));return;
 }
 const expectations=facts[row.id.slice(-3)];
 if(expectations){
  assert.ok(evidence.length,`missing answer: ${row.question}`);
  for(const fact of expectations)assert.match(evidence.map(e=>e.excerpt).join(" "),fact);
  for(const source of evidence){assert.equal(source.publisher,officialPublisher(source.url));assert.equal(officialUrl(source.url),source.url);assert.ok(source.excerpt.length<=6000);}
  assert.equal(parsed.officialSearch!.links.length,evidence.length);
 } else {
  // Known unresolved P1/coverage gaps: passing a refusal-safety test is NOT answer completion.
  assert.ok(["domain-071","domain-083","domain-113"].includes(row.id));assert.equal(evidence.length,0);
 }
});

test("topic-only snippets and policy tables cannot substitute for requested details",()=>{
 const page={url:"https://www.seongnam.go.kr/ct-cn090301",title:"청년희망도시",paragraphs:[],sections:["청년 공간 위치정보 서비스 등 여러 지원 사업과 연계합니다."],checkedAt:new Date().toISOString(),fromCache:false};
 assert.equal(relevantOriginalSection(page,"청년 모임 공공 공간"),undefined);
 assert.equal(relevantOriginalSection({...page,sections:["민원접수 구비서류 감축에 따라 동의하시면 제출을 생략할 수 있습니다."]},"여권 준비물"),undefined);
 assert.equal(relevantOriginalSection({...page,sections:["성남아트센터 공연장 주차장과 여러 시설을 운영합니다."]},"성남문화재단 공연표 공식 사이트"),undefined);
});
test("published same-institution navigation is HTTPS and user boards cannot enter evidence",()=>{
 for(const url of ["https://www.snlib.go.kr.evil.test/intro/","https://job.seongnam.go.kr/contents/content.do?fboard=board_review","https://www.snspring.or.kr/questionView.do?idx=1"])
  assert.equal(officialUrl(url),null);
 const p=extractOfficialDocument('<title>성남시청</title><nav><a href="http://www.snart.or.kr/">성남문화재단</a><a href="http://evil.test/">문화재단</a></nav>');
 assert.deepEqual(p.navigation,[{url:"https://www.snart.or.kr/",title:"성남문화재단"}]);
});
