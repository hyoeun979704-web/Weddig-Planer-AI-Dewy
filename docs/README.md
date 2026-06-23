# Dewy `docs/` 인덱스

> 문서가 164개라 길찾기용 인덱스. **규칙·플레이북은 `AGENTS.md`가 단일 소스**이고, 여기 `docs/`는
> 그 상세·기록이다. 파일을 옮기면 `AGENTS.md`·`CLAUDE.md`의 `docs/이름.md` 포인터가 깨지므로
> **이름은 유지**하고 이 인덱스로 분류만 한다.
>
> - `YYMMDD_*.md` = **그 시점 스냅샷/기록**(코드리뷰·시뮬레이션·계획). 최신이 정답 — 과거는 히스토리.
> - 아래 **📐 규칙·방법론**이 현행 단일 소스(매번 따른다). 나머지는 주제별 상세/기록.
> - 서브폴더: `assets/` `events/` `ios-widgets/` `preview/` `slides_pdf/` `sql/`.

## 📐 규칙·방법론 (현행 단일 소스 — AGENTS.md가 참조)
- **code-review-rules.md** — 14차원 코드리뷰 상세·Red Flags·프롬프트 템플릿.
- **verification-lessons.md** — "작동한다≠검증됨" 회귀 사례 전문(라벨vs값·RPC인자·섀도잉 등).
- **audit-surface-map.md** — 전체감사 surface 커버리지 맵(라우트 130+ 전수) + 개인화 기회 매트릭스 양식.
- **persona-ux-review-rules.md** — 페르소나 UX 검토 방법론(20모드 기준).
- **invitation-template-rules.md** — 청첩장 템플릿 좌표·인쇄 규칙.
- **tutorial-system.md** — 코치마크/튜토리얼 레슨 추가 절차.
- **guide-authoring.md** — 인앱 사용법 가이드 작성 플레이북.
- **feature-simulation.md** — 기능 시뮬레이션·경쟁사 분석 선행(§5).
- **ux-fatigue-guidelines.md** — 결정 피로·UX 과부하 가이드.

## 🔍 전체감사·코드리뷰 기록 (YYMMDD = 스냅샷)
**260623_codereview.md** (최신 — 14차원 전 surface) · 260606_codereview.md · 260606_codereview_2.md · 260606_codereview_3.md · 260608_codereview.md · 260611_codereview.md · 260613_admin_review.md · 260613_auth_review.md · 260613_codereview.md · 260613_codereview_2.md · 260613_platform_consistency.md · 260614_codereview.md · 260614_codereview_2.md · 260615_codereview.md · 260615_codereview_2.md · 260615_codereview_3.md · 260616_codereview.md · 260616_codereview_2.md · 260617_codereview.md · 260617_codereview_2.md · 260617_codereview_3.md · 260617_codereview_4.md · 260617_consistency_audit.md · 260618_schema_audit.md · 260619_codereview.md · 260619_vendor_detail_audit.md · 260620_codereview.md · 260620_codereview_2.md · 260620_codereview_3.md · 260620_gatekeeper_review.md · 260620_google_play_policy_audit.md · 260620_launch_readiness_audit.md · 260621_codereview.md · 260622_codereview.md · 260622_codereview_2.md · CODE_REVIEW_REPORT.md · feature-activation-audit.md

## 🎯 페르소나·개인화
260606_persona_ux_findings.md · 260616_persona_ux_implemented_features.md · 260616_persona_ux_reference_matching.md · 260617_business_persona_e2e.md · 260621_persona_simulation.md · 260621_personalization_redesign.md · 260622_personalization_plan.md · persona-simulation.md · persona-simulation-v2.md · persona-ux-review.md · persona-ux-review-v2.md · persona-v2-retrospective.md

