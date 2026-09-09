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
          <h1 id="page-title">성남 생활정보를 쉽게 찾아보세요</h1>
          <p className={styles.description}>제도명을 몰라도 필요한 도움을 물어보세요.</p>
        </section>

        <QuestionPanel />
      </main>

      <footer className={styles.footer}>
        <div>
          <strong>Seongnam VoiceCare AI</strong>
          <span>Astra 팀</span>
        </div>
        <div className={styles.footerNotice}>
          <p>성남시 공식 공개정보를 바탕으로 안내합니다.</p>
          <p>경진대회 비공식 프로토타입이며 성남시가 운영하는 공식 서비스가 아닙니다.</p>
        </div>
      </footer>
    </div>
  );
}
