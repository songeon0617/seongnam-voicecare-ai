import { mkdirSync,readFileSync,writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { VOICECARE_EVALUATION_CASES,validateEvaluationInventory } from "./voicecare-evaluation-cases";
import { createExpandedPublicInformationResponse as expanded } from "../src/lib/search/expanded-public-information";
import { createPublicInformationResponseWithAnswer as legacy } from "../src/lib/search/create-public-information-response-with-answer";
import { readSearchAnswer } from "../src/lib/search/read-search-answer";
import type { ClarificationContext } from "../src/types/public-information-router";
import type { OfficialSearchProvider } from "../src/types/official-search";

const disabled:OfficialSearchProvider={search:async()=>({status:"disabled",evidence:[],links:[]})};
async function main(){
  validateEvaluationInventory();
  const results: Array<{id:string;group:string;domain:string;split:string;question:string;answerability:string;expectedBehavior:string;allowedOutcomes:readonly string[];evidenceReferences:readonly string[];outcome:string|null;schemaPass:boolean;routeAllowed:boolean;wrongService:boolean;ms:number;answerSuccess:null;semanticReview:string;turns:unknown[];response:unknown;failure:string|null}>=[];
  for(const entry of VOICECARE_EVALUATION_CASES){
    let context:ClarificationContext|undefined;
    const turns=[];
    for(const turn of entry.context.filter(t=>t.role==="user")){
      const response=await expanded({query:turn.content,...(context?{context}:{})},disabled);
      const parsed=readSearchAnswer(response.body);
      turns.push({query:turn.content,response:response.body});
      context=parsed?.clarification?{question:turn.content,clarificationId:parsed.clarification.id}:undefined;
    }
    const start=performance.now();
    const response=await expanded({query:entry.question,...(context?{context}:{})},disabled);
    const ms=performance.now()-start;
    const parsed=readSearchAnswer(response.body);
    const mapping={answer:"STRUCTURED_ANSWER",official_answer:"SEARCH_ANSWER",partial_answer:"PARTIAL",official_links:"OFFICIAL_LINK",clarification:"CLARIFY",unsupported:"OUT_OF_SCOPE",safety:"SAFETY",search_unavailable:"RECOVERY",guidance:"HELP"} as const;
    const outcome=parsed?.kind?mapping[parsed.kind]:null;
    const routeAllowed=!!outcome&&entry.allowedOutcomes.some(x=>x===outcome);
    const actualService="results" in response.body?response.body.results[0]?.document.id:null;
    const wrongService=!!entry.existingServiceId&&outcome==="STRUCTURED_ANSWER"&&entry.existingServiceId!==actualService;
    results.push({id:entry.id,group:entry.group,domain:entry.domain,split:entry.split,question:entry.question,answerability:entry.answerability,
      expectedBehavior:entry.expectedBehavior,allowedOutcomes:entry.allowedOutcomes,evidenceReferences:entry.evidenceReferences,
      outcome,schemaPass:!!parsed,routeAllowed,wrongService,ms,answerSuccess:null,semanticReview:"NOT_ADJUDICATED",turns,response:response.body,
      failure:!parsed?"invalid_schema":wrongService?"wrong_service":!routeAllowed?"unexpected_outcome":null});
  }
  const old=JSON.parse(readFileSync("docs/final-local-e2e.json","utf8")) as {results:{id:string;question:string;expectedRoute:string;expectedServiceIds:string[];expectedClarificationId?:string;context?:ClarificationContext}[]};
  const baseline=[];
  for(const entry of old.results){
    const payload={query:entry.question,...(entry.context?{context:entry.context}:{})};
    const before=await legacy(payload,()=>({status:"disabled"}));
    const after=await expanded(payload,disabled);
    const route="routing" in before.body?before.body.routing?.decision:null;
    const priorPass=route?.route===entry.expectedRoute&&JSON.stringify([...(route?.serviceIds??[])].sort())===JSON.stringify([...entry.expectedServiceIds].sort())&&(!entry.expectedClarificationId||route?.clarificationId===entry.expectedClarificationId);
    baseline.push({...entry,beforePass:priorPass,before:before.body,after:after.body});
  }
  const times=results.map(r=>r.ms).sort((a,b)=>a-b);
  const generatedAt=new Date().toISOString();
  const summary={generatedAt,mode:"OFFLINE_SEARCH_DISABLED_NO_MODEL_CALLS",codeBase:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),
    evaluationSha256:createHash("sha256").update(readFileSync("scripts/voicecare-evaluation-cases.ts")).digest("hex"),
    holdoutExposure:"All 60 used in this run; any subsequent tuning makes them development-exposed.",
    cases:results.length,schemaPass:results.filter(r=>r.schemaPass).length,allowedOutcome:results.filter(r=>r.routeAllowed).length,
    wrongServiceDetected:results.filter(r=>r.wrongService).length,failures:results.filter(r=>r.failure).length,
    outcomes:Object.fromEntries([...new Set(results.map(r=>r.outcome))].map(kind=>[String(kind),results.filter(r=>r.outcome===kind).length])),
    realAnswerSuccessRate:null,citationAccuracy:null,unnecessaryRefusalRate:null,paidCalls:0,paidUsd:0,
    latencyMs:{median:times[Math.floor(times.length/2)],p95:times[Math.ceil(times.length*.95)-1]},
    legacy61Offline:{total:baseline.length,pass:baseline.filter(r=>r.beforePass).length,note:"AI disabled; differs from historical real-model 61/61. Original expectations retained."},
    releaseGate:"NOT_MET: real evidence/semantic evaluation, per-domain thresholds, and production verification not completed."};
  mkdirSync("docs/voicecare-evaluation",{recursive:true});
  const file=`docs/voicecare-evaluation/offline-${generatedAt.replace(/[:.]/g,"-")}.json`;
  writeFileSync(file,JSON.stringify({summary,results,legacy61:baseline},null,2));
  console.log(JSON.stringify({file,summary},null,2));
  // Diagnostics contain expected failures with search disabled. Schema/incorrect ID remain blocking.
  if(results.some(r=>!r.schemaPass||r.wrongService))process.exitCode=1;
}
void main();
