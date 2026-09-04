# Seongnam VoiceCare AI

2026 성남×KAIST AI 경진대회 일반부 출전을 위한 웹 기반 MVP입니다. 현재는 고령자와 디지털 취약계층을 고려한 질문 화면과 답변 표시 영역만 구현되어 있습니다.

## 실행 방법

Node.js 20.9 이상이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

배포 전 확인:

```bash
npm run lint
npm run build
```

## 현재 구조

```text
src/
├─ app/
│  ├─ globals.css               # 전역 디자인 토큰과 기본 스타일
│  ├─ layout.tsx                # 문서 메타데이터와 공통 레이아웃
│  ├─ page.module.css           # 메인 화면 레이아웃
│  └─ page.tsx                  # 메인 화면
├─ components/
│  └─ question-panel/
│     ├─ question-panel.tsx     # 음성·텍스트 질문 및 답변 UI
│     └─ question-panel.module.css
└─ lib/
   └─ example-questions.ts      # 예시 질문 목록
```

현재 화면 로직을 질문 패널로 분리해 두었으므로, 다음 단계에서 API Route 또는 Server Action과 연결할 수 있습니다. 실제 기능을 추가할 때는 역할별로 `src/services/ai`, `src/services/retrieval`, `src/services/speech` 등을 추가하는 방식을 권장합니다.

## 구조화된 공공정보 답변 모델

`src/types/public-information.ts`에는 향후 검색·RAG·LLM 결과를 화면에 안전하게 전달하기 위한 `PublicInformationAnswer` 타입이 정의되어 있습니다.

답변을 단순 문자열이 아니라 쉬운 설명, 단계별 행동, 다음 행동, 출처, 확인 상태로 나누면 다음 장점이 있습니다.

- 화면에서 각 정보를 일관된 순서와 형태로 표시할 수 있습니다.
- 단계별 안내와 근거 출처를 연결할 수 있습니다.
- 연락처나 장소처럼 공식 자료에서 확인되지 않은 값은 생략할 수 있습니다.
- 자료 부족, 일부 확인, 미확인 상태를 사용자에게 명확히 알릴 수 있습니다.

현재는 타입과 개발용 예시 객체만 있으며 AI 호출이나 실제 공공정보는 연결되어 있지 않습니다. 다음 단계에서 성남시 공식 자료 기반 검색과 RAG 결과를 이 구조로 변환할 예정입니다.

## 아직 구현하지 않은 기능

- OpenAI 또는 기타 LLM API 연동
- 성남시 공식 데이터 검색과 출처 표시
- RAG 파이프라인
- 음성 인식(STT)과 음성 합성(TTS)
- 인증, 데이터베이스, 회원 기능

현재 질문하기 버튼은 실제 답변 대신 기능이 아직 연결되지 않았다는 안내만 표시합니다. 임의의 복지 정보나 예시 답변은 포함하지 않았습니다.

## 배포

표준 Next.js 프로젝트이므로 Git 저장소를 Vercel에 연결해 별도 설정 없이 배포할 수 있습니다.
