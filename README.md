# Seongnam VoiceCare AI

2026 성남×KAIST AI 경진대회 일반부 출전을 위한 웹 MVP입니다. 텍스트 또는 브라우저 음성 질문 → 공식 문서 로컬 검색 → 안전 매핑 → 선택적 AI 표현 생성 또는 원본 답변 복귀 → 답변·출처·확인 상태 표시 → 사용자가 선택한 답변 듣기까지 연결되어 있습니다.

최종 감사 결과와 행사 당일 확인 순서는 [대회 데모 최종 검증 기록](docs/demo-readiness-validation.md)을 참고하세요. 실제 OpenAI·마이크·스피커·Vercel HTTPS 검증 여부는 자동 테스트 결과와 구분해 기록합니다.

실제 OpenAI smoke는 `gpt-5.6-terra`로 1회 성공했습니다(2,806ms, 실제 생성 경로). 이후의 [Vercel 배포 준비 및 HTTPS 체크리스트](docs/vercel-deployment-readiness.md)에 배포 설정과 남은 검증을 정리했습니다. 현재 Vercel 배포는 실행하지 않았습니다.

## 실행 방법

Node.js 20.9 이상이 필요합니다.

```bash
npm install
npx playwright install chromium
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
│  ├─ ai/
│  │  ├─ generate-public-information-answer.ts # 제한된 표현 검증·원문 조합
│  │  ├─ openai-answer-generator.ts # 서버 전용 OpenAI Responses 어댑터
│  │  └─ *.test.ts              # 사실 보존·제공자 오류 테스트
│  ├─ public-information/
│  │  └─ map-documents-to-answer.ts # 원문 문서의 안전한 답변 매핑
│  └─ search/
│     ├─ create-public-information-response-with-answer.ts # 검색 후 AI 적용
│     ├─ create-public-information-response-with-answer.test.ts # API 생성 통합 테스트
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

현재 공식 문서 검색 결과를 이 타입으로 안전하게 매핑합니다. 생성 계층은 `plainLanguageSummary`의 안내 표현과 문단 형식만 변경하며 나머지 필드는 그대로 보존합니다.

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

이 기능은 향후 RAG의 retrieval 단계를 검증하기 위한 로컬 구현입니다. 화면은 API의 `answer`를 표시합니다. 생성 성공 시 제한된 표현을 적용한 원문 안내를, AI 비활성·설정 누락·생성 실패 시 기존 공식 원문 안내를 표시합니다. 검색 점수나 `answerGeneration` 내부 코드는 화면에 노출하지 않습니다.

텍스트 질문 UI는 `POST /api/public-information/search`를 호출합니다. API는 빈 질문, 잘못된 JSON, 300자를 넘는 질문을 구분해 처리하고 검색 결과와 공식 원문 기반 `PublicInformationAnswer` 매핑 결과를 반환합니다. 매핑 단계는 문서에 이미 구조화된 값만 옮기며 전화번호, 준비물, 단계, 장소를 본문에서 임의로 추출하거나 생성하지 않습니다.

## AI answer generation

기존 `createPublicInformationSearchResponse`는 동기 검색과 안전 매핑을 그대로 수행합니다. `POST /api/public-information/search`는 별도 비동기 서비스 `createPublicInformationResponseWithAnswer`를 호출합니다. 요청 형식, 기존 응답 필드와 오류 코드는 유지하고 선택 필드 `answerGeneration`만 추가했습니다.

```text
query 검증 → 허용된 공식 문서 검색 → 기존 안전 매핑
  ├─ 입력 오류 / 빈 결과 → LLM 호출 없이 기존 응답
  ├─ AI 비활성 / 설정 누락 → 기존 매핑 답변
  └─ 검색 성공 → 질문 + 검색된 문서 제목/본문의 복사본 → LLM 표현 코드 선택
      → 서버가 키·허용 코드 검증 → 원문 전체 + 서버 안내 표현으로 요약 조합
      → plainLanguageSummary만 교체 (그 외 answer 필드는 보존) → UI 표시
      └─ 예외 / 시간 초과 / 거절 / 미완료 / 잘못된 출력 → 기존 매핑 답변
