import { SERVICE_GUIDES } from '@/data/public-data/service-guides';
import { PUBLIC_INFORMATION_DOCUMENTS } from '@/data/public-data/documents';
import type { PublicInformationDocument } from '@/types/public-data';
import type { PublicInformationAnswer } from '@/types/public-information';

/** Query-specific presentation of reviewed facts; no generative model or text truncation. */
export function guideAnswer(question: string, document: PublicInformationDocument): Partial<PublicInformationAnswer> | undefined {
  const guide = SERVICE_GUIDES[document.id];
  const reviewed = PUBLIC_INFORMATION_DOCUMENTS.find(source => source.id === document.id);
  if (!guide || !reviewed || document.originalUrl !== reviewed.originalUrl || document.content !== reviewed.content) return undefined;
  // Exclude the service name ("버스요금 지원" is not itself a fee question),
  // while retaining an explicit usage request carried in the kiosk title.
  const subjectTitle = document.title.replace(/\s+이용\s*안내$/, '');
  const query = question.replace(subjectTitle, '');
  const wants = {
    documents: /서류|준비물|준비해|준비해야|챙겨야/.test(query),
    eligibility: /누가|누구|자격|대상|조건/.test(query),
    cost: /요금|비용|얼마|금액|무료|수수료/.test(query),
    contact: /전화|연락|문의/.test(query),
    application: /신청|접수|등록|절차|어떻게|이용.*(?:방법|안내)|다음/.test(query),
    location: /어디|주소|위치|장소/.test(query) && !/신청|접수/.test(query),
    hours: /몇\s*시|시간|언제/.test(query),
  };
  const unknown = (name:string) => `확인한 공식 안내에 ${name}이 명시되지 않았습니다. ${guide.contacts[0]?.label ?? '공식 안내의 담당 부서'}에 확인하세요.`;
  const summaries: string[] = [];
  if (wants.documents) summaries.push(...(guide.documents ?? [unknown('제출서류 목록')]));
  if (wants.eligibility) summaries.push(...guide.eligibility);
  if (wants.cost) summaries.push(...(guide.cost ?? [unknown('비용')]));
  if (wants.contact) summaries.push(guide.contacts.map(c=>`${c.label}: ${c.phone ?? c.url}`).join(' / '));
  if (wants.application) summaries.push(/어떻게.*이용|이용.*(?:방법|안내)/.test(query) ? guide.overview : guide.application[0]);
  if (wants.location) summaries.push(...(guide.location ?? [guide.application[0]]));
  if (wants.hours) summaries.push(...(guide.hours ?? [unknown('상세 운영시간')]));
  const overview = !Object.values(wants).some(Boolean);
  return {
    plainLanguageSummary: summaries.length ? summaries.join('\n\n') : guide.overview,
    // Keep related conditions near the answer without repeating every field in every reply.
    eligibility: wants.eligibility ? [] : overview || wants.application ? [...guide.eligibility] : [],
    requiredItems: wants.documents ? [] : wants.application && guide.documents ? [...guide.documents] : [],
    steps: overview || wants.application ? guide.application.map((description,index)=>({order:index+1,title:`${index+1}단계`,description,sourceIds:[document.id]})) : [],
    contacts: [...guide.contacts],
    nextAction: {title:'이제 이렇게 해 보세요',description:[guide.next,guide.caution].filter(Boolean).join(' '),url:document.originalUrl},
  };
}
