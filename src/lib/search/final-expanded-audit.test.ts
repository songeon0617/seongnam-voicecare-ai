import assert from "node:assert/strict";
import test from "node:test";
import { createExpandedPublicInformationResponse } from "./expanded-public-information";
import { createOfficialSearchProvider } from "./openai-official-search";
import { OFFICIAL_HOSTS } from "./official-source-policy";
import { readSearchAnswer } from "./read-search-answer";
import { readFileSync } from "node:fs";
import { answersRequestedDetail, matchesRequestedSubject } from "./official-navigation";

for (const query of ["특별교통수단과 장애인 택시바우처 알려줘", "장애인 버스요금 지원 또는 장애인 택시바우처"]) {
  test(`all named mobility candidates are retained: ${query}`, async () => {
    const response=await createExpandedPublicInformationResponse({query},{search:async()=>assert.fail("must clarify without a model")});
    assert.ok("routing" in response.body);
    assert.equal(response.body.routing?.decision.route,"CLARIFY");
    assert.equal(response.body.routing?.decision.clarificationId,"mobility_vehicle_or_fare");
    assert.equal(response.body.routing?.decision.serviceIds.length,2);
    assert.ok(readSearchAnswer(response.body));
  });
}
for (const query of ["도움", "서류", "복지", "신청 어떻게 해", "ㅋㅋㅋ?!", "성남시"]) {
  test(`missing service has no paid search: ${query}`, async () => {
    const response=await createExpandedPublicInformationResponse({query},{search:async()=>assert.fail("no subject to search")});
    assert.ok("clarification" in response.body);
    assert.equal(response.body.clarification?.id,"service_required");
  });
}
for (const query of ["특별교통수단 예약 취소", "노인맞춤돌봄서비스 신청 마감", "내일 장애인 버스요금 지원 변경", "2027년 장애인 택시바우처 요금"]) {
  test(`unstored or current detail bypasses every static shortcut: ${query}`, async () => {
    let calls=0;
    const response=await createExpandedPublicInformationResponse({query},{search:async()=>{calls++;return {status:"disabled",evidence:[],links:[]};}});
    assert.equal(calls,1); assert.ok("kind" in response.body); assert.equal(response.body.kind,"search_unavailable");
    assert.ok(readSearchAnswer(response.body));
  });
}
test("provider searches the same reviewed institutional hosts enforced at retrieval",async()=>{
  let called=false;
  const provider=createOfficialSearchProvider({PUBLIC_INFORMATION_WEB_SEARCH_ENABLED:"true",PUBLIC_INFORMATION_SEARCH_DAILY_USD:"3",OPENAI_API_KEY:"test",OPENAI_MODEL:"fixture"},
    async(_url,init)=>{
      called=true;const body=JSON.parse(String(init?.body));
      assert.deepEqual(body.tools[0].filters.allowed_domains,OFFICIAL_HOSTS);
      for(const host of OFFICIAL_HOSTS)assert.ok(body.instructions.includes(host));
      return Response.json({status:"completed",output:[]});
    },async()=>assert.fail("invalid provider output cannot be evidence"),()=>({allowed:true,release(){}}));
  assert.equal((await provider.search("성남 도서관 회원증",AbortSignal.timeout(1000))).status,"invalid_output");
  assert.ok(called);
});

for(const id of ["066","138","130"])test(`real provider counterexample cannot become answer evidence: ${id}`,()=>{
  const row=JSON.parse(readFileSync(`docs/voicecare-evaluation/final-expanded-20260907/domain-${id}-live.json`,"utf8"));
  assert.ok(row.response.officialSearch.evidence.length>0);
  for(const evidence of row.response.officialSearch.evidence){
    assert.equal(matchesRequestedSubject(evidence.excerpt,row.question),false);
    assert.equal(answersRequestedDetail(evidence.excerpt,row.question),false);
  }
});
