import {execFileSync} from "node:child_process";
import {readFileSync,writeFileSync,unlinkSync} from "node:fs";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {createPublicInformationResponseWithAnswer} from "../src/lib/search/create-public-information-response-with-answer";
import type {ClarificationContext} from "../src/types/public-information-router";
type HistoricalRow={id:string;question:string;expectedRoute:string;expectedServiceIds:string[];context?:ClarificationContext;pass:boolean};
const output="docs/voicecare-evaluation/recovery-20260907";
const historical=JSON.parse(readFileSync("docs/voicecare-evaluation/release-20260907/legacy-e2e-summary.json","utf8"));
const temporary=resolve("src/lib/search/.checkpoint-expanded.ts");
const categories=["기존 structured path가 web search로 넘어감","keyword confidence 변화","CLARIFY 변화","region guard 변화","scope guard 변화","fallback 변화","timeout/provider","context/follow-up 변화","기타"];
async function main(){
 writeFileSync(temporary,execFileSync("git",["show","b39df0f:src/lib/search/expanded-public-information.ts"]));
 try{
 const checkpoint=await import(pathToFileURL(temporary).href);
 const rows:Array<HistoricalRow&{category:string;currentKind:string;currentRoute:string|null;currentService:string[];source:string|null;searchCalls:number;searchStatus:string|null;codePath:string;expansionEffect:string;legacyAiOff:unknown}>=[];
 for(const row of (historical.results as HistoricalRow[]).filter(r=>!r.pass)){
  let searchCalls=0;const result=await checkpoint.createExpandedPublicInformationResponse({query:row.question,...(row.context?{context:row.context}:{})},{search:async()=>{searchCalls++;return {status:"disabled",evidence:[],links:[]};}});
  const old=await createPublicInformationResponseWithAnswer({query:row.question,...(row.context?{context:row.context}:{})},()=>({status:"disabled"}));
  const body=result.body;
  let category=categories[0],path="expanded.curatedMatch → confidentKeywordResult(named.length !== 1) → provider.search",effect="확장 handler가 기존 legacy 의도 라우터/안전한 fallback을 호출하지 않음; 구어체 목적을 명시적 이름 기준만으로 탈락";
  if(row.id.startsWith("region-")){category=categories[3];path="expanded.regionBoundaryGuard → state(unsupported)";effect="타지역 거부는 유지됐으나 routing.decision/source 누락";}
  else if(row.id==="edge-region-unavailable"){category=categories[4];path="confidentKeywordResult → locationGuard → undefined → provider.search";effect="거리순/구별 범위 guard의 UNSUPPORTED를 검색으로 대체";}
  else if(row.expectedRoute==="CLARIFY"){category=categories[2];path=searchCalls?"expanded.curatedMatch → provider.search (기존 constrainClarificationCandidates/guardClarificationMeaning 미실행)":"expanded.clarify → state(clarification)";effect=searchCalls?"기존 구조화 복수 목적 CLARIFY 후보 처리를 건너뜀":"화면의 확인 질문은 맞지만 routing.decision/source 누락";}
  else if(row.context){category=categories[7];path="resolveFollowup → continued=false → curatedMatch → provider.search";effect="기존 elderly/health 자유문장 후속 선택을 resolveFollowup이 인식하지 못하고 legacy context 라우터도 호출하지 않음";}
  else if(row.id==="edge-typo"){category=categories[1];path="confidentKeywordResult(택시바우쳐 이름 불일치) → provider.search";effect="keyword 내부 임계값 변경은 없음; 기존 라우터의 오타 해석 기회가 사라짐";}
  else if(row.id==="developmental-situation"){category=categories[1];path="curatedMatch → needsFreshEvidence(함께) → undefined → provider.search";effect="같은 서비스의 낮활동·부모상담을 최신성/복수사업 검색으로 과잉 분류";}
  else if(row.expectedRoute==="UNSUPPORTED"){category=categories[5];path="expanded.curatedMatch → provider.search(disabled) → state(search_unavailable)";effect="기존 미지원 계약을 검색 실패 응답으로 대체";}
  if(row.id==="special-colloquial")effect+="; 수동 named 정규식 부를.{0,5}차가 띄어쓰기 포함 6자 구간을 놓침";
  rows.push({...row,currentRoute:body.routing?.decision.route??null,currentKind:body.kind,currentService:body.routing?.decision.serviceIds??[],source:body.routing?.source??null,searchCalls,searchStatus:body.officialSearch?.status??null,category,codePath:path,expansionEffect:effect,legacyAiOff:"routing" in old.body?old.body.routing:null});
 }
 const counts=Object.fromEntries(categories.map(c=>[c,rows.filter(r=>r.category===c).length]));
 writeFileSync(`${output}/regression-audit.json`,JSON.stringify({checkpoint:"b39df0f",mode:"CHECKPOINT_CODE_REPLAY_SEARCH_DISABLED_NO_PAID_API",total:rows.length,counts,rows},null,2));
 const cell=(v:unknown)=>String(v??"∅").replace(/\|/g,"/").replace(/\n/g," ");
 const table=rows.map(r=>`| ${r.id} | ${cell(r.question)} | ${r.expectedRoute} | ${cell(r.currentRoute)} (${r.currentKind}) | ${r.expectedServiceIds.join(", ")||"∅"} | ${r.currentService.join(", ")||"∅"} | ${r.source??"∅"}; search=${r.searchStatus??"미호출"} | ${r.category} | ${r.codePath} | ${r.expansionEffect} |`).join("\n");
 writeFileSync(`${output}/regression-audit.md`,`# 기존 E2E 실패 37건 전수 분석\n\ncheckpoint 소스를 직접 재생했다. 기대값은 원본 그대로다. current는 작업 시작 시점이다. ∅는 필드 누락이며 임의로 DIRECT/UNSUPPORTED로 해석하지 않았다. 검색 disabled는 평가 설정이고 유료 provider 실패가 아니다. 대부분의 구어체는 기존 함수에서도 AI OFF이면 DIRECT를 만들지 못했다. 따라서 37건 모두를 새 keyword 알고리즘 변경이라고 주장하지 않는다. 확장 handler가 기존 AI 의미 해석 경로 자체를 호출하지 않은 지점과 이번 코드로 복구한 결정적 목적 분류를 구분한다.\n\n| 원인 (배타적 1차 분류) | 건수 |\n|---|---:|\n${Object.entries(counts).map(([c,n])=>`| ${c} | ${n} |`).join("\n")}\n\n| ID | 질문 | 기대 route | 시작 시 route/kind | 기대 service | 시작 시 service | source | 원인 | 실패 코드 경로 | 확장 코드 영향 |\n|---|---|---|---|---|---|---|---|---|---|\n${table}\n`);
 console.log(counts);
 }finally{unlinkSync(temporary);}
}
void main();
