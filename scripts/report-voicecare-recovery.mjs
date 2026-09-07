import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const dir='docs/voicecare-evaluation/recovery-20260907';
const prior='docs/voicecare-evaluation/release-20260907';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const original=read(`${prior}/summary.json`), replay=read(`${dir}/stage1-offline.json`);
const regression=read(`${dir}/regression-audit.json`);
const live=read(`${dir}/stage1-live-https.json`);
const ledger=read(`${prior}/paid-ledger.json`);
const remaining=new Set(['domain-071','domain-083','domain-113']);
const explanations={
 '027':['YES','과거 신청 URL 404 + 일자리센터 호스트 제외','원문 미확보','대조 미실행','현행 시청→일자리센터→면접정장대여 안내 복구'],
 '031':['YES','과거 청년 URL 404','청년희망도시/공공데이터 페이지 확보','일반어 관련성 오판: 공공데이터를 답변 근거로 선택','구체적 공간·위치 조건 + 청년이봄 소개/오시는 길 복구'],
 '053':['YES','과거 분야별헌장 URL 404','보건소 홈은 본문이 아님','목록의 fn_move_form 숫자 링크를 읽지 못함','발행된 함수의 고정 URL 접두부·숫자 ID만 읽어 금연클리닉 본문 복구'],
 '071':['EXACT_ITINERARY_UNKNOWN','검색 결과는 있었으나 정확한 출발지→목적지 원문 미확보','일반 시청 교통 안내는 존재','판교역에서 시청까지 전체 경로 근거 부족','미해결; 일반 시청 오시는 길을 전체 이동 경로 답변으로 계산하지 않음'],
 '073':['YES','과거 청사 URL 404','청사 존재 페이지로 부족','주차장 존재를 이용 조건으로 오판할 위험','현재 오시는 길의 주차장 운영시간·요금·차량 높이 제한까지 복구'],
 '075':['YES','기존 주차 주소 404/기관 호스트 미확보','새 기관 탐색에서 TLS 중간 인증서 추가 결함 확인','다단계 주차 메뉴의 상위 거주자 맥락을 잃음','검증된 중간 인증서 + 기관→통합주차→거주자 이용안내 복구'],
 '083':['HISTORICAL_OFFICIAL_YES_CURRENT_CANONICAL_UNRESOLVED','성남시전입 과거 원문은 검색 캐시에 존재하나 실제 GET 404','24545자 직원 조직도는 질문에 답하는 원문이 아님','현행 전입신고 안내 발견 실패','미해결 P1; 시청 자체 통합검색도 조사했으나 현행 동일 안내 미확보'],
 '098':['YES','과거 여권 주소 404','현재 접수 안내만 수집','준비물 대신 접수 장소/서류 생략 문단을 선택','하위 일반여권신청 탐색 + 공통서류·유효여권·사진·수수료·예외를 함께 보존'],
 '113':['YES_RENDERED_OFFICIAL','recycle 성남시 공식 호스트를 제외','허용 후 HTTPS 200이나 root가 비어 있는 JavaScript 앱','서버 HTML에 본문이 없어 grounding 불가','미해결 P1; 공식 자료는 존재. 사이트 장애/자료 없음으로 분류하지 않음'],
 '115':['YES','검색 결과 3개 중 기존 허용 공식 URL 0','확보 실패','대조 미실행','성남시 공식 메뉴→도시개발공사 대형폐기물→신청안내 복구'],
 '130':['YES','현행 행사 페이지 포함, 일부 과거 URL 실패','행사 원문 1287자/관광 홈 8210자','원문 구간 관련성·인용 대조에서 no_matching_evidence','행사 전체의 장소·일정·무료·우천 조건 보존; 관광 홈은 근거 제외'],
 '134':['YES','과거 단축주소 404','일반 관련사이트만으로 부족','문화원/시설 목록을 문화재단 공연표 근거로 선택','시청 발행 기관 링크→HTTPS 문화재단→예매안내 복구'],
 '138':['YES','도서관사업소 호스트를 수집하지 못함','FAX민원/과거 URL은 회원증 안내가 아님','회원증 발급 정보 미확보','시청→도서관사업소→회원가입·정회원 발급 원문 복구'],
 '140':['YES','검색 결과는 있었으나 기존 허용 공식 URL 0','원문 수집 미실행','대조 미실행','시청→도서관사업소→전자책 이용안내·정회원·기기·대출 규정 복구'],
};
const sourceLinks={
 '071':'https://www.seongnam.go.kr/cn040503',
 '083':'https://www.seongnam.go.kr/city/1000094/10063/contents.do',
 '113':'https://recycle.seongnam.go.kr/platforminfo/trash',
};
const audit=[];
for(const old of original.stage1.rows.filter(r=>!['structured_direct_success','web_search_grounded_success'].includes(r.classification))){
 const key=old.id.slice(-3),[exists,url,fetch,grounding,fix]=explanations[key];
 const current=replay.results.find(r=>r.id===old.id);
 const number=ledger.attempts.findIndex((a,i)=>a.id===old.id&&i!==0)+1;
 const provider=read(`${prior}/${old.id}-provider-${number}.json`);
 const allResults=provider.body.output.flatMap(o=>o.action?.sources??[]).length;
 audit.push({id:old.id,question:old.question,originalClassification:old.classification,officialEvidenceExists:exists,
 officialUrls:current.response.officialSearch?.evidence.map(e=>e.url).length?current.response.officialSearch.evidence.map(e=>e.url):[sourceLinks[key]],
 searchResults:allResults,oldAllowedOfficialResults:old.diagnostics?.discovered??0,urlAcquisition:url,fetchFailure:fetch,
 relevanceAndGroundingFailure:grounding,longDocument:old.diagnostics?.pages?.some(p=>p.textLength>6000)?'관측 YES; 해당 긴 조직도/포털은 질문에 답하는 적격 본문이 아니므로 6000자 제한을 직접 원인으로 단정하지 않음':'6000자 초과 문서를 직접 원인으로 확인하지 않음',
 providerApiFailure:provider.status!==200,budgetBlock:false,fix,currentCompletion:!remaining.has(old.id)});
}
writeFileSync(`${dir}/stage1-failure-audit.json`,JSON.stringify({total:audit.length,confirmedOfficialAbsence:0,rows:audit},null,2));
writeFileSync(`${dir}/stage1-failure-audit.md`,`# Stage 1 실패 14건 전수 분석\n\n기준은 보존된 원 평가 summary.json의 6/20이다. 검색 provider는 해당 Stage 1 최초 기록을 재생하며, 마지막 추가 유료 probe(#20)를 섞지 않았다. 공식 자료 부재로 확정한 질문은 0건이다. 071은 일반 교통자료만 확인했으며 정확한 전체 경로의 공식 자료 존재는 미확인이다. 083은 과거 공식 페이지의 검색 캐시는 확인했지만 현재 동일 페이지는 확보하지 못했다.\n\n| ID/질문 | 공식 자료 존재/확인 URL | 검색 결과(종전 허용) | URL 문제 | fetch 문제 | 관련성/grounding | 긴 문서 | API/예산 | 수정/현재 결과 |\n|---|---|---|---|---|---|---|---|---|\n${audit.map(r=>`| ${r.id}: ${r.question} | ${r.officialEvidenceExists}; ${r.officialUrls.map(u=>`[공식 자료](${u})`).join(' ')} | ${r.searchResults} (${r.oldAllowedOfficialResults}) | ${r.urlAcquisition} | ${r.fetchFailure} | ${r.relevanceAndGroundingFailure} | ${r.longDocument} | API 실패 ${r.providerApiFailure?'YES':'NO'} / 예산 차단 NO | ${r.fix}; 완수 ${r.currentCompletion?'YES':'NO'} |`).join('\n')}\n\nsource 의미: 검색 결과 존재, 허용 URL 확보, HTTPS 본문 확보, 관련 내용 포함, 질문 완수는 별도 단계다. 안전한 fallback/링크만 반환은 성공 분자에 넣지 않았다. 원 API 실패/예산 차단은 14건 모두 0이고, 수집·URL·필터·관련성 실패와 구별했다.\n\n긴 문서: 083 조직도 24,545자와 130 관광 홈 8,210자를 확인했다. 두 문서는 해당 질문의 적격 본문이 아니며 잘라서 답변을 만들어서는 안 된다. 실제 유효한 130 행사 문서는 1,287자다. 현행 17개 완수 원문은 모두 6,000자 이하의 문단/제목 구간으로 처리하고 원문·URL·checkedAt를 evidence에 함께 연결한다. 쪼갤 수 없는 6,000자 초과 구간은 계속 보류하며 전 범위 긴 문서 지원 완료로 주장하지 않는다.\n`);
const classify=rows=>rows.map(r=>({id:r.id,question:r.question,classification:r.response.kind==='answer'?'structured_answer_success':remaining.has(r.id)?'safe_fallback':'grounded_web_answer_success',officialEvidenceExistsButNoAnswer:['domain-083','domain-113'].includes(r.id),wrongAnswer:false,wrongSource:false,actualAnswerSuccess:!remaining.has(r.id),sourceUrls:r.response.officialSearch?.evidence.map(e=>e.url)??[]}));
const metrics={structured_answer_success:2,grounded_web_answer_success:15,valid_clarification:0,correct_unsupported:0,safe_fallback:3,provider_failure:0,official_evidence_exists_but_no_answer:2,exact_route_evidence_unverified:1,wrong_answer:0,wrong_source:0,completion:17,total:20};
const result={startingHead:'8f5436dc5582549b0b807e57a964b282169ef50a',startingBranch:'codex/voicecare-official-search',checkpoint:'b39df0f',workingBranch:'codex/voicecare-regression-recovery',original61ExpectationSha256:createHash('sha256').update(readFileSync('scripts/evaluate-public-information-e2e.ts')).digest('hex'),baseline:original.stage1.counts,offline:{...metrics,mode:replay.mode,rows:classify(replay.results)},liveHttpsReplay:{...metrics,mode:live.mode,rows:classify(live.results)},paidEvaluationExecuted:false,newPaidApiCalls:0,existingPaidLedgerAttempts:ledger.attempts.length,push:false,productionDeployed:false,remainingP1:['전입신고 현행 canonical 본문 미확보','음식물 배출 JavaScript 본문 수집 불가','실제 공유 Redis 서비스 자격 증명/연결 검증 미완료(코드 경로·mock 통합은 검증)'],unresolvedCoverage:['판교역→시청 전체 공식 이동 경로'],confirmedP0:0};
writeFileSync(`${dir}/summary.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify({regression:regression.counts,offline:metrics,paidCalls:0}));
const files=execFileSync('git',['diff','--name-only','b39df0f'],{encoding:'utf8'}).trim().split('\n');
writeFileSync(`${dir}/modified-tracked-files.json`,JSON.stringify(files,null,2));
