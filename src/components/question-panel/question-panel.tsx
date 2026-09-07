"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions";
import { readSearchAnswer } from "@/lib/search/read-search-answer";
import { conciseAnswer } from "@/lib/public-information/concise-answer";
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

export function QuestionPanel() {
  const [question, setQuestion] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState<ReturnType<typeof readSearchAnswer>>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clarificationContext, setClarificationContext] = useState<ClarificationContext>();
  const activeRequest = useRef<AbortController | null>(null);
  const requestTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const speech = useAnswerSpeech(setNotice);
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
    void submitQuestion(text);
  }, setNotice);
  const isRecognizing = voice.state !== "idle";

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
    if (!preserveContext) setClarificationContext(undefined);
  }

  return (
    <section className={styles.panel} aria-label="질문하기">
      <div className={styles.panelHeading}>
        <div>
          <p className={styles.panelEyebrow}>질문 입력</p>
          <h2>어떤 도움이 필요하세요?</h2>
        </div>
        <span className={styles.inputHint}>글자 또는 음성으로 질문하세요</span>
      </div>
      <div className={styles.questionWorkspace}>
        <form
          className={styles.form}
          onSubmit={handleSubmit}
          aria-busy={isLoading}
        >
          <label htmlFor="question">글자로 질문하기</label>
          <div className={styles.inputRow}>
            <input
              id="question"
              name="question"
              type="text"
              value={question}
              onChange={(event) => selectExample(event.target.value, true)}
              placeholder="궁금한 내용을 입력해 주세요"
              autoComplete="off"
              maxLength={PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH}
            />
            <button
              type="submit"
              aria-label={isLoading ? "공식 자료 검색 중" : "질문 보내기"}
              disabled={isLoading}
            >
              <span>{isLoading ? "검색 중..." : "질문하기"}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m8 5 7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className={styles.privacyNotice}>
            질문과 직전 확인 답변은 OpenAI의 공식 웹 검색으로 처리될 수 있습니다. 번호·이메일 자동 가림에는 한계가 있으니 이름, 주민등록번호, 연락처 등 개인정보는 입력하지 마세요. 앱은 질문·음성 원본을 DB에 저장하지 않습니다.
          </p>
        </form>
        <div className={styles.voiceArea}>
          <button
            className={styles.voiceButton}
            type="button"
            onClick={() => {
              speech.stop();
              if (isRecognizing) {
                voice.cancel();
                setNotice("음성 입력을 취소했습니다. 글자로도 질문할 수 있습니다.");
                return;
              }
              activeRequest.current?.abort();
              activeRequest.current = null;
              setSearch(null);
              setIsLoading(false);
              voice.start();
            }}
            aria-label={isRecognizing ? "음성 입력 취소" : "마이크로 질문하기"}
            aria-pressed={isRecognizing}
            aria-describedby="voice-help"
          >
            <span className={styles.micIcon} aria-hidden="true">
              <svg viewBox="0 0 40 40" role="img">
                <rect x="14" y="6" width="12" height="20" rx="6" />
                <path d="M9.5 20.5a10.5 10.5 0 0 0 21 0M20 31v5m-6 0h12" />
              </svg>
            </span>
            <strong>{isRecognizing ? "음성 입력 취소" : "말로 질문하기"}</strong>
            <small>{voice.state === "starting" ? "마이크 연결 중" : voice.state === "listening" ? "듣고 있습니다" : voice.state === "processing" ? "음성 인식 중" : "누르고 질문을 말씀하세요"}</small>
          </button>
          <span className={styles.status}>{isRecognizing ? "다시 누르면 취소합니다" : "한국어 음성 질문"}</span>
          <p id="voice-help" className={styles.voiceHelp}>
            말씀이 끝나면 인식한 질문을 자동으로 보냅니다. 인식 결과는 질문 입력란에서 수정할 수 있습니다.
            브라우저에 따라 음성이 음성 인식 서비스로 전송될 수 있습니다.
            마이크를 사용할 수 없다면 글자 입력이나 휴대폰 키보드의 음성 입력을 이용하세요.
          </p>
          {voice.preview && <p className={styles.voicePreview} aria-live="off">인식 중: {voice.preview}</p>}
        </div>
      </div>
      {clarificationContext && <div className={styles.clarification}>
        <h3>알맞은 안내를 위해 하나만 더 확인할게요</h3>
        <p>{CLARIFICATIONS[clarificationContext.clarificationId].question}</p>
        <div className={styles.exampleList}>
          {CLARIFICATIONS[clarificationContext.clarificationId].options.map((option) => <button key={option} type="button" disabled={isLoading}
            onClick={() => { voice.cancel(); setQuestion(option); void submitQuestion(option); }}>{option}</button>)}
          {!CLARIFICATIONS[clarificationContext.clarificationId].options.some(option => option === "잘 모르겠어요") && <button type="button" disabled={isLoading} onClick={() => { setQuestion("잘 모르겠어요"); void submitQuestion("잘 모르겠어요"); }}>잘 모르겠어요</button>}
          <button type="button" onClick={() => selectExample("")}>새 질문하기</button>
        </div>
      </div>}

      <div className={styles.examples}>
        <p>이렇게 물어보세요</p>
        <div className={styles.exampleList}>
          {EXAMPLE_QUESTIONS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => selectExample(example)}
            >
              <span aria-hidden="true">“</span>
              {example}
            </button>
          ))}
        </div>
      </div>

      <section
        className={`${styles.answer} ${search?.kind === "safety" ? styles.safetyAnswer : ""}`}
        data-state={isLoading ? "loading" : search?.kind ?? (notice ? "notice" : "empty")}
        aria-labelledby="answer-title"
      >
        <div className={styles.answerHeading}>
          <span className={styles.answerIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M5 5h14v10H9l-4 4V5Z" />
              <path d="M9 9h6m-6 3h4" />
            </svg>
          </span>
          <h2 id="answer-title">{search?.kind === "safety" ? "긴급 안전 안내" : "공식 자료 안내"}</h2>
        </div>
        {search?.kind === "unsupported" && <h3 className={styles.stateHeading}>지금 안내할 수 있는 범위를 확인해 주세요</h3>}
        <p className={notice ? styles.notice : styles.answerPlaceholder} role="status" aria-live={speech.isSpeaking ? "off" : "polite"} aria-atomic="true">
          {notice || "질문하면 관련 공식 자료와 출처가 여기에 표시됩니다."}
        </p>
        {search && search.kind !== "clarification" && search.kind !== "unsupported" && Boolean(search.answer.plainLanguageSummary.trim()) && <div className={styles.speechControls}>
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
            {search.kind === "search_unavailable" && <button type="button" disabled={isLoading} onClick={() => { void submitQuestion(question); }}>다시 시도</button>}
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
          {search && !search.officialSearch && search.kind !== "guidance" && search.kind !== "clarification" && search.kind !== "unsupported" && search.kind !== "safety" && <PublicInformationAnswerView answer={search.answer} onReadFull={() => { voice.cancel(); speech.play(search.answer.plainLanguageSummary); }} />}
        </div>
      </section>
    </section>
  );
}
