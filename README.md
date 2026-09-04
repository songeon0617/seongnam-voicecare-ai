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
npm test
npm run lint
npm run typecheck
npm run build
```

## 현재 구조

```text
src/
├─ app/
│  ├─ globals.css               # 전역 디자인 토큰과 기본 스타일
│  ├─ layout.tsx                # 문서 메타데이터와 공통 레이아웃
│  ├─ page.module.css           # 메인 화면 레이아웃
│  ├─ page.tsx                  # 메인 화면
│  └─ api/public-information/search/route.ts # 공공정보 검색 API
├─ components/
│  └─ question-panel/
│     ├─ question-panel.tsx     # 음성·텍스트 질문 및 답변 UI
│     └─ question-panel.module.css
├─ data/
│  └─ public-data/
│     ├─ documents.ts           # MVP용 성남시 공식 원문 데이터
│     └─ sources.ts             # 허용된 공식 데이터 출처 목록
├─ lib/
│  ├─ example-questions.ts      # 예시 질문 목록
│  ├─ public-information/
│  │  └─ map-documents-to-answer.ts # 원문 문서의 안전한 답변 매핑
│  └─ search/
│     ├─ create-public-information-search-response.ts # API 검증·응답 구성
│     ├─ search-public-information.ts      # 로컬 공식 문서 검색
│     └─ search-public-information.test.ts # 검색 동작 자동 테스트
└─ types/
   ├─ public-data.ts            # 공식 출처와 RAG 원문 문서 타입
   ├─ public-information-search.ts # 검색 API 요청·응답 타입
   └─ public-information.ts     # 사용자에게 표시할 최종 답변 타입
```

현재 화면 로직과 검색 로직을 분리해 두었으므로, 다음 단계에서 로컬 검색을 서버 기반 retrieval 또는 embedding 검색으로 교체해도 질문 UI 변경을 줄일 수 있습니다. 실제 기능을 추가할 때는 역할별로 `src/services/ai`, `src/services/retrieval`, `src/services/speech` 등을 추가하는 방식을 권장합니다.

## 구조화된 공공정보 답변 모델

`src/types/public-information.ts`에는 향후 검색·RAG·LLM 결과를 화면에 안전하게 전달하기 위한 `PublicInformationAnswer` 타입이 정의되어 있습니다.

답변을 단순 문자열이 아니라 쉬운 설명, 단계별 행동, 다음 행동, 출처, 확인 상태로 나누면 다음 장점이 있습니다.

- 화면에서 각 정보를 일관된 순서와 형태로 표시할 수 있습니다.
- 단계별 안내와 근거 출처를 연결할 수 있습니다.
- 연락처나 장소처럼 공식 자료에서 확인되지 않은 값은 생략할 수 있습니다.
- 자료 부족, 일부 확인, 미확인 상태를 사용자에게 명확히 알릴 수 있습니다.

현재는 타입과 개발용 예시 객체만 있으며 AI 호출이나 실제 공공정보는 연결되어 있지 않습니다. 다음 단계에서 성남시 공식 자료 기반 검색과 RAG 결과를 이 구조로 변환할 예정입니다.

## 공식 데이터와 RAG 원문 구조

`PublicDataSource`는 허용된 공식 출처와 우선순위를 관리하고, `PublicInformationDocument`는 검색·RAG에 투입할 원자료를 나타냅니다. 원자료 문서와 사용자용 `PublicInformationAnswer`를 분리해 수집된 원문이 검증 없이 그대로 답변으로 표시되지 않도록 합니다.

초기 데이터는 `src/data/public-data`에서 TypeScript 파일로 관리합니다. 현재는 이 데이터만 대상으로 하는 키워드 기반 로컬 검색을 연결했으며 Vector DB는 아직 연결하지 않았습니다.

현재 데이터셋에는 2026년 9월 5일에 성남시청 공식 페이지에서 직접 확인한 문서 4건이 들어 있습니다. 범위는 특별교통수단, 장애인 택시바우처, 노인맞춤돌봄서비스, 분당노인종합복지관 안내입니다. 이는 MVP 질문 검증을 위한 제한된 범위이며 성남시의 전체 복지정책이나 시설을 포괄하지 않습니다.

### 데이터 원칙

- 공식 출처를 우선하며 출처 없는 정책 정보는 사용하지 않습니다.
- 오래된 자료와 최신 자료가 충돌하면 최신 공식 자료를 우선합니다.
- 게시일, 수정일, 수집일, 마지막 확인일을 가능한 범위에서 기록합니다.
- 최신성은 고정된 불리언 값이 아니라 날짜, 문서 상태, 출처 우선순위를 바탕으로 판단합니다.
- 확인되지 않은 값은 AI가 추정하거나 임의로 채우지 않습니다.
- 최종 답변에는 근거가 된 원문 출처를 표시합니다.

## 로컬 공식 문서 검색

텍스트 질문을 제출하면 `status`가 `active`이고 허용된 공식 출처에 등록된 문서만 대상으로 검색합니다. 제목, 검색 태그, 대상자, 지역, 본문, 범주를 순서대로 가중해 점수를 계산하며, MVP 범위의 한국어 동의어를 정규화합니다. 기본 결과 수는 최대 3건이고 최소 관련성 점수 10 미만은 제외하므로 관련 문서가 없으면 빈 결과를 반환합니다.

이 기능은 향후 RAG의 retrieval 단계를 검증하기 위한 로컬 구현입니다. 화면에는 검색된 원문 제목·출처·점수만 개발용으로 표시하며, AI가 답변을 생성하거나 원문 내용을 재작성하지 않습니다.

텍스트 질문 UI는 `POST /api/public-information/search`를 호출합니다. API는 빈 질문, 잘못된 JSON, 300자를 넘는 질문을 구분해 처리하고 검색 결과와 공식 원문 기반 `PublicInformationAnswer` 매핑 결과를 반환합니다. 매핑 단계는 문서에 이미 구조화된 값만 옮기며 전화번호, 준비물, 단계, 장소를 본문에서 임의로 추출하거나 생성하지 않습니다.

## 아직 구현하지 않은 기능

- OpenAI 또는 기타 LLM API 연동
- RAG 파이프라인
- embedding 및 Vector DB 기반 검색
- 사용자용 AI 답변 생성과 답변 내 출처 표시
- 음성 인식(STT)과 음성 합성(TTS)
- 인증, 데이터베이스, 회원 기능

현재 텍스트 질문하기 버튼은 등록된 4개 공식 문서의 개발용 검색 결과만 표시합니다. 음성 질문 버튼과 실제 AI 답변은 아직 연결되지 않았으며, 임의의 복지 정보나 예시 답변은 포함하지 않았습니다.

## 배포

표준 Next.js 프로젝트이므로 Git 저장소를 Vercel에 연결해 별도 설정 없이 배포할 수 있습니다.
