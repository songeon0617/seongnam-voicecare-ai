# UI/UX 시각 개선 검수 기록

기준 코드 SHA: bc86f88d869723e3f173b37850570b711ce31314
검수: 로컬 작업 트리, 2026-09-06~07 KST. Production에는 반영하지 않음.

## 1. 수정 전 UI 문제

- 큰 원형 마이크와 데스크톱 좌우 배치 때문에 글자 입력의 위치와 우선순위가 약했다.
- 모바일에서 질문 입력까지 내려가야 하는 거리가 길었다.
- 긴 답변과 출처의 구획, 확인 질문 선택지의 위계가 약했다.
- 입력 테두리, 키보드 포커스, 상태별 카드 표현을 일관되게 정리할 필요가 있었다.

## 2. 디자인 방향

기존 로고와 공공정보 서비스 성격을 유지하고, 짙은 청록색·밝은 배경·단정한 카드로 구성했다. 제목에서 성남 생활정보와 일상어 질문을 먼저 설명하고, 글자/음성 질문과 공식 자료 기반 안내를 연결했다. 공식 운영 서비스로 오인하지 않도록 경진대회 프로토타입 표기를 유지했다.

## 3. 변경한 파일

- src/app/globals.css: 색상 토큰, 기본 행간, 공통 키보드 포커스
- src/app/page.module.css: 전체 너비, 헤더·Hero·푸터, 반응형 배치
- src/app/page.tsx: 첫 화면 문구·위계, 안내 묶음, 기존 13개 범위 표시
- src/components/question-panel/question-panel.module.css: 질문·음성·답변·상태·출처 스타일
- src/components/question-panel/question-panel.tsx: 기존 폼/음성 영역 재배치, 표시용 제목과 상태 속성
- src/components/question-panel/public-information-answer.tsx: 서비스명 우선 배치, 세부 구획, 원문을 유지하는 문장별 표시 간격, 출처 카드

기존 docs/submission-2026 파일은 수정하지 않았다. 이 폴더의 PNG/JSON/Markdown은 검수 증빙이다.

## 4. 주요 UI 개선점

- 최대 너비 1040px, 중앙 정렬, 제목과 설명의 위계 정리
- 질문 입력을 패널 앞에 배치, 전송 버튼과 마이크 역할 구분
- 예시 질문을 읽기 쉬운 버튼으로 배치
- 서비스명, 핵심 원문, 대상·절차 등의 기존 세부 항목, 확인 상태, 출처 구분
- 긴 원문은 문장 사이 간격만 추가. 실제 API 응답과 DOM textContent의 동일성 확인
- 확인 질문에 친절한 안내 제목과 큰 선택 카드 적용
- 미지원·로딩·오류·긴급 안전 상태를 문구와 카드 표현으로 구분
- 공식 출처 카드에 링크·기관·확인일·최신성·문서 상태 유지
- 듣기 기능은 기존 위치와 안내 문구를 유지하면서 보조 도구 모음으로 정리

## 5. 접근성 개선

- 입력/본문 16~17px 중심, 보조 설명 14px 중심
- 키보드 포커스 3px 외곽선, 입력 라벨 및 기존 live region 유지
- 점검 화면의 모든 버튼 높이 최소 48px, 모바일 입력/전송 최소 56px, 출처 링크 최소 44px
- 계산 대비: 본문 14.76:1, 보조 본문 5.74:1, 전송 버튼 6.22:1, 음성 버튼 6.73:1, 입력 안내 5.00:1, 포커스/흰 배경 6.40:1, 입력 테두리/흰 배경 3.48:1
- 색상만으로 상태를 전달하지 않으며 애니메이션 추가 없음
- 전체 WCAG 적합성 인증이나 실제 스크린리더 사용성 검증을 의미하지 않음

## 6. 모바일 개선

Playwright Chromium의 1440px, 390px, 320px 뷰포트에서 초기·일반 답변·확인 질문·미지원·로딩·오류·글꼴 200% 확대 상태를 점검했다. 모든 경우 documentElement.scrollWidth <= innerWidth. 전역 overflow-x:hidden으로 숨기지 않았다.

