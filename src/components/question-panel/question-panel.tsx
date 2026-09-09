"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions";
import { readSearchAnswer } from "@/lib/search/read-search-answer";
import { conciseAnswer, completeAnswerSpeech } from "@/lib/public-information/concise-answer";
import { questionScope, JOURNEY_LIMIT } from "@/lib/search/question-scope";
import { CLARIFICATIONS, type ClarificationContext } from "@/types/public-information-router";
import {
  PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH,
  type PublicInformationSearchRequest,
} from "@/types/public-information-search";
import { PublicInformationAnswerView } from "./public-information-answer";
import { useVoiceInput } from "./use-voice-input";
import { useAnswerSpeech } from "./use-answer-speech";
import styles from "./question-panel.module.css";

const NO_RESULTS_MESSAGE =
  "현재 등록된 공식 자료에서 관련 정보를 찾지 못했습니다.";
const SEARCH_ERROR_MESSAGE =
  "검색 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
const SEARCHING_MESSAGE = "공식 자료를 찾고 안내를 준비하고 있습니다.";

const CURATED_QUESTION_CATEGORIES = [
  {
    id: "senior-welfare",
    label: "노인복지",
    description: "어르신 생활·돌봄 지원",
    questions: [
      "노인맞춤돌봄서비스는 어디서 신청하나요?",
      "분당노인종합복지관 주소와 연락처 알려주세요.",
    ],
  },
  {
    id: "disability-welfare",
    label: "장애인복지",
    description: "이동·보조·생활 지원",
    questions: [
      "장애인 택시바우처 신청하려면 어떻게 해요?",
      "장애인 보조기구·보장구 지원은 어디서 신청해요?",
      "발달장애인 지원 서비스 신청 방법을 알려주세요.",
    ],
  },
  {
    id: "transportation",
    label: "교통·이동지원",
    description: "이동지원 및 교통 정보",
    questions: [
      "특별교통수단 운영 신청에 필요한 서류가 뭐예요?",
      "장애인 버스비 환급받을 수 있어요?",
    ],
  },
  {
    id: "health",
    label: "보건·건강",
    description: "건강관리 및 보건 서비스",
    questions: [
      "중원구보건소 치매안심센터 연락처가 어떻게 되나요?",
      "맞춤형 방문건강관리 대상과 비용을 알려주세요.",
    ],
  },
  {
    id: "daily-life",
    label: "생활지원·민원",
    description: "일상생활 및 민원 안내",
    questions: [
      "무인민원발급기 이용 안내와 설치 장소를 알려주세요.",
      "긴급복지지원 사업은 어디서 신청하나요?",
    ],
  },
] as const;

type CuratedCategoryId = (typeof CURATED_QUESTION_CATEGORIES)[number]["id"];

