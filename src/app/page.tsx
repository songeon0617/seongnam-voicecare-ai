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
            <strong>성남 생활정보 안내</strong>
            <small>Seongnam VoiceCare AI</small>
          </span>
        </div>
        <span className={styles.prototype}>경진대회 프로토타입</span>
      </header>

      <main className={styles.main}>
        <section className={styles.intro} aria-labelledby="page-title">
          <p className={styles.eyebrow}>복지 · 돌봄 · 이동 · 건강 · 행정</p>
          <h1 id="page-title">성남 생활정보, 무엇이 궁금하세요?</h1>
          <p className={styles.description}>
            제도명을 몰라도 괜찮아요. 말하거나 글로 물어보세요.
          </p>
        </section>

        <QuestionPanel />
      </main>

      <footer className={styles.footer}>
        <div>
          <strong>Seongnam VoiceCare AI</strong>
          <span>Astra 팀</span>
        </div>
        <p>경진대회 프로토타입이며 성남시가 운영하는 공식 서비스가 아닙니다.</p>
      </footer>
    </div>
  );
}
