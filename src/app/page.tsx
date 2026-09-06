import { QuestionPanel } from "@/components/question-panel/question-panel";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand} aria-label="Seongnam VoiceCare AI">
          <span className={styles.brandMark} aria-hidden="true">
            <svg viewBox="0 0 32 32" role="img">
              <path d="M7 17v-2m5 6V11m5 14V7m5 14V11m5 6v-2" />
            </svg>
          </span>
          <span>
            <strong>Seongnam VoiceCare</strong>
            <small>성남 생활정보 음성 도우미</small>
          </span>
        </div>
        <span className={styles.badge}>성남시 공식자료 기반 경진대회 프로토타입</span>
      </header>

      <main className={styles.main}>
        <section className={styles.intro} aria-labelledby="page-title">
          <p className={styles.eyebrow}>복지 · 교통 · 행정 정보</p>
          <h1 id="page-title">
            필요한 정보를
            <br />
            <span>편하게 물어보세요</span>
          </h1>
          <p className={styles.description}>
            궁금한 내용을 말하거나 글자로 질문하면 등록된 성남시 공식 자료를
            찾아 안내합니다. 답변과 함께 출처와 확인 상태를 살펴보세요.
          </p>
          <div className={styles.guide}>
            <span aria-hidden="true">1</span>
            <p>
              <strong>말하거나 입력하세요</strong>
              마이크 버튼으로 질문하거나 글자로 적어 주세요.
            </p>
          </div>
          <div className={styles.guide}>
            <span aria-hidden="true">2</span>
            <p>
              <strong>공식 자료 안내를 확인하세요</strong>
              답변 듣기로 내용을 듣고, 출처와 확인일도 함께 확인하세요.
            </p>
          </div>
        </section>

        <QuestionPanel />
      </main>

      <footer className={styles.footer}>
        Seongnam VoiceCare AI · 성남 생활정보 음성 도우미
      </footer>
    </div>
  );
}