export function QuestionPanel() {
  const [question, setQuestion] = useState("");
  const [voiceReview, setVoiceReview] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const [serviceContext, setServiceContext] = useState<string>();
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState<ReturnType<typeof readSearchAnswer>>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<CuratedCategoryId>();
  const [clarificationContext, setClarificationContext] = useState<ClarificationContext>();
  const activeRequest = useRef<AbortController | null>(null);
  const requestTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const speech = useAnswerSpeech(setNotice);
  useEffect(() => {
    if (!search) return;
    resultRef.current?.focus({ preventScroll: true });
    resultRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [search]);
  useEffect(() => () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    clearTimeout(requestTimeout.current);
  }, []);

  async function submitQuestion(text: string, fresh = false) {
    // disabled 렌더 전 같은 이벤트 턴의 중복 제출도 막는다.
    if (activeRequest.current) return;
    speech.stop();
    setIsLoading(false);
    const normalizedQuestion = text.trim();

    if (!normalizedQuestion) {
      setSearch(null);
      setNotice("질문을 입력하거나 아래 예시 질문을 선택해 주세요.");
      return;
    }

    if (normalizedQuestion.length > PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH) {
      setSearch(null);
      setNotice(`인식한 질문이 너무 깁니다. 입력 내용을 ${PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH}자 이하로 수정한 뒤 질문해 주세요.`);
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setVoiceReview(false);
    setIsLoading(true);
    setSearch(null);
    setNotice(SEARCHING_MESSAGE);
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30_000);
    requestTimeout.current = timeout;

    try {
      const response = await fetch("/api/public-information/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: normalizedQuestion,
          ...(!fresh && serviceContext && !clarificationContext ? { serviceContext: { serviceId: serviceContext } } : {}),
          ...(!fresh && clarificationContext ? { context: clarificationContext } : {}),
        } satisfies PublicInformationSearchRequest),
        cache: "no-store",
        signal: controller.signal,
      });
      if (activeRequest.current !== controller || controller.signal.aborted) return;
      if (response.status === 429) {
        const seconds = Number(response.headers.get("Retry-After"));
        const wait = Number.isFinite(seconds) && seconds > 0 && seconds <= 60
          ? `약 ${Math.ceil(seconds)}초 후 다시 질문해 주세요.`
          : "잠시 후 다시 질문해 주세요.";
        setNotice(`요청이 많아 잠시 기다려야 합니다. ${wait}`);
        return;
      }
      const body = readSearchAnswer(await response.json());
      if (activeRequest.current !== controller || controller.signal.aborted) return;

      if (!response.ok || !body) {
        throw new Error("Public information search request failed");
      }

      setSearch(body);
      setServiceContext(body.kind === "answer" && body.answer.sources.length === 1 ? body.answer.sources[0].id : undefined);
      setClarificationContext(body.clarification ? { question: normalizedQuestion, clarificationId: body.clarification.id } : undefined);
      setNotice(body.kind === "clarification" ? (body.clarification && CLARIFICATIONS[body.clarification.id].options.length > 0
        ? "도움의 종류를 확인해 주세요. 아래 선택지를 고르거나 입력란에 답해 주세요."
        : "도움의 종류를 확인해 주세요. 입력란에 답해 주세요.")
        : body.kind === "unsupported" ? body.answer.plainLanguageSummary
        : body.kind === "safety" ? "긴급 상황이라면 아래 번호로 사용자가 직접 연락해 주세요."
        : body.officialSearch || body.kind === "guidance" ? body.answer.plainLanguageSummary
        : body.hasResults ? "공식 자료 안내가 준비되었습니다. 아래에서 답변과 출처를 확인해 주세요." : NO_RESULTS_MESSAGE);
      if (body.kind === "clarification") setQuestion("");
    } catch {
      if (activeRequest.current === controller && (!controller.signal.aborted || timedOut)) {
        setSearch(null);
        setNotice(timedOut ? "응답이 지연되고 있습니다. 잠시 후 다시 질문해 주세요." : SEARCH_ERROR_MESSAGE);
      }
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setIsLoading(false);
      }
    }
  }

  const voice = useVoiceInput((text) => {
    setQuestion(text);
    setVoiceReview(true);

    setNotice(text.length > PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH
      ? `인식한 질문이 너무 깁니다. ${PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH}자 이하로 수정한 뒤 질문해 주세요.`
      : "인식한 내용을 확인한 뒤 ‘이 내용으로 찾기’를 눌러 주세요.");
  }, (message) => { setNotice(message);  });
  const isRecognizing = voice.state !== "idle";
  const scope = search && search.kind !== "safety" && search.kind !== "clarification" && (search.kind !== "unsupported" || search.answer.plainLanguageSummary === JOURNEY_LIMIT) ? questionScope(search.answer.userQuestion) : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Read the submitted control too: autofill or input before hydration can precede
    // React's onChange state update (observed in WebKit on a production build).
    const submittedQuestion = String(new FormData(event.currentTarget).get("question") ?? question);
    setQuestion(submittedQuestion);
    voice.cancel();
    await submitQuestion(submittedQuestion);
  }

  function selectExample(example: string, preserveContext = false) {
    voice.cancel();
    speech.stop();
    activeRequest.current?.abort();
    activeRequest.current = null;
    setQuestion(example);
    setNotice("");
    setSearch(null);
    setIsLoading(false);
    if (!preserveContext) { setClarificationContext(undefined); setServiceContext(undefined); }
  }

  function runCuratedQuestion(curatedQuestion: string) {
    selectExample(curatedQuestion);
    void submitQuestion(curatedQuestion, true);
  }

  const selectedCategory = CURATED_QUESTION_CATEGORIES.find(
    (category) => category.id === selectedCategoryId,
  );

  return (
    <section className={styles.panel} aria-label="질문하기">
      <div className={styles.panelHeading}>
        <h2>어떤 도움이 필요하세요?</h2>
      </div>
      <div className={styles.questionWorkspace}>
        <div className={styles.inputChoices}>
          <button className={styles.voiceButton} type="button"
            onClick={() => {
              speech.stop();
              if (isRecognizing) { voice.cancel(); setNotice("음성 입력을 취소했습니다. 글자로도 질문할 수 있습니다."); return; }
              activeRequest.current?.abort(); activeRequest.current = null;
              clearTimeout(requestTimeout.current);
              setIsLoading(false); setVoiceReview(false);  voice.start();
            }} aria-label={isRecognizing ? "음성 입력 취소" : "마이크로 질문하기"}
            aria-pressed={isRecognizing} aria-describedby="voice-help">
            <span aria-hidden="true">●</span>
            <strong>{isRecognizing ? "음성 입력 취소" : voiceReview ? "다시 말하기" : "눌러서 말하기"}</strong>
          </button>
        </div>
        <p id="voice-help" className={styles.voiceHelp}>{isRecognizing ? "듣고 있습니다. 끝나면 인식한 내용을 확인해 주세요." : "말한 내용을 확인한 뒤 질문을 보냅니다."}</p>
        {voice.preview && <p className={styles.voicePreview} aria-live="off">인식 중: {voice.preview}</p>}
        {<form className={styles.form} onSubmit={handleSubmit} aria-busy={isLoading}>
          <label htmlFor="question">{voiceReview ? "인식한 질문 · 글자로 고치기" : "글자로 질문하기"}</label>
          <div className={styles.inputRow}>
            <input ref={inputRef} id="question" name="question" type="text" value={question}
              onChange={(event) => { selectExample(event.target.value, true); }}
              placeholder={serviceContext ? "예: 준비물은?" : "질문을 적어 주세요"}
              autoComplete="off" maxLength={PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH} />
            <button type="submit" aria-label={isLoading ? "공식 자료 검색 중" : "질문 보내기"} disabled={isLoading}>
              {isLoading ? "검색 중…" : voiceReview ? "이 내용으로 찾기" : "질문하기"}
            </button>
          </div>
          {voiceReview && <button className={styles.textChoice} type="button" onClick={() => { setVoiceReview(false); setQuestion(""); setNotice("인식한 질문을 취소했습니다."); }}>인식한 질문 취소</button>}
        </form>}
        <p className={notice ? styles.notice : styles.answerPlaceholder} role="status" aria-live={speech.isSpeaking ? "off" : "polite"} aria-atomic="true">
          {notice}
        </p>
        <p className={styles.privacyNotice}>이름·주민등록번호 등 개인정보는 입력하지 마세요.</p>
        {isLoading && <button className={styles.textChoice} type="button" onClick={() => {
          activeRequest.current?.abort(); activeRequest.current = null; clearTimeout(requestTimeout.current);
          setIsLoading(false); setNotice("검색을 취소했습니다. 다른 질문을 입력할 수 있습니다.");
        }}>검색 취소</button>}
      </div>
      {!search && !isLoading && !clarificationContext && <div className={styles.examples}>
        <h3>지원 분야</h3>
        <div className={styles.categoryList} aria-label="지원 분야">
          {CURATED_QUESTION_CATEGORIES.map(category => <button key={category.id} type="button"
            aria-label={`${category.label} ${category.questions.length}개 질문`} aria-pressed={selectedCategoryId === category.id}
            onClick={() => { setSelectedCategoryId(category.id); setServiceContext(undefined); setClarificationContext(undefined); }}>
            {selectedCategoryId === category.id && <span aria-hidden="true">✓ </span>}{category.label}
          </button>)}
        </div>
        <h3 className={styles.exampleHeading}>{selectedCategory ? `${selectedCategory.label} 예시 질문` : "이렇게 물어보세요"}</h3>
        <div className={styles.exampleList}>
          {(selectedCategory?.questions ?? EXAMPLE_QUESTIONS).map(example => <button key={example} type="button" onClick={() => runCuratedQuestion(example)}>{example}</button>)}
        </div>
      </div>}
      <section
        className={`${styles.answer} ${search?.kind === "safety" ? styles.safetyAnswer : ""}`}
        data-state={isLoading ? "loading" : search?.kind ?? (notice ? "notice" : "empty")}
        aria-labelledby="answer-title"
      >
        <div className={styles.answerHeading}>
          <h2 id="answer-title" ref={resultRef} tabIndex={-1}>{search?.kind === "safety" ? "긴급 안전 안내" : "공식 자료 안내"}</h2>
        </div>
        {(isLoading || search) && <p className={styles.currentQuestion}>질문: {search?.answer.userQuestion ?? question}</p>}
        {clarificationContext && <div className={styles.clarification}>
          <h3>알맞은 안내를 위해 하나만 더 확인할게요</h3>
          <p>{CLARIFICATIONS[clarificationContext.clarificationId].question}</p>
          <div className={styles.exampleList}>
            {CLARIFICATIONS[clarificationContext.clarificationId].options.map(option => <button key={option} type="button" disabled={isLoading}
              onClick={() => { voice.cancel(); setQuestion(option); void submitQuestion(option); }}>{option}</button>)}
            {!CLARIFICATIONS[clarificationContext.clarificationId].options.some(o=>o === "잘 모르겠어요") && <button type="button" disabled={isLoading} onClick={() => {setQuestion("잘 모르겠어요"); void submitQuestion("잘 모르겠어요");}}>잘 모르겠어요</button>}
            <button type="button" onClick={() => {selectExample(""); inputRef.current?.focus();}}>새 질문하기</button>
          </div>
        </div>}
        {search?.kind === "unsupported" && <h3 className={styles.stateHeading}>지금 안내할 수 있는 범위를 확인해 주세요</h3>}
        {search && (search.kind === "unsupported" || search.kind === "guidance" || search.officialSearch) && <p className={styles.notice}>{search.answer.plainLanguageSummary}</p>}
        {search && (search.officialSearch || search.kind === "safety" || search.kind === "guidance") && search.kind !== "clarification" && search.kind !== "unsupported" && Boolean(search.answer.plainLanguageSummary.trim()) && <div className={styles.speechControls}>
          <button type="button" onClick={() => {
            if (speech.isSpeaking) {
              speech.stop();
              setNotice("답변 읽기를 중지했습니다.");
            } else {
              voice.cancel();
              speech.play(search.kind === "safety" ? search.answer.plainLanguageSummary : conciseAnswer(search.answer));
            }
          }} aria-label={speech.isSpeaking ? "답변 읽기 중지" : "답변 듣기"} aria-pressed={speech.isSpeaking}>
            {speech.isSpeaking ? "중지" : "답변 듣기"}
          </button>
          <span>{search.kind === "safety" ? "고정 안전 안내를 읽습니다. 전화나 신고는 자동으로 실행되지 않습니다."
            : search.answer.sources.length > 0 ? "화면의 짧은 안내를 읽습니다. 긴 본문은 상세 안내를 펼쳐 따로 들을 수 있습니다. 출처와 확인 상태도 확인해 주세요."
            : "답변 본문만 읽습니다."}</span>
        </div>}
        <div aria-busy={isLoading}>
          {scope && <div className={`${styles.searchResults} ${styles.detailSection}`}>
            <h3>이 질문의 지원 범위와 확인 방법</h3>
            <p>{scope.message}</p>
            <div className={styles.speechControls}><button type="button" onClick={() => { voice.cancel(); speech.play(scope.message); }}>지원 범위 안내 듣기</button></div>
            <ul>{scope.links.map(link => <li key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.title} (새 창)</a></li>)}</ul>
            <p>직접 확인을 위한 공식 페이지입니다. 상세 답변의 검증 완료를 뜻하지 않습니다.</p>
          </div>}
          {search?.officialSearch && <div className={styles.searchResults}>
            <h3 className={styles.serviceTitle}>{search.answer.title}</h3>
            <p>안내 지역: 성남시 · {search.officialSearch.searched ? "검색 실행 확인" : "검색 완료 미확인"}</p>
            {search.officialSearch.evidence.map(evidence => <article key={evidence.id} className={styles.detailSection}>
              <h3><a href={evidence.url} target="_blank" rel="noreferrer">{evidence.title} (공식 원문)</a></h3>
              <blockquote className={styles.excerpt}>{evidence.excerpt}</blockquote>
              <div className={styles.speechControls}><button type="button" onClick={() => { voice.cancel(); speech.play(evidence.excerpt); }}>공식 원문 듣기</button></div>
              <p>발행기관: {evidence.publisher} · 적용 지역: {evidence.region}</p>
              <p>원문 대조: <time dateTime={evidence.checkedAt}>{evidence.checkedAt.replace("T", " ").slice(0, 19)} UTC</time>{evidence.fromCache ? " (이전에 확인한 문서 캐시)" : ""}</p>
              <p>게시·수정일: 미확인 · 시행·신청기간: 미확인 · 최신성: 미확인</p>
            </article>)}
            {search.officialSearch.links.length > 0 && <div className={styles.detailSection}><h3>공식 근거</h3><ul>{search.officialSearch.links.map(link => <li key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.title} (새 창)</a></li>)}</ul></div>}
            {search.kind === "search_unavailable" && search.officialSearch.status !== "budget_limited" && <button type="button" disabled={isLoading} onClick={() => { void submitQuestion(question); }}>다시 시도</button>}
            <p><a href="https://www.seongnam.go.kr/" target="_blank" rel="noreferrer">성남시 공식 홈페이지 (새 창)</a></p>
          </div>}
          {search?.kind === "safety" && search.safety && <div className={styles.safetyCard} role="alert">
            <h3>{search.answer.title}</h3>
            <p>{search.answer.plainLanguageSummary}</p>
            <div className={styles.safetyPhones} aria-label="긴급 연락처">
              {search.safety.phoneNumbers.map((phone) => <a key={phone} href={`tel:${phone}`}>{phone} 전화하기</a>)}
            </div>
            <strong>이 서비스는 자동으로 전화하거나 신고하지 않습니다. 사용자가 직접 연락해 주세요.</strong>
          </div>}
          {search && !search.officialSearch && search.kind !== "guidance" && search.kind !== "clarification" && search.kind !== "unsupported" && search.kind !== "safety" && <PublicInformationAnswerView
            answer={search.answer}
            isSpeaking={speech.isSpeaking}
            onReadConcise={() => {
              if (speech.isSpeaking) {
                speech.stop();
                setNotice("답변 읽기를 중지했습니다.");
              } else {
                voice.cancel();
                speech.play([conciseAnswer(search.answer), search.answer.nextAction?.description, search.answer.verification.details].filter(Boolean).join(" "));
              }
            }}
            onReadFull={() => { voice.cancel(); speech.play(completeAnswerSpeech(search.answer)); }}
            followupQuestions={serviceContext && <div className={styles.followupActions} id="followup-questions">
              <h3>궁금한 내용을 바로 선택하세요</h3>
              <div className={styles.exampleList}>{["어떻게 이용해요?", "누가 이용할 수 있어요?", "준비물은?", "요금은?", "전화번호는?"].map(q => <button key={q} type="button" disabled={isLoading} onClick={() => { setQuestion(q); void submitQuestion(q); }}>{q}</button>)}</div>
            </div>}
          />}
        </div>
        {search && <div className={styles.followupActions}>
          <button className={styles.textChoice} type="button" onClick={() => {
            speech.stop(); inputRef.current?.scrollIntoView({block:"center",behavior:"instant"});
            document.querySelector<HTMLButtonElement>('[aria-label="마이크로 질문하기"]')?.focus();
          }}>말이나 글로 이어서 질문</button>
          {serviceContext && <p><a href="#followup-questions">준비물·요금 등 후속 질문 선택</a></p>}
          <button className={styles.textChoice} type="button" onClick={() => {
            selectExample(""); setVoiceReview(false);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}>다른 질문·분야 선택</button>
        </div>}
      </section>
      <details className={styles.infoDetails}>
        <summary>개인정보·음성·질문 처리 방식</summary>
        <p>질문과 직전 확인 답변은 OpenAI의 공식 웹 검색으로 처리될 수 있습니다. 자동 개인정보 가림에는 한계가 있습니다. 앱은 질문·음성 원본을 DB에 저장하지 않습니다. 브라우저에 따라 음성이 음성 인식 서비스로 전송될 수 있습니다.</p>
      </details>

    </section>
  );
}
