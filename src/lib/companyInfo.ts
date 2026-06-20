// 회사·사업자 법적 정보의 **단일 소스(SSOT)**.
//
// 약관(/terms)·개인정보처리방침(/privacy)·위치약관·푸터·계정삭제 등 **모든 표시는 여기를 참조**한다.
// 인라인 하드코딩 금지 — 사업자번호·연락처·주소가 파일마다 흩어지면 변경 시 드리프트가 생기고,
// 값이 어긋나면 전자상거래법 표시의무 위반 등 **법적 리스크**가 된다.
//
// 런타임 연락처는 `useAppConfig()`/`app_config` 테이블 override 가 우선이며, 아래 값은 정적 폴백이다.

export const COMPANY = {
  /** 상호(국문) */
  name: "듀이",
  /** 상호(영문) */
  nameEn: "Dewy",
  /** 대표자 */
  ceo: "김효은",
  /** 사업자등록번호 */
  bizRegNo: "218-38-01132",
  /** 통신판매업신고번호 */
  telecomSalesNo: "제 2023-충남천안-1575호",
  /** 사업장 주소 */
  address: "충청남도 천안시 서북구 천안대로 1446, 16층 듀이",
  /** 고객센터 전화 */
  phone: "050-6459-7504",
  /** 고객센터 운영시간 */
  operatingHours: "평일 10:00~18:00",
  /** 대표 이메일(정적 폴백 — 런타임은 useAppConfig 우선) */
  email: "kheceo@dewy-wedding.com",
  /** 웹사이트 */
  website: "dewy-wedding.com",
  /** 개인정보 보호책임자 */
  privacyOfficer: { name: "김효은", title: "대표자", email: "kheceo@dewy-wedding.com" },
} as const;
