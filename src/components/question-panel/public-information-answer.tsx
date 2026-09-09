import type { PublicDocumentFreshnessStatus, PublicDocumentStatus } from "@/types/public-data";
import type { ReactNode } from "react";
import type { InformationVerificationStatus, PublicInformationAnswer } from "@/types/public-information";
import styles from "./question-panel.module.css";
import { conciseAnswer } from "@/lib/public-information/concise-answer";

const VERIFICATION: Record<InformationVerificationStatus, string> = {
  verified: "공식 자료 확인됨",
  partially_verified: "일부 정보의 최신성을 추가로 확인해야 합니다",
  insufficient_data: "안내할 공식 자료가 부족합니다",
  unverified: "자료의 확인 상태를 추가로 확인해야 합니다",
};
const DOCUMENT_STATUS: Record<PublicDocumentStatus, string> = {
  active: "안내에 사용 중", review_required: "재검토 필요", expired: "유효기간 지남",
  superseded: "새 자료로 대체됨", excluded: "안내 대상 제외",
};
const FRESHNESS: Record<PublicDocumentFreshnessStatus, string> = {
  current: "확인일 기준 최신", possibly_outdated: "변경 가능성 있음",
  superseded: "새 자료로 대체됨", unknown: "최신성 미확인",
};

function CheckedDate({ value }: { value: string | null }) {
  return value ? <time dateTime={value}>{value.slice(0, 10)}</time> : <>미확인</>;
}

/** 서버가 승인한 답변만 렌더링한다. AI 상태로 검증 수준을 바꾸지 않는다. */
export function PublicInformationAnswerView({
  answer,
  isSpeaking = false,
  onReadConcise,
  onReadFull,
  followupQuestions,
}: {
  answer: PublicInformationAnswer;
  isSpeaking?: boolean;
  onReadConcise?: () => void;
  onReadFull?: () => void;
  followupQuestions?: ReactNode;
}) {
  const concise = conciseAnswer(answer);
  const expanded = concise !== answer.plainLanguageSummary;
  return (
    <div className={styles.searchResults}>
      <h3 className={styles.serviceTitle}>{answer.title}</h3>
      {answer.sources.length > 0 && <p className={styles.evidenceLabel}>공식 성남시 자료를 바탕으로 안내합니다.</p>}
      <p className={styles.summary} data-testid="answer-summary">{concise}</p>
      {onReadConcise && <div className={styles.speechControls}>
        <button type="button" onClick={onReadConcise} aria-label={isSpeaking ? "답변 읽기 중지" : "답변 듣기"} aria-pressed={isSpeaking}>
          {isSpeaking ? "중지" : "답변 듣기"}
        </button>
        {onReadFull && <button type="button" onClick={onReadFull}>상세 안내 전체 듣기</button>}
        <span>화면의 핵심 안내를 읽습니다. 출처와 확인 상태도 확인해 주세요.</span>
      </div>}
      {followupQuestions}
      {expanded && <details className={styles.detailSection}>
        <summary>자세한 내용 보기</summary>
        <p className={styles.summary}>
          {answer.plainLanguageSummary.split(/(?<=[.!?])(?=\s)/u).map((paragraph, index) => (
            <span className={styles.summaryParagraph} key={index}>{paragraph}</span>
          ))}
        </p>
        {onReadFull && <div className={styles.speechControls}><button type="button" onClick={onReadFull}>상세 안내 전체 듣기</button></div>}
      </details>}

      {answer.eligibility && answer.eligibility.length > 0 && <div className={styles.detailSection}>
        <h3>자료에 안내된 대상</h3>
        <ul>{answer.eligibility.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>}
      {answer.requiredItems && answer.requiredItems.length > 0 && <div className={styles.detailSection}>
        <h3>준비할 서류·물품</h3>
        <ul>{answer.requiredItems.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>}
      {answer.steps.length > 0 && <div className={styles.detailSection}>
        <h3>진행 순서</h3>
        <ol>{answer.steps.map((step) => <li key={step.order} value={step.order}>
          <strong>{step.title}</strong><p>{step.description}</p>
        </li>)}</ol>
      </div>}
      {answer.contacts && answer.contacts.length > 0 && <div className={styles.detailSection}>
        <h3>문의</h3>
        <ul>{answer.contacts.map((contact, index) => <li key={index}>
          {contact.label && <strong>{contact.label}</strong>}
          {contact.phone && <p>{/^0[0-9-]{8,13}$|^1[0-9-]{7,9}$/.test(contact.phone) ? <a href={`tel:${contact.phone}`}>{contact.phone} 전화하기</a> : contact.phone}</p>}
          {contact.url && <a href={contact.url} target="_blank" rel="noreferrer">문의 페이지 (새 창)</a>}
          {contact.availableHours && <p>{contact.availableHours}</p>}
        </li>)}</ul>
      </div>}
      {answer.locations && answer.locations.length > 0 && <div className={styles.detailSection}>
        <h3>장소</h3>
        <ul>{answer.locations.map((location, index) => <li key={index}>
          <strong>{location.organizationName}</strong>
          {location.address && <p>{location.address}</p>}
          {location.url && <a href={location.url} target="_blank" rel="noreferrer">장소 안내 (새 창)</a>}
        </li>)}</ul>
      </div>}
      {answer.nextAction && <div className={styles.detailSection}>
        <h3>다음 행동: {answer.nextAction.title}</h3>
        <p>{answer.nextAction.description}</p>
        {answer.nextAction.url && <a href={answer.nextAction.url} target="_blank" rel="noreferrer">공식 안내 열기 (새 창)</a>}
      </div>}

      {answer.sources.length > 0 && <a className={styles.sourceShortcut} href="#answer-sources">출처 {answer.sources.length}건과 확인 상태 보기</a>}

      <div id="answer-sources" className={styles.verification} tabIndex={-1}>
        <h3>자료 확인 상태</h3>
        <p>{VERIFICATION[answer.verification.status]}</p>
        <p>확인일: <CheckedDate value={answer.verification.checkedAt} /></p>
        {answer.verification.details && <p>{answer.verification.details}</p>}
      </div>
      {answer.sources.length > 0 && <div className={styles.sourceSection}>
        <h3>공식 출처</h3>
        <p className={styles.sourcesIntro}>성남시 공식 출처에서 자세한 내용을 확인하세요.</p>
        <ol className={styles.sourceList}>{answer.sources.map((source) => <li key={source.id}>
          <a href={source.url} target="_blank" rel="noreferrer">{source.title} (새 창)</a>
          {source.supportingSources?.map((support) => <p key={support.url}>
            <a href={support.url} target="_blank" rel="noreferrer">추가 근거: {support.title} (새 창)</a>
          </p>)}
          <p>출처: {source.organizationName}</p>
          <p>확인일: <CheckedDate value={source.checkedAt} /></p>
          <p>최신성: {FRESHNESS[source.freshnessStatus]}</p>
          <p>문서 상태: {DOCUMENT_STATUS[source.documentStatus]}</p>
          {source.evidenceSummary && <p>{source.evidenceSummary}</p>}
        </li>)}</ol>
      </div>}

    </div>
  );
}
