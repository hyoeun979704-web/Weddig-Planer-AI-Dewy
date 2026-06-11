// 범용 CSV 내보내기 — 의존성 없이 Blob 다운로드.
// 엑셀(한국어 Windows)이 UTF-8 을 올바로 열도록 BOM(﻿) 을 붙인다.

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

const escapeCell = (raw: unknown): string => {
  if (raw === null || raw === undefined) return "";
  const s = String(raw);
  // 콤마·따옴표·줄바꿈 포함 시 RFC4180 인용
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = <T>(columns: readonly CsvColumn<T>[], rows: readonly T[]): string => {
  const head = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(","));
  return [head, ...body].join("\r\n");
};

export const downloadCsv = (filename: string, csv: string): void => {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
