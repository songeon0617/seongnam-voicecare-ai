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
        <span className={styles.badge}>경진대회 MVP</span>
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
            복잡한 행정 표현을 쉬운 말로 풀고, 다음에 무엇을 해야 하는지
            차근차근 안내하는 서비스를 준비하고 있습니다.
          </p>
          <div className={styles.guide}>
            <span aria-hidden="true">1</span>
            <p>
              <strong>말하거나 입력하세요</strong>
              궁금한 내용을 평소 쓰는 말로 질문해 주세요.
            </p>
          </div>
          <div className={styles.guide}>
            <span aria-hidden="true">2</span>
            <p>
              <strong>쉬운 안내를 확인하세요</strong>
              답변과 해야 할 일, 공식 출처가 함께 표시될 예정입니다.
            </p>
          </div>
        </section>

        <QuestionPanel />
      </main>

      <footer className={styles.footer}>
        Seongnam VoiceCare AI · 2026 성남×KAIST AI 경진대회 일반부 MVP
      </footer>
    </div>
  );
}