## 💌 청첩장 (invitation)
260611_invitation_roadmap.md · 260614_invitation_editor_competitor_analysis.md · 260616_invitation_design_marketplace.md · 260616_invitation_print_order_design.md · 260616_invitation_product_types.md · 260616_reference_matching_design.md · 260622_invitation_drive_sync_HANDOVER.md · 260622_invitation_drive_sync_simulation.md · bizhows-paper-research.md · invitation-app-style-engine.md · invitation-template-gpt-guide.md · invitation-ux-improvement-plan.md · invitation-ux-review.md · mobile-editor-plan.md · mobile-invitation-revamp.md · mobile-invitation-roll-wireframe-prompt.md · paper-invitation-formats-plan.md

## 🏢 기업·운영자·벤더
260611_business_member_plan.md · 260613_business_dashboard_review.md · 260616_retouch_vendor_flow_simulation.md · 260617_business_media_plan.md · 260617_design_admin_ux.md · 260617_multibranch_geodedup_plan.md · 260619_dochak_business_plan.md · 260619_vendor_commerce_plan.md · admin-business-app-split.md · admin-setup.md · business-guide-capture.md · business-listing-enhancement-plan.md · business-onboarding-guide.md · business-plan.md · business-plan-gov.md · business-plan-ir-deck.md · partner-company-intro.md · partner-proposal.md

## 📱 iOS·네이티브·출시·스토어
260620_data_safety_mapping.md · 260620_google_iap_setup.md · 260620_launch_handoff.md · **260622_apple_iap_setup.md** · **260622_appstore_submission_runbook.md** · android-target-sdk-upgrade.md · capacitor-migration-plan.md · ios-packaging.md · play-store-listing.md · release-guide-android.md · safe-area-system.md · submission-attachments.md · widget-system.md

## 💳 결제·구독·법규
260619_regulation_ux_review.md · 260620_payment_compliance_plan.md · 260620_subscription_autorenew_plan.md

## 🤖 AI (플래너·스튜디오·RAG)
260612_ai_planner_caching_grounding_plan.md · 260612_ai_planner_review.md · 260614_aio_strengthening.md · 260615_rag_grounding_presentation.md · 260615_rag_grounding_script.md · 260619_vertical_ai_positioning.md · ai-planner-handoff.md · aiplanner-ux-review.md · connection_strengthening_design.md · makeup-samples-gpt-guide.md · makeup-samples-final-prompts.md · makeup-samples-prompts-generated.md

## 📣 마케팅·사업·IR
260619_gov_funding_strategy.md · marketing-plan.md · naver-search-ads-keyword-map.md · service-briefing.md

## ⚙️ 셋업·운영 가이드
260617_ops_migration_and_push.md · ADS_SETUP.md · analytics-events-spec.md · calendar-sync-setup.md · inquiry-notification-setup.md · kakao-chatbot-setup.md · kakao-login-setup.md · push-notification-scenarios.md

## 🖥️ UX 리뷰
260613_e2e_ux_review.md · 260617_detail_redesign.md · 260618_detail_redesign_handoff.md · core-flows-ux-review-v2.md · home-community-ux-review.md · mypage-ux-review.md · schedule-budget-ux-review.md

## ⚡ 성능·리팩터
260621_optimization.md · god-file-split-plan.md · parallel-tracks.md · perf-optimization-plan.md · perf-optimization-prompts.md

## 🗺️ 계획·전략·핸드오프
260611_competitor_analysis.md · 260613_agent_org_blueprint.md · 260619_feature_enhancement_plan.md · 260620_FINAL_execution_plan.md · 260620_MASTER_PLAN.md · 260620_growth_improvements_plan.md · 260620_handoff_continuation.md · 260620_wedding_photoshoot_draft_plan.md · 260621_competitor_analysis_2.md · 260621_design_appeal_and_coverage.md

## 🗂️ 기타
260607_game_dailylimit_ads.md · 260613_agent_automation_research.md · 260613_desktop_responsive.md · 260616_e2e_simulation.md · 260616_inapp_email_design.md · 260622_schedule_research.md · ai-uploads-retention.md · consumer-guide-qa.md · consumer-onboarding-guide.md · visual-review.md

---

> 새 문서 추가 시 이 인덱스의 해당 카테고리에 한 줄 추가. **규칙 변경은 여기 말고 `AGENTS.md`**(단일 소스).
