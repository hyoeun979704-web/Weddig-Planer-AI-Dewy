# 모바일 청첩장 템플릿 (프리뷰/보존)

세로 스크롤(seamless_roll) 9:16 모바일 청첩장. 에셋(폴라로이드·배경·트레이싱 SVG)은
self-contained data-URI 임베드 상태(프리뷰용). **운영 등록 전 권장**: raster(폴라로이드·배경)는
Supabase Storage 공개 버킷으로 옮기고 URL 참조로 교체해 layout 크기를 줄일 것.

- natty-polaroid.json — 폴라로이드/블루 수채/더스티블루 트레이싱 아이콘, decor: petals
- kids-pastel.json — 하트 프레임/파스텔/핑크 doodle, auto_cutout 커버, decor: hearts

등록 시: invitation_templates(format='mobile', layout=<이 JSON>, price_hearts=0, is_active=false)
