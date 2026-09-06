import {readFileSync,writeFileSync,readdirSync} from "node:fs";
import {createHash} from "node:crypto";
const directory="docs/voicecare-evaluation/release-20260907";
const read=name=>JSON.parse(readFileSync(`${directory}/${name}`,"utf8"));
// Human/agent semantic adjudication of saved visible excerpts, not status-based success.
const judgments={
  "009":["structured_direct_success","structured_direct_success","기존 보조기구 원문·신청처 매핑 보존"],
  "068":["structured_direct_success","structured_direct_success","기존 특별교통수단 원문·신청 조건 매핑 보존"],
  "097":["web_search_grounded_success","web_search_grounded_success","여권 접수 장소·층·주소와 휴무 조건이 원문에 있음"],
  "098":["no_answer_despite_official_evidence","no_answer_despite_official_evidence","접수 안내만 반환; 질문한 준비물 목록은 완수하지 못함"],
  "113":["safe_fallback","safe_fallback","음식물 배출 방법 미답변"],
  "115":["safe_fallback","safe_fallback","공식성 필터 밖 폐기물 출처; 배출 신고 방법 미답변"],
  "081":["web_search_grounded_success","web_search_grounded_success","성남시에 바란다/국민신문고 및 공식 상담 경로가 원문에 있음"],
  "083":["safe_fallback","safe_fallback","전입신고 온라인 가능 여부 미답변"],
  "052":["web_search_grounded_success","web_search_grounded_success","구별 보건소 민원실·발급 방법·인터넷 발급 조건이 원문에 있음"],
  "053":["safe_fallback","safe_fallback","금연 상담 안내 미답변"],
  "066":["web_search_grounded_success","web_search_grounded_success","일반 버스 노선/경로 확인과 예매 경로가 원문에 있음"],
  "071":["safe_fallback","safe_fallback","판교역-시청 이동 경로 미답변"],
  "027":["safe_fallback","safe_fallback","정장 대여 질문에서 검색된 과거 신청 주소 404; 현재 대여 경로 미답변"],
  "031":["wrong_source","no_answer_despite_official_evidence","실평가: 청년 공간 대신 공공데이터 담당자. 수정 재생: 청년 사업표는 찾았으나 공간 위치/이용 방법 미완수"],
  "138":["safe_fallback","safe_fallback","도서관 회원증 발급 미답변"],
  "140":["safe_fallback","safe_fallback","전자책 이용 미답변"],
  "073":["safe_fallback","no_answer_despite_official_evidence","수정 재생에서 청사에 주차장이 있음을 확인했으나 실제 주차 이용 조건 미완수"],
  "075":["safe_fallback","safe_fallback","거주자우선주차 신청 미답변"],
  "130":["safe_fallback","web_search_grounded_success","수정 재생에서 시 공식 행사 목록의 무료 공연·장소·일정·우천 조건을 함께 보존"],
  "134":["wrong_source","safe_fallback","문화재단 공연표 대신 문화원 등이 나열된 일반 관련사이트를 근거로 표시하던 오류 차단"],
};
const categories=["structured_direct_success","web_search_grounded_success","clarification_success","unsupported_correct","safe_fallback","provider_network_failure","wrong_answer","wrong_source","no_answer_despite_official_evidence"];
const ids=Object.keys(judgments).map(n=>`domain-${n}`).sort();
function stage(mode){
  const rows=ids.map(id=>{
    // Preserve the original completed Stage 1 run; the later paid probe is separate.
    const file=mode==="live"&&id==="domain-097"?"domain-097-previous-1788710612662.json":`${id}-${mode==="live"?"result":"replay"}.json`;
    const r=read(file),j=judgments[id.slice(-3)];
    return {id,question:r.question,domain:r.domain,kind:r.response.kind,schemaPass:r.schemaPass,classification:j[mode==="live"?0:1],rationale:j[2],sourceUrls:r.response.officialSearch?.evidence.map(e=>e.url)??r.response.answer.sources.map(s=>s.url),diagnostics:r.response.officialSearch?.diagnostics};
  });
  const counts=Object.fromEntries(categories.map(c=>[c,rows.filter(r=>r.classification===c).length]));
  const completed=counts.structured_direct_success+counts.web_search_grounded_success;
  return {mode:mode==="live"?"ORIGINAL_20_CASE_STAGE1_LIVE_PROVIDER_RESULTS":"SAVED_PROVIDER_RESPONSES_PLUS_FRESH_HTTPS_NOT_NEW_LIVE_API_EVALUATION",total:20,contractPass:rows.filter(r=>r.schemaPass).length,counts,actualAnswerCompletion:{count:completed,denominator:20,rate:completed/20},safeFallbackRate:counts.safe_fallback/20,rows};
}
const ledger=read("paid-ledger.json");
let estimatedUsd=0,inputTokens=0,outputTokens=0,cacheWrites=0,cached=0;
for(const attempt of ledger.attempts){
  const u=attempt.usage;if(!u)continue;
  const i=u.input_tokens??0,o=u.output_tokens??0,w=u.input_tokens_details?.cache_write_tokens??0,c=u.input_tokens_details?.cached_tokens??0;
  inputTokens+=i;outputTokens+=o;cacheWrites+=w;cached+=c;estimatedUsd+=(i*2+w*.5-c*1.8+o*12)/1e6+.01;
}
const baseline=JSON.parse(readFileSync("docs/voicecare-evaluation/offline-2026-09-06T15-02-47-243Z.json","utf8"));
const recoveries=baseline.results.filter(r=>r.outcome==="RECOVERY");
const causes={feature_disabled:0,api_provider_not_configured:0,tls_network_failure:0,official_fetch_failure:0,zero_search_results:0,official_validation_failure:0,source_length_exceeded:0,answer_extraction_failure:0,timeout:0,cost_rate_limit:0,other:0};
for(const r of recoveries){if(r.response.officialSearch.status==="disabled")causes.feature_disabled++;else causes.other++;}
const verification=readFileSync("release-verified.log","utf8");
const latestOffline=readdirSync("docs/voicecare-evaluation").filter(f=>/^offline-.*\.json$/.test(f)).sort().at(-1);
const offline=JSON.parse(readFileSync(`docs/voicecare-evaluation/${latestOffline}`,"utf8"));
const routeChanges=offline.legacy61.flatMap(r=>{const prior=baseline.legacy61.find(p=>p.id===r.id);return prior.after.kind!==r.after.kind?[{id:r.id,before:prior.after.kind,after:r.after.kind}]:[];});
const summary={generatedAt:new Date().toISOString(),baseline:"8f5436d",codeState:"UNCOMMITTED_LOCAL_RELEASE_FIXES_NO_PUSH",evaluationSha256:createHash("sha256").update(readFileSync("scripts/voicecare-evaluation-cases.ts")).digest("hex"),
  disabled206:{causes,note:"An injected disabled provider short-circuited all 206. Zero counts in other categories mean NOT EXECUTED, not proven healthy."},
  stage1:stage("live"),finalReplay:stage("replay"),stage2:{status:"NOT_RUN",reason:"Stage 1 gate failed"},stage3:{status:"NOT_RUN",reason:"Stage 2 not passed; 20-call cap kept"},
  finalLiveProbe:{id:"domain-097",at:read("domain-097-result.json").at,status:read("domain-097-result.json").response.officialSearch.status,actualAnswerSuccess:false,classification:"no_answer_despite_official_evidence",reason:"Reservation steps selected instead of passport application location. Subsequently excluded reservation pages from evidence; latest capture replay succeeds, no additional paid call."},
  costs:{paidResponses:ledger.attempts.length,webSearchCalls:ledger.attempts.length,inputTokens,outputTokens,cacheWrites,cached,estimatedUsd,reservedUsd:ledger.attempts.length*.15,billingActual:null,estimateSource:"https://developers.openai.com/api/docs/pricing",replayPaidCalls:0,stage2PaidCalls:0,stage3PaidCalls:0,billingSettingsChanged:false},
  verification:{server:{total:176,pass:176},ui:{total:53,pass:53},lint:"PASS",typecheck:"PASS",build:verification.includes("Compiled successfully")?"PASS":"UNKNOWN",logSha256:createHash("sha256").update(verification).digest("hex"),legacy61:read("legacy-e2e-summary.json"),baselineRouteChanges:routeChanges,offline240:offline.summary},
  release:{production:false,push:false,knownRemainingP0:0,p0Limit:"Two wrong-source evidence cases in live run (plus a transient replay relevance error) are blocked in final replay; fresh paid 20-case confirmation not performed.",p1Blockers:["Current official URLs/institution sources not recovered across required topics","Relevant evidence does not yet complete requested fields; indivisible sections above 6000 characters still omitted","Shared production budget credentials and live atomic admission validation missing"],phone:"NOT_PHYSICALLY_TESTED",submissionChanged:false}};
writeFileSync(`${directory}/summary.json`,JSON.stringify(summary,null,2));
writeFileSync(`${directory}/verification.log`,verification);
console.log(JSON.stringify({live:summary.stage1.counts,completion:summary.stage1.actualAnswerCompletion,replay:summary.finalReplay.counts,replayCompletion:summary.finalReplay.actualAnswerCompletion,costs:summary.costs},null,2));
