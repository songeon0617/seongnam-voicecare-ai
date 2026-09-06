# Public-information E2E 품질 검증

검증일: 2026-09-06 (Asia/Seoul)

## 결론

현재 등록된 13개 `PublicInformationDocument`를 대상으로 실제 시민 표현과 경계 사례 54건을 `POST /api/public-information/search`에 전송했다. 질문당 1회만 실행했고 실패 질문 재시도나 기대값 변경은 하지 않았다. 54건 모두 기대 route, 서비스 선택, clarification 종류와 공식 문서 기반 답변 무결성 기준을 만족했다.

| 지표 | 결과 |
| --- | ---: |
| 총 검증 질문 수 | 54 |
| PASS | 54 |
| FAIL | 0 |
| 정확도 | 100.0% |
| wrong_route | 0 |
| wrong_service | 0 |
| wrong_clarification | 0 |
| hallucination | 0 |
| unsupported_information | 0 |

정확도는 `PASS / 전체 질문 × 100`으로 계산했다. 이 결과는 고정된 질문셋의 2026-09-06 단일 실행 결과이며 확률적 라우터의 모든 미래 표현을 보장하지는 않는다.

## 등록 문서

활성화된 공식 출처에 연결된 현재 등록 문서는 13건이다.

| # | 서비스 | document id |
| ---: | --- | --- |
| 1 | 특별교통수단 운영 | `seongnam-special-transportation` |
| 2 | 장애인 택시바우처 | `seongnam-disabled-taxi-voucher` |
| 3 | 노인맞춤돌봄서비스 | `seongnam-senior-tailored-care` |
| 4 | 분당노인종합복지관 | `seongnam-bundang-senior-welfare-center` |
| 5 | AI·IoT 기반 어르신 건강관리 | `seongnam-senior-ai-iot-health-care` |
| 6 | 장애인 보조기구·보장구 지원 | `seongnam-disabled-assistive-devices` |
| 7 | 발달장애인 지원 | `seongnam-developmental-disability-support` |
| 8 | 장애인 보건·의료서비스 지원 | `seongnam-disabled-medical-support` |
| 9 | 중원구보건소 치매안심센터 | `seongnam-dementia-center` |
| 10 | 맞춤형 방문건강관리 | `seongnam-home-health-care` |
| 11 | 무인민원발급기 이용 안내 | `seongnam-unmanned-civil-service-kiosk` |
| 12 | 긴급복지지원 사업 | `seongnam-emergency-welfare-support` |
| 13 | 장애인 버스요금 지원 | `seongnam-disabled-bus-fare-support` |

## 판정 방법

- 실제 Next.js 개발 서버의 공개 API 경로 `POST /api/public-information/search`를 사용했다. 내부 검색 함수만 직접 호출하지 않았다.
- 1~39번은 각 서비스별로 공식명, 구어체, 상황 설명 표현을 하나씩 구성했다.
- 40~54번은 복수 후보, 지역 필요, 광범위 질문, 미지원 요청, 미등록 세부정보, 오타, 무관 질문과 clarification 후속 대화를 포함한다.
- DIRECT는 route와 단일 서비스 ID가 모두 기대값과 같아야 PASS다.
- CLARIFY는 route, 후보 집합, `clarificationId`가 모두 기대값과 같아야 PASS다.
- UNSUPPORTED는 빈 서비스 집합을 유지해야 PASS다. 현재 실제 타입명은 `NO_RESULT`가 아니라 `UNSUPPORTED`다.
- hallucination은 답변 제목·본문·대상·출처가 반환된 단일 공식 문서와 정확히 일치하고, `steps=[]`, `nextAction=null`, `requiredItems`·`contacts`·`locations`가 생성되지 않았는지 검사했다. clarification/unsupported 답변은 출처와 사실 필드가 비어 있는지 검사했다.
- unsupported_information은 등록 문서에 없는 전화번호·서류·지급액을 요청한 45~47번에서 위 문서 기반성 검사를 통과했는지 별도로 집계했다.
- API의 분당 30회 제한 때문에 같은 코드와 환경의 서버 프로세스를 27건 후 재시작해 제한기만 초기화했다. 각 질문은 한 번만 전송했다.

서비스 표기는 아래 표에서 짧게 적었다: 특별교통, 택시바우처, 노인돌봄, 분당복지관, AI·IoT 건강, 보조기구, 발달장애, 장애인의료, 치매센터, 방문건강, 무인발급기, 긴급복지, 버스요금. `-`는 빈 후보 집합이다.

