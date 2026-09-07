import assert from "node:assert/strict";
import test from "node:test";
import { createExpandedPublicInformationResponse as run } from "./expanded-public-information";
import { createOfficialSearchProvider } from "./openai-official-search";
import { createSearchBudget } from "./search-budget";
import { officialUrl,redactQuestion } from "./official-source-policy";
import { extractPage,publicAddress } from "./fetch-official-source";
import { readSearchAnswer } from "./read-search-answer";
import { boundedResponseText } from "./bounded-io";
import { getRoutingDocuments } from "@/lib/ai/service-catalog";
import type { OfficialSearchProvider } from "@/types/official-search";
import type { PublicInformationSearchResponse } from "@/types/public-information-search";

const env={PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"true",PUBLIC_INFORMATION_SEARCH_DAILY_USD:"3",OPENAI_API_KEY:"test",OPENAI_MODEL:"gpt-5.6-terra"};
const url="https://www.seongnam.go.kr/cn020101";
const quote="성남시 공공시설 이용 안내입니다. 시설별로 이용 대상과 운영 시간이 다르므로 개별 시설 안내를 확인하세요.";
const original=async()=>({url,title:"공공시설 안내",paragraphs:[quote],checkedAt:"2026-09-06T12:00:00.000Z",fromCache:false});
function api(options:{calls?:boolean;malformed?:boolean;quote?:string;url?:string}={}) {
  return {status:"completed",usage:{input_tokens:1000,output_tokens:100},output:[
    ...(options.calls===false?[]:[{type:"web_search_call",status:"completed",action:{type:"search",sources:[{url:options.url??url}]}}]),
    {type:"message",content:[{type:"output_text",text:options.malformed?"wrong json":JSON.stringify({findings:[{url:options.url??url,quote:options.quote??quote}]}),annotations:[{type:"url_citation",url:options.url??url}]}]},
  ]};
}
const fetcher=(body:unknown,status=200)=>(async()=>Response.json(body,{status})) as typeof fetch;
const provider=(body:unknown=api(),status=200,source=original)=>createOfficialSearchProvider(env,fetcher(body,status),source,createSearchBudget());
const off:OfficialSearchProvider={search:async()=>({status:"disabled",evidence:[],links:[]})};
const body=async(payload:unknown,p=off)=>{const result=await run(payload,p);assert.ok("answer" in result.body);return result.body as PublicInformationSearchResponse;};

