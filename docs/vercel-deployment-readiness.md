# Vercel 배포 준비 및 HTTPS 데모 체크리스트

검증일: 2026-09-05 (KST).

**이번 작업은 사용자의 후속 요청에 따라 배포 준비까지만 완료했다. Vercel 로그인 권한 승인·프로젝트 생성·환경변수 전송·배포·Git push는 실행하지 않았다.**

## A. 배포 성공 여부

미배포. 코드 기준 배포 준비 검사는 통과했다. Next.js 16.3.4 App Router, Node.js POST Route Handler, build/start 스크립트와 lockfile이 있으며 최종 로컬 production build도 성공했다. 정적 export 설정은 없다. 이 앱은 POST API가 필요하므로 정적 사이트로 내보내지 않는다.

Vercel CLI 인증·VERCEL_TOKEN·프로젝트 연결 파일이 없었다. 브라우저에서 GitHub 계정 승인 화면까지 확인했으며 사용자가 준비까지만 진행하도록 선택해 승인하지 않고 해당 탭을 닫았다. Vercel CLI 59.11.2의 버전 조회만 임시 실행했다. 프로젝트 의존성·package.json·package-lock.json은 변경하지 않았다.

## B. 배포 URL

없음. 추정 주소를 배포 URL로 표시하지 않는다. 배포 후 Vercel이 발급한 실제 HTTPS 주소와 배포 ID, 배포한 Git commit 또는 작업본을 아래에 기록한다.

- HTTPS URL: 미발급
- 배포 ID: 미발급
- 배포 소스: 미배포
- 실제 검증 기기/브라우저: 미기록

## C. 환경변수 설정 여부

| 이름 | Vercel에 넣을 값 | 유형 | 로컬 상태 | Vercel 상태 |
| --- | --- | --- | --- | --- |
| `PUBLIC_INFORMATION_AI_ENABLED` | `true` | Config | 일치 확인 | 미설정/미확인 |
| `OPENAI_API_KEY` | 사용자의 실제 키를 Vercel 비밀값 입력란에 직접 입력 | Secret | 존재 확인, 값 출력 안 함 | 전송 안 함 |
| `OPENAI_MODEL` | `gpt-5.6-terra` | Config | 일치 확인 | 미설정/미확인 |

실제 데모에 사용할 Production 환경에 설정한다. Preview에서도 검증할 경우 Preview 대상에도 설정한다. Development 설정만으로 Preview/Production에 적용된 것으로 판단하지 않는다. 저장 후 새 배포로 반영한다. `.env.local`은 업로드 대상이 아니며 Vercel에 자동으로 전달되지 않는다.

