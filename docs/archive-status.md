# VoiceCare Archive 운영 기록

확인일: 2026-09-10 (KST). 이 프로젝트는 2026 성남×KAIST AI 경진대회 출품작으로 더 이상 사용하지 않으며, 비활성 보존 상태로 전환한다. 아래 기록은 실제 확인한 범위이며 이전 평가자료의 PASS를 현재 서비스 상태로 재사용하지 않는다.

## 보존

- 변경 전 `main` / `origin/main`: `67bca746b2758747a49813b97469d5e5555e138a` (`feat: simplify voice-first public information flow`). `git fetch origin` 후 ahead/behind 0/0.
- 기존 코드, 377개 tracked 파일, Git history와 9개 local branch를 삭제하지 않는다. 다른 checkout/worktree를 수정하지 않는다.
- `docs/submission-2026/` 71개와 기존 untracked `tmp/pdfs/` 2개는 원래 위치에 보존한다. 총 73개의 SHA-256을 작업 전후 대조하여 변경/누락 0개를 확인했다. 개인정보가 포함될 수 있는 이 자료를 새로 GitHub나 Vercel에 업로드하지 않는다.
- 로컬 검증 기록은 `.git/voicecare-archive-preservation.json`, `.git/voicecare-archive-deployments.json`, `.git/voicecare-archive-http.json`에 보관한다. 별도 백업을 생성했다는 의미는 아니다.
- GitHub 저장소와 Vercel 프로젝트를 삭제하지 않는다. Upstash database/account 및 API key를 삭제하거나 폐기하지 않는다.

## 코드 차단

- `src/lib/archive.ts`의 코드 상수로 차단한다. 환경변수, 실제 key, mock 의존성 주입으로 운영을 재개할 수 없다.
- `src/proxy.ts`: matcher 예외 없이 모든 요청을 `410 Gone`과 `Cache-Control: no-store`로 종료한다. 정적 파일, image optimizer, API도 포함한다. 응답은 외부 리소스와 script가 없는 텍스트이며 CSP는 `default-src 'none'`이다.
- `src/app/api/public-information/search/route.ts`: proxy를 거치지 않는 직접 POST 진입도 서비스 실행 전에 종료한다. 홈페이지에도 Archive 분기를 두어 음성 입력/출력과 질문 UI가 마운트되지 않게 한다. 기존 구현은 보존한다.
- Responses API 호출을 가진 `openai-intent-router.ts`, `openai-answer-generator.ts`, `openai-official-search.ts`를 disabled로 고정한다. 검색 provider는 Redis 예약보다 먼저 중단한다.
- `shared-search-budget.ts`에서 Upstash 요청을, `fetch-official-source.ts`에서 DNS/HTTPS 요청을 각각 중단한다.
- 직접 유료 호출이 있던 `voicecare-preflight.ts`와 직접 원격 HTTP/HTTPS 요청을 하는 live/audit 진입점도 차단한다. 환경변수를 강제로 켜는 과거 평가 도구도 유료 호출을 재개할 수 없다.
- GitHub Actions 검증은 `workflow_dispatch` 수동 실행만 유지한다. 기존 기능 회귀 테스트/평가자료는 보존하며, 현재 검증 명령은 `npm run test:archive`이다. 기존 기능 테스트의 정상 서비스 기대값은 Archive 상태에 적용되지 않는다.

## Vercel에서 적용·확인한 설정

대상: `seongnam-voice-care-ai/seongnam-voicecare-ai`, project ID `prj_NA3IAHOZ4BC3eEk4jbm6CqQlLVd5`. GitHub 연결 저장소가 위 VoiceCare 저장소인 것을 확인했다. 로컬 `.vercel/project.json`은 없으며, 로그인된 Vercel dashboard에서 대상 프로젝트를 확인했다.

- Vercel Authentication을 Standard Protection에서 **All Deployments**로 변경하여 저장했다. Production, Preview, 과거 deployment의 인증 보호를 설정했다. Automation bypass secret, protection exception domain, OPTIONS allowlist, WAF system/custom bypass는 발견하지 못했다. 이 프로젝트 자체의 Trusted Source 항목은 존재하며 변경하지 않았다.
- **Pause Project**를 적용했다. Production 도메인 `seongnam-voicecare-ai.vercel.app` 및 당시 최신 deployment는 `503 DEPLOYMENT_PAUSED`를 반환한다. Pause는 Preview에 적용되지 않는다는 dashboard 안내를 확인했다.
- 프로젝트 WAF 규칙 **VoiceCare Archive - deny all serving**을 게시했다. 조건은 **Request Path starts with `/`**, 동작은 **Deny**이며 환경·사용자·method 예외가 없다. 인증된 소유자도 과거 deployment의 홈페이지/API에서 `403 Forbidden`을 확인했다. 보존을 위한 dashboard 접근은 가능하지만 웹서비스 자체는 소유자에게도 제공하지 않는다.
- Cron Jobs 목록은 비어 있었고, 프로젝트 Cron 실행 스위치도 비활성화한다.
- 새 코드/환경변수 변경은 과거 immutable deployment에 소급되지 않는다. 그러므로 과거 배포의 차단은 이 프로젝트의 인증 보호와 WAF에 의존한다. Pause만으로 과거/Preview 전체가 중단됐다고 판단하지 않는다.