## 전체 케이스 결과

| # | 질문 | 기대 route | 실제 route | 기대 서비스 | 실제 선택/후보 | 환각 | 미지원정보 | 결과 | 실패 원인 |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 특별교통수단 운영 신청에 필요한 서류가 뭐예요? | DIRECT | DIRECT | 특별교통 | 특별교통 | 없음 | 없음 | PASS | - |
| 2 | 휠체어 타는데 부를 수 있는 차 있어요? | DIRECT | DIRECT | 특별교통 | 특별교통 | 없음 | 없음 | PASS | - |
| 3 | 버스를 타기 어려운 휠체어 이용자가 이동할 차량이 필요해요. | DIRECT | DIRECT | 특별교통 | 특별교통 | 없음 | 없음 | PASS | - |
| 4 | 장애인 택시바우처 신청하려면 어떻게 해요? | DIRECT | DIRECT | 택시바우처 | 택시바우처 | 없음 | 없음 | PASS | - |
| 5 | 장애인이 택시비 할인받는 거 있어요? | DIRECT | DIRECT | 택시바우처 | 택시바우처 | 없음 | 없음 | PASS | - |
| 6 | 장애가 심한데 택시 탈 때 요금 지원받고 싶어요. | DIRECT | DIRECT | 택시바우처 | 택시바우처 | 없음 | 없음 | PASS | - |
| 7 | 노인맞춤돌봄서비스는 어디서 신청하나요? | DIRECT | DIRECT | 노인돌봄 | 노인돌봄 | 없음 | 없음 | PASS | - |
| 8 | 혼자 사는 어머니 안부를 챙겨주는 도움 있나요? | DIRECT | DIRECT | 노인돌봄 | 노인돌봄 | 없음 | 없음 | PASS | - |
| 9 | 70세 기초연금 수급자인 아버지가 병원 갈 때 동행이 필요해요. | DIRECT | DIRECT | 노인돌봄 | 노인돌봄 | 없음 | 없음 | PASS | - |
| 10 | 분당노인종합복지관 주소와 연락처 알려주세요. | DIRECT | DIRECT | 분당복지관 | 분당복지관 | 없음 | 없음 | PASS | - |
| 11 | 정자동에 어르신 교육이랑 상담하는 복지관 있어요? | DIRECT | DIRECT | 분당복지관 | 분당복지관 | 없음 | 없음 | PASS | - |
| 12 | 부모님이 분당에서 프로그램에 참여할 만한 노인복지시설을 찾고 있어요. | DIRECT | DIRECT | 분당복지관 | 분당복지관 | 없음 | 없음 | PASS | - |
| 13 | AI·IoT 기반 어르신 건강관리 신청 대상이 누구예요? | DIRECT | DIRECT | AI·IoT 건강 | AI·IoT 건강 | 없음 | 없음 | PASS | - |
| 14 | 스마트폰으로 어르신 건강 챙겨주는 서비스 있나요? | DIRECT | DIRECT | AI·IoT 건강 | AI·IoT 건강 | 없음 | 없음 | PASS | - |
| 15 | 70세이고 만성질환이 있는데 앱이랑 스마트기기로 건강관리를 받고 싶어요. | DIRECT | DIRECT | AI·IoT 건강 | AI·IoT 건강 | 없음 | 없음 | PASS | - |
| 16 | 장애인 보조기구·보장구 지원은 어디서 신청해요? | DIRECT | DIRECT | 보조기구 | 보조기구 | 없음 | 없음 | PASS | - |
| 17 | 장애인 보행차 지원받을 수 있나요? | DIRECT | DIRECT | 보조기구 | 보조기구 | 없음 | 없음 | PASS | - |
| 18 | 차상위 등록장애인인데 욕창 방석을 마련할 때 도움받을 수 있을까요? | DIRECT | DIRECT | 보조기구 | 보조기구 | 없음 | 없음 | PASS | - |
| 19 | 발달장애인 지원 서비스 신청 방법을 알려주세요. | DIRECT | DIRECT | 발달장애 | 발달장애 | 없음 | 없음 | PASS | - |
| 20 | 발달장애 자녀가 방과 후에 도움받을 곳이 있나요? | DIRECT | DIRECT | 발달장애 | 발달장애 | 없음 | 없음 | PASS | - |
| 21 | 성인 발달장애인 가족인데 낮 활동과 부모상담을 함께 알아보고 싶어요. | DIRECT | DIRECT | 발달장애 | 발달장애 | 없음 | 없음 | PASS | - |
| 22 | 장애인 보건·의료서비스 지원에는 어떤 항목이 있나요? | DIRECT | DIRECT | 장애인의료 | 장애인의료 | 없음 | 없음 | PASS | - |
| 23 | 장애검사비 지원받는 제도 있어요? | DIRECT | DIRECT | 장애인의료 | 장애인의료 | 없음 | 없음 | PASS | - |
| 24 | 등록장애인인데 진단 검사와 의료비가 부담돼요. | DIRECT | DIRECT | 장애인의료 | 장애인의료 | 없음 | 없음 | PASS | - |
| 25 | 중원구보건소 치매안심센터 연락처가 어떻게 되나요? | DIRECT | DIRECT | 치매센터 | 치매센터 | 없음 | 없음 | PASS | - |
| 26 | 기억력 검사 어디서 받을 수 있어요? | DIRECT | DIRECT | 치매센터 | 치매센터 | 없음 | 없음 | PASS | - |
| 27 | 요즘 자꾸 깜빡해서 치매 검사와 상담을 받아보고 싶어요. | DIRECT | DIRECT | 치매센터 | 치매센터 | 없음 | 없음 | PASS | - |
| 28 | 맞춤형 방문건강관리 대상과 비용을 알려주세요. | DIRECT | DIRECT | 방문건강 | 방문건강 | 없음 | 없음 | PASS | - |
| 29 | 간호사가 집에 와서 건강 봐주는 거 있나요? | DIRECT | DIRECT | 방문건강 | 방문건강 | 없음 | 없음 | PASS | - |
| 30 | 성남에 사는 차상위 만성질환자인데 집에서 건강상담을 받고 싶어요. | DIRECT | DIRECT | 방문건강 | 방문건강 | 없음 | 없음 | PASS | - |
| 31 | 무인민원발급기 이용 안내와 설치 장소를 알려주세요. | DIRECT | DIRECT | 무인발급기 | 무인발급기 | 없음 | 없음 | PASS | - |
| 32 | 등본을 기계로 뽑으려면 어디서 확인해요? | DIRECT | DIRECT | 무인발급기 | 무인발급기 | 없음 | 없음 | PASS | - |
| 33 | 주민센터가 닫았는데 무인으로 가족관계증명서를 발급하고 싶어요. | DIRECT | DIRECT | 무인발급기 | 무인발급기 | 없음 | 없음 | PASS | - |
| 34 | 긴급복지지원 사업은 어디서 신청하나요? | DIRECT | DIRECT | 긴급복지 | 긴급복지 | 없음 | 없음 | PASS | - |
| 35 | 실직해서 당장 생계비가 없는데 받을 수 있는 도움 있나요? | DIRECT | DIRECT | 긴급복지 | 긴급복지 | 없음 | 없음 | PASS | - |
| 36 | 가장의 수입이 끊겨서 월세와 의료비를 감당하기 막막해요. | DIRECT | DIRECT | 긴급복지 | 긴급복지 | 없음 | 없음 | PASS | - |
| 37 | 장애인 버스요금 지원 한도가 얼마예요? | DIRECT | DIRECT | 버스요금 | 버스요금 | 없음 | 없음 | PASS | - |
| 38 | 장애인 버스비 환급받을 수 있어요? | DIRECT | DIRECT | 버스요금 | 버스요금 | 없음 | 없음 | PASS | - |
| 39 | 성남 등록장애인인데 버스 타고 다닌 비용을 지원받고 싶어요. | DIRECT | DIRECT | 버스요금 | 버스요금 | 없음 | 없음 | PASS | - |
| 40 | 장애인이 이동할 때 차량을 불러야 할지 택시비 지원을 받아야 할지 모르겠어요. | CLARIFY / `mobility_vehicle_or_fare` | CLARIFY / `mobility_vehicle_or_fare` | 특별교통, 택시바우처 | 특별교통, 택시바우처 | 없음 | 없음 | PASS | - |
| 41 | 휠체어로 탈 수 있는 차량이 필요해요. (40번 context) | DIRECT | DIRECT | 특별교통 | 특별교통 | 없음 | 없음 | PASS | - |
| 42 | 가까운 노인복지관이 어디예요? | CLARIFY / `region_required` | CLARIFY / `region_required` | - | - | 없음 | 없음 | PASS | - |
| 43 | 성남시 복지 지원은 뭐가 있어요? | CLARIFY / `service_required` | CLARIFY / `service_required` | - | - | 없음 | 없음 | PASS | - |
| 44 | 성남시에서 반려동물 수술비를 지원받고 싶어요. | UNSUPPORTED | UNSUPPORTED | - | - | 없음 | 없음 | PASS | - |
| 45 | 장애인 버스요금 지원 담당 전화번호 알려주세요. | DIRECT | DIRECT | 버스요금 | 버스요금 | 없음 | 없음 | PASS | - |
| 46 | 맞춤형 방문건강관리 신청 서류를 전부 알려주세요. | DIRECT | DIRECT | 방문건강 | 방문건강 | 없음 | 없음 | PASS | - |
| 47 | 발달장애인 지원은 매달 얼마를 지급해요? | DIRECT | DIRECT | 발달장애 | 발달장애 | 없음 | 없음 | PASS | - |
| 48 | 장애인 택시바우쳐 어케 신청해? | DIRECT | DIRECT | 택시바우처 | 택시바우처 | 없음 | 없음 | PASS | - |
| 49 | 오늘 성남 날씨 어때? | UNSUPPORTED | UNSUPPORTED | - | - | 없음 | 없음 | PASS | - |
| 50 | 수정구에서 가까운 치매안심센터가 어디예요? | UNSUPPORTED | UNSUPPORTED | - | - | 없음 | 없음 | PASS | - |
| 51 | 혼자 사는 아버지가 돌봄을 받을지 복지관 프로그램을 다닐지 모르겠어요. | CLARIFY / `elderly_care_type` | CLARIFY / `elderly_care_type` | 노인돌봄, 분당복지관 | 노인돌봄, 분당복지관 | 없음 | 없음 | PASS | - |
| 52 | 안부를 확인해 주고 병원 갈 때 동행해 주는 쪽이요. (51번 context) | DIRECT | DIRECT | 노인돌봄 | 노인돌봄 | 없음 | 없음 | PASS | - |
| 53 | 집으로 와서 건강관리를 받는 것과 기억력 검사를 어디서 받을지 둘 다 궁금해요. | CLARIFY / `health_visit_or_dementia` | CLARIFY / `health_visit_or_dementia` | 방문건강, 치매센터 | 방문건강, 치매센터 | 없음 | 없음 | PASS | - |
| 54 | 간호사가 집에 와서 건강 상태를 봐주는 쪽이요. (53번 context) | DIRECT | DIRECT | 방문건강 | 방문건강 | 없음 | 없음 | PASS | - |

