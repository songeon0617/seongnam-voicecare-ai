"use client";

import { type FormEvent, useRef, useState } from "react";
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions";
import {
  PUBLIC_INFORMATION_SEARCH_MAX_QUERY_LENGTH,
  type PublicInformationSearchApiResponse,
  type PublicInformationSearchRequest,
  type PublicInformationSearchResponse,
  type PublicInformationSearchResult,
} from "@/types/public-information-search";
import styles from "./question-panel.module.css";

const NOT_CONNECTED_MESSAGE =
  "음성 기능은 아직 연결되지 않았습니다.";
const NO_RESULTS_MESSAGE =
  "현재 등록된 공식 자료에서 관련 정보를 찾지 못했습니다.";
const SEARCH_ERROR_MESSAGE =
  "검색 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.";
const SEARCHING_MESSAGE = "공식 자료를 찾고 있습니다.";

function isSearchResponse(
  value: PublicInformationSearchApiResponse,
): value is PublicInformationSearchResponse {
  return "results" in value;
}

export function QuestionPanel() {
  const [question, setQuestion] = useState("");
  const [notice, setNotice] = useState("");
  const [results, setResults] = useState<
    PublicInformationSearchResult[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuestion = question.trim();

    if (!normalizedQuestion) {
      setResults(null);
      setNotice("질문을 입력하거나 아래 예시 질문을 선택해 주세요.");
      return;
    }

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    setResults(null);
    setNotice(SEARCHING_MESSAGE);

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
      const body = (await response.json()) as PublicInformationSearchApiResponse;

      if (!response.ok || !isSearchResponse(body)) {
        throw new Error("Public information search request failed");
      }

      setResults(body.results);
      setNotice(body.hasResults ? "" : NO_RESULTS_MESSAGE);
    } catch {
      if (!controller.signal.aborted) {
        setResults(null);
        setNotice(SEARCH_ERROR_MESSAGE);
      }
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setIsLoading(false);
      }
    }
  }

  function selectExample(example: string) {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setQuestion(example);
    setNotice("");
    setResults(null);
    setIsLoading(false);
  }

  return (
    <section className={styles.panel} aria-label="질문하기">
      <div className={styles.voiceArea}>
        <button
          className={styles.voiceButton}
          type="button"
          onClick={() => {
            activeRequest.current?.abort();
            activeRequest.current = null;
            setResults(null);
            setNotice(NOT_CONNECTED_MESSAGE);
            setIsLoading(false);
          }}
          aria-label="말로 질문하기. 음성 기능은 아직 연결되지 않았습니다."
        >
          <span className={styles.micIcon} aria-hidden="true">
            <svg viewBox="0 0 40 40" role="img">
              <rect x="14" y="6" width="12" height="20" rx="6" />
              <path d="M9.5 20.5a10.5 10.5 0 0 0 21 0M20 31v5m-6 0h12" />
            </svg>
          </span>
          <strong>말로 질문하기</strong>
          <small>버튼을 누르고 편하게 말씀하세요</small>
        </button>
        <span className={styles.status}>음성 기능 준비 중</span>
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
            onChange={(event) => {
              activeRequest.current?.abort();
              activeRequest.current = null;
              setQuestion(event.target.value);
              setNotice("");
              setResults(null);
              setIsLoading(false);
            }}
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
        aria-live="polite"
      >
        <div className={styles.answerHeading}>
          <span className={styles.answerIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M5 5h14v10H9l-4 4V5Z" />
              <path d="M9 9h6m-6 3h4" />
            </svg>
          </span>
          <h2 id="answer-title">공식 자료 검색 결과</h2>
        </div>
        {results && results.length > 0 ? (
          <div className={styles.searchResults}>
            <p className={styles.developmentLabel}>
              개발용 검색 결과 · AI 답변 아님
            </p>
            <ol>
              {results.map((result) => (
                <li key={result.document.id}>
                  <a
                    href={result.document.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.document.title}
                  </a>
                  <p>출처: {result.document.sourceOrganizationName}</p>
                  <p>
                    검색 점수 {result.score} · 일치 표현{" "}
                    {result.matchedTerms.join(", ")}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className={notice ? styles.notice : styles.answerPlaceholder}>
            {notice || "질문하면 관련 공식 자료가 여기에 표시됩니다."}
          </p>
        )}
      </section>
    </section>
  );
}
