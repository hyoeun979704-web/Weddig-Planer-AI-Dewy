// 개인정보 보유·이용기간의 **단일 소스(SSOT)**.
//
// 개인정보처리방침(/privacy)·계정삭제 안내(/account-deletion)의 보유기간 서술이 서로 어긋나면
// 법적 리스크다. 표시는 이 배열을 참조한다(현재는 문서 일관성 검증·향후 렌더 단일화용).

export interface RetentionRow {
  /** 데이터 항목 */
  category: string;
  /** 보유기간 */
  period: string;
  /** 근거 */
  basis: string;
}

export const DATA_RETENTION: readonly RetentionRow[] = [
  { category: "회원 정보", period: "탈퇴 시까지", basis: "본인 동의" },
  { category: "사용자 업로드 사진", period: "처리 후 30일(자동 삭제)", basis: "본인 동의" },
  { category: "AI 결과물", period: "탈퇴 시까지", basis: "본인 동의" },
  { category: "채팅 기록", period: "최대 1년", basis: "서비스 운영" },
  { category: "계약·결제 기록", period: "5년", basis: "전자상거래 등에서의 소비자보호에 관한 법률" },
  { category: "소비자 분쟁·민원 기록", period: "3년", basis: "전자상거래 등에서의 소비자보호에 관한 법률" },
  { category: "접속 로그(IP 등)", period: "3개월", basis: "통신비밀보호법" },
] as const;