```

LLM 출력은 `{ "introduction": "neutral" | "friendly", "layout": "paragraphs" | "document_sections" }`로 제한됩니다. 서버가 미리 검토한 도입 문구와 문단 형식만 선택합니다. 자유 생성 문장이나 추가 키는 허용하지 않으며 모델 출력 객체를 `answer`에 병합하지 않습니다. 따라서 이번 구현은 **원문 재서술·축약이 아닌 제한형 자연어 표현 생성**입니다. 자유 재서술의 의미적 정확성은 프롬프트, 전화번호 검사, JSON 스키마만으로 보장할 수 없기 때문입니다.

문서의 전체 본문과 검색 순서를 유지하므로 조건·예외·금액·연락처가 누락되거나 서로 다른 문서의 사실이 합쳐지지 않습니다. `sources`의 URL·id·sourceId·checkedAt·documentStatus·freshnessStatus, `verification`과 모든 구조화된 필드는 기존 서버 매핑이 유일한 기준입니다. LLM에는 이 답변 객체나 출처 메타데이터를 전달하지 않으며, 본문에 이미 포함된 URL·연락처 등은 원문 일부로 전달됩니다. 본문에서 `contacts`, `requiredItems`, `locations`, `steps`, `nextAction`을 추출해 채우지도 않습니다.

여러 문서가 검색되면 AI 선택과 관계없이 각 본문 앞에 서버 문서명을 붙입니다. 여러 서비스의 지원 대상을 하나의 신청 자격처럼 합친 목록은 표시하지 않으며 각 문서의 전체 본문에 있는 조건을 유지합니다. 단일 문서의 대상 목록은 유지합니다.

### 환경변수

`.env.example`을 `.env.local`로 복사해 설정합니다. 환경변수가 없으면 API는 외부 호출 없이 기존 답변을 반환합니다.

| 변수 | 설정 |
| --- | --- |
| `PUBLIC_INFORMATION_AI_ENABLED` | 정확히 `true`일 때만 활성화. 기본 비활성 |
| `OPENAI_API_KEY` | 서버 전용 API 키 |
| `OPENAI_MODEL` | 해당 계정에서 접근 가능한 Responses API + Structured Outputs 지원 모델 ID. 기본 모델 없음 |

`NEXT_PUBLIC_` 접두사를 사용하지 마세요. 제공자 모듈은 `server-only`로 클라이언트 import를 차단합니다. SDK 의존성 없이 서버 `fetch`를 사용합니다. 요청은 8초 제한, 최대 출력 토큰 512, `store: false`, 도구 미제공, 자동 재시도 없음으로 구성했습니다. 이는 [OpenAI Structured Outputs 공식 문서](https://developers.openai.com/api/docs/guides/structured-outputs)의 Responses 스키마 형식을 사용하며, 서버에서 별도로 출력값을 검증합니다.

활성화 시 사용자 질문과 검색 문서 본문이 OpenAI로 전송됩니다. `store: false`는 Responses 저장 옵션이며 서비스 전반의 무보존을 보장하는 설정은 아닙니다. API 키·질문·제공자 오류 상세를 로그나 오류 응답에 기록하지 않습니다.

### 응답 상태와 확인 방법

- `answerGeneration: { status: "generated", mode: "constrained_presentation" }`: 제한된 표현 적용 완료
- `{ status: "skipped", reason: "no_results" | "disabled" | "not_configured" }`: 호출 생략
- `{ status: "fallback", reason: "invalid_output" | "provider_error" }`: 기존 답변으로 복귀. 검색 성공 HTTP 200 유지

기존 동기 검색 서비스를 직접 호출하면 `answerGeneration`은 생략됩니다. 공개 API는 성공 응답에 이 필드를 추가합니다. 생성 성공 상태는 공식 자료의 검증/최신성 상태와 별개입니다.

```bash
curl -X POST http://localhost:3000/api/public-information/search \
  -H "Content-Type: application/json" \
  -d '{"query":"장애인 택시 지원받으려면 어떻게 해야 해?"}'
