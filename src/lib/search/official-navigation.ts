import "server-only";
import { normalizeEvidence, type OriginalPage } from "./fetch-official-source";

// Retrieval vocabulary only; no URL, eligibility, fee or contact is inferred here.
export function retrievalTerms(query:string):string[] {
  const aliases: [RegExp,string][]=[[/소파|가구|침대/,"대형폐기물"],[/보건증/,"건강진단결과서"],[/정장/,"면접"],[/버스/,"버스"],[/도서관|전자책/,"도서관"],[/전자책/,"전자도서관"],[/회원증/,"회원가입"],[/담배|금연/,"금연"],[/담배|금연/,"금연클리닉"],[/청년/,"청년"],[/주차/,"주차"],[/공연/,"공연"],[/준비물/,"구비서류"],[/전입/,"전입신고"],[/청년.*모임|공공.*공간/,"공간공유"]];
  const clean=query.replace(/성남시청|성남시|성남|시청|분당구|중원구|수정구|공식|안내|어떻게|어디서|어디|알려|방법|신청|하는|할수|수있|지원|처음|만드는|만들어|이용|싶어요|홈페이지|사이트|공공|공간|무료|시에서|알아|주세요/g," ");
  const stop=new Set(["에서","으로","어떤","무슨","있는","있어요","있나요","가능","가능해요","가요","가져가면","빌릴","만들","찾아줘","알려줘","할수","되나요","하는데","싶은데","어디로","버리는"]);
  const terms:string[]=(clean.match(/[가-힣]{2,}|[a-z]{3,}/gi)??[])
    .map(t=>t.replace(/(?:에서는|에서|으로|들이|들은|에게)$/,""))
    .filter(t=>t.length>=2&&!stop.has(t));
  for(const [pattern,term] of aliases)if(pattern.test(query))terms.push(term);
  return [...new Set(terms)];
}
export function navigationScore(title:string,query:string):number {
  const target=title.replace(/\s/g,"");let score=0;
  for(const term of retrievalTerms(query)){
    if(target.includes(term))score+=term.length*3;
    else {
      let longest=0;
      for(let size=2;size<=term.length;size++)for(let i=0;i<=term.length-size;i++)if(target.includes(term.slice(i,i+size)))longest=Math.max(longest,size);
      if(longest>=3)score+=longest*3;
    }
  }
  return score;
}
export function relevantNavigation(page:OriginalPage,query:string) {
  return (page.navigation??[]).map(l=>({...l,score:navigationScore(l.title,query)
    + (/버스/.test(query)&&/^(교통|교통 자동차)$/.test(l.title)?25:0)
    + (/시청/.test(query)&&/주차|대중교통|가는/.test(query)&&/오시는\s*길/.test(l.title)?30:0)
    + (/정장/.test(query)&&/일자리센터/.test(l.title)?20:0)
    + (/거주자우선/.test(query)&&/도시개발공사/.test(l.title)?30:0)
    + (/여권/.test(query)&&/일반여권|여권사무/.test(l.title)?30:0)
    + (/여권/.test(query)&&/어디|어딜|장소|어느/.test(query)&&/여권신청접수/.test(l.title)?55:0)
    + (/대형폐기물/.test(page.title)&&/소파|폐기물|가구/.test(query)&&/신청안내|신청절차/.test(l.title)?30:0)
    + (/청년/.test(query)&&/공간|모임/.test(query)&&/공간공유|센터소개/.test(l.title)?30:0)
    + (/도서관/.test(query)&&/회원/.test(query)&&/회원가입/.test(l.title)?30:0)
    + (/담배|금연/.test(query)&&/보건소/.test(l.title)?20:0)
    + (/문화재단/.test(query)&&/예매안내/.test(l.title)?40:0)
    + (/거주자우선/.test(query)&&/거주자/.test(l.title)&&/이용안내/.test(l.title)?50:0)
    + (/거주자/.test(page.title)&&/거주자/.test(query)&&/이용안내/.test(l.title)&&new URL(l.url).pathname.split("/")[1]===new URL(page.url).pathname.split("/")[1]?50:0)
  })).filter(l=>l.score>=6)
    .sort((a,b)=>b.score-a.score||a.title.length-b.title.length).slice(0,3);
}
/** Relevance needs the requested detail, not merely a shared subject word. */
export function matchesRequestedSubject(text:string,query:string,today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul"}).format(new Date())):boolean {
  if(/금연|담배/.test(query)&&/상담|끊/.test(query)&&!/금연/.test(text))return false;
  // Passport certificates are not applications for an actual passport.
  if(/여권/.test(query)&&!/증명|기록|실효|정보/.test(query)) {
    const withoutCertificates=text.replace(/여권\s*(?:발급\s*기록|발급\s*신청\s*서류|정보|실효)\s*(?:증명서|확인서)/g,"");
    if(!/여권\s*(?:발급|신청|민원|사무)|일반여권|여권(?:은|을|의)\s*[^.]{0,80}(?:신청|발급)/.test(withoutCertificates))return false;
  }
  // A different organizer's event cannot stand in for the requested institution.
  if(/문화재단/.test(query)&&!/성남문화재단|성남아트센터/.test(text))return false;
  // Explicitly ended events are historical, even if the user did not say 'today'.
  if(/공연|음악회|콘서트/.test(query)&&!/지난|과거|작년|재작년|종료된|\d{4}년|\d{4}[-./]\d{1,2}/.test(query)) {
    const period=text.match(/행사기간\s*(\d{4}-\d{2}-\d{2})\s*[~～–—]\s*(\d{4}-\d{2}-\d{2})/);
    if(period&&period[2]<today)return false;
  }
  // A venue's access directions do not answer a citywide transit question.
  const generalBus=/버스/.test(query)&&!/시청|역에서|역까지|도서관|보건소|센터|박람회|행사|공연|정장|청년|장애|휠체어/.test(query);
  if(generalBus&&/채용|취업|박람회|면접|행사장/.test(text))return false;
  // Temporary pandemic membership procedures are not ordinary first-time registration.
  if(/회원증|회원가입/.test(query)&&!/한시|임시|코로나|2020/.test(query)&&/한시적|임시휴관|코로나19/.test(text))return false;
  // A performance venue mentioned in a career lecture is not a performance program.
  if(/공연/.test(query)&&!/특강|진로|문화재단/.test(query)&&! /공연|음악회|콘서트|연극|뮤지컬/.test(text.replace(/공연장/g,"")))return false;
  return true;
}
export function answersRequestedDetail(text:string,query:string):boolean {
  if(!matchesRequestedSubject(text,query))return false;
  if(navigationScore(text,query)<6)return false;
  if(/여권/.test(query)&&!/증명|기록|실효/.test(query)&&/어디|어딜|장소|어느/.test(query)&&!/접수\s*(?:장소|처)|성남시청.{0,30}(?:민원실|여권)/.test(text))return false;
  if(/버스/.test(query)&&!/장애|지원|휠체어|특별교통/.test(query)&&!(/버스/.test(text)&&/노선|경로|교통카드|승차|하차|요금|정류장/.test(text)))return false;
  if(/준비물|구비서류/.test(query)&&!(/신분증|사진/.test(text)&&/서류|신청서/.test(text)))return false;
  if(/청년/.test(query)&&/모임|공공\s*공간/.test(query)&&!(/공간|센터/.test(text)&&/[가-힣]+(?:대로|로|길)\s*\d|역\s*\d번\s*출구|대관\s*(신청|방법)/.test(text)))return false;
  if(/시청/.test(query)&&/주차/.test(query)&&!(/시청/.test(text)&&/주차요금|무료|운영시간/.test(text)))return false;
  if(/전자책/.test(query)&&!(/전자책|전자도서관/.test(text)&&/대출|로그인|회원/.test(text)))return false;
  if(/회원증/.test(query)&&!(/회원증.{0,20}발급|회원가입\s*안내|정회원\s*가입/.test(text)&&/신분증|가입/.test(text)))return false;
  if(/금연|담배/.test(query)&&/무료|비용|돈|유료/.test(query)&&!(/금연/.test(text)&&/상담/.test(text)&&/무료\s*(?:금연\s*)?상담|상담(?:\s*서비스)?\s*(?:비용|요금|료|은|는|이|가|:|：)*\s*(?:무료|0원)/.test(text)))return false;
  if(/전입신고/.test(query)&&!(/전입신고/.test(text)&&/온라인|인터넷|정부24/.test(text)))return false;
  if(/판교역/.test(query)&&/시청/.test(query)&&!(/판교역/.test(text)&&/시청/.test(text)&&/버스|지하철/.test(text)))return false;
  if(/거주자우선/.test(query)&&!(/거주자.{0,3}(전용|우선)|거주자주차/.test(text)&&/신청\s*및\s*이용자격|신청방법|신청절차|접수방법/.test(text)))return false;
  if(/문화재단/.test(query)&&!(/문화재단|성남아트센터/.test(text)&&/예매/.test(text)))return false;
  if(/민원\s*넣/.test(query)&&!/성남시에 바란다|국민신문고|민원상담/.test(text))return false;
  if(/음식물/.test(query)&&!(/음식물/.test(text)&&/배출|봉투/.test(text)))return false;
  return true;
}
export function relevantOriginalSection(page:OriginalPage,query:string):string|undefined {
  const sections=page.sections??[];
  if(!matchesRequestedSubject([page.title,...page.paragraphs,...sections].join(" "),query))return undefined;
  const combined=sections.join(" ");
  if(/준비물|구비서류/.test(query)&&combined.length<=6000&&answersRequestedDetail(combined,query))return combined;
  return [...sections].map(value=>({value,score:navigationScore(normalizeEvidence(value),query)}))
    .filter(s=>s.score>=6&&answersRequestedDetail(s.value,query)).sort((a,b)=>b.score-a.score)[0]?.value;
}
