import "server-only";
import { CLARIFICATIONS, type ClarificationId, type ServiceId } from "@/types/public-information-router";
import type { PublicInformationSearchResponse } from "@/types/public-information-search";
import type { OfficialSearchProvider, SearchFailure } from "@/types/official-search";
import { SEARCH_MESSAGES as MESSAGES } from "@/types/search-messages";
import { createPublicInformationResponseWithAnswer as legacy, finishStructuredResponse } from "./create-public-information-response-with-answer";
import { structuredBoundary } from "./structured-boundary";
import { needsLiveOfficialEvidence } from "./curated-query-policy";
import { validatePublicInformationSearchRequest, type PublicInformationSearchServiceResult } from "./create-public-information-search-response";
import { createOfficialSearchProvider } from "./openai-official-search";
import { regionBoundaryGuard } from "./region-boundary";
import { matchSafetyBoundary } from "@/lib/safety/safety-boundary";
import { getRoutingDocuments } from "@/lib/ai/service-catalog";
import { confidentKeywordResult, serviceScopeGuard, keywordDecision } from "./keyword-routing";
import { searchPublicInformation } from "./search-public-information";
import { redactQuestion } from "./official-source-policy";
import { mapDocumentsToPublicInformationAnswer } from "@/lib/public-information/map-documents-to-answer";
import type { PublicInformationDocument } from "@/types/public-data";
import { isJourneyRequest, JOURNEY_LIMIT } from "./question-scope";

function state(query:string,kind:PublicInformationSearchResponse["kind"],title:string,message:string):PublicInformationSearchServiceResult {
  return {status:200,body:{query,kind,results:[],hasResults:false,...(kind==="unsupported"?{routing:{source:"guard" as const,decision:{route:"UNSUPPORTED" as const,serviceIds:[] as [],intent:"other" as const,clarificationId:null}}}:{}),answer:{userQuestion:query,title,plainLanguageSummary:message,steps:[],nextAction:null,sources:[],verification:{status:"insufficient_data",checkedAt:null,details:message}}}};
}
function clarify(query:string,id:ClarificationId) {
  const result=state(query,"clarification","안내를 위해 확인해 주세요",CLARIFICATIONS[id].question);
  if("answer" in result.body){result.body.clarification={id};result.body.routing={source:"guard",decision:{route:"CLARIFY",serviceIds:[],intent:"other",clarificationId:id}};}
  return result;
}
const compact=(s:string)=>s.replace(/\s+/g,"");
const needsFreshEvidence=(query:string)=>needsLiveOfficialEvidence(query)||/예약|동시에|같이|함께|여권|쓰레기|주차|도서관|역사|관광/.test(query);
function curatedResponse(query:string,document:PublicInformationDocument):PublicInformationSearchServiceResult {
  return {status:200,body:{query,kind:"answer",results:[{document,score:0,matchedTerms:[]}],hasResults:true,
    answer:mapDocumentsToPublicInformationAnswer(query,[document]),routing:{source:"keyword",decision:keywordDecision(query,document.id as ServiceId)},answerGeneration:{status:"skipped",reason:"deterministic"}}};
}
/** Resolve only a short answer to the immediately preceding question; new topics discard it. */
export function resolveFollowup(query:string,context?:{question:string;clarificationId:ClarificationId}):{query:string;continued:boolean;uncertain:boolean} {
  if(!context)return {query,continued:false,uncertain:false};
  const q=compact(query);
  const options=CLARIFICATIONS[context.clarificationId].options as readonly string[];
  const number=q.match(/^([1-4])(?:번|번째)?(?:이요|요)?$/);
  let chosen=number?options[Number(number[1])-1]:options.find(x=>compact(x)===q);
  if(/^(잘모르겠어요|모르겠어요|몰라요|아무거나)$/.test(q))return {query:`${context.question} 분야별 공식 안내`,continued:true,uncertain:true};
  if(/^(다른도움|새질문)$/.test(q))return {query:"사용법",continued:false,uncertain:false};
  if(/^(그거|그게|거기|그걸)(요)?$/.test(q))return {query,continued:true,uncertain:true};
  if(context.clarificationId==="mobility_general") {
    if(/^(일반)?버스(?:요|이요)?$|^지하철(?:요|이요)?$/.test(q))chosen="일반 버스·지하철 이용";
    if(/^택시(?:요|이요)?$/.test(q))chosen="성남 일반 택시 이용 안내";
  }
  if(context.clarificationId==="mobility_purpose"&&/차량|차요|차가/.test(q))chosen="휠체어로 탈 차량";
  if(context.clarificationId==="mobility_purpose"&&/비용|요금/.test(q))chosen="이동 비용 도움";
  if(!/성남|분당구|중원구|수정구|여권|도서관/.test(q)) {
    if(context.clarificationId==="elderly_care_type"&&/안부|동행/.test(q)&&!/복지관/.test(q))chosen="노인맞춤돌봄서비스 안내";
    if(context.clarificationId==="health_visit_or_dementia"&&/집/.test(q)&&/간호사|건강/.test(q)&&!/기억력|치매/.test(q))chosen="맞춤형 방문건강관리 안내";
    if(context.clarificationId==="mobility_vehicle_or_fare"&&/휠체어/.test(q)&&/차량/.test(q)&&!/택시|비용|요금/.test(q))chosen="특별교통수단 운영 안내";
  }
  if(chosen==="잘 모르겠어요")return {query:`${context.question} 분야별 공식 안내`,continued:true,uncertain:true};
  if(chosen) {
    const expanded:Record<string,string>={"일반 버스·지하철 이용":"성남시 일반 버스 지하철 이용 안내", "타기 편한 차량 지원":"성남시 교통약자 이동 차량 지원 안내", "교통비 도움":"성남시 교통비 지원 종류", "휠체어로 탈 차량":"특별교통수단 신청 방법", "이동 비용 도움":"성남시 휠체어 이용자 교통비 지원 종류"};
    return {query:expanded[chosen]??chosen,continued:true,uncertain:false};
  }
  if(context.clarificationId==="region_required"&&/^(성남시|분당구|수정구|중원구|[가-힣]{2,8}동)(?:이요|요)?$/.test(q))return {query:`${query} ${context.question.replace(/가장\s*가까운|가까운|근처|주변/g,"")} 공식 시설 목록 주소`,continued:true,uncertain:false};
  if(context.clarificationId==="library_required"&&/^[가-힣]{2,16}도서관(?:이요|요)?$/.test(q))return {query:`${query} 오늘 휴관 운영 안내`,continued:true,uncertain:false};
  return {query,continued:false,uncertain:false};
}

