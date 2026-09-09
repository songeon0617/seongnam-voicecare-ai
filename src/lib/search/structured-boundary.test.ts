import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {createExpandedPublicInformationResponse} from "./expanded-public-information";
import {readSearchAnswer} from "./read-search-answer";

// Expectations come from the frozen historical report; the original HTTP evaluator
// remains untouched and separately validates every document field on next start.
const golden=JSON.parse(readFileSync("tests/fixtures/voicecare/release/legacy-e2e-summary.json","utf8"));
for(const row of golden.results) test(`legacy boundary: ${row.id}; web provider cannot override the result`,async()=>{
  const result=await createExpandedPublicInformationResponse({query:row.question,...(row.context?{context:row.context}:{})},
    {search:async()=>{assert.fail(`legacy question escaped to web search: ${row.id}`);}});
  assert.ok("routing" in result.body);
  assert.equal(result.body.routing?.decision.route,row.expectedRoute);
  assert.deepEqual([...result.body.routing!.decision.serviceIds].sort(),[...row.expectedServiceIds].sort());
  assert.equal(result.body.routing?.decision.clarificationId,row.expectedClarificationId??null);
  assert.ok(readSearchAnswer(result.body));
});

test("new wordings preserve purpose, ambiguity, scope and the independent search exit",async()=>{
  const cases=[
    ["특별교통수단 알려줘","DIRECT","seongnam-special-transportation"],
    ["장애인 이동 지원 뭐 있어?","CLARIFY",null],
    ["장애가 있어 택시 비용 할인이 궁금합니다","DIRECT","seongnam-disabled-taxi-voucher"],
    ["만성질환으로 집에서 건강 상담을 받고 싶습니다","DIRECT","seongnam-home-health-care"],
    ["수정구 치매안심센터 연락처","UNSUPPORTED",null],
  ];
  for(const [query,route,id]of cases){
    const result=await createExpandedPublicInformationResponse({query},{search:async()=>assert.fail("structured path searched")});
    assert.ok("routing" in result.body);assert.equal(result.body.routing?.decision.route,route);
    if(id)assert.equal(result.body.routing?.decision.serviceIds[0],id);
  }
  for(const query of ["성남에서 여권 어디서 만들어?","성남 쓰레기 대형폐기물 어떻게 버려?"]){
    let calls=0;const result=await createExpandedPublicInformationResponse({query},{search:async()=>{calls++;return {status:"disabled",evidence:[],links:[]};}});
    assert.equal(calls,1);assert.ok("kind" in result.body);assert.equal(result.body.kind,"search_unavailable");
  }
});
test("an outside clarification cannot become local via a free-text legacy followup",async()=>{
 const result=await createExpandedPublicInformationResponse({query:"안부를 확인하고 병원 동행하는 쪽이요",context:{question:"부천시 아버지 돌봄과 복지관 중 무엇이 나을까요",clarificationId:"elderly_care_type"}},
  {search:async()=>assert.fail("outside followup searched")});
 assert.ok("kind" in result.body);assert.equal(result.body.kind,"unsupported");
});
