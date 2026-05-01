# 딥리서치 프롬프트 — 카테고리별 수동 enrichment

API 호출 없이 ChatGPT/Gemini AI Studio/Claude의 **딥리서치 모드**에서
수동으로 업체 정보를 수집해 JSON으로 받아 import하는 워크플로우.

(`enrich-with-gemini.ts`의 자동 enrichment와 동일한 스키마지만 사람이 직접 수행.)

## 사용 흐름

1. **미처리 업체 추출**: 카테고리별로 enrichment가 안 된 N개 추출
   ```sql
   -- 예: 스튜디오 미처리 10개 (place_studios에 신규 컬럼 NULL인 것)
   SELECT p.place_id, p.name, p.city, p.district
   FROM places p
   JOIN place_studios s USING (place_id)
   WHERE p.category = 'studio'
     AND s.package_types IS NULL
   ORDER BY p.is_partner DESC NULLS LAST, p.created_at DESC
   LIMIT 10;
   ```

2. **프롬프트 복붙**: 카테고리별 `.md` 파일을 통째로 딥리서치에 붙여넣고,
   파일 하단 `## 입력 업체 리스트` 자리를 위 SQL 결과로 교체.

3. **JSON 응답을 파일로 저장**: `tmp/studio-batch-1.json` 식으로.
   응답이 JSON 배열인지 확인.

4. **Import**:
   ```bash
   npm run import-gemini-json -- tmp/studio-batch-1.json --dry-run
   npm run import-gemini-json -- tmp/studio-batch-1.json
   ```

5. **검증**:
   ```sql
   SELECT COUNT(*) AS done
   FROM place_studios
   WHERE package_types IS NOT NULL;
   ```

## 프롬프트 파일

- `studio.md` — 스튜디오 (`place_studios`, 348행)
- `dress-shop.md` — 드레스샵 (`place_dress_shops`, 113행)
- `makeup-shop.md` — 메이크업샵 (`place_makeup_shops`, 112행)

세 프롬프트 모두 **SDM 공통 블록**(card_partners, installment_months, gift_items,
promotion_text, package_url, is_bestseller, is_new)을 포함.

## 배치 사이즈 권장

딥리서치 1세션당 **5~10개**가 적정 (응답 JSON 길이/시간 고려).
업체 1개당 5~7개 검색 쿼리를 돌리므로 10개 처리 시 50+ 쿼리.