/** Curated eligibility is a gate, not a keyword score. New fields fall through to search. */
export function curatedMatch(query:string) {
  if(needsFreshEvidence(query))return undefined;
  const result=confidentKeywordResult(query,searchPublicInformation(query));
  if(!result)return undefined;
  const decision=keywordDecision(query,result.document.id as ServiceId);
  if(serviceScopeGuard(query,decision))return undefined;
  return result;
}

const defaultProvider=createOfficialSearchProvider();
export async function createExpandedPublicInformationResponse(payload:unknown,provider:OfficialSearchProvider=defaultProvider):Promise<PublicInformationSearchServiceResult> {
  const validation=validatePublicInformationSearchRequest(payload);if(!validation.valid)return validation.response;
  const original=validation.request.query;
  if(matchSafetyBoundary(original))return legacy({query:original},()=>({status:"disabled"}));
  const context=validation.request.context;
  const follow=resolveFollowup(original,context);
  if(follow.continued&&context&&regionBoundaryGuard(context.question)&&!/(?:말고|아니고)\s*성남/.test(context.question))return state(original,"unsupported","성남 지역 안내 서비스입니다","직전 질문은 다른 지역에 관한 내용입니다. 해당 지역의 공식 홈페이지에서 확인하거나 성남에 관한 새 질문을 적어 주세요.");
  let query=follow.query.normalize("NFKC");
  // Negated outside location does not override an explicitly corrected local target.
  query=query.replace(/(?:서울|부천시?|수원시?|용인시?|부산)(?:은|는|이|가)?\s*(?:말고|아니고|아닌)\s*(?=성남|분당|수정구|중원구)/g,"");
  const localInstitution=/(성남시청|성남시|성남|분당구|수정구|중원구)/.test(query);
  const residencyQuestion=localInstitution&&/(사는|살고|거주)/.test(query)&&/(성남(?:시청|시)?|분당구|수정구|중원구).{0,25}(이용|신청|만들|발급|가능|회원|여권)/.test(query);
  if(regionBoundaryGuard(query)&&!residencyQuestion)return state(original,"unsupported","성남 지역 안내 서비스입니다","요청하신 다른 지역의 신청처를 성남 안내로 대신할 수 없습니다. 해당 지역 지자체 공식 홈페이지에서 확인해 주세요. 성남 기관 이용에 관한 질문이라면 기관과 이용 목적을 함께 알려주세요.");
  if(/시스템\s*(프롬프트|지침)|api\s*키|비밀\s*키|지침.{0,12}무시|명단|주민등록번호|개인\s*신상|진단해|확진|수급.{0,5}확정|대신.{0,8}(접수|신청)(?:해\s*줘|해\s*주세요|해라)|맛집|주식.{0,6}추천|업체.{0,6}(평가|순위)|파이썬|자바스크립트|소설\s*써/i.test(query))
    return state(original,"unsupported","안내할 수 있는 범위를 확인해 주세요","개인정보 조회, 진단·자격 확정, 실제 신청·접수, 민간 평가와 일반 작업은 제공하지 않습니다. 성남의 공공 제도, 이용 방법, 공식 상담·신청 안내는 질문할 수 있습니다.");
  if(/^(안녕(?:하세요)?|안녕하세요[.!?]?|고마워요|감사합니다|사용법|도움말|어떻게\s*사용해(?:요)?)[.!?\s]*$/.test(query))
    return state(original,"guidance","성남 공공·생활정보를 물어보세요","성남시를 기본 지역으로 안내합니다. 필요한 일을 글이나 음성으로 질문하고, 확인 질문이 나오면 선택하거나 짧게 답해 주세요. 출처와 확인 상태를 함께 읽어 주세요.");
  if(isJourneyRequest(query))return state(original,"unsupported","정확한 길찾기는 지원하지 않습니다",JOURNEY_LIMIT);
  // A request with no subject needs user input, not a paid search or a guessed service.
  const subject=query.replace(/성남시?|분당구|수정구|중원구|어떻게|알려\s*줘|알려\s*주세요|신청|방법|서류|준비물|연락처|운영시간|지원|도움|복지|해\s*줘|해\s*주세요/g,"").replace(/[^가-힣a-z0-9]/gi,"").replace(/^(해|요|이요|좀|부탁해요)$/g,"");
  if(!subject && !follow.continued)return clarify(original,"service_required");
  const structured = !residencyQuestion && structuredBoundary(query, context);
  if (structured) {
    const empty = state(original,"answer","","");
    if ("answer" in empty.body) return finishStructuredResponse(empty.body,structured,structured.route==="DIRECT"?"keyword":"guard");
  }
  if(follow.uncertain&&/^(그거|그게|거기|그걸)(요)?$/.test(compact(original))) {
    if(context?.clarificationId==="referent_required")return state(original,"guidance","새 질문을 적어 주세요","앞선 선택을 확인하기 어렵습니다. 원하는 일을 새 질문으로 적어 주세요. 예: 성남에서 일반 버스 이용 방법");
    return clarify(original,"referent_required");
  }
  if(!follow.continued) {
    if(/^(?:성남(?:시)?\s*)?(?:복지|복지\s*지원)(?:는|가|은)?\s*(?:뭐\s*있어(?:요)?|뭐가\s*있어(?:요)?|알려\s*줘|종류|안내)[?.!\s]*$/.test(query))return clarify(original,"service_required");
    if(/^(?:성남(?:시)?\s*)?교통\s*지원\s*(?:알려\s*줘|뭐\s*있어(?:요)?|종류|안내)[?.!\s]*$/.test(query))return clarify(original,"mobility_general");
    if(/이동\s*수단|교통\s*수단|이동할\s*때.{0,10}도움/.test(query)&&!/특별교통|장애인|휠체어|버스|지하철/.test(query))return clarify(original,"mobility_general");
    if(/휠체어/.test(query)&&/병원/.test(query)&&!/차량|탈\s*차|비용|요금|특별교통/.test(query))return clarify(original,"mobility_purpose");
    if(/청년\s*지원/.test(query)&&/뭐|어떤|종류/.test(query)&&!/일자리|주거|생활비|교육/.test(query))return clarify(original,"youth_purpose");
    if(/도서관/.test(query)&&/오늘|내일|열어|열었/.test(query)&&/^(?:성남|성남시|분당|분당구|수정구|중원구)?\s*도서관/.test(query))return clarify(original,"library_required");
    if(/가까|근처|주변/.test(query)&&!/(성남시|분당구|수정구|중원구|[가-힣]{2,8}동)/.test(query))return clarify(original,"region_required");
  }
  const curated=curatedMatch(query);
  if(curated&&!residencyQuestion) return curatedResponse(original,curated.document);
  // Specific, unambiguous everyday requests also use a curated document without a model call.
  const named = !needsFreshEvidence(query)&&!/말고|아니|오늘|지금|근처|가까/.test(query) && (
    /휠체어.{0,12}(부를.{0,5}차|탈.{0,4}차|차량)/.test(query)?"seongnam-special-transportation":
    /(혼자.{0,8}(어머니|아버지|어르신)|어르신).{0,12}안부/.test(query)?"seongnam-senior-tailored-care":
    /등본.{0,10}기계|기계.{0,10}등본/.test(query)?"seongnam-unmanned-civil-service-kiosk":null);
  if(named){const doc=getRoutingDocuments().find(d=>d.id===named)!;return curatedResponse(original,doc);}
  const redacted=redactQuestion(query);
  const result=await provider.search(redacted.text,AbortSignal.timeout(27_000));
  const hasEvidence=result.evidence.length>0;
  const kind=hasEvidence?"partial_answer":result.links.length?"official_links":"search_unavailable";
  const message=hasEvidence?"질문과 관련해 대조한 공식 원문입니다. 게시·수정일과 현재 적용 여부는 확인되지 않았습니다. 개인별 자격이나 현재 접수 가능 여부를 확정하지 않습니다.":result.links.length?"관련 공식 페이지를 확인했습니다. 질문의 상세 내용은 원문과 충분히 대조하지 못했습니다. 아래 링크에서 확인해 주세요.":MESSAGES[result.status as SearchFailure]??MESSAGES.source_unverified;
  const response=state(original,kind,hasEvidence?"확인한 공식 원문과 남은 확인 사항":result.links.length?"공식 페이지에서 확인해 주세요":"공식 검색을 완료하지 못했습니다",message);
  if("answer" in response.body)response.body.officialSearch={...result,region:"성남시",searched:result.usage?.cacheHit===true||(result.usage?.toolCalls??0)>0};
  return response;
}