`NEXT_PUBLIC_` 접두사는 사용하지 않는다. 키를 커맨드 인자·스크린샷·채팅·소스 코드에 넣지 않는다. Vercel은 현재 Config와 Secret 유형을 제공하며 키에는 Secret을 선택한다. 팀에서 Production 비밀값 분리 정책을 사용하는 경우 해당 정책에 맞는 값을 입력한다. [Vercel 비밀 환경변수 공식 문서](https://vercel.com/docs/environment-variables/sensitive-environment-variables), [환경별 설정 공식 문서](https://vercel.com/docs/environment-variables/manage-across-environments).

## D. 실제 AI 동작 여부

이전 턴에서 로컬 실제 smoke를 정확히 1회 실행해 성공했다.

- 모델: `gpt-5.6-terra`
- 총 시간: 2,806ms (검색·OpenAI 요청·응답 파싱·검증·조합 포함)
- 결과: `generated`, fallback 아님
- 실제 API 오류: 없음

이번 배포 준비에서는 실제 OpenAI 요청을 추가하지 않았다. 최종 자동 테스트는 mock 제공자 또는 AI 비활성 서버를 사용했다. 배포 URL의 실제 AI 동작은 아직 미검증이다.

## E. STT/TTS 실기기 검증 여부

미검증. 기존 표준/접두사 SpeechRecognition, 한국어 STT 자동 제출, TTS 듣기·중지, 권한 오류·timeout·취소 복구는 mock 테스트로 통과했다. 실제 HTTPS 권한 창, 마이크 인식, 한국어 발음과 스피커 출력은 배포 후 행사 기기에서 확인해야 한다. API 생성자가 존재하거나 한국어 음성 목록이 있다는 사실만으로 통과 처리하지 않는다.

## F. 발견된 blocker

1. 실제 배포 인증이 준비되지 않았으며 사용자 요청으로 배포 진행을 중단했다. 앱 코드 실패로 분류하지 않는다.
2. 핵심 MVP 파일에 미커밋·미추적 변경이 있다. GitHub 연동 배포 전에 현재 파일들을 검토해 커밋·push해야 한다. 현재 원격 저장소만 가져오면 검증한 로컬 작업본과 다를 수 있다. 이번 작업에서 원격 코드 동기화를 수행하지 않았다.
3. Vercel의 실제 클라우드 의존성 설치·빌드·함수 실행·콜드 스타트·HTTPS 음성 동작은 미검증이다. 로컬 build 성공으로 이를 대체하지 않는다.

새로운 앱 코드 blocker는 발견하지 않았다. 인스턴스별 30건/분·동시 3건 제한은 Vercel 전체 인스턴스를 통합하는 전역 제한이나 비용 상한이 아니다.

## G. 수정 내용 및 비밀키 검사

- `.vercelignore` 추가: `.env*`, 로컬 빌드·테스트 산출물·로그·Git 메타데이터를 CLI 업로드에서 명시적으로 제외한다. 기존 `.gitignore`의 환경파일 제외도 유지한다. [Vercel 업로드 제외 공식 문서](https://vercel.com/docs/deployments/vercel-ignore).
- `README.md` 수정: 실제 smoke 성공 기록 반영 및 배포 체크리스트 연결.
- `docs/demo-readiness-validation.md` 수정: 초기 SKIPPED 기록과 후속 smoke 성공을 구분.
- 이 문서 추가: 배포 설정·검증 기준·수동 체크리스트.

STT/TTS, UI, 검색, AI 제공자, 공식 데이터, 테스트 코드는 수정하지 않았다. 새 앱 기능이나 프로젝트 패키지를 추가하지 않았다.

보안 검사 결과:

- `.env.local`은 `.gitignore`의 `.env*` 규칙으로 제외됨. Git에 추적 중인 환경파일 없음.
- Git 추적/미추적 대상 51개 파일 및 staged/unstaged diff에서 실제 로컬 키·OpenAI 키 패턴 일치 없음(문서 추가 전 검사).
- 로컬 Git 참조의 과거 blob 98개에서도 실제 키·키 패턴 일치 없음. 원격의 별도 삭제 기록이나 접근 불가능한 참조까지 검사한 것은 아님.
- 실제 키를 로드한 최종 build의 클라이언트 JS 청크 10개에서 실제 키·키 변수·OpenAI 제공자 URL 노출 없음.
- 로컬 개발 로그 1개에서 실제 키·키 패턴 일치 없음. 원격 Vercel 로그는 아직 없음.
- 제공자 원시 오류/키를 API 응답에 넣는 코드나 클라이언트 공개 접두사 사용 없음. 실제 키의 문자열은 검사 프로세스 안에서만 비교하고 출력하지 않았다.

## H. 최종 테스트 결과

| 명령 | 이번 작업 결과 |
| --- | --- |
| `npm test` | 82/82 PASS (서버 46, Chromium UI 36, UI 약 21.4초) |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, Next.js 16.3.4, `.env.local`을 사용하는 로컬 build |
| `git diff --check` | PASS |

번들 Node.js v24.19.0과 `pnpm dlx npm@12.0.2`로 프로젝트 npm 스크립트를 실행했다. 테스트 수와 기존 82개 테스트는 유지했다. 검사 중 `NO_COLOR`/`FORCE_COLOR` 안내가 있었으며 테스트 오류는 아니다.

## I. 지금 대회 데모 가능한지

**로컬 텍스트 MVP와 검증된 로컬 AI smoke는 사용 가능한 상태다. 외부 HTTPS·실기기 음성을 포함한 대회 데모는 아직 검증 완료가 아니다.**

다음 배포 시 권장 설정:

| 설정 | 값 |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | 저장소 루트 (`.`) |
| Build Command | `npm run build` |
| Install Command | lockfile을 사용하는 Vercel 기본 설정. 설치 실패 시 로그의 원인을 먼저 확인 |
| Output Directory | Next.js 기본값 유지. 정적 `out`으로 바꾸지 않음 |
| Node.js | 로컬과 같은 24.x를 선택하고 클라우드 build 결과 확인 |
| 환경변수 | C의 세 항목을 실제 배포 환경에 입력 |

Vercel의 Next.js 지원 및 Node.js 버전은 [Next.js 배포 공식 문서](https://vercel.com/docs/frameworks/full-stack/nextjs), [지원 Node.js 버전](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)을 확인했다. 특정 프로젝트의 접근 권한·요금제·실제 빌드 성공을 보증하는 설정표는 아니다.

## J. 남은 수동 확인 항목

### 배포 실행 전

- [ ] Vercel 계정·사용할 팀/프로젝트 확인 및 필요한 로그인 승인.
- [ ] 현재 검증한 작업본의 신규 파일을 포함해 Git 변경 검토. `.env.local`·키·로컬 산출물 제외 확인.
- [ ] GitHub 연동 방식이면 검토한 소스를 커밋·push한 후 그 commit으로 배포. CLI 방식이면 `.vercelignore`를 포함한 로컬 작업본과 대상 프로젝트 확인.
- [ ] C의 환경변수 등록, `OPENAI_API_KEY`는 Secret, `OPENAI_MODEL=gpt-5.6-terra` 유지.
- [ ] build 성공 및 Ready 상태 확인. 실제 HTTPS URL·배포 ID·소스 버전 기록.
- [ ] 행사 참가자가 사용할 브라우저에서 URL에 접근 가능한지 확인. 배포 보호 설정 때문에 로그인 화면이 나오면 공개 접근을 검증한 것으로 기록하지 않음.

### HTTPS 텍스트·AI·출처

- [ ] 대표 질문 **“노인맞춤돌봄서비스 신청하려면 어떻게 해야 하나요?”**를 1회 제출.
- [ ] 브라우저 Network에서 `/api/public-information/search` 요청 1건, HTTP 200 확인. 동일 화면의 답변 표시 확인.
- [ ] `answerGeneration.status === "generated"` 및 `mode === "constrained_presentation"` 확인. HTTP 200만으로 실제 AI 성공으로 판단하지 않음.
- [ ] 소요 시간 기록. 8초 AI 제한으로 fallback하면 실제 AI 성공으로 기록하지 않음. 로그에 키/원시 제공자 응답을 출력하지 않음.
- [ ] `answer.plainLanguageSummary`에 검색된 각 공식 문서의 전체 본문과 문서명이 보존되는지 확인. 다중 문서의 대상 목록이 하나로 합쳐지지 않는지 확인.
- [ ] `results[].document`와 `answer.sources`의 문서 ID/sourceId, 원문 URL, 확인일, 문서 상태, 최신성 상태 대조.
- [ ] 대표 돌봄 출처 `https://www.seongnam.go.kr/wf-pm020101/22001` 링크 열림 확인. 저장 데이터 기준 확인일 2026-09-05, 문서 active, 최신성 unknown이 표시에서 임의 승격되지 않는지 확인.
- [ ] 출처 바로가기, 키보드 포커스, 브라우저 console error/hydration error 없음 확인.
- [ ] 390px·320px 모바일에서 입력칸과 버튼이 잘리지 않고, 입력칸 높이 62px·출처 링크·상태 메시지 확인.

### HTTPS 실기기 음성

- [ ] 실제 행사 브라우저·마이크·스피커·네트워크를 사용. 최초 마이크 클릭 시 사이트 권한 요청 확인.
- [ ] 권한 허용 후 대표 질문을 한국어로 말해 입력란 인식문과 자동 검색 1건 확인.
- [ ] 같은 질문을 3회 독립적으로 말하고 인식문·검색 적중·오인식 수정 가능 여부 기록.
- [ ] 답변 듣기로 한국어 발화·전체 순서·전화번호 발음을 직접 청취.
- [ ] 중지 → 다시 듣기 → 새 질문 입력 시 기존 발화 중지 확인.
- [ ] 사이트 마이크 권한 거부 후 안내 표시, 같은 질문의 텍스트 제출 정상 동작 확인.
- [ ] STT 미지원/서비스 실패나 한국어 TTS 미설치에서도 텍스트 입력과 본문을 계속 사용할 수 있는지 확인.
- [ ] 탭을 닫거나 페이지를 떠난 뒤 음성이 남지 않는지, 실기기 스크린리더와의 겹침 확인.

### 장애 복구와 최종 고정

- [ ] 검색 없음, 네트워크 오류 후 재시도, 429 대기 후 복구, AI fallback 상태를 구분해 확인.
- [ ] 실제 기존 공식 문서 4건의 링크/내용/최신성을 행사 전에 재확인. 확인하지 않은 날짜는 갱신하지 않음.
- [ ] 최종 HTTPS 주소와 데모 질문을 고정하고 localhost 텍스트 대체 흐름 준비.

이번 체크리스트의 미체크 항목은 미검증이다. 자동 mock 테스트 결과로 수동 체크를 완료 처리하지 않는다.
