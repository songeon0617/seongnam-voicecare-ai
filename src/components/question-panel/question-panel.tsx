"use client";

import { type FormEvent, useState } from "react";
import { EXAMPLE_QUESTIONS } from "@/lib/example-questions";
import styles from "./question-panel.module.css";

const NOT_CONNECTED_MESSAGE =
  "현재는 화면 구성 단계입니다. AI 답변 기능은 다음 단계에서 연결할 예정입니다.";

export function QuestionPanel() {
  const [question, setQuestion] = useState("");
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(
      question.trim()
        ? NOT_CONNECTED_MESSAGE
        : "질문을 입력하거나 아래 예시 질문을 선택해 주세요.",
    );
  }

  function selectExample(example: string) {
    setQuestion(example);
    setNotice("");
  }

  return (
    <section className={styles.panel} aria-label="질문하기">
      <div className={styles.voiceArea}>
        <button
          className={styles.voiceButton}
          type="button"
          onClick={() => setNotice(NOT_CONNECTED_MESSAGE)}
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

      <form className={styles.form} onSubmit={handleSubmit}>
        <label htmlFor="question">글자로 질문하기</label>
        <div className={styles.inputRow}>
          <input
            id="question"
            name="question"
            type="text"
            value={question}
            onChange={(event) => {
              setQuestion(event.target.value);
              setNotice("");
            }}
            placeholder="궁금한 내용을 입력해 주세요"
            autoComplete="off"
          />
          <button type="submit" aria-label="질문 보내기">
            <span>질문하기</span>
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
          <h2 id="answer-title">답변</h2>
        </div>
        <p className={notice ? styles.notice : styles.answerPlaceholder}>
          {notice || "질문하면 쉬운 설명과 단계별 안내가 여기에 표시됩니다."}
        </p>
      </section>
    </section>
  );
}
