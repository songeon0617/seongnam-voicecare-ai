"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions";
import { readSearchAnswer } from "@/lib/search/read-search-answer";
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
  const activeRequest = useRef<AbortController | null>(null);
  const requestTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const speech = useAnswerSpeech(setNotice);
  useEffect(() => () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
    clearTimeout(requestTimeout.current);
  }, []);

  async function submitQuestion(text: string) {
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
    }, 15_000);
    requestTimeout.current = timeout;

    try {
      const response = await fetch("/api/public-information/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: normalizedQuestion,
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
      setNotice(body.hasResults ? "공식 자료 안내가 준비되었습니다. 아래에서 답변과 출처를 확인해 주세요." : NO_RESULTS_MESSAGE);
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
    voice.cancel();
    await submitQuestion(question);
  }

  function selectExample(example: string) {
    voice.cancel();
    speech.stop();
    activeRequest.current?.abort();
    activeRequest.current = null;
    setQuestion(example);
    setNotice("");
    setSearch(null);
    setIsLoading(false);
  }

  return (
    <section className={styles.panel} aria-label="질문하기">
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
          말씀이 끝나면 인식한 질문을 자동으로 보냅니다. 인식 결과는 아래 입력란에서 수정할 수 있습니다.
          브라우저에 따라 음성이 음성 인식 서비스로 전송될 수 있습니다.
        </p>
        {voice.preview && <p className={styles.voicePreview} aria-live="off">인식 중: {voice.preview}</p>}
      </div>

      <div className={styles.divider} aria-hidden="true">
        <span>또는</span>
      </div>

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
            onChange={(event) => selectExample(event.target.value)}
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
      </form>

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
        className={styles.answer}
        aria-labelledby="answer-title"
      >
        <div className={styles.answerHeading}>
          <span className={styles.answerIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M5 5h14v10H9l-4 4V5Z" />
              <path d="M9 9h6m-6 3h4" />
            </svg>
          </span>
          <h2 id="answer-title">공식 자료 안내</h2>
        </div>
        <p className={notice ? styles.notice : styles.answerPlaceholder} role="status" aria-live={speech.isSpeaking ? "off" : "polite"} aria-atomic="true">
          {notice || "질문하면 관련 공식 자료와 출처가 여기에 표시됩니다."}
        </p>
        {search && <div className={styles.speechControls}>
          <button type="button" onClick={() => {
            if (speech.isSpeaking) {
              speech.stop();
              setNotice("답변 읽기를 중지했습니다.");
            } else {
              voice.cancel();
              speech.play(search.answer.plainLanguageSummary);
            }
          }} aria-label={speech.isSpeaking ? "답변 읽기 중지" : "답변 듣기"} aria-pressed={speech.isSpeaking}>
            {speech.isSpeaking ? "중지" : "답변 듣기"}
          </button>
          <span>답변 본문만 읽습니다. 출처와 확인 상태는 아래에서 확인해 주세요.</span>
        </div>}
        <div aria-busy={isLoading}>
          {search && <PublicInformationAnswerView answer={search.answer} />}
        </div>
      </section>
    </section>
  );
}