```

`npm test`는 서버 테스트(`test:server`)와 Chromium UI 테스트(`test:ui`)를 실행합니다. 최초 1회 `npx playwright install chromium`이 필요합니다. UI 테스트는 별도 개발 서버를 3100 포트에서 시작하며 AI 환경변수를 비활성화하고 키·모델 값을 비워 실제 비용이 발생하지 않게 합니다. 생성·fallback UI 테스트는 실제 검색·안전 조합 함수로 만든 응답을 브라우저 네트워크에서 mock합니다. 실제 Route Handler와 OpenAI 어댑터 연결은 서버 테스트에서 mock fetch로 검증합니다.

`--conditions=react-server`는 Node 서버 테스트에서 `server-only`의 서버 export를 사용하기 위한 설정입니다. 모든 허용 표현의 원문 보존, 구조화 사실·출처 변조 거부, 프롬프트 주입, 빈 결과 무호출, 설정 누락, 거절/미완료/잘못된 JSON, HTTP 오류, 응답 본문 시간 초과, 호출량 제한과 UI 상태를 검증합니다.

### 실제 API smoke test

`.env.local` 또는 프로세스 환경에서 위 세 변수를 설정한 뒤 명시적으로 실행합니다. 개발 환경의 Next.js 환경변수 로드 순서를 사용합니다.

```bash
npm run smoke:openai
```

설정 완료 시 실제 어댑터로 “노인맞춤돌봄서비스 신청하려면 어떻게 해야 하나요?” **1건만** 호출하고 응답 파싱·허용 코드 검증·답변 조합 성공 여부와 소요 시간(ms)을 출력합니다. 시간에는 검색·요청·검증·조합이 포함됩니다. 키·질문·응답·원시 오류는 출력하지 않습니다. 자동 재시도나 모델 변경은 없습니다. 설정 누락 시 `SKIPPED`와 종료 코드 2, 생성 확인 실패 시 종료 코드 1, 성공 시 0을 반환합니다. `npm test`에 포함되지 않습니다.

PowerShell에서 직접 설정하는 정확한 순서:

1. 프로젝트 루트에서 아래 명령으로 예시를 복사합니다. 기존 설정 파일은 덮어쓰지 않습니다.

   ```powershell
   if (-not (Test-Path -LiteralPath .env.local)) {
     Copy-Item -LiteralPath .env.example -Destination .env.local
   }
   notepad .env.local
   ```

2. 편집기에서 `PUBLIC_INFORMATION_AI_ENABLED=true`로 바꾸고, `OPENAI_API_KEY=` 뒤에 본인의 실제 서버 API 키, `OPENAI_MODEL=` 뒤에 본인 프로젝트에서 사용할 수 있는 Responses API + Structured Outputs 지원 모델 ID를 입력해 저장합니다. 임의 키나 임의 모델을 넣지 않습니다. 키를 채팅·터미널 출력·Git에 남기지 않습니다.
3. 같은 이름의 프로세스 환경변수가 있으면 파일보다 우선합니다. 개발 smoke는 `.env.development.local` → `.env.local` → `.env.development` → `.env` 순서로 누락값을 읽습니다. 혼동되는 중복 설정을 정리하고 실행 중인 앱을 재시작합니다. 운영 실행은 development 대신 production 파일을 사용합니다.
4. `npm run smoke:openai`를 **1회만** 실행합니다. PASS/FAIL 및 ms를 기록합니다. FAIL은 앱의 deterministic fallback과 별도로 실제 AI 생성이 확인되지 않았다는 뜻입니다. 자동 반복 호출하지 않습니다.
5. PASS 후 브라우저에서 대표 질문을 별도로 확인합니다. 브라우저 요청은 smoke와 별개의 실제 호출입니다. 설정하지 않은 상태에서도 텍스트 공식 자료 데모는 가능합니다.

초기 감사에서는 설정 부재로 SKIPPED였으나, 이후 사용자가 `.env.local`을 설정한 뒤 실제 smoke 1회를 실행했습니다. `gpt-5.6-terra`로 파싱·안전 검증·답변 조합이 성공했고 총 2,806ms가 걸렸습니다. fallback이 아닌 generated 경로였습니다. 이 기록은 로컬 smoke 결과이며 Vercel HTTPS에서의 성공을 의미하지 않습니다.

## UI 및 접근성

`QuestionPanel`은 서버 응답의 `answer`를 저장하고 `PublicInformationAnswerView`에 전달합니다. 본문을 HTML로 해석하지 않고 텍스트로 표시하며 문단과 원문 순서를 보존합니다. 출처 URL·기관명·확인일·문서 상태·최신성을 표시하고 확인일이 없으면 `미확인`으로 안내합니다. 대상, 서류, 단계, 문의, 장소, 다음 행동은 서버 필드가 있을 때만 표시합니다. 최신성 미확인을 AI 성공으로 승격하지 않습니다.

키보드 Enter 제출, 포커스 표시, 로딩 중 중복 제출 방지, `role=status`의 짧은 상태 알림과 `aria-busy`를 제공합니다. 질문 수정·예시 선택·화면 해제 시 이전 요청을 취소하고 늦은 응답을 무시합니다. UI 요청은 15초 후 중단하고 재시도 안내를 표시합니다. 429에는 서버의 `Retry-After`를 자연어로 안내합니다. AI 오류는 HTTP 200의 공식 정보 fallback을 그대로 표시합니다.

응답 JSON의 본문·출처·날짜·상태와 선택 구조화 필드를 렌더링 전에 검사합니다. 손상된 응답과 HTTPS 이외 링크는 일반 오류 안내로 처리해 텍스트 재시도가 가능합니다. 답변 상단의 출처 바로가기로 확인 상태와 원문 링크를 바로 찾을 수 있습니다.

## MVP API 남용 방지

- 서버 프로세스(모듈 인스턴스) 전체에 **60초 고정 구간당 30건, 동시 3건**을 적용합니다. 잘못된 입력도 허용된 요청 수에 포함됩니다. 사용자/IP별 저장소는 없고 요청 IP 헤더를 신뢰하지 않습니다.
- 제한 초과 시 검색·AI 호출 전에 `429 rate_limited`와 `Retry-After`를 반환합니다. 시간 구간 만료로 진행 중 요청 수가 초기화되지 않으며 성공·실패 시 동시 슬롯을 해제합니다.
- 실제 수신 본문을 최대 **4 KiB**, 수신 대기를 **5초**로 제한합니다. `Content-Length` 누락/위조로 우회할 수 없습니다. 기존 질문 300자 제한도 유지합니다. `application/json`만 허용합니다.
- 모든 JSON 응답에 `Cache-Control: no-store`를 적용합니다. API 오류 상세·키·질문 로그를 추가하지 않습니다.

외부 서비스·DB·인증을 도입하지 않은 단일 프로세스 데모용 보호입니다. 모든 사용자가 같은 제한을 공유하므로 다른 사용자의 요청도 지연될 수 있습니다. 재시작/개발 중 재로딩 시 초기화되며, 서버리스/다중 인스턴스 사이에서는 공유되지 않고 고정 구간 경계에서 순간 요청이 몰릴 수 있습니다. 공개 운영 시 배포 환경의 입구 제한 및 OpenAI 프로젝트 지출 한도 설정이 필요합니다. 브라우저 취소가 이미 시작한 외부 호출 비용을 되돌리지는 않습니다.

### 한계

자유로운 쉬운 말 재서술은 아직 지원하지 않아 원문이 길거나 어려우면 그대로 유지됩니다. 로컬 원자료의 오류·누락·오래된 내용과 검색 관련성은 생성 계층이 교정하지 않습니다. 최소 호출량 제한은 비용 상한이나 분산 환경 보호를 보장하지 않습니다. 실제 모델의 접근 권한과 출력 성공 여부는 운영 키를 사용한 별도 확인이 필요합니다. 모델별 추론 토큰 사용량에 따라 512 출력 토큰/8초 제한 내에 완료되지 않으면 fallback할 수 있습니다.

## 브라우저 음성 질문과 답변 듣기

별도 음성 서버, 외부 음성 API SDK, API 키 또는 추가 패키지 없이 브라우저 Web Speech API를 사용합니다. 서버의 공공정보 검색·AI·fallback·출처 데이터와 기존 제한 정책은 변경하지 않았습니다.

### STT

`SpeechRecognition` 또는 `webkitSpeechRecognition`을 실행 시 확인하고, `ko-KR`, 단발 인식, 중간 결과 표시로 설정합니다. 마이크 버튼 클릭 후에만 인식을 시작합니다. 발화가 끝나 인식 세션이 종료되면 확정 결과를 입력란에 표시하고 기존 `POST /api/public-information/search`에 한 번 전달합니다. 중간 결과는 전송하지 않습니다. 300자를 넘으면 임의로 자르지 않고 입력란에서 수정하도록 안내합니다.

마이크 연결 중/듣는 중/인식 중을 구분하고 같은 버튼으로 취소합니다. 권한 거부, 마이크 없음, 네트워크/인식 오류, 미지원 환경, 결과 없는 종료, 시작 예외 및 30초 대기 제한을 처리합니다. 취소·입력 수정·예시 선택 후 늦은 콜백은 무시하며 텍스트 입력은 계속 사용할 수 있습니다.

음성 입력은 HTTPS 또는 localhost에서 사용합니다. 브라우저 생성자의 존재만으로 실제 인식 서비스 작동이 보장되지는 않습니다. [MDN SpeechRecognition 문서](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)처럼 STT 지원은 제한적이며 Chrome 등에서는 브라우저 제공자의 서버에 음성을 보내 인식할 수 있습니다. 앱이 별도 음성 API를 추가한 것은 아니지만 오프라인/기기 내부 처리나 무전송을 보장하지 않습니다. 이 내용을 마이크 근처에서도 안내합니다.

### TTS

답변의 **답변 듣기** 버튼을 누르면 `speechSynthesis`와 `SpeechSynthesisUtterance`로 서버의 `answer.plainLanguageSummary`를 그대로 읽습니다. 자동 재생하지 않습니다. `ko-KR`을 지정하고 설치된 한국어 음성 중 기기 내 음성을 우선 사용합니다. 음성 목록 지연 로드를 위해 `voiceschanged`를 처리하며 한국어 음성이 없으면 다른 언어로 대신 읽지 않고 재시도/한국어 음성 설치를 안내합니다.

긴 본문은 문자와 순서를 보존한 짧은 발화로 나누어 순차 재생합니다. 중지, 새 텍스트 입력/질문 제출, 새 마이크 입력, 예시 선택 및 컴포넌트 해제 시 이전 재생을 취소합니다. 재생 오류 또는 발화 한 조각의 45초 무응답에도 화면의 답변은 유지합니다. 출처와 확인 상태는 화면에 계속 표시하며 버튼 옆에 본문만 읽는다는 범위를 안내합니다.

[MDN SpeechSynthesis 문서](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)에 따르면 TTS는 폭넓게 지원되지만 실제 한국어 음성의 유무·품질은 OS/브라우저에 달려 있습니다. 기기 내 한국어 음성이 없고 원격 음성이 선택되면 브라우저/OS의 음성 서비스가 사용될 수 있습니다.

### 접근성과 데모 점검

마이크·듣기·중지는 일반 button으로 Tab/Enter/Space 조작이 가능합니다. 마이크 작동 상태는 색상과 텍스트, `aria-pressed`로 함께 전달합니다. 짧은 안내는 기존 `role=status`에서 알리고 중간 인식 문자열은 반복 낭독하지 않습니다. 답변 TTS 재생 중에는 상태 영역의 `aria-live`를 off로 바꾸어 중복 낭독을 줄이고 완료/오류/중지 후 polite로 복원합니다. 실제 스크린리더를 감지하거나 끄지는 않습니다.

대회 기기에서 먼저 다음 흐름을 직접 확인하세요.

1. HTTPS 또는 localhost로 접속하고 마이크·스피커 및 한국어 읽기 음성을 확인합니다.
2. 마이크를 누르고 “장애인 콜택시 이용하려면 어떻게 해야 해?”라고 질문합니다.
3. 인식한 입력과 답변·출처·확인 상태를 확인합니다. 오인식은 입력란에서 수정 후 다시 보냅니다.
4. 답변 듣기 → 중지 → 다시 듣기 → 새 질문으로 이전 읽기 중지를 확인합니다.
5. 권한을 거절하거나 음성 서비스 연결이 실패해도 텍스트 질문으로 데모를 이어갑니다.

자동 테스트는 Chromium에서 STT/TTS 브라우저 API를 mock해 애플리케이션 연결·오류·취소·재생 원문 보존을 검증합니다. 실제 마이크로 한국어를 인식하거나 스피커의 발음/음질을 청취한 테스트는 수행하지 않았습니다. 실제 행사 기기의 브라우저 서비스·권한·네트워크·음성을 별도로 점검해야 합니다.

## 아직 구현하지 않은 기능

- 자유 재서술/축약과 의미적 근거 검증
- embedding 및 Vector DB 기반 검색
- 인증, 데이터베이스, 회원 기능

현재 텍스트/음성 질문은 등록된 4개 공식 문서에서 찾은 안내와 출처를 표시합니다. 서버 API의 제한형 AI 답변 생성은 선택적으로 활성화할 수 있고, 비활성/실패 시에도 공식 원문 안내와 답변 듣기 데모가 가능합니다. 음성 기능은 브라우저와 기기의 지원 범위 안에서 동작합니다.

## 배포

Next.js 빌드와 로컬 production 실행은 검증했습니다. 실제 Vercel 배포는 아직 검증하지 않았습니다.

배포 전 설정과 배포 후 실기기 검증은 [Vercel 체크리스트](docs/vercel-deployment-readiness.md)를 따릅니다. `.gitignore`로 Git에서 비밀 파일을 제외하며, `.vercelignore`로 CLI 업로드에서도 `.env*`와 로컬 산출물을 제외합니다. Vercel 서버 환경변수는 별도로 입력해야 합니다.

1. 제출할 코드에 새 파일까지 포함되어 있는지 확인한 뒤 Vercel 프로젝트에 연결합니다. Build Command는 `npm run build`이며 Next.js 기본 설정을 사용합니다.
2. AI를 사용할 경우 Vercel 프로젝트의 서버 환경변수에 위 세 값을 설정하고 실제 데모에 사용할 Preview/Production 환경을 선택합니다. 로컬 `.env.local`은 Git에 포함되지 않으므로 배포 환경에 자동으로 전달되지 않습니다. 변경 후 새 배포가 필요합니다.
3. 발급된 HTTPS URL을 실제 행사 기기에서 열어 텍스트 질문과 원문 링크부터 확인합니다. 마이크 권한 허용·거부, 한국어 인식, 듣기·중지는 별도로 리허설합니다.
4. 서버 요청은 본문 수신 최대 5초 + AI 최대 8초이며 브라우저는 15초에 중단합니다. 배포 함수 제한·콜드 스타트·현장 네트워크를 포함해 정상 응답이 도착하는지 확인합니다.
5. 분당 30건/동시 3건은 **인스턴스별 제한**입니다. 여러 Vercel 인스턴스 전체를 묶는 전역 제한이나 비용 상한으로 설명하지 마세요. 이번 MVP에는 분산 저장소를 추가하지 않았습니다.