test("wide mobility never asserts a disability, and numbered/general-bus followup reaches official search",async()=>{
  const first=await body({query:"이동수단 알려줘"});assert.equal(first.clarification?.id,"mobility_general");assert.equal(first.results.length,0);
  for(const query of ["1번","일반 버스요","택시","일반 버스·지하철 이용"]){
    let called="";const p:OfficialSearchProvider={search:async(q)=>{called=q;return off.search(q,new AbortController().signal);}};
    const next=await body({query,context:{question:"이동수단 알려줘",clarificationId:"mobility_general"}},p);
    assert.match(called,/일반/);assert.equal(next.kind,"search_unavailable");assert.equal(next.results.length,0);
  }
});
test("required acceptance examples route without paid calls",async()=>{
  const cases=[
    ["성남에서 버스 타려면","search_unavailable"],["휠체어 타고 병원 가야 해","clarification"],["특별교통수단 신청 방법","answer"],
    ["성남시 여권 어디서 만들어","search_unavailable"],["성남 청년지원 뭐 있어","clarification"],["성남 음식물쓰레기 버리는 법","search_unavailable"],
    ["분당 도서관 오늘 열어?","clarification"],["수원시 여권 발급","unsupported"],["서울 사는데 성남시청에서 여권 만들 수 있어?","search_unavailable"],
    // Correcting only the region still leaves the requested service unspecified.
    ["부천 말고 성남","clarification"],["안녕하세요","guidance"],
    ["서울 사는데 성남 도서관 이용할 수 있어?","search_unavailable"],["성남이 아니라 수원 공공근로","unsupported"],
  ];
  for(const [query,kind]of cases){const result=await body({query});assert.equal(result.kind,kind,query);assert.ok(readSearchAnswer(result),query);}
});
test("curated thirteen remain exactly mapped under expanded handler",async()=>{
  for(const doc of getRoutingDocuments()){
    const result=await body({query:`${doc.title} 안내`});assert.equal(result.kind,"answer",doc.title);assert.equal(result.results[0].document.id,doc.id);assert.equal(result.answer.plainLanguageSummary,doc.content);assert.ok(readSearchAnswer(result));
  }
});
test("changed/future services bypass curated shortcuts and preserve the original question",async()=>{
  for(const query of ["휠체어 탈 차량 요금 내년 인상되나요?","어르신 안부 서비스는 중단됐어?","특별교통수단 오늘 예약 가능해?","장애인 버스요금 지원 말고 성남 일반 버스 노선"]){
    const result=await body({query});assert.equal(result.kind,"search_unavailable");assert.equal(result.answer.userQuestion,query);
  }
});
test("new topic clears outside context; outside short context cannot be promoted to local guidance",async()=>{
  const result=await body({query:"성남 여권 신청",context:{question:"수원시 교통 안내",clarificationId:"service_required"}});assert.equal(result.kind,"search_unavailable");
  const outside=await body({query:"1번",context:{question:"수원시 이동수단",clarificationId:"mobility_general"}});
  // An outside parent question must not become a local answer through a short selection.
  assert.equal(outside.kind,"unsupported");
});
test("unknown choice does not loop and a repeated ambiguous pronoun exits with guidance",async()=>{
  const unsure=await body({query:"잘 모르겠어요",context:{question:"이동수단 알려줘",clarificationId:"mobility_general"}});assert.notEqual(unsure.kind,"clarification");
  const pronoun=await body({query:"그거요",context:{question:"이동수단 알려줘",clarificationId:"mobility_general"}});assert.equal(pronoun.clarification?.id,"referent_required");
  const second=await body({query:"그거요",context:{question:"그거요",clarificationId:"referent_required"}});assert.equal(second.kind,"guidance");
});
test("nearby location followup requests a facility list rather than claiming distance",async()=>{
  assert.equal((await body({query:"가까운 도서관"})).clarification?.id,"region_required");
  let requested="";await body({query:"분당구요",context:{question:"가까운 도서관",clarificationId:"region_required"}},{search:async(q)=>{requested=q;return off.search(q,new AbortController().signal);}});
  assert.match(requested,/분당구/);assert.match(requested,/목록/);assert.doesNotMatch(requested,/가까운/);
});
test("source policy rejects lookalike hosts, ports, credentials, encoded paths, attachments, boards, redirects",()=>{
  for(const value of ["http://www.seongnam.go.kr/","https://seongnam.go.kr.evil.test/","https://evilseongnam.go.kr/","https://www.seongnam.go.kr:444/","https://x@www.seongnam.go.kr/","https://127.0.0.1/","https://www.seongnam.go.kr/%62bs/1","https://www.seongnam.go.kr/file.pdf","https://www.seongnam.go.kr/page?returnURL=https://evil.test"]){assert.equal(officialUrl(value),null,value);}
  assert.equal(officialUrl(url+"?utm_source=openai"),url);
  for(const ip of ["127.0.0.1","10.1.2.3","169.254.169.254","172.16.0.1","192.168.1.1","100.64.0.1","::1","::ffff:127.0.0.1","fc00::1"]){assert.equal(publicAddress(ip),false,ip);}
});
test("PII and arbitrary user URLs are removed before the external search",async()=>{
  let query="";await body({query:"성남 여권 문의 010-1234-5678 test@example.com https://evil.test/a"},{search:async(q)=>{query=q;return off.search(q,new AbortController().signal);}});
  assert.doesNotMatch(query,/010-1234|test@example|evil.test/);assert.ok(redactQuestion("990101-1234567").redacted);
});
test("HTML processing excludes executable, navigation and forms",()=>{
  const parsed=extractPage(`<title>공식 &amp; 안내</title><script>${quote}</script><nav>${quote}</nav><main><p>${quote}</p></main>`);
  assert.equal(parsed.title,"공식 & 안내");assert.deepEqual(parsed.paragraphs,[quote]);
});
test("whole evidence section retains short eligibility, heading and expired footnote",()=>{
  const parsed=extractPage("<h2>2023년 한시 지원</h2><p>기초생활수급자만 해당</p><p>지원금은 대상자 한 사람에게 50만원을 지급하며 동 행정복지센터에서 접수합니다.<br>※ 2023년 접수 종료</p>");
  assert.equal(parsed.paragraphs.length,1);assert.match(parsed.paragraphs[0],/2023년 한시 지원.*기초생활수급자만 해당.*50만원.*2023년 접수 종료/);
  const huge=extractPage(`<h2>지원사업</h2><p>${"대상 조건 ".repeat(300)}</p>`);assert.equal(huge.paragraphs.length,0);
  const hierarchy=extractPage("<main><h2>2023년 한시 지원</h2><p>기초생활수급자만 해당</p><h3>지원 금액</h3><p>지원금은 대상자 한 사람에게 50만원을 지급하며 동 행정복지센터에서 접수합니다.</p><h3>신청 기간</h3><p>2023년 접수 종료</p></main>");
  assert.match(hierarchy.paragraphs[0],/기초생활수급자만 해당.*50만원.*2023년 접수 종료/);
});
test("emergency wording takes priority over costs and external search",async()=>{
  for(const query of ["가슴이 심하게 아프고 숨쉬기 어려워요","죽고 싶고 지금 약을 많이 먹었어요","넘어져서 피가 멈추지 않는데 보건소 비용부터 알려줘","작년에 아팠고 지금 숨을 못 쉬어요","숨을 못 쉬어요 어떻게 해야 하나요?"]){
    const result=await body({query},{search:async()=>{assert.fail("emergency cannot search");}});assert.equal(result.kind,"safety",query);assert.ok(readSearchAnswer(result));
  }
  for(const query of ["예전에 약을 많이 먹었어요","숨쉬기 어려워하는 사람을 발견하면 대처법은?","예시: 가슴이 심하게 아파요"]){assert.notEqual((await body({query})).kind,"safety",query);}
});
test("comparison, concurrent benefits and device faults must search; ordinary exam and proxy instructions are supported topics",async()=>{
  for(const query of ["긴급복지 지원과 기초생활보장 차이","방문건강관리와 다른 도움 중복 가능?","무인민원발급기 지문 오류","성남 검정고시 지원","부모가 대신 신청할 수 있나요?"]){assert.equal((await body({query})).kind,"search_unavailable",query);}
});
test("library correction starts a fresh subject",async()=>{
  let sent="";await body({query:"중앙도서관 말고 여권 발급",context:{question:"분당 도서관 오늘 열어?",clarificationId:"library_required"}},{search:async(q)=>{sent=q;return off.search(q,new AbortController().signal);}});
  assert.doesNotMatch(sent,/오늘 휴관/);
});
test("actual search execution plus original paragraph is required, snippets/ungrounded text never become facts",async()=>{
  const verified=await provider().search("성남 공공시설 안내",AbortSignal.timeout(1000));assert.equal(verified.status,"partial");assert.equal(verified.evidence[0].excerpt,quote);
  const missing=await provider(api({calls:false})).search("시설",AbortSignal.timeout(1000));assert.equal(missing.status,"invalid_output");assert.equal(missing.evidence.length,0);
  const mismatch=await provider(api({quote:"모든 시민에게 매달 999만원을 지급하며 아무 조건 없이 신청할 수 있습니다."})).search("시설",AbortSignal.timeout(1000));assert.equal(mismatch.status,"links");assert.equal(mismatch.evidence.length,0);
  const malformed=await provider(api({malformed:true})).search("시설",AbortSignal.timeout(1000));assert.equal(malformed.status,"links");
  const wrong=await provider(api({url:"https://evil.test"})).search("시설",AbortSignal.timeout(1000));assert.equal(wrong.status,"no_results");
});
test("time-sensitive, 404 and 429 remain distinct from an answer or no-results",async()=>{
  const today=await provider().search("성남 공공시설 오늘 열어?",AbortSignal.timeout(1000));assert.equal(today.status,"links");assert.equal(today.evidence.length,0);
  const gone=await provider(api(),200,async()=>{throw Error("404");}).search("시설",AbortSignal.timeout(1000));assert.equal(gone.status,"source_unavailable");
  const limited=await provider({},429).search("시설",AbortSignal.timeout(1000));assert.equal(limited.status,"rate_limited");
  const offResult=await createOfficialSearchProvider({}).search("시설",AbortSignal.timeout(1000));assert.equal(offResult.status,"disabled");
});
test("provider request preserves existing model, privacy, one tool call and no retries",async()=>{
  let count=0;const p=createOfficialSearchProvider(env,(async(_url,init)=>{
    count++;const sent=JSON.parse(String(init?.body));assert.equal(sent.model,env.OPENAI_MODEL);assert.equal(sent.max_tool_calls,1);assert.equal(sent.store,false);assert.equal(sent.parallel_tool_calls,false);assert.deepEqual(sent.tools[0].filters.allowed_domains,["seongnam.go.kr"]);
    return Response.json(api());
  }) as typeof fetch,original,createSearchBudget());
  await p.search("시설",AbortSignal.timeout(1000));assert.equal(count,1);
});
test("bounded response rejects oversized and stalled bodies and releases on timeout",async()=>{
  await assert.rejects(()=>boundedResponseText(new Response("x".repeat(100)),new AbortController().signal,50));
  const controller=new AbortController();const pending=boundedResponseText(new Response(new ReadableStream({start(){}})),controller.signal);controller.abort();await assert.rejects(()=>pending);
  const waiting=new AbortController();const p=createOfficialSearchProvider(env,(()=>new Promise(()=>{})) as typeof fetch,original,createSearchBudget());
  const result=p.search("시설",waiting.signal);waiting.abort();assert.equal((await result).status,"timeout");
});
test("a fetched long original still provides a link without inventing a short fragment",async()=>{
  const source=async()=>({...await original(),paragraphs:[]});const result=await provider(api(),200,source).search("시설",AbortSignal.timeout(1000));assert.equal(result.status,"links");assert.equal(result.links.length,1);assert.equal(result.evidence.length,0);
});
test("per-process budget handles concurrency, rollover and release idempotence",()=>{
  let time=0;const acquire=createSearchBudget(()=>time);const first=acquire(0.15);assert.ok(first.allowed);assert.deepEqual(acquire(3),{allowed:false,reason:"rate_limited"});
  first.release();first.release();time+=3000;assert.deepEqual(acquire(0.15),{allowed:false,reason:"budget_limited"});
  time=86_400_000;assert.ok(acquire(0.15).allowed);
});
test("client rejects forged citations and incompatible search states",async()=>{
  const result=await body({query:"성남 공공시설 안내"},provider());assert.ok(readSearchAnswer(result));
  const forged=structuredClone(result);forged.officialSearch!.evidence[0].url="https://evil.test";assert.equal(readSearchAnswer(forged),null);
  const noSearch=structuredClone(result);noSearch.officialSearch!.searched=false;assert.equal(readSearchAnswer(noSearch),null);
  const wrongKind=structuredClone(result);wrongKind.kind="search_unavailable";assert.equal(readSearchAnswer(wrongKind),null);
  const unavailable=await body({query:"성남 여권"});unavailable.answer.plainLanguageSummary="지원금은 무조건 500만원입니다";assert.equal(readSearchAnswer(unavailable),null);
});
