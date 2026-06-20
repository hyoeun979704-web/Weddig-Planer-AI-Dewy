# Data Safety / App Privacy 신고용 매핑표 (R2 — 260620)

> R2 수집항목 전수조사 결과. **Google Play Data Safety**·**Apple App Privacy** 콘솔에 **이대로 신고**한다.
> "이름·이메일만"으로 신고하면 **실제 수집과 불일치 → 반려·과태료**. 방침(`/privacy`)도 이 표에 맞게
> 정정 완료(광고ID·캘린더 위탁 추가, 사진 보유기간 분리).

## A. 수집 데이터 (Google Play Data Safety)
| 카테고리 | 항목 | 수집 | 공유(3rd) | 목적 | 선택? |
|---|---|---|---|---|---|
| 개인정보 | 이메일·이름(닉네임)·**전화(선택)**·생년월일 | ✅ | — | 계정·연령확인 | 필수/일부선택 |
| 사진·동영상 | **얼굴·전신 사진(AI Studio)**, 커뮤니티·다이어리 사진 | ✅ | OpenAI·remove.bg | AI 생성·게시 | 선택 |
| 금융정보 | 결제 금액·주문내역, **배송 이름·전화·주소**(상품주문 시) | ✅ | PG(KakaoPay/PortOne) | 결제·배송 | 기능사용 시 |
| 건강·민감 | 임신·결혼이력·자녀·부모 정보 | ✅(별도동의) | — | 페르소나 맞춤 | 선택 |
| 앱 활동 | 채팅 내용, 서비스 이용기록 | ✅ | Google(Gemini) | AI·추천 | 기능사용 시 |
| **기기·식별자** | **광고 ID(AdMob·AdSense)**, user-agent, 기기정보 | ✅ | **Google** | **광고**·진단 | — |
| 앱 성능 | 크래시·에러 로그 | ✅ | — | 디버깅 | — |
| 캘린더(선택) | 일정(웨딩·체크리스트) | 연동 시 | Google·Kakao | 캘린더 연동 | 선택 |

- **전송 중 암호화**: 예(HTTPS/TLS). **삭제 요청 가능**: 예(인앱 계정삭제 + 스토리지 파기).
- ⚠️ **광고 ID** 항목을 반드시 체크(가장 흔히 누락 → Play 경고/반려).

## B. 제3자 제공·국외이전 (전부 신고)
| 수탁/수신자 | 국가 | 데이터 |
|---|---|---|
| Supabase Inc. | 미국 | DB·인증·파일 |
| OpenAI, L.L.C. | 미국 | 사진·텍스트 |
| Google LLC (Gemini) | 미국 | 채팅·웨딩정보 |
| Kaleido AI GmbH (remove.bg) | 독일 | 사진 |
| PortOne + PG(KakaoPay) | 한국 | 결제정보 |
| Vercel Inc. | 미국 | 접속·CDN |
| **Google (AdMob/AdSense)** | 미국 | **광고 ID·기기** |
| Google·Kakao 캘린더(선택) | 미국·한국 | 일정 |

## C. Apple App Privacy 매핑(카테고리)
- **Contact Info**: Email·Name·Phone.
- **User Content**: Photos(얼굴 포함).
- **Health & Fitness / Sensitive**: 임신·건강 관련(Sensitive Info).
- **Financial Info**: Purchase history(결제), 배송정보.
- **Identifiers**: User ID, **Device/Advertising ID**(AdMob).
- **Usage Data**: 제품 상호작용·채팅.
- **Diagnostics**: Crash·Performance.
- 각 항목 "앱 기능 / 분석 / **제3자 광고**(AdMob)" 용도 표시, 트래킹(ATT) = 광고ID 사용 시 "예".

## D. 남은 코드 보강(별도 — fineable 잔여)
- (Medium) `dataUsage` 동의 토글 UI 노출 확인(방침은 "별도 동의" 명시).
- (Medium) `payments.raw_response` PG 원응답에 민감필드 있으면 strip/암호화.
- (Medium) `client_error_logs.stack` PII 필터.
- (Low) 캘린더 연동분 계정삭제 시 해지 포함.
> 위는 R2 후속(코드)로, 본 신고표(A~C)와 방침 정정이 **반려·과태료 1차 방어**.