공식 근거: [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication), [Pause Project](https://vercel.com/docs/projects/managing-projects#pausing-a-project), [WAF 조건과 Deny](https://vercel.com/docs/vercel-firewall/vercel-waf/rule-configuration).

## 환경변수 이름만 확인

Vercel Production: `OPENAI_API_KEY`, `OPENAI_MODEL`, `PUBLIC_INFORMATION_AI_ENABLED`, `PUBLIC_INFORMATION_WEB_SEARCH_ENABLED`, `PUBLIC_INFORMATION_SEARCH_DAILY_USD`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

로컬 `.env.local`: `PUBLIC_INFORMATION_AI_ENABLED`, `OPENAI_API_KEY`, `OPENAI_MODEL`. 실제 값은 공개하거나 commit하지 않는다. key 삭제 여부를 차단의 전제조건으로 삼지 않는다.

## 검증 결과

| 항목 | 결과 | 실제 확인 범위 |
|---|---|---|
| Next.js 16.3.4 production build | PASS | 로컬 `next build` 성공 |
| ESLint / TypeScript | PASS | 오류 없음 |
| Archive mock tests | PASS | AI flag=true, 가짜 key/Redis 설정에서도 provider/budget/source callback 0회; 직접 API 및 proxy 410 |
| 로컬 production HTTP | PASS | `/`, API, favicon, image optimizer, 임의 경로, RSC query에서 410; POST/HEAD/OPTIONS/PUT/DELETE 410; 중복/후행 slash는 정규화 redirect 후 차단 |
| 비인증 Production | PASS | 도메인과 당시 최신 deployment의 GET/잘못된 JSON POST 모두 503 DEPLOYMENT_PAUSED |
| 비인증 과거 deployment | PASS (확인 표본) | GitHub deployment 기록에서 얻은 URL 19개 중 당시 최신 1개 503, 나머지 18개 GET 302 / 잘못된 JSON POST 401 |
| 인증된 과거 deployment | PASS (확인 표본) | `seongnam-voicecare-5njqpx6rj-seongnam-voice-care-ai.vercel.app`의 홈페이지와 API GET 모두 403 |
| Preview 실접속 | 수동 확인 필요 | Vercel Preview 필터 결과 배포 없음. All Deployments/WAF 설정은 적용했으나 존재하지 않는 Preview를 실접속 PASS로 처리하지 않음 |
| 유료 API 실호출 테스트 | 실행 안 함 | mock/코드 검사/차단된 HTTP 요청만 사용 |
| 제출자료 보존 | PASS | 73개 파일 SHA-256 동일; 원래 untracked PDF 2개는 계속 untracked |
| 전체 계정의 과금/Redis 사용량 | 수동 확인 필요 | OpenAI/Upstash 계정의 사용량 화면을 조회하지 않았음 |

## 남아 있는 위험과 수동 확인

- GitHub deployment 목록은 Vercel 수동 재배포까지 완전히 열거하지 못한다. 프로젝트 전체 보호를 적용했지만 모든 과거 URL·공유 링크·사용자 조합을 개별 검증한 것은 아니다. 전체 snapshot별 실접속은 수동 확인 필요.
- 차단 직전에 이미 실행 중이던 요청의 완료·청구 여부, key가 다른 곳에서 사용되는지, 계정 전체의 0원 여부는 수동 확인 필요. 현재 코드/배포의 차단이 과거 사용료를 없애지는 않는다.
- WAF 삭제, 프로젝트 재개, 과거 commit 재배포 또는 다른 checkout에서 과거 스크립트 실행 시 기존 key를 사용할 수 있다. Archive 보호를 유지해야 한다.
- 기존 Vercel Deployment Retention이 활성화되어 있다는 안내를 확인했다. 프로젝트와 Git은 보존되지만 장기적으로 모든 배포 snapshot의 영구 보존을 보장하지 않는다. 필요하다면 retention 보존 기간은 수동 확인 필요.
- 제출자료 73개는 GitHub에 없는 로컬 자료이다. 디스크 장애에 대비한 별도 비공개 백업 여부는 수동 확인 필요.
- 향후 사용자가 전용 여부를 확인한 후 정리할 수 있는 항목: VoiceCare 전용 OpenAI key, VoiceCare 전용 Upstash REST credentials/database, 프로젝트 환경변수. 공유 key/계정/다른 프로젝트는 임의로 폐기하지 않는다.

## 변경 파일

`README.md`, 이 문서, `.github/workflows/verify.yml`, `package.json`, `playwright.audit.config.ts`, `src/lib/archive.ts`, `src/proxy.ts`, `src/app/page.tsx`, `src/app/api/public-information/search/route.ts`, AI provider 2개, `src/lib/search/{openai-official-search,shared-search-budget,fetch-official-source}.ts`, `tests/archive.test.ts`, `scripts/{voicecare-preflight,audit-expanded-http,audit-expanded-live,audit-expanded-production-budget,audit-expanded-sources,evaluate-public-information-e2e,evaluate-voicecare-live,final-review-evaluate}.ts`, `scripts/final-review-npm-audit.mjs`.
