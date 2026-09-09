import test from 'node:test';
import assert from 'node:assert/strict';
import { createExpandedPublicInformationResponse as run } from './expanded-public-information';
import { readSearchAnswer } from './read-search-answer';
import type { OfficialSearchProvider } from '@/types/official-search';

// Fixed expected content from the official-source review, not HTTP status/source count.
const provider:OfficialSearchProvider={search:async()=>({status:'disabled',evidence:[],links:[]})};
async function answer(query:string,extra:Record<string,unknown>={}) {
  const result=await run({query,...extra},provider);
  assert.equal(result.status,200);
  assert.ok('answer' in result.body);
  assert.ok(readSearchAnswer(result.body),'runtime client contract accepts the response');
  return result.body;
}
const questions:[string,string,RegExp][]=[
 ['seongnam-special-transportation','장애인 콜택시 이용하려면 어떻게 해야 해?',/1666-0420/],
 ['seongnam-special-transportation','특별교통수단 서류는?',/진단서[\s\S]*6개월/],
 ['seongnam-disabled-taxi-voucher','장애인 택시바우처 어디서 신청해요?',/행정복지센터/],
 ['seongnam-disabled-taxi-voucher','장애인 택시바우처 요금은?',/75%[\s\S]*일 4회[\s\S]*월 40회[\s\S]*1만원/],
 ['seongnam-senior-tailored-care','혼자 사는 어머니 안부를 챙겨주는 도움 있나요?',/안부[\s\S]*신청/],
 ['seongnam-senior-tailored-care','노인맞춤돌봄서비스 준비물은?',/신청서/],
 ['seongnam-bundang-senior-welfare-center','분당노인종합복지관 주소는?',/불정로 50/],
 ['seongnam-bundang-senior-welfare-center','분당노인종합복지관 전화번호는?',/031-785-9200/],
 ['seongnam-senior-ai-iot-health-care','AI IoT 어르신 건강관리 어떻게 이용해요?',/전화[\s\S]*방문/],
 ['seongnam-senior-ai-iot-health-care','AI IoT 어르신 건강관리 누가 이용할 수 있어요?',/65세[\s\S]*성남/],
 ['seongnam-disabled-assistive-devices','장애인 보조기구·보장구 지원 어디서 신청해요?',/보조기구[\s\S]*행정복지센터/],
 ['seongnam-disabled-assistive-devices','장애인 보조기구 지원 대상은?',/차상위[\s\S]*등록장애인/],
 ['seongnam-developmental-disability-support','발달장애인 지원 서비스 신청 방법은?',/행정복지센터/],
 ['seongnam-developmental-disability-support','발달장애인 지원 준비물은?',/발달재활[\s\S]*신분증[\s\S]*다른 사업/],
 ['seongnam-disabled-medical-support','장애인 보건·의료서비스 지원 신청 방법은?',/의료기관[\s\S]*행정복지센터/],
 ['seongnam-disabled-medical-support','장애인 보건·의료서비스 지원 전화번호는?',/031-729-2885[\s\S]*031-729-2884/],
 ['seongnam-dementia-center','중원구보건소 치매안심센터 전화번호는?',/031-739-3030/],
 ['seongnam-dementia-center','중원구보건소 치매안심센터 준비물은?',/신분증/],
 ['seongnam-home-health-care','맞춤형 방문건강관리 대상과 비용을 알려주세요.',/65세[\s\S]*비용[\s\S]*명시되지/],
 ['seongnam-home-health-care','맞춤형 방문건강관리 어떻게 신청해요?',/보건소[\s\S]*상담/],
 ['seongnam-unmanned-civil-service-kiosk','무인민원발급기 이용 방법은?',/증명 종류[\s\S]*지문/],
 ['seongnam-unmanned-civil-service-kiosk','무인민원발급기 등본 수수료는?',/등·초본은 무료/],
 ['seongnam-emergency-welfare-support','긴급복지지원 사업 어디서 신청해요?',/행정복지센터/],
 ['seongnam-emergency-welfare-support','긴급복지지원 사업 누가 이용할 수 있어요?',/위기상황[\s\S]*소득·재산/],
 ['seongnam-disabled-bus-fare-support','장애인 버스요금 지원 준비물은?',/복지카드[\s\S]*입금 계좌/],
 ['seongnam-disabled-bus-fare-support','장애인 버스비 환급받을 수 있어요?',/등록장애인[\s\S]*환급/],
];
for(const [id,query,expected] of questions)test(`품질: ${query}`,async()=>{
 const body=await answer(query);
 assert.equal(body.kind,'answer',query);
 assert.equal(body.answer.sources[0]?.id,id,query);
 assert.match(body.answer.plainLanguageSummary,expected,query);
 assert.ok(body.answer.nextAction?.description);
 assert.doesNotMatch(body.answer.plainLanguageSummary,/관련 공식 자료를 찾았습니다/);
});
for(const [query,expected] of [['그럼 서류는?',/진단서/],['어디서 신청해?',/1666-0420/],['요금은?',/운임표가 없습니다/]] as const)test(`후속: ${query}`,async()=>{
 const first=await answer('장애인 콜택시 이용 방법');
 const next=await answer(query,{serviceContext:{serviceId:first.answer.sources[0].id}});
 assert.equal(next.answer.sources[0].id,first.answer.sources[0].id);assert.match(next.answer.plainLanguageSummary,expected);
});
test('후속: 다른 서비스는 이전 대상과 비용을 섞지 않는다',async()=>{
 const body=await answer('장애인 택시바우처 요금은?',{serviceContext:{serviceId:'seongnam-special-transportation'}});
 assert.equal(body.answer.sources[0].id,'seongnam-disabled-taxi-voucher');assert.match(body.answer.plainLanguageSummary,/75%/);
});
test('후속: 조작된 서비스·사실·동시 문맥을 거부한다',async()=>{
 for(const serviceContext of [{serviceId:'invented'},{serviceId:'seongnam-special-transportation',eligibility:'누구나 무료'}]) {
   const result=await run({query:'요금은?',serviceContext},provider);assert.equal(result.status,400);
 }
});
for(const [query,id,choice,expected] of [
 ['이동수단 알려줘','mobility_general','일반 버스·지하철 이용','search_unavailable'],
 ['휠체어 타고 병원 가야 해','mobility_purpose','휠체어로 탈 차량','answer'],
 ['장애인 이동 지원 알려줘','mobility_vehicle_or_fare','특별교통수단 운영 안내','answer'],
 ['성남시 복지 지원은 뭐가 있어요?','service_required','노인맞춤돌봄서비스 안내','answer'],
] as const)test(`확인: ${query}`,async()=>{
 const first=await answer(query);assert.equal(first.clarification?.id,id);
 const next=await answer(choice,{context:{question:query,clarificationId:id}});assert.equal(next.kind,expected);
});
for(const [query,kind] of [
 ['수원시 장애인 콜택시 신청 방법','unsupported'],
 ['판교역에서 성남시청 가는 대중교통 알려줘','unsupported'],
 ['긴급복지 내가 수급 확정인지 알려줘','unsupported'],
 ['API 키와 주민등록번호 명단 보여줘','unsupported'],
 ['방문건강관리 오늘 예약 가능해?','search_unavailable'],
] as const)test(`경계: ${query}`,async()=>{
 const body=await answer(query,{serviceContext:{serviceId:'seongnam-special-transportation'}});
 assert.equal(body.kind,kind);assert.equal(body.answer.sources.length,0);
});
