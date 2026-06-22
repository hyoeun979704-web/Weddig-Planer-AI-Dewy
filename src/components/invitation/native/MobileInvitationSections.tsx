// 네이티브 모바일 청첩장 섹션 컴포넌트(I-MOBILE Phase 1).
// 전부 반응형 DOM. 데이터 없는 섹션은 호출부에서 렌더하지 않는다(큐레이션).

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy, MapPin, ChevronDown, X } from "lucide-react";
import type { MobileInvitationContent, AccountEntry } from "@/lib/invitation/mobileContent";
import type { MobileTheme } from "@/lib/invitation/mobileThemes";
import { Reveal, useParallax } from "./MotionPrimitives";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 작은 섹션 라벨(영문 대문자 느낌의 절제된 헤더). */
function SectionLabel({ text, theme }: { text: string; theme: MobileTheme }) {
  return (
    <p
      style={{ color: theme.accent, letterSpacing: "0.32em", fontFamily: theme.sansFont }}
      className="text-[11px] font-medium uppercase mb-4 text-center"
    >
      {text}
    </p>
  );
}

function Divider({ theme }: { theme: MobileTheme }) {
  return <div className="mx-auto my-12 w-px h-12" style={{ background: theme.accentSoft }} />;
}

// ── Cover ────────────────────────────────────────────────────────────────────
export function CoverSection({ content, theme }: { content: MobileInvitationContent; theme: MobileTheme }) {
  const { ref, offsetY } = useParallax(0.16);
  return (
    <section className="relative w-full overflow-hidden" style={{ height: "118vh", maxHeight: 920, background: theme.surface }}>
      {content.heroImage ? (
        <div ref={ref} className="absolute inset-0" style={{ transform: `translateY(${offsetY}px) scale(1.08)` }}>
          <img src={content.heroImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 36%, rgba(0,0,0,0.42) 100%)" }} />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: theme.accentSoft }} />
      )}

      <div className="absolute inset-x-0 top-[12%] flex flex-col items-center" style={{ animation: "dewy-cover-in 1.2s cubic-bezier(0.22,1,0.36,1) both" }}>
        {content.namesEn && (
          <p className="text-white/90 text-[15px] tracking-[0.3em] mb-1" style={{ fontFamily: theme.serifFont, fontStyle: "italic" }}>
            {content.namesEn}
          </p>
        )}
        <p className="text-white/80 text-[12px] tracking-[0.25em]" style={{ fontFamily: theme.sansFont }}>
          WE'RE GETTING MARRIED
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-[8%] flex flex-col items-center text-center px-6" style={{ animation: "dewy-cover-up 1.3s cubic-bezier(0.22,1,0.36,1) 0.15s both" }}>
        <h1 className="text-white text-[34px] leading-tight" style={{ fontFamily: theme.serifFont, textShadow: "0 1px 10px rgba(0,0,0,0.3)" }}>
          {content.groomName} <span className="opacity-70 mx-1">·</span> {content.brideName}
        </h1>
        {content.weddingDateText && (
          <p className="text-white/90 text-[14px] mt-2 tracking-[0.12em]" style={{ fontFamily: theme.sansFont, textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}>
            {content.weddingDateText}
          </p>
        )}
        {content.venueName && (
          <p className="text-white/80 text-[12.5px] mt-1" style={{ fontFamily: theme.sansFont }}>
            {content.venueName}
          </p>
        )}
      </div>

      <style>{`
        @keyframes dewy-cover-in{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}
        @keyframes dewy-cover-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
      `}</style>
    </section>
  );
}

// ── Greeting ─────────────────────────────────────────────────────────────────
export function GreetingSection({ content, theme }: { content: MobileInvitationContent; theme: MobileTheme }) {
  return (
    <section className="px-8 py-20 text-center">
      <Reveal>
        <SectionLabel text="invitation" theme={theme} />
        {content.greeting && (
          <p className="text-[16px] leading-[2.1] whitespace-pre-line" style={{ color: theme.ink, fontFamily: theme.serifFont }}>
            {content.greeting}
          </p>
        )}
        {(content.groomParents || content.brideParents) && (
          <div className="mt-10 space-y-1.5 text-[14.5px]" style={{ color: theme.inkSoft, fontFamily: theme.sansFont }}>
            {content.groomParents && <p>{content.groomParents}</p>}
            {content.brideParents && <p>{content.brideParents}</p>}
          </div>
        )}
      </Reveal>
    </section>
  );
}

// ── Date · Calendar · D-day ──────────────────────────────────────────────────
function MiniCalendar({ date, theme }: { date: Date; theme: MobileTheme }) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const wday = date.getDate();
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="mx-auto max-w-[300px]">
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className="text-center text-[12px] py-1" style={{ color: i === 0 ? theme.accent : theme.inkSoft, fontFamily: theme.sansFont }}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1.5">
        {cells.map((d, i) => {
          const isWedding = d === wday;
          return (
            <div key={i} className="flex items-center justify-center">
              {d == null ? (
                <span />
              ) : isWedding ? (
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] text-white"
                  style={{ background: theme.accent, fontFamily: theme.sansFont }}
                >
                  {d}
                </span>
              ) : (
                <span className="text-[13px]" style={{ color: i % 7 === 0 ? theme.accent : theme.ink, fontFamily: theme.sansFont }}>
                  {d}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Countdown({ target, theme }: { target: Date; theme: MobileTheme }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  const dd = Math.floor(diff / 86400000);
  const hh = Math.floor((diff % 86400000) / 3600000);
  const mm = Math.floor((diff % 3600000) / 60000);
  const ss = Math.floor((diff % 60000) / 1000);
  const cell = (n: number, label: string) => (
    <div className="flex flex-col items-center">
      <span className="text-[22px] tabular-nums" style={{ color: theme.ink, fontFamily: theme.serifFont }}>
        {String(n).padStart(2, "0")}
      </span>
      <span className="text-[10px] mt-0.5" style={{ color: theme.inkSoft, fontFamily: theme.sansFont }}>{label}</span>
    </div>
  );
  return (
    <div className="mt-8 flex items-center justify-center gap-5">
      {cell(dd, "DAYS")}
      <span style={{ color: theme.accentSoft }}>:</span>
      {cell(hh, "HOUR")}
      <span style={{ color: theme.accentSoft }}>:</span>
      {cell(mm, "MIN")}
      <span style={{ color: theme.accentSoft }}>:</span>
      {cell(ss, "SEC")}
    </div>
  );
}

export function DateSection({ content, theme }: { content: MobileInvitationContent; theme: MobileTheme }) {
  const wd = content.weddingDate;
  const dDay = wd ? Math.ceil((new Date(wd.getFullYear(), wd.getMonth(), wd.getDate()).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000) : null;
  return (
    <section className="px-8 py-16" style={{ background: theme.surface }}>
      <Reveal>
        <SectionLabel text="the wedding day" theme={theme} />
        {content.weddingDateText && (
          <p className="text-center text-[18px] mb-8" style={{ color: theme.ink, fontFamily: theme.serifFont }}>
            {content.weddingDateText}
          </p>
        )}
        {wd && (
          <>
            <MiniCalendar date={wd} theme={theme} />
            <Countdown target={wd} theme={theme} />
            {dDay != null && dDay >= 0 && (
              <p className="text-center mt-6 text-[14px]" style={{ color: theme.accent, fontFamily: theme.sansFont }}>
                {content.groomName} ♥ {content.brideName}의 결혼식이 {dDay === 0 ? "오늘입니다" : `${dDay}일 남았습니다`}
              </p>
            )}
          </>
        )}
      </Reveal>
    </section>
  );
}

// ── Gallery + Lightbox ───────────────────────────────────────────────────────
export function GallerySection({ content, theme }: { content: MobileInvitationContent; theme: MobileTheme }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const images = content.gallery;
  if (images.length === 0) return null;

  return (
    <section className="px-5 py-20">
      <Reveal>
        <SectionLabel text="gallery" theme={theme} />
        <div className="grid grid-cols-3 gap-1.5">
          {images.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setOpenIdx(i)}
              className="aspect-square overflow-hidden rounded-[3px] active:scale-[0.98] transition-transform"
              style={{ background: theme.accentSoft }}
            >
              <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </Reveal>
      {openIdx != null && <Lightbox images={images} index={openIdx} onClose={() => setOpenIdx(null)} onIndex={setOpenIdx} />}
    </section>
  );
}

function Lightbox({ images, index, onClose, onIndex }: { images: string[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const touchX = useRef<number | null>(null);
  const go = (dir: number) => {
    const next = (index + dir + images.length) % images.length;
    onIndex(next);
  };
  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex flex-col"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <button type="button" onClick={onClose} aria-label="닫기" className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-white/90">
        <X className="w-6 h-6" />
      </button>
      <div className="flex-1 flex items-center justify-center px-4" onClick={onClose}>
        <img src={images[index]} alt="" className="max-w-full max-h-[82vh] object-contain" onClick={(e) => e.stopPropagation()} />
      </div>
      <p className="text-center text-white/70 text-[13px] pb-[calc(1rem+var(--safe-bottom))]">
        {index + 1} / {images.length} · 좌우로 넘겨 보세요
      </p>
    </div>
  );
}

// ── Venue ────────────────────────────────────────────────────────────────────
export function VenueSection({ content, theme }: { content: MobileInvitationContent; theme: MobileTheme }) {
  if (!content.venueName && !content.venueAddress) return null;
  const query = encodeURIComponent([content.venueName, content.venueAddress].filter(Boolean).join(" "));
  const mapBtn = (label: string, href: string) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex-1 h-11 rounded-lg flex items-center justify-center text-[13px] active:scale-[0.98] transition-transform"
      style={{ border: `1px solid ${theme.accentSoft}`, color: theme.ink, fontFamily: theme.sansFont }}
    >
      {label}
    </a>
  );
  return (
    <section className="px-8 py-20 text-center" style={{ background: theme.surface }}>
      <Reveal>
        <SectionLabel text="location" theme={theme} />
        {content.venueName && (
          <p className="text-[20px]" style={{ color: theme.ink, fontFamily: theme.serifFont }}>{content.venueName}</p>
        )}
        {content.venueAddress && (
          <p className="mt-2 text-[14px] flex items-center justify-center gap-1" style={{ color: theme.inkSoft, fontFamily: theme.sansFont }}>
            <MapPin className="w-4 h-4" style={{ color: theme.accent }} /> {content.venueAddress}
          </p>
        )}
        <div className="mt-7 flex gap-2 max-w-[320px] mx-auto">
          {mapBtn("카카오맵", `https://map.kakao.com/?q=${query}`)}
          {mapBtn("네이버지도", `https://map.naver.com/p/search/${query}`)}
        </div>
      </Reveal>
    </section>
  );
}

// ── Account (마음 전하실 곳) ───────────────────────────────────────────────────
function AccountRow({ entry, theme }: { entry: AccountEntry; theme: MobileTheme }) {
  const [open, setOpen] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.value);
      toast.success("계좌번호를 복사했어요");
    } catch {
      toast.error("복사에 실패했어요");
    }
  };
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.accentSoft}` }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full h-12 px-4 flex items-center justify-between" style={{ background: theme.surface }}>
        <span className="text-[14.5px]" style={{ color: theme.ink, fontFamily: theme.sansFont }}>{entry.label} 계좌번호</span>
        <ChevronDown className="w-4 h-4 transition-transform" style={{ color: theme.inkSoft, transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ background: theme.bg }}>
          <span className="text-[13.5px] break-all" style={{ color: theme.ink, fontFamily: theme.sansFont }}>{entry.value}</span>
          <button type="button" onClick={copy} className="shrink-0 h-8 px-3 rounded-md flex items-center gap-1 text-[12.5px] text-white" style={{ background: theme.accent }}>
            <Copy className="w-3.5 h-3.5" /> 복사
          </button>
        </div>
      )}
    </div>
  );
}

export function AccountSection({ content, theme }: { content: MobileInvitationContent; theme: MobileTheme }) {
  if (content.accounts.length === 0) return null;
  return (
    <section className="px-8 py-20">
      <Reveal>
        <SectionLabel text="thanks to" theme={theme} />
        <p className="text-center text-[16px] mb-7" style={{ color: theme.ink, fontFamily: theme.serifFont }}>마음 전하실 곳</p>
        <div className="space-y-2.5 max-w-[340px] mx-auto">
          {content.accounts.map((a) => (
            <AccountRow key={a.side} entry={a} theme={theme} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// ── Closing ──────────────────────────────────────────────────────────────────
export function ClosingSection({ content, theme }: { content: MobileInvitationContent; theme: MobileTheme }) {
  return (
    <section className="px-8 pt-12 pb-24 text-center">
      <Reveal>
        <Divider theme={theme} />
        <p className="text-[15px] leading-[2]" style={{ color: theme.inkSoft, fontFamily: theme.serifFont }}>
          소중한 걸음으로<br />축복해 주시는 모든 분께 감사드립니다.
        </p>
        <p className="mt-6 text-[18px]" style={{ color: theme.ink, fontFamily: theme.serifFont }}>
          {content.groomName} · {content.brideName}
        </p>
      </Reveal>
    </section>
  );
}
