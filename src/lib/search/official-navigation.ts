import "server-only";
import { normalizeEvidence, type OriginalPage } from "./fetch-official-source";

// Retrieval vocabulary only; no URL, eligibility, fee or contact is inferred here.
export function retrievalTerms(query:string):string[] {
  const aliases: [RegExp,string][]=[[/소파|가구|침대/,"대형폐기물"],[/보건증/,"건강진단결과서"],[/정장/,"면접"],[/버스/,"버스"],[/도서관|전자책/,"도서관"],[/담배|금연/,"금연"],[/청년/,"청년"],[/주차/,"주차"],[/공연/,"공연"]];
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
  return (page.navigation??[]).map(l=>({...l,score:navigationScore(l.title,query)})).filter(l=>l.score>=6)
    .sort((a,b)=>b.score-a.score||a.title.length-b.title.length).slice(0,3);
}
export function relevantOriginalSection(page:OriginalPage,query:string):string|undefined {
  const sections=page.sections??[];
  return [...sections].map(value=>({value,score:navigationScore(normalizeEvidence(value),query)}))
    .filter(s=>s.score>=6).sort((a,b)=>b.score-a.score)[0]?.value;
}
