// Supabase Storage 공용 헬퍼 (shared) — 서명 URL 생성·버킷 업로드 idiom 단일화.
// 17+ 화면(드레스/메이크업/헤어/사진보정 피팅 갤러리·결과 등)이 같은 패턴을 복붙해 왔다.
// 여기로 모아 드리프트(만료시간·옵션 불일치)를 막는다. data 레이어/페이지 어디서나 재사용.

import { supabase } from "@/integrations/supabase/client";

/** 자주 쓰는 서명 URL 만료(초). */
export const SIGNED_URL_TTL = {
  /** 업로드 직후 미리보기용 — 2시간. */
  preview: 60 * 60 * 2,
  /** 갤러리·결과 조회용 — 24시간. */
  day: 60 * 60 * 24,
} as const;

/** 프라이빗 버킷의 객체에 대한 서명 URL 생성. 실패 시 null(호출부가 폴백 처리). */
export async function createSignedUrl(
  bucket: string,
  path: string,
  expiresSec: number,
): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresSec);
  return data?.signedUrl ?? null;
}

/** 파일을 버킷에 업로드. 기본 upsert=false. 에러 시 throw(호출부가 메시지 노출). */
export async function uploadToBucket(
  bucket: string,
  path: string,
  file: File | Blob,
  opts?: { contentType?: string; upsert?: boolean },
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    ...opts,
  });
  if (error) throw error;
}