390px 초기 화면·답변·선택 카드·미지원·로딩·오류·확대 화면 PNG를 직접 열어 검수했다. 실제 휴대전화/실기기 음성 품질 검증은 이번 작업 범위에 포함되지 않았다. 200% 검사는 CSS 글꼴 확대이며 브라우저 전체 확대 실험과 구분한다.

## 7. 테스트 결과

| 검증 | 결과 |
| --- | --- |
| lint | PASS |
| typecheck | PASS |
| production build | PASS |
| 기존 UI tests | 44/44 PASS |
| 기존 Server tests | 145/145 PASS |
| 화면/포커스/출처 바로가기 기록 | 27개 기록, 가로 넘침 없음 |
| 로컬 배포용 빌드 브라우저 runtime error | 0 |
| 보호 경로 diff | 0 |

npm 실행 파일이 PATH에 없어 package.json과 동일한 로컬 바이너리를 node로 실행했다. 테스트 파일과 기대값은 수정하지 않았다.

실행 명령:

- node node_modules/eslint/bin/eslint.js
- node node_modules/typescript/bin/tsc --noEmit
- node node_modules/next/dist/bin/next build
- node node_modules/@playwright/test/cli.js test
- node node_modules/tsx/dist/cli.mjs --conditions=react-server --test src/lib/search/*.test.ts src/lib/ai/*.test.ts

화면 확인은 next start의 로컬 배포용 빌드에서 AI를 비활성화해 수행했다. 일반 답변과 타 지역 미지원은 실제 로컬 API를 사용했다. 선택지가 있는 확인 질문과 지연/오류는 기존 테스트와 같은 형태의 브라우저 응답 fixture로 표시만 점검했다. 오류 검수 중 기록된 HTTP 500 로그 3건은 의도적으로 주입한 응답이며 runtime error와 구분했다.

사용자가 제시한 Local/Production E2E 61/61은 기존 기준 결과다. 이번 작업에서 외부 AI를 포함한 해당 61건을 새로 실행한 것은 아니다.

## 8. 기존 기능/서버 로직 변경 여부

변경 없음. API, 검색/라우팅, DIRECT/CLARIFY/UNSUPPORTED 판단, AI prompt/model, service ID, 공식 데이터·출처, 지역 경계, 개인정보/safety, 음성 hook, 테스트, 의존성 파일의 diff가 없다. QuestionPanel의 imports/state/request/handler/voice integration 부분을 HEAD와 문자열 대조해 동일함을 확인했다. 기존 폼·음성·선택지 이벤트 처리와 조건을 유지했다.

## 9. Production 반영 전 주의사항

현재 로컬 미커밋 UI 변경이다. 커밋·푸시·배포는 수행하지 않았다. 배포 시 기존 Production 환경변수를 유지하고 배포본에서 입력·공식 출처·확인 질문·타 지역 거절·마이크 권한 및 음성 재생을 확인한다. 로컬 검수용 AI 비활성화 설정은 프로세스 환경에만 적용했고 설정 파일에는 저장하지 않았다.

예선 자료와 화면을 함께 제출할 경우 배포 후 실제 반영된 화면을 사용하고, 기존 제출 근거 SHA와 UI 변경 후 SHA를 구분한다.

## 화면 증빙

- [수정 전 PC](before-1440.png) / [수정 전 모바일](before-390.png)
- [수정 후 PC](after-initial-1440.png) / [수정 후 모바일](after-initial-390.png)
- [모바일 답변](after-answer-390.png) / [확인 질문](after-clarification-390.png)
- [미지원](after-unsupported-390.png) / [로딩](after-loading-390.png) / [오류](after-error-390.png)
- [포커스](after-focus-390.png) / [글꼴 확대](after-text-200-percent-390.png)
- [화면 측정](visual-checks.json) / [대비 계산](contrast-checks.json)
