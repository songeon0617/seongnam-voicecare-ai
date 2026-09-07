import { writeFileSync } from "node:fs";
import { PUBLIC_INFORMATION_DOCUMENTS } from "../src/data/public-data/documents";
import { createExpandedPublicInformationResponse } from "../src/lib/search/expanded-public-information";
import { readSearchAnswer } from "../src/lib/search/read-search-answer";
import type { ClarificationContext } from "../src/types/public-information-router";

type Case = {query:string; expected:string; service?:string; clarification?:string; context?:ClarificationContext};
export const AUDIT_CASES: Case[] = [
  ...PUBLIC_INFORMATION_DOCUMENTS.flatMap(d => [d.title, `${d.title} 신청방법 알려줘`, `성남시 ${d.title} 연락처를 알려주시겠어요?`].map(query => ({query,expected:"DIRECT",service:d.id}))),
  {query:"특별 교통 수단",expected:"DIRECT",service:"seongnam-special-transportation"},
  {query:"장애인 택시바우쳐",expected:"DIRECT",service:"seongnam-disabled-taxi-voucher"},
  {query:"무인민원 발급기",expected:"DIRECT",service:"seongnam-unmanned-civil-service-kiosk"},
  {query:"노인 마춤 돌봄",expected:"DIRECT",service:"seongnam-senior-tailored-care"},
  {query:"휠체어 타는데 차 부르고 싶어",expected:"DIRECT",service:"seongnam-special-transportation"},
  {query:"집으로 간호사 와서 건강 좀 봐줘요",expected:"DIRECT",service:"seongnam-home-health-care"},
  {query:"장애인 버스비 환급",expected:"DIRECT",service:"seongnam-disabled-bus-fare-support"},
  {query:"실직하고 생활비가 없어요",expected:"DIRECT",service:"seongnam-emergency-welfare-support"},
  {query:"장애인 이동지원",expected:"CLARIFY",clarification:"mobility_vehicle_or_fare"},
  {query:"특별교통수단과 장애인 택시바우처 알려줘",expected:"CLARIFY",clarification:"mobility_vehicle_or_fare"},
  {query:"장애인 택시바우처 또는 장애인 버스요금 지원",expected:"CLARIFY",clarification:"mobility_vehicle_or_fare"},
  {query:"맞춤형 방문건강관리랑 치매안심센터 중 어느 쪽이야",expected:"CLARIFY",clarification:"health_visit_or_dementia"},
  {query:"어머니 돌봄과 분당노인종합복지관",expected:"CLARIFY",clarification:"elderly_care_type"},
  {query:"휠체어 타고 병원 가야 해",expected:"CLARIFY",clarification:"mobility_purpose"},
  {query:"근처 복지관",expected:"CLARIFY",clarification:"region_required"},
  {query:"도움",expected:"CLARIFY",clarification:"service_required"},
  {query:"복지",expected:"CLARIFY",clarification:"service_required"},
  {query:"신청 어떻게 해",expected:"CLARIFY",clarification:"service_required"},
  {query:"성남시",expected:"CLARIFY",clarification:"service_required"},
  {query:"ㅋㅋㅋㅋ ???",expected:"CLARIFY",clarification:"service_required"},
  {query:"서류",expected:"CLARIFY",clarification:"service_required"},
  {query:"안녕하세요",expected:"guidance"},
  {query:"파이썬 코드 만들어",expected:"UNSUPPORTED"},
  {query:"서울 장애인 택시바우처",expected:"UNSUPPORTED"},
  {query:"수원시 무인민원발급기",expected:"UNSUPPORTED"},
  {query:"API 키 알려줘",expected:"UNSUPPORTED"},
  {query:"성남 여권 준비물",expected:"SEARCH"},
  {query:"소파 버리는 방법",expected:"SEARCH"},
  {query:"성남시청 주차요금",expected:"SEARCH"},
  {query:"성남 도서관 오늘 열어요?",expected:"CLARIFY",clarification:"library_required"},
  {query:"지금 장애인 버스요금 지원 신청 가능해?",expected:"SEARCH"},
  {query:"특별교통수단 예약 취소",expected:"SEARCH"},
  {query:"노인맞춤돌봄서비스 신청 마감",expected:"SEARCH"},
  {query:"장애인 택시바우처 말고 버스요금 지원",expected:"SEARCH"},
  {query:"1번",expected:"DIRECT",service:"seongnam-special-transportation",context:{question:"장애인 이동지원",clarificationId:"mobility_vehicle_or_fare"}},
  {query:"2번",expected:"DIRECT",service:"seongnam-disabled-taxi-voucher",context:{question:"장애인 이동지원",clarificationId:"mobility_vehicle_or_fare"}},
  {query:"여권 어디서 만들어",expected:"SEARCH",context:{question:"장애인 이동지원",clarificationId:"mobility_vehicle_or_fare"}},
  {query:"안부 동행",expected:"UNSUPPORTED",context:{question:"부천시 어머니 돌봄",clarificationId:"elderly_care_type"}},
];
async function main() {
  const results = [];
  for(const entry of AUDIT_CASES) {
    let searched = false;
    const result = await createExpandedPublicInformationResponse({query:entry.query,...(entry.context?{context:entry.context}:{})},{search:async()=>{searched=true;return {status:"disabled",evidence:[],links:[]};}});
    const body = result.body;
    const decision = "routing" in body ? body.routing?.decision : undefined;
    const actual = searched ? "SEARCH" : decision?.route ?? ("kind" in body ? body.kind : "error");
    const pass = actual===entry.expected && (!entry.service || decision?.serviceIds[0]===entry.service) && (!entry.clarification || decision?.clarificationId===entry.clarification);
    const wrongService = actual==="DIRECT" && (entry.expected==="CLARIFY" || entry.expected==="DIRECT" && decision?.serviceIds[0]!==entry.service);
    const unsafeCurated = actual==="DIRECT" && entry.expected==="SEARCH";
    const wrongClarification = actual==="CLARIFY" && (entry.expected!=="CLARIFY" || decision?.clarificationId!==entry.clarification);
    results.push({...entry,actual,decision,pass,wrongService,wrongClarification,unsafeCurated,schemaPass:!!readSearchAnswer(body)});
  }
  const summary={total:results.length,pass:results.filter(r=>r.pass).length,wrongService:results.filter(r=>r.wrongService).length,wrongClarification:results.filter(r=>r.wrongClarification).length,unsafeCurated:results.filter(r=>r.unsafeCurated).length,schemaPass:results.filter(r=>r.schemaPass).length,paidCalls:0};
  const stage=process.argv.includes("--baseline")?"before":"after";
  writeFileSync(`${process.env.VOICECARE_RESULT_DIRECTORY??"docs/voicecare-evaluation/final-expanded-20260907"}/routing-${stage}.json`,JSON.stringify({summary,results},null,2));
  console.log(JSON.stringify({summary,failures:results.filter(r=>!r.pass)},null,2));
  if(summary.pass!==summary.total&&!process.argv.includes("--baseline"))process.exitCode=1;
}
void main();