## 경계 사례 해석

- 복수 후보 세 흐름은 각각 이동수단/요금, 노인 돌봄/복지시설, 방문건강/치매 구분 질문을 정확히 반환했고 후속 context에서 의도한 단일 서비스로 수렴했다.
- 지역 없는 가까운 시설 질문은 `region_required`, 서비스 분야조차 특정할 수 없는 질문은 `service_required`로 보수적으로 확인했다.
- 반려동물 수술비, 날씨, 등록 범위 밖인 수정구의 가까운 치매안심센터 요청은 `UNSUPPORTED`로 처리했다.
- 등록 문서에 전화번호가 없는 장애인 버스요금 지원, 신청서류가 없는 맞춤형 방문건강관리, 월 지급액이 없는 발달장애인 지원 질문은 관련 문서를 선택하되 해당 값을 새로 만들지 않았다. API는 문서 전체를 그대로 제시하므로 “그 정보가 문서에 없다”는 별도 설명도 생성하지 않는다.
- `택시바우쳐`, `어케`가 포함된 짧은 오타·구어체 질문도 택시바우처로 연결됐다.

## 실패 사례

없음. 따라서 이번 단계에서 프로덕션 코드 수정이 필요한 근거는 발견되지 않았다.

## 실행 산출물

- 재현용 질문셋·API 판정기: `scripts/evaluate-public-information-e2e.ts`
- 원시 결과 1~27: `docs/public-information-e2e-validation-part1.json`
- 원시 결과 28~54: `docs/public-information-e2e-validation-part2.json`

프로덕션 코드는 변경하지 않았다.

## 전체 회귀 결과

| 검증 | 결과 |
| --- | --- |
| server tests | 124/124 PASS |
| UI tests | 43/43 PASS |
| ESLint | PASS (오류·경고 없음) |
| TypeScript `--noEmit` | PASS |
| Next.js 16.3.4 production build | PASS |

빌드 결과 `/`와 `/_not-found`는 static, `/api/public-information/search`는 dynamic route로 생성됐다.
