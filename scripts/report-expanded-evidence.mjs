import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='docs/voicecare-evaluation/final-expanded-20260907';
const initial=JSON.parse(readFileSync(`${dir}/live-summary.json`));
const replay=JSON.parse(readFileSync(`${dir}/replay-summary.json`));
const bad=new Set(['domain-066','domain-138','domain-130']);
const incomplete=new Set(['domain-113','domain-081','domain-083','domain-066','domain-071','domain-053']);
const notes={
 'domain-066':'Before: 채용박람회 오시는 길은 일반 버스 이용의 답이 아님. After: 무관 근거 제외, 안전 fallback. 일반 버스 안내 수집 미완료.',
 'domain-138':'Before: 2020년 코로나 임시휴관 중 대출/한시 회원 전환. After: 실제 회원가입·회원증발급·구비서류 안내로 복구.',
 'domain-130':'Before: 진로 특강/공연장 언급을 일반 공연으로 오인. After: 실제 무료 힙페스타 일정·장소·우천 조건 원문으로 복구.',
 'domain-113':'공식 자원순환 SPA가 존재하지만 HTTP HTML에 실행 후 본문이 없음. 원문 답변 미완료.',
 'domain-083':'구 성남시전입 URL은 404. 현재 원문 확보 미완료; 다른 주거 안내로 대체하지 않음.',
 'domain-071':'시청 교통 링크는 있으나 판교역 출발의 전체 경로 근거 미확보.',
 'domain-081':'공식 링크만 제공. 상세 민원 시작 절차의 원문 대조 미완료.',
 'domain-053':'금연상담 및 무료 보조제 안내 원문은 관련 있음. 상담 자체가 무료인지 명시되지 않아 질문 완수로 집계하지 않음.',
};
const rows=initial.results.map(before=>{
 const after=replay.results.find(r=>r.id===before.id);
 return {id:before.id,question:before.question,beforeKind:before.response.kind,afterKind:after.response.kind,beforeWrongSource:bad.has(before.id),afterWrongSource:false,
 beforeComplete:!bad.has(before.id)&&!incomplete.has(before.id),afterComplete:!incomplete.has(before.id),
 afterSources:after.response.officialSearch?.evidence.map(e=>({url:e.url,checkedAt:e.checkedAt,freshness:e.freshness}))??after.response.answer.sources.map(s=>({url:s.url,checkedAt:s.checkedAt,freshness:s.freshnessStatus})),
 notes:notes[before.id]??'요청한 핵심 정보가 전체 조건과 함께 공식 원문/등록 데이터에 존재. 개인 자격·현재 접수 가능을 확정하지 않음.'};
});
function walk(p){return readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${p}/${e.name}`):[`${p}/${e.name}`]);}
const runtimeFiles=[...walk('src').filter(p=>!p.endsWith('.test.ts')),'package.json','package-lock.json','next.config.ts'].sort();
const hash=createHash('sha256');for(const p of runtimeFiles)hash.update(p).update(readFileSync(p));
const summary={reviewedAt:new Date().toISOString(),sample:20,initialLiveProviderCalls:18,initialSchemaPass:initial.results.filter(r=>r.schemaPass).length,
 initialRelatedAnswerOrPartial:initial.results.filter(r=>['answer','partial_answer'].includes(r.response.kind)).length,
 initialComplete:rows.filter(r=>r.beforeComplete).length,initialWrongSource:3,
 postFixMode:'Same captured provider responses + new real HTTPS; NOT a fresh 20-case OpenAI evaluation',postFixSchemaPass:replay.results.filter(r=>r.schemaPass).length,
 postFixRelatedAnswerOrPartial:replay.results.filter(r=>['answer','partial_answer'].includes(r.response.kind)).length,
 postFixComplete:rows.filter(r=>r.afterComplete).length,postFixWrongSource:0,
 separateFreshFinalProbes:2,actualPaidCallsLocal:JSON.parse(readFileSync(`${dir}/live-ledger.json`)).attempts.length,
 runtimeSha256:hash.digest('hex'),runtimeFiles,rows};
writeFileSync(`${dir}/semantic-review.json`,JSON.stringify(summary,null,2));
console.log(JSON.stringify({...summary,rows:undefined,runtimeFiles:undefined},null,2));
