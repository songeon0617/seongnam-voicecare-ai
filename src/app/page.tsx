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
        <span className={styles.badge}>Astra · 공식 자료 기반 시민 프로젝트</span>
      </header>

      <main className={styles.main}>
        <section className={styles.intro} aria-labelledby="page-title">
          <p className={styles.eyebrow}>성남시 공공정보 안내 · 복지 · 교통 · 행정</p>
          <h1 id="page-title">
            성남 생활정보,
            <br />
            <span>내 말로 물어보세요</span>
          </h1>
          <p className={styles.description}>
            제도명을 몰라도 괜찮아요. 필요한 도움을 말하거나 글로 적어 주세요.
            글을 읽거나 입력하기 어려운 어르신·시각장애인도 이용할 수 있도록 음성 질문과 답변 듣기를 제공합니다.
            성남시와 공공기관의 공식 자료를 바탕으로 출처와 확인 상태를 함께 안내합니다.
          </p>
          <div className={styles.guideList}>
            <div className={styles.guide}>
              <span aria-hidden="true">1</span>
              <p>
                <strong>말하거나 입력하세요</strong>
              </p>
            </div>
            <div className={styles.guide}>
              <span aria-hidden="true">2</span>
              <p>
                <strong>공식 자료 안내를 확인하세요</strong>
              </p>
            </div>
          </div>
        </section>

        <QuestionPanel />
      </main>

      <footer className={styles.footer}>
        <strong>Seongnam VoiceCare AI</strong>
        <span>Astra 팀의 경진대회 프로토타입 · 성남시가 운영하는 공식 서비스가 아닙니다.</span>
      </footer>
    </div>
  );
}
