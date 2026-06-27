import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast as appToast } from "@/hooks/use-toast";
import type {
  ScrollAccount,
  ScrollInvitationData,
  ScrollTheme,
} from "@/lib/invitation/scrollTypes";

/**
 * 인터랙티브 롱스크롤 모바일 청첩장 — "트로피컬 그린 (스크롤)".
 *
 * 디자인 핸드오프(design/청첩장.dc.html)를 React 로 재현. 슬롯-캔버스 엔진이
 * 아닌 별도 렌더 경로(InvitationLayout.kind === 'html_component')로 붙는다.
 * 콘텐츠는 전부 `data`(ScrollInvitationData)에서 주입 — 하드코딩 없음.
 *
 * mode:
 *  - "view"    : 발행된 청첩장(공개 뷰어). RSVP/방명록을 실제 DB 에 쓴다.
 *  - "preview" : 편집기 라이브 프리뷰. DB 쓰기 없음(로컬 상태만), 인트로 연출/리빌 생략.
 */

// ── 테마 (A/B/C) ─ 디자인 this.themes 와 동일 ───────────────────
type ThemeVars = Record<string, string> & { __page: string };
const THEMES: Record<ScrollTheme, ThemeVars> = {
  A: {
    __page: "#e9e4d8",
    "--c-bg": "#f4f1ea",
    "--c-paper": "#ffffff",
    "--c-cream": "#efeae0",
    "--c-deep": "#36443d",
    "--c-accent": "#7a9277",
    "--c-soft": "#dde6dc",
    "--c-line": "rgba(54,68,61,.16)",
    "--c-ink": "#4a554d",
    "--f-disp": "'Cormorant Garamond',serif",
    "--f-kr": "'Gowun Batang',serif",
    "--f-body": "'Noto Sans KR',sans-serif",
  },
  B: {
    __page: "linear-gradient(170deg,#e3f0e2,#cfe6cf)",
    "--c-bg": "#eaf3ea",
    "--c-paper": "#ffffff",
    "--c-cream": "#e2f2e2",
    "--c-deep": "#1c4733",
    "--c-accent": "#2f9e5f",
    "--c-soft": "#c6eccf",
    "--c-line": "rgba(28,71,51,.18)",
    "--c-ink": "#2c4a3a",
    "--f-disp": "'Marcellus',serif",
    "--f-kr": "'Gowun Batang',serif",
    "--f-body": "'Noto Sans KR',sans-serif",
  },
  C: {
    __page: "#dfe4e1",
    "--c-bg": "#eef1ef",
    "--c-paper": "#ffffff",
    "--c-cream": "#e7ebe8",
    "--c-deep": "#21342f",
    "--c-accent": "#4f786e",
    "--c-soft": "#dde4e0",
    "--c-line": "rgba(33,52,47,.14)",
    "--c-ink": "#3a4742",
    "--f-disp": "'Jost',sans-serif",
    "--f-kr": "'Noto Sans KR',sans-serif",
    "--f-body": "'Noto Sans KR',sans-serif",
  },
};

// 은행 칩 색상 — [배경, 글자]
const BANK_COLORS: Record<string, [string, string]> = {
  국민: ["#ffbc00", "#3a2e00"],
  농협: ["#0a8c3c", "#fff"],
  신한: ["#1b59a6", "#fff"],
  우리: ["#0067ac", "#fff"],
  하나: ["#00857a", "#fff"],
  카카오뱅크: ["#ffe000", "#3a2e00"],
  기업: ["#0066b3", "#fff"],
  토스뱅크: ["#0064ff", "#fff"],
};

const FONT_LINK_ID = "dewy-scroll-invitation-fonts";
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Marcellus&family=Jost:wght@300;400;500&family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap";

const KEYFRAMES = `
@keyframes tg-cueBounce{0%,100%{transform:translateY(0);opacity:.5}50%{transform:translateY(7px);opacity:1}}
@keyframes tg-pulseRing{0%{transform:scale(.85);opacity:.55}70%{transform:scale(1.5);opacity:0}100%{opacity:0}}
@keyframes tg-toastIn{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes tg-lbIn{from{opacity:0}to{opacity:1}}
@keyframes tg-leafFall{0%{transform:translate(0,-34px) rotate(0);opacity:0}9%{opacity:.78}90%{opacity:.5}100%{transform:translate(38px,880px) rotate(280deg);opacity:0}}
@keyframes tg-kenburns{0%{transform:scale(1.05)}100%{transform:scale(1.15)}}
@keyframes tg-flrMove{0%{transform:translateX(-110%)}100%{transform:translateX(110%)}}
@keyframes tg-flrFade{0%{opacity:0}16%{opacity:1}84%{opacity:1}100%{opacity:0}}
@keyframes tg-flrVeil{0%{opacity:0}48%{opacity:.92}58%{opacity:.92}100%{opacity:0}}
@keyframes tg-flrMono{0%{opacity:1}52%{opacity:1}78%{opacity:0}100%{opacity:0}}
@keyframes tg-flrHold{0%{opacity:1}42%{opacity:1}72%{opacity:0}100%{opacity:0}}
`;

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const KO_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const EN_MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function formatKoreanDateTime(d: Date) {
  const h = d.getHours();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const min = d.getMinutes();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${
    KO_DAYS[d.getDay()]
  }요일 · ${ampm} ${h12}시${min ? ` ${min}분` : ""}`;
}

// ── 잎 구분선 (섹션 헤더 아래) ──────────────────────────────────
function LeafDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 16 }}>
      <span style={{ width: 20, height: 1, background: "var(--c-accent)", opacity: 0.5 }} />
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--c-accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21C6.5 17 4.5 10.5 12 3c7.5 7.5 5.5 14 0 18Z" />
        <path d="M12 6.5V19" />
        <path d="M12 12l2.6-2.6M12 14.6l-2.4-2.4" />
      </svg>
      <span style={{ width: 20, height: 1, background: "var(--c-accent)", opacity: 0.5 }} />
    </div>
  );
}

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <Reveal style={{ textAlign: "center", marginBottom: 18 }}>
      <div style={{ fontFamily: "var(--f-disp)", fontSize: 13, letterSpacing: ".34em", textTransform: "uppercase", color: "var(--c-accent)", marginBottom: 12 }}>
        {label}
      </div>
      <h2 style={{ fontFamily: "var(--f-kr)", fontWeight: 500, fontSize: 24, color: "var(--c-deep)", margin: 0 }}>
        {title}
      </h2>
      <LeafDivider />
    </Reveal>
  );
}

// ── 스크롤 진입 등장(reveal). RevealContext 로 preview 모드면 비활성. ──
const RevealCtx = { enabled: true };
function Reveal({
  children,
  style,
  init = "translateY(24px)",
  delay = 0,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  init?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const enabled = RevealCtx.enabled && !prefersReduced();
  const [shown, setShown] = useState(!enabled);
  useEffect(() => {
    if (!enabled) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);
  return (
    <div
      ref={ref}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : init,
        transition: enabled
          ? `opacity .85s ease ${delay}ms, transform .85s cubic-bezier(.2,.7,.2,1) ${delay}ms`
          : undefined,
        willChange: enabled ? "opacity, transform" : undefined,
      }}
    >
      {children}
    </div>
  );
}

interface GuestbookEntry {
  id?: string;
  name: string;
  message: string;
  created_at?: string;
}

type RsvpSideKo = "신랑측" | "신부측";

export interface TropicalGreenScrollProps {
  data: ScrollInvitationData;
  invitationId?: string;
  mode?: "view" | "preview";
}

export default function TropicalGreenScroll({
  data,
  invitationId,
  mode = "view",
}: TropicalGreenScrollProps) {
  const isView = mode === "view";
  RevealCtx.enabled = isView; // preview 는 리빌 끔(중첩 스크롤에서 IO 미스 방지)

  const theme = THEMES[data.theme ?? "B"] ?? THEMES.B;

  // ── Google Fonts 1회 주입 (iOS @import 회귀 회피 → <link>) ──
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  // ── 예식 일시 ──
  const weddingDate = useMemo(() => {
    if (!data.wedding_at) return null;
    const d = new Date(data.wedding_at);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [data.wedding_at]);

  // ── 카운트다운 ──
  const [cd, setCd] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [dday, setDday] = useState("");
  useEffect(() => {
    if (!weddingDate) return;
    const target = weddingDate.getTime();
    const tick = () => {
      let diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000);
      diff -= d * 86400000;
      const h = Math.floor(diff / 3600000);
      diff -= h * 3600000;
      const m = Math.floor(diff / 60000);
      diff -= m * 60000;
      const s = Math.floor(diff / 1000);
      setCd({ d, h, m, s });
      // D-day (자정 기준)
      const now = new Date();
      const days = Math.round(
        (new Date(weddingDate.getFullYear(), weddingDate.getMonth(), weddingDate.getDate()).getTime() -
          new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
          86400000,
      );
      setDday(days > 0 ? `D-${days}` : days === 0 ? "D-DAY" : `D+${-days}`);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [weddingDate]);

  // ── 인트로 렌즈플레어 ──
  const [showFlare, setShowFlare] = useState(isView && !prefersReduced());
  useEffect(() => {
    if (!showFlare) return;
    const t = window.setTimeout(() => setShowFlare(false), 2400);
    return () => window.clearTimeout(t);
  }, [showFlare]);

  // ── 토스트 (컴포넌트 내부 알약) ──
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<number | null>(null);
  const toast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(""), 2200);
  };

  // ── 클립보드 ──
  const copyText = async (text: string, okMsg: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast(okMsg);
    } catch {
      toast("복사 권한이 없어 복사하지 못했어요");
    }
  };

  // ── 라이트박스 ──
  const gallery = (data.gallery ?? []).filter(Boolean);
  const [lbIndex, setLbIndex] = useState<number | null>(null);
  const lbTouchX = useRef(0);
  const lbNav = (delta: number) =>
    setLbIndex((i) =>
      i === null ? i : (i + delta + gallery.length) % gallery.length,
    );

  // ── 계좌 아코디언 ──
  const [groomOpen, setGroomOpen] = useState(false);
  const [brideOpen, setBrideOpen] = useState(false);

  // ── RSVP ──
  const [rsvpDone, setRsvpDone] = useState(false);
  const [rsvpSide, setRsvpSide] = useState<RsvpSideKo>("신랑측");
  const [rsvpAttending, setRsvpAttending] = useState(true);
  const [rsvpMeal, setRsvpMeal] = useState(true); // true=식사 함
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpCount, setRsvpCount] = useState(1); // 본인 포함
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);

  const submitRsvp = async () => {
    if (!rsvpName.trim()) {
      toast("성함을 입력해 주세요");
      return;
    }
    if (!isView || !invitationId) {
      // 편집 프리뷰 — DB 쓰기 없이 완료 상태만
      setRsvpDone(true);
      toast("참석 의사가 전달되었어요 (미리보기)");
      return;
    }
    setRsvpSubmitting(true);
    try {
      const { error } = await (supabase as any).from("invitation_rsvp").insert({
        invitation_id: invitationId,
        name: rsvpName.trim(),
        is_attending: rsvpAttending,
        side: rsvpSide === "신랑측" ? "groom" : "bride",
        meal_preference: rsvpMeal ? "yes" : "no",
        companion_count: Math.max(0, rsvpCount - 1),
        child_count: 0,
        message: null,
      });
      if (error) throw error;
      setRsvpDone(true);
      toast("참석 의사가 전달되었어요");
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      toast(
        msg.includes("rsvp_limit_reached")
          ? "참석 등록이 마감되었어요"
          : msg.includes("rsvp_rate_limited")
            ? "잠시 후 다시 시도해 주세요"
            : "전송에 실패했어요. 다시 시도해 주세요",
      );
    } finally {
      setRsvpSubmitting(false);
    }
  };

  // ── 방명록 ──
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [gbName, setGbName] = useState("");
  const [gbMsg, setGbMsg] = useState("");
  const [gbSubmitting, setGbSubmitting] = useState(false);

  useEffect(() => {
    if (!isView || !invitationId) return;
    let alive = true;
    (async () => {
      const { data: rows } = await (supabase as any)
        .from("invitation_guestbook")
        .select("id, name, message, created_at")
        .eq("invitation_id", invitationId)
        .order("created_at", { ascending: false });
      if (alive && Array.isArray(rows)) setEntries(rows as GuestbookEntry[]);
    })();
    return () => {
      alive = false;
    };
  }, [isView, invitationId]);

  const addEntry = async () => {
    const name = gbName.trim() || "익명";
    const message = gbMsg.trim();
    if (!message) {
      toast("축하 메시지를 입력해 주세요");
      return;
    }
    if (message.length > 500) {
      toast("메시지는 500자 이내로 남겨 주세요");
      return;
    }
    if (!isView || !invitationId) {
      setEntries((e) => [{ name, message }, ...e]);
      setGbName("");
      setGbMsg("");
      toast("방명록이 등록되었어요 (미리보기)");
      return;
    }
    setGbSubmitting(true);
    try {
      const { data: row, error } = await (supabase as any)
        .from("invitation_guestbook")
        .insert({ invitation_id: invitationId, name, message })
        .select("id, name, message, created_at")
        .single();
      if (error) throw error;
      setEntries((e) => [row as GuestbookEntry, ...e]);
      setGbName("");
      setGbMsg("");
      toast("방명록이 등록되었어요");
    } catch {
      toast("등록에 실패했어요. 다시 시도해 주세요");
    } finally {
      setGbSubmitting(false);
    }
  };

  // ── 공유 ──
  const share = async () => {
    const groom = data.groom?.name ?? "";
    const bride = data.bride?.name ?? "";
    const shareData = {
      title: `${groom} · ${bride} 결혼합니다`,
      text: "저희 두 사람의 결혼식에 초대합니다.",
      url: typeof window !== "undefined" ? window.location.href : "",
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          await copyText(shareData.url, "청첩장 링크가 복사되었어요");
        }
      }
    } else {
      await copyText(shareData.url, "청첩장 링크가 복사되었어요");
    }
  };

  // ── 연락하기 (하단 탭바) ──
  const contact = () => {
    const g = data.groom?.phone;
    const b = data.bride?.phone;
    if (!g && !b) {
      toast("연락처가 아직 입력되지 않았어요");
      return;
    }
    toast(
      [g ? `신랑측 ${g}` : null, b ? `신부측 ${b}` : null]
        .filter(Boolean)
        .join(" · "),
    );
  };

  // ── 일정 저장 (ICS) ──
  const addToCalendar = () => {
    if (!weddingDate) {
      toast("예식 일시가 아직 입력되지 않았어요");
      return;
    }
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const end = new Date(weddingDate.getTime() + 100 * 60000);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//dewy//wedding//KR",
      "BEGIN:VEVENT",
      `UID:dewy-${invitationId ?? "preview"}@dewy`,
      `SUMMARY:${data.groom?.name ?? ""} · ${data.bride?.name ?? ""} 결혼식`,
      `DTSTART:${fmt(weddingDate)}`,
      `DTEND:${fmt(end)}`,
      `LOCATION:${data.venue?.name ?? ""}`,
      "DESCRIPTION:두 사람의 결혼식에 초대합니다.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    try {
      const blob = new Blob([ics], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "wedding.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast("캘린더 일정이 저장되었어요");
    } catch {
      toast("이 환경에서는 캘린더 저장이 지원되지 않아요");
    }
  };

  // ── 파생값 ──
  const overlayPos: React.CSSProperties["position"] = isView ? "fixed" : "absolute";
  const groomAccts = (data.accounts?.groom ?? []).filter((a) => a?.num || a?.name);
  const brideAccts = (data.accounts?.bride ?? []).filter((a) => a?.num || a?.name);
  const hasAccounts = groomAccts.length > 0 || brideAccts.length > 0;
  const story = (data.story ?? []).filter((s) => s?.image_url || s?.desc || s?.title);
  const venue = data.venue ?? {};
  const hasVenue = !!(venue.name || venue.address);

  const accent = theme["--c-accent"];
  const deep = theme["--c-deep"];

  return (
    <div
      style={{
        ...(theme as React.CSSProperties),
        position: "relative",
        width: "100%",
        maxWidth: 430,
        margin: "0 auto",
        background: theme.__page,
        fontFamily: "var(--f-body)",
        color: "var(--c-ink)",
        overflowX: "hidden",
        minHeight: isView ? "100vh" : undefined,
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ===== COVER ===== */}
      <section style={{ position: "relative", minHeight: 640, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", overflow: "hidden" }}>
        {data.cover_image_url ? (
          <img
            src={data.cover_image_url}
            alt="대표 사진"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", animation: prefersReduced() ? undefined : "tg-kenburns 22s ease-in-out infinite alternate", transformOrigin: "center" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg,#2f6b48,#173a28)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(40,55,45,.34) 0%, rgba(40,55,45,.12) 32%, rgba(40,55,45,.20) 62%, rgba(30,42,33,.66) 100%)", pointerEvents: "none" }} />
        {!prefersReduced() && (
          <div style={{ position: "absolute", inset: 0, zIndex: 2, overflow: "hidden", pointerEvents: "none" }}>
            {[
              { left: "16%", size: 15, dur: 10, delay: 1.5 },
              { left: "38%", size: 11, dur: 13, delay: 4 },
              { left: "60%", size: 16, dur: 11.5, delay: 0.5 },
              { left: "82%", size: 12, dur: 12, delay: 2.8 },
            ].map((l, i) => (
              <svg key={i} width={l.size} height={l.size} viewBox="0 0 24 24" fill="rgba(255,255,255,.42)" style={{ position: "absolute", top: 0, left: l.left, animation: `tg-leafFall ${l.dur}s linear infinite ${l.delay}s` }}>
                <path d="M12 2C6 8 5 15 12 22 19 15 18 8 12 2Z" />
              </svg>
            ))}
          </div>
        )}
        <div style={{ position: "absolute", inset: 18, border: "1px solid rgba(255,255,255,.4)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 3, pointerEvents: "none", padding: "0 30px" }}>
          <div style={{ fontFamily: "var(--f-disp)", fontStyle: "italic", fontSize: 19, letterSpacing: ".06em", color: "#fff", opacity: 0.92, marginBottom: 18 }}>
            We're getting married
          </div>
          <div style={{ fontFamily: "var(--f-kr)", fontSize: 40, lineHeight: 1.18, color: "#fff", fontWeight: 700, textShadow: "0 2px 18px rgba(20,30,22,.4)" }}>
            {data.groom?.name || "신랑"}
            <span style={{ fontFamily: "var(--f-disp)", fontSize: 30, verticalAlign: "middle", margin: "0 12px", opacity: 0.85, fontWeight: 400 }}>&amp;</span>
            {data.bride?.name || "신부"}
          </div>
          <div style={{ width: 46, height: 1, background: "rgba(255,255,255,.7)", margin: "24px auto" }} />
          {weddingDate && (
            <>
              <div style={{ color: "#fff", fontSize: 15, letterSpacing: ".28em", fontWeight: 300 }}>
                {weddingDate.getFullYear()} · {pad2(weddingDate.getMonth() + 1)} · {pad2(weddingDate.getDate())} · {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][weddingDate.getDay()]}
              </div>
              <div style={{ color: "rgba(255,255,255,.88)", fontSize: 13, marginTop: 8, letterSpacing: ".04em" }}>
                {formatKoreanDateTime(weddingDate).split("·").slice(1).join("·").trim()}
                {venue.name ? ` · ${venue.name}` : ""}
              </div>
            </>
          )}
        </div>
        <div style={{ position: "absolute", bottom: 34, left: "50%", transform: "translateX(-50%)", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none" }}>
          <span style={{ fontSize: 10, letterSpacing: ".3em", color: "rgba(255,255,255,.8)" }}>SCROLL</span>
          <svg width="16" height="22" viewBox="0 0 16 22" style={{ animation: "tg-cueBounce 1.8s ease-in-out infinite" }}>
            <path d="M8 1v18M2 13l6 6 6-6" stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* ===== 인사말 ===== */}
      <section style={{ background: "var(--c-paper)", padding: "62px 32px", position: "relative", overflow: "hidden" }}>
        <SectionHeader label={data.greeting?.label || "Invitation"} title={data.greeting?.title || "초대합니다"} />
        {data.greeting?.body && (
          <Reveal>
            <p style={{ fontFamily: "var(--f-kr)", textAlign: "center", fontSize: 17, lineHeight: 2.15, color: "var(--c-ink)", margin: "0 0 40px", letterSpacing: ".01em", whiteSpace: "pre-line" }}>
              {data.greeting.body}
            </p>
          </Reveal>
        )}
        <Reveal style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          {(data.groom?.father || data.groom?.mother || data.groom?.name) && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--f-kr)", fontSize: 15, color: deep }}>
              {(data.groom?.father || data.groom?.mother) && (
                <span style={{ color: accent, fontSize: 13 }}>
                  {[data.groom?.father, data.groom?.mother].filter(Boolean).join(" · ")}
                </span>
              )}
              의 <strong style={{ fontWeight: 500 }}>{data.groom?.role_label || "아들"}</strong> {data.groom?.name}
            </div>
          )}
          {(data.bride?.father || data.bride?.mother || data.bride?.name) && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--f-kr)", fontSize: 15, color: deep }}>
              {(data.bride?.father || data.bride?.mother) && (
                <span style={{ color: accent, fontSize: 13 }}>
                  {[data.bride?.father, data.bride?.mother].filter(Boolean).join(" · ")}
                </span>
              )}
              의 <strong style={{ fontWeight: 500 }}>{data.bride?.role_label || "딸"}</strong> {data.bride?.name}
            </div>
          )}
          {(data.groom?.phone || data.bride?.phone) && (
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              {data.groom?.phone && <ContactPill href={`tel:${data.groom.phone}`} label="신랑측에 연락" />}
              {data.bride?.phone && <ContactPill href={`tel:${data.bride.phone}`} label="신부측에 연락" />}
            </div>
          )}
        </Reveal>
      </section>

      {/* ===== 신랑 & 신부 ===== */}
      {(data.couple_intro?.groom_blurb || data.couple_intro?.bride_blurb) && (
        <section style={{ background: "var(--c-cream)", padding: "62px 28px" }}>
          <SectionHeader label="The Couple" title="신랑 & 신부" />
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <CoupleCard
              roleEn="GROOM"
              name={data.groom?.name || "신랑"}
              blurb={data.couple_intro?.groom_blurb}
              reverse={false}
            />
            <CoupleCard
              roleEn="BRIDE"
              name={data.bride?.name || "신부"}
              blurb={data.couple_intro?.bride_blurb}
              reverse
            />
          </div>
        </section>
      )}

      {/* ===== 러브스토리 ===== */}
      {story.length > 0 && (
        <section style={{ background: "var(--c-paper)", padding: "62px 30px" }}>
          <SectionHeader label="Our Story" title="우리, 두 사람의 기록" />
          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 14 }}>
            {story.map((s, i) => {
              const left = i % 2 === 0;
              return (
                <Reveal key={i} init={left ? "translateX(-40px)" : "translateX(40px)"}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexDirection: left ? "row" : "row-reverse", textAlign: left ? "left" : "right" }}>
                    <div style={{ position: "relative", width: 134, height: 152, borderRadius: 10, overflow: "hidden", flexShrink: 0, boxShadow: "0 16px 32px -18px rgba(28,71,51,.65)", background: "var(--c-soft)" }}>
                      {s.image_url && <img src={s.image_url} alt={s.title || ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 52, background: "linear-gradient(transparent, rgba(18,38,26,.6))", pointerEvents: "none" }} />
                      {s.tag && <div style={{ position: "absolute", left: 11, bottom: 9, fontFamily: "var(--f-disp)", fontStyle: "italic", fontSize: 12.5, color: "#fff", letterSpacing: ".04em" }}>{s.tag}</div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {s.year && <div style={{ fontFamily: "var(--f-disp)", fontSize: 36, lineHeight: 1, color: accent, opacity: 0.42, fontWeight: 500 }}>{s.year}</div>}
                      {s.title && <div style={{ fontFamily: "var(--f-kr)", fontSize: 17, color: deep, margin: "7px 0 6px" }}>{s.title}</div>}
                      {s.desc && <p style={{ fontSize: 12.5, lineHeight: 1.75, color: "var(--c-ink)", margin: 0 }}>{s.desc}</p>}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== 캘린더 / D-day ===== */}
      {weddingDate && (
        <section style={{ background: "var(--c-cream)", padding: "62px 30px" }}>
          <SectionHeader label="The Date" title="예식 날짜" />
          <Reveal style={{ background: "var(--c-paper)", borderRadius: 9, padding: "24px 20px", boxShadow: "0 8px 24px -16px rgba(40,55,45,.4)" }}>
            <div style={{ textAlign: "center", fontFamily: "var(--f-disp)", fontSize: 17, letterSpacing: ".2em", color: deep, marginBottom: 18 }}>
              {EN_MONTHS[weddingDate.getMonth()]} {weddingDate.getFullYear()}
            </div>
            <CalendarGrid date={weddingDate} />
            <div style={{ textAlign: "center", marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--c-line)", fontSize: 13, color: "var(--c-ink)" }}>
              {formatKoreanDateTime(weddingDate)}
            </div>
          </Reveal>
          <Reveal style={{ marginTop: 22, background: "linear-gradient(160deg,#1f5138,#143a29)", borderRadius: 10, padding: "26px 20px 22px", textAlign: "center", color: "#fff", position: "relative", overflow: "hidden", boxShadow: "0 14px 30px -16px rgba(20,40,28,.7)" }}>
            <svg viewBox="0 0 24 24" width="120" height="120" fill="rgba(255,255,255,.05)" style={{ position: "absolute", right: -22, bottom: -26, pointerEvents: "none" }}>
              <path d="M12 2C6 8 5 15 12 22 19 15 18 8 12 2Z" />
            </svg>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, letterSpacing: ".04em", opacity: 0.92 }}>
              <span style={{ display: "inline-flex", color: "#ff8fa0" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff8fa0"><path d="M12 20C6.5 16 3.5 12.5 3.5 8.8 3.5 6.2 5.5 4.5 8 4.5c1.7 0 3.1 1 4 2.3.9-1.3 2.3-2.3 4-2.3 2.5 0 4.5 1.7 4.5 4.3 0 3.7-3 7.2-8.5 11.2Z" /></svg>
              </span>
              {(data.groom?.name || "신랑")} · {(data.bride?.name || "신부")}의 결혼식까지
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 18 }}>
              {[
                { v: pad2(cd.d), l: "DAYS" },
                { v: pad2(cd.h), l: "HOURS" },
                { v: pad2(cd.m), l: "MIN" },
                { v: pad2(cd.s), l: "SEC", hot: true },
              ].map((b) => (
                <div key={b.l} style={{ flex: 1, maxWidth: 68, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.16)", borderRadius: 6.5, padding: "13px 0" }}>
                  <div style={{ fontFamily: "'Gowun Batang',serif", fontSize: 26, fontWeight: 700, lineHeight: 1, color: b.hot ? "#ffd9a0" : "#fff" }}>{b.v}</div>
                  <div style={{ fontSize: 9, letterSpacing: ".18em", opacity: 0.65, marginTop: 6 }}>{b.l}</div>
                </div>
              ))}
            </div>
            {dday && (
              <div style={{ marginTop: 16, fontSize: 12, opacity: 0.82 }}>
                두 사람의 그날까지 <span style={{ fontFamily: "'Gowun Batang',serif", fontSize: 17, fontWeight: 700, color: "#bff0cf", letterSpacing: ".04em" }}>{dday}</span>
              </div>
            )}
          </Reveal>
        </section>
      )}

      {/* ===== 갤러리 ===== */}
      {gallery.length > 0 && (
        <section style={{ background: "var(--c-paper)", padding: "62px 24px" }}>
          <SectionHeader label="Gallery" title="우리의 순간들" />
          <Reveal>
            <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--c-ink)", opacity: 0.75, margin: "0 0 22px" }}>
              사진을 누르면 크게 볼 수 있어요
            </p>
          </Reveal>
          <div style={{ columnCount: 2, columnGap: 6 }}>
            {gallery.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setLbIndex(i)}
                aria-label={`사진 ${i + 1} 확대`}
                style={{ display: "block", width: "100%", breakInside: "avoid", marginBottom: 6, borderRadius: 6, overflow: "hidden", position: "relative", border: "none", padding: 0, cursor: "pointer", background: "var(--c-soft)" }}
              >
                <img src={url} alt="" loading="lazy" style={{ width: "100%", display: "block" }} />
                <span style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,.85)", display: "flex", alignItems: "center", justifyContent: "center", color: deep }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4.5h4.5M20 9V4.5h-4.5M4 15v4.5h4.5M20 15v4.5h-4.5" /></svg>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ===== 오시는 길 ===== */}
      {hasVenue && (
        <section style={{ background: "var(--c-paper)", padding: "62px 28px" }}>
          <SectionHeader label="Location" title="오시는 길" />
          <Reveal style={{ textAlign: "center", marginBottom: 18 }}>
            {venue.name && <div style={{ fontFamily: "var(--f-kr)", fontSize: 18, color: deep }}>{venue.name}</div>}
            {(venue.address || venue.detail) && (
              <div style={{ fontSize: 13, color: "var(--c-ink)", marginTop: 6 }}>
                {[venue.address, venue.detail].filter(Boolean).join(" · ")}
              </div>
            )}
          </Reveal>
          <Reveal style={{ position: "relative", height: 170, borderRadius: 8, overflow: "hidden", background: "linear-gradient(135deg,var(--c-soft),var(--c-cream))", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.5, backgroundImage: "linear-gradient(var(--c-line) 1px,transparent 1px),linear-gradient(90deg,var(--c-line) 1px,transparent 1px)", backgroundSize: "26px 26px" }} />
            <div style={{ position: "relative", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 3 }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21c5-5.3 7-8.4 7-11A7 7 0 0 0 5 10c0 2.6 2 5.7 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
              </div>
              {venue.name && <div style={{ fontSize: 12, color: deep, marginTop: 2 }}>{venue.name}</div>}
            </div>
          </Reveal>
          <Reveal style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 24 }}>
            <MapLink label="네이버지도" href={venue.map_links?.naver} query={venue.name || venue.address} app="naver" />
            <MapLink label="카카오맵" href={venue.map_links?.kakao} query={venue.name || venue.address} app="kakao" />
            <MapLink label="티맵" href={venue.map_links?.tmap} query={venue.name || venue.address} app="tmap" />
          </Reveal>
          {(venue.transport || venue.parking) && (
            <Reveal style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {venue.transport && <InfoRow title="대중교통" body={venue.transport} kind="transit" />}
              {venue.parking && <InfoRow title="주차 안내" body={venue.parking} kind="parking" />}
            </Reveal>
          )}
        </section>
      )}

      {/* ===== 마음 전하실 곳 ===== */}
      {hasAccounts && (
        <section style={{ background: "var(--c-cream)", padding: "62px 28px" }}>
          <SectionHeader label="With Heart" title="마음 전하실 곳" />
          <Reveal>
            <p style={{ textAlign: "center", fontSize: 12.5, lineHeight: 1.7, color: "var(--c-ink)", margin: "0 0 24px" }}>
              참석이 어려우신 분들을 위해<br />계좌번호를 안내드립니다.
            </p>
          </Reveal>
          <Reveal style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {groomAccts.length > 0 && (
              <AccountAccordion title="신랑측 마음 전하실 곳" open={groomOpen} onToggle={() => setGroomOpen((v) => !v)} accounts={groomAccts} onCopy={copyText} />
            )}
            {brideAccts.length > 0 && (
              <AccountAccordion title="신부측 마음 전하실 곳" open={brideOpen} onToggle={() => setBrideOpen((v) => !v)} accounts={brideAccts} onCopy={copyText} />
            )}
          </Reveal>
        </section>
      )}

      {/* ===== RSVP ===== */}
      <section style={{ background: "var(--c-paper)", padding: "62px 30px" }}>
        <SectionHeader label="R.S.V.P" title="참석 의사 전달" />
        <Reveal>
          <p style={{ textAlign: "center", fontSize: 12.5, lineHeight: 1.7, color: "var(--c-ink)", margin: "0 0 26px" }}>
            정성껏 준비하기 위해<br />참석 여부를 알려주시면 감사하겠습니다.
          </p>
        </Reveal>
        {rsvpDone ? (
          <div style={{ textAlign: "center", padding: "34px 20px", background: "var(--c-soft)", borderRadius: 9 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, color: accent }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14Z" /><path d="M5 19c4-1 8-4 11-8" /></svg>
            </div>
            <div style={{ fontFamily: "var(--f-kr)", fontSize: 17, color: deep }}>소중한 마음 감사합니다</div>
            <div style={{ fontSize: 12.5, color: "var(--c-ink)", marginTop: 6 }}>참석 의사가 전달되었어요.</div>
          </div>
        ) : (
          <Reveal style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SegField label="어느 측 하객이신가요?">
              <Seg active={rsvpSide === "신랑측"} onClick={() => setRsvpSide("신랑측")}>신랑측</Seg>
              <Seg active={rsvpSide === "신부측"} onClick={() => setRsvpSide("신부측")}>신부측</Seg>
            </SegField>
            <SegField label="참석 여부">
              <Seg active={rsvpAttending} onClick={() => setRsvpAttending(true)}>참석합니다</Seg>
              <Seg active={!rsvpAttending} onClick={() => setRsvpAttending(false)}>참석이 어려워요</Seg>
            </SegField>
            <SegField label="식사 여부">
              <Seg active={rsvpMeal} onClick={() => setRsvpMeal(true)}>식사 함</Seg>
              <Seg active={!rsvpMeal} onClick={() => setRsvpMeal(false)}>식사 안함</Seg>
            </SegField>
            <div>
              <FieldLabel>성함</FieldLabel>
              <input
                value={rsvpName}
                maxLength={80}
                onChange={(e) => setRsvpName(e.target.value)}
                placeholder="이름을 입력해 주세요"
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>동행 인원 (본인 포함)</FieldLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <RoundBtn onClick={() => setRsvpCount((c) => Math.max(1, c - 1))}>−</RoundBtn>
                <span style={{ fontFamily: "var(--f-disp)", fontSize: 22, color: deep, minWidth: 24, textAlign: "center" }}>{rsvpCount}</span>
                <RoundBtn onClick={() => setRsvpCount((c) => Math.min(20, c + 1))}>+</RoundBtn>
                <span style={{ fontSize: 13, color: "var(--c-ink)" }}>명</span>
              </div>
            </div>
            <button
              type="button"
              onClick={submitRsvp}
              disabled={rsvpSubmitting}
              style={{ marginTop: 6, width: "100%", padding: 15, border: "none", borderRadius: 6, background: accent, color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", letterSpacing: ".04em", opacity: rsvpSubmitting ? 0.6 : 1 }}
            >
              {rsvpSubmitting ? "전송 중…" : "참석 의사 전달하기"}
            </button>
          </Reveal>
        )}
      </section>

      {/* ===== 방명록 ===== */}
      <section style={{ background: "var(--c-cream)", padding: "62px 28px" }}>
        <SectionHeader label="Guestbook" title="축하 한마디" />
        <Reveal style={{ textAlign: "center", fontSize: 11.5, color: "var(--c-ink)", opacity: 0.75, margin: "-10px 0 18px" }}>
          남겨주신 한마디가 <span style={{ color: accent, fontWeight: 600 }}>{entries.length}</span>개 모였어요
        </Reveal>
        <Reveal style={{ background: "var(--c-paper)", borderRadius: 8, padding: 18, boxShadow: "0 8px 22px -16px rgba(28,71,51,.5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
            <span style={{ display: "inline-flex", color: accent }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14Z" /><path d="M5 19c4-1 8-4 11-8" /></svg>
            </span>
            <span style={{ fontFamily: "var(--f-kr)", fontSize: 14, color: deep }}>두 사람에게 한마디 남겨주세요</span>
          </div>
          <input value={gbName} maxLength={40} onChange={(e) => setGbName(e.target.value)} placeholder="이름" style={{ ...inputStyle, padding: "11px 13px", fontSize: 13, marginBottom: 9 }} />
          <textarea value={gbMsg} maxLength={500} onChange={(e) => setGbMsg(e.target.value)} placeholder="축하 메시지를 남겨주세요" rows={3} style={{ ...inputStyle, padding: "11px 13px", fontSize: 13, resize: "none", fontFamily: "inherit", marginBottom: 10 }} />
          <button type="button" onClick={addEntry} disabled={gbSubmitting} style={{ width: "100%", padding: 13, border: "none", borderRadius: 5, background: deep, color: "#fff", fontSize: 13, cursor: "pointer", letterSpacing: ".03em", opacity: gbSubmitting ? 0.6 : 1 }}>
            {gbSubmitting ? "등록 중…" : "축하 메시지 남기기"}
          </button>
        </Reveal>
        {entries.length > 0 && (
          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
            {entries.slice(0, 30).map((e, i) => (
              <div key={e.id ?? i} style={{ background: "var(--c-paper)", borderRadius: 8, padding: "13px 16px", boxShadow: "0 6px 18px -16px rgba(28,71,51,.5)" }}>
                <div style={{ fontFamily: "var(--f-kr)", fontSize: 13, color: deep, marginBottom: 4 }}>{e.name}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--c-ink)", whiteSpace: "pre-wrap" }}>{e.message}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== 마무리 / 공유 ===== */}
      <section style={{ background: "var(--c-deep)", padding: "64px 30px 104px", textAlign: "center", color: "#fff", position: "relative", overflow: "hidden" }}>
        <Reveal>
          <div style={{ fontFamily: "var(--f-disp)", fontStyle: "italic", fontSize: 20, opacity: 0.9, marginBottom: 18 }}>Thank you</div>
          <p style={{ fontFamily: "var(--f-kr)", fontSize: 15, lineHeight: 2, opacity: 0.95, margin: "0 0 30px" }}>
            저희의 시작을 함께해 주셔서<br />진심으로 감사합니다.
          </p>
          <div style={{ fontFamily: "var(--f-disp)", fontSize: 30, letterSpacing: ".04em", marginBottom: 8 }}>
            {(data.groom?.name || "신랑")} &amp; {(data.bride?.name || "신부")}
          </div>
          {weddingDate && (
            <div style={{ fontSize: 12, letterSpacing: ".24em", opacity: 0.7 }}>
              {weddingDate.getFullYear()} · {pad2(weddingDate.getMonth() + 1)} · {pad2(weddingDate.getDate())}
            </div>
          )}
          <button type="button" onClick={share} style={{ marginTop: 22, display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 26px", border: "1px solid rgba(255,255,255,.45)", borderRadius: 999, background: "transparent", color: "#fff", fontSize: 13, cursor: "pointer" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6.5" cy="12" r="2.2" /><circle cx="17" cy="6.5" r="2.2" /><circle cx="17" cy="17.5" r="2.2" /><path d="M8.4 11l6.4-3.4M8.4 13l6.4 3.4" /></svg>
            청첩장 공유하기
          </button>
        </Reveal>
      </section>

      {/* ===== 하단 고정 탭바 ===== */}
      <div style={{ position: overlayPos, bottom: 0, left: 0, right: 0, zIndex: 40, maxWidth: 430, margin: "0 auto", display: "flex", background: "rgba(255,255,255,.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: "1px solid var(--c-line)" }}>
        <TabBtn onClick={contact} label="연락하기">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 3.5h3l1.3 4-2 1.4a11 11 0 0 0 4.8 4.8l1.4-2 4 1.3v3a1.6 1.6 0 0 1-1.7 1.6A15.4 15.4 0 0 1 5 5.2 1.6 1.6 0 0 1 6.5 3.5Z" /></svg>
        </TabBtn>
        <TabBtn onClick={addToCalendar} label="일정 저장" bordered>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="5.5" width="15" height="14" rx="2" /><path d="M4.5 9.5h15" /><path d="M8.5 3.5v4M15.5 3.5v4" /></svg>
        </TabBtn>
        <TabBtn onClick={share} label="공유하기">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6.5" cy="12" r="2.2" /><circle cx="17" cy="6.5" r="2.2" /><circle cx="17" cy="17.5" r="2.2" /><path d="M8.4 11l6.4-3.4M8.4 13l6.4 3.4" /></svg>
        </TabBtn>
      </div>

      {/* ===== 인트로 렌즈플레어 ===== */}
      {showFlare && (
        <div style={{ position: overlayPos, inset: 0, zIndex: 46, pointerEvents: "none", overflow: "hidden", maxWidth: 430, margin: "0 auto" }}>
          <div style={{ position: "absolute", inset: 0, background: "#fff", animation: "tg-flrHold 2.3s ease-in-out forwards" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 120% 80% at 50% 44%, #ffffff 0%, rgba(255,250,238,.82) 45%, rgba(255,246,228,.4) 70%, rgba(255,246,228,0) 100%)", animation: "tg-flrVeil 2.3s ease-in-out forwards" }} />
          <div style={{ position: "absolute", inset: 0, animation: "tg-flrMove 2.3s cubic-bezier(.5,0,.5,1) forwards, tg-flrFade 2.3s ease forwards" }}>
            <div style={{ position: "absolute", top: "44%", left: "50%", transform: "translate(-50%,-50%)", width: "230%", height: 2, background: "linear-gradient(90deg, transparent, rgba(255,247,228,.85) 40%, #ffffff 50%, rgba(255,247,228,.85) 60%, transparent)", boxShadow: "0 0 9px 1px rgba(255,250,238,.85)" }} />
            <div style={{ position: "absolute", top: "44%", left: "50%", transform: "translate(-50%,-50%)", width: 78, height: 78, borderRadius: "50%", background: "radial-gradient(circle, #ffffff 0%, rgba(255,250,236,.85) 32%, rgba(255,246,226,0) 72%)", boxShadow: "0 0 44px 16px rgba(255,249,232,.8)" }} />
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 13, animation: "tg-flrMono 2.3s ease forwards" }}>
            <div style={{ fontFamily: "var(--f-disp)", fontStyle: "italic", fontSize: 15, letterSpacing: ".14em", color: "#6f8a72" }}>The Wedding of</div>
            <div style={{ fontFamily: "var(--f-disp)", fontSize: 30, letterSpacing: ".1em", color: "#1c4733" }}>
              {(data.groom?.name?.slice(-2, -1) || "R")} &amp; {(data.bride?.name?.slice(-2, -1) || "K")}
            </div>
            {weddingDate && (
              <div style={{ fontFamily: "var(--f-disp)", fontSize: 12, letterSpacing: ".24em", color: "#3a5643" }}>
                {weddingDate.getFullYear()} · {pad2(weddingDate.getMonth() + 1)} · {pad2(weddingDate.getDate())}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 라이트박스 ===== */}
      {lbIndex !== null && gallery[lbIndex] && (
        <div
          onClick={() => setLbIndex(null)}
          onTouchStart={(e) => (lbTouchX.current = e.changedTouches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - lbTouchX.current;
            if (Math.abs(dx) > 40) lbNav(dx < 0 ? 1 : -1);
          }}
          style={{ position: overlayPos, inset: 0, zIndex: 60, background: "rgba(20,28,22,.94)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "tg-lbIn .25s ease", maxWidth: 430, margin: "0 auto" }}
          role="dialog"
          aria-label="사진 크게 보기"
        >
          <div style={{ position: "absolute", top: 46, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,.85)", fontFamily: "var(--f-disp)", letterSpacing: ".2em", fontSize: 14 }}>
            {lbIndex + 1} / {gallery.length}
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); setLbIndex(null); }} style={{ position: "absolute", top: 42, right: 18, width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.16)", color: "#fff", cursor: "pointer" }} aria-label="닫기">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <img src={gallery[lbIndex]} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "86%", maxHeight: "70%", objectFit: "contain", borderRadius: 7 }} />
          <div style={{ position: "absolute", bottom: 48, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 40 }}>
            <button type="button" onClick={(e) => { e.stopPropagation(); lbNav(-1); }} style={lbNavBtnStyle} aria-label="이전">‹</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); lbNav(1); }} style={lbNavBtnStyle} aria-label="다음">›</button>
          </div>
        </div>
      )}

      {/* ===== 토스트 ===== */}
      {toastMsg && (
        <div style={{ position: overlayPos, bottom: 78, left: "50%", transform: "translateX(-50%)", zIndex: 70, background: "rgba(30,42,33,.94)", color: "#fff", padding: "12px 22px", borderRadius: 999, fontSize: 12.5, maxWidth: "86%", textAlign: "center", animation: "tg-toastIn .3s ease", boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// 하위 컴포넌트
// ════════════════════════════════════════════════════════════════

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 14px",
  border: "1px solid var(--c-line)",
  borderRadius: 6,
  fontSize: 14,
  color: "var(--c-deep)",
  outline: "none",
  background: "var(--c-bg)",
};

const lbNavBtnStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,.4)",
  background: "rgba(255,255,255,.1)",
  color: "#fff",
  fontSize: 18,
  cursor: "pointer",
};

function ContactPill({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", border: "1px solid var(--c-line)", borderRadius: 999, fontSize: 12, color: "var(--c-deep)", textDecoration: "none" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M6.5 3.5h3l1.3 4-2 1.4a11 11 0 0 0 4.8 4.8l1.4-2 4 1.3v3a1.6 1.6 0 0 1-1.7 1.6A15.4 15.4 0 0 1 5 5.2 1.6 1.6 0 0 1 6.5 3.5Z" /></svg>
      {label}
    </a>
  );
}

function CoupleCard({ roleEn, name, blurb, reverse }: { roleEn: string; name: string; blurb?: string; reverse: boolean }) {
  return (
    <Reveal style={{ background: "var(--c-paper)", borderRadius: 9, padding: 22, display: "flex", gap: 18, alignItems: "center", flexDirection: reverse ? "row-reverse" : "row", textAlign: reverse ? "right" : "left", boxShadow: "0 8px 24px -16px rgba(40,55,45,.4)" }}>
      <div>
        <div style={{ fontFamily: "var(--f-disp)", fontSize: 13, letterSpacing: ".2em", color: "var(--c-accent)" }}>{roleEn}</div>
        <div style={{ fontFamily: "var(--f-kr)", fontSize: 21, color: "var(--c-deep)", margin: "3px 0 8px" }}>{name}</div>
        {blurb && <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--c-ink)", margin: 0 }}>{blurb}</p>}
      </div>
    </Reveal>
  );
}

function CalendarGrid({ date }: { date: Date }) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const weddingDay = date.getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, textAlign: "center", fontSize: 12 }}>
      {KO_DAYS.map((d, i) => (
        <div key={d} style={{ padding: "6px 0", color: i === 0 ? "#c98b7a" : i === 6 ? "var(--c-accent)" : "var(--c-ink)" }}>{d}</div>
      ))}
      {cells.map((d, i) => {
        if (d === null) return <div key={`e${i}`} />;
        const dow = (firstDow + d - 1) % 7;
        const isWed = d === weddingDay;
        if (isWed) {
          return (
            <div key={d} style={{ padding: "2px 0" }}>
              <div style={{ position: "relative", width: 38, height: 38, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "drop-shadow(0 2px 4px rgba(214,40,40,.45))" }}>
                  <path d="M12 21C6.5 17 3 13 3 8.8 3 6 5 4 7.5 4c1.7 0 3.2 1 4.5 2.6C13.3 5 14.8 4 16.5 4 19 4 21 6 21 8.8c0 4.2-3.5 8.2-9 12.2Z" fill="#e23b4e" />
                </svg>
                <span style={{ position: "absolute", inset: -4 }}>
                  <svg viewBox="0 0 24 24" style={{ width: "100%", height: "100%", animation: "tg-pulseRing 2.4s ease-out infinite", transformOrigin: "center" }}>
                    <path d="M12 21C6.5 17 3 13 3 8.8 3 6 5 4 7.5 4c1.7 0 3.2 1 4.5 2.6C13.3 5 14.8 4 16.5 4 19 4 21 6 21 8.8c0 4.2-3.5 8.2-9 12.2Z" fill="none" stroke="#e23b4e" strokeWidth="1.1" />
                  </svg>
                </span>
                <span style={{ position: "relative", zIndex: 1, color: "#fff", fontSize: 11, fontWeight: 600, marginTop: 1 }}>{d}</span>
              </div>
            </div>
          );
        }
        return (
          <div key={d} style={{ padding: "8px 0", color: dow === 0 ? "#c98b7a" : "var(--c-ink)" }}>{d}</div>
        );
      })}
    </div>
  );
}

function MapLink({ label, href, query, app }: { label: string; href?: string; query?: string; app: "naver" | "kakao" | "tmap" }) {
  // 명시 링크가 있으면 그대로, 없으면 장소명 검색 deep link 폴백 (dead-end 방지)
  const fallback =
    query && query.trim()
      ? app === "naver"
        ? `https://map.naver.com/v5/search/${encodeURIComponent(query)}`
        : app === "kakao"
          ? `https://map.kakao.com/link/search/${encodeURIComponent(query)}`
          : `https://www.tmap.co.kr/`
      : undefined;
  const url = href || fallback;
  const style: React.CSSProperties = { textAlign: "center", padding: "11px 0", border: "1px solid var(--c-line)", borderRadius: 6, fontSize: 12, color: "var(--c-deep)", textDecoration: "none", opacity: url ? 1 : 0.4 };
  if (!url) return <span style={style}>{label}</span>;
  return <a href={url} target="_blank" rel="noopener noreferrer" style={style}>{label}</a>;
}

function InfoRow({ title, body, kind }: { title: string; body: string; kind: "transit" | "parking" }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <span style={{ flexShrink: 0, lineHeight: 1, color: "var(--c-deep)" }}>
        {kind === "transit" ? (
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 11V6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5V16H5z" /><path d="M5 12h14" /><path d="M8 19v1.5M16 19v1.5" /><path d="M8 16h.01M16 16h.01" /></svg>
        ) : (
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="4.5" width="15" height="15" rx="3" /><path d="M9.5 16V8h3a2.5 2.5 0 0 1 0 5h-3" /></svg>
        )}
      </span>
      <div>
        <div style={{ fontSize: 13, color: "var(--c-deep)", fontWeight: 500, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--c-ink)" }}>{body}</div>
      </div>
    </div>
  );
}

function AccountAccordion({ title, open, onToggle, accounts, onCopy }: { title: string; open: boolean; onToggle: () => void; accounts: ScrollAccount[]; onCopy: (text: string, msg: string) => void }) {
  return (
    <div style={{ background: "var(--c-paper)", borderRadius: 7, overflow: "hidden", boxShadow: "0 6px 18px -14px rgba(40,55,45,.4)" }}>
      <button type="button" onClick={onToggle} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", fontSize: 14, color: "var(--c-deep)", fontFamily: "var(--f-kr)" }}>
        <span>{title}</span>
        <span style={{ color: "var(--c-accent)", fontSize: 12 }}>{open ? "닫기 −" : "열기 +"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 20px 12px" }}>
          {accounts.map((a, i) => {
            const [bg, fg] = BANK_COLORS[a.bank ?? ""] ?? ["#2f9e5f", "#fff"];
            const full = `${a.bank ?? ""} ${a.num ?? ""}`.trim();
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 0", borderTop: "1px solid var(--c-line)" }}>
                <div style={{ width: 38, height: 38, borderRadius: 5.5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: bg, color: fg }}>
                  {(a.bank ?? "").slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--c-accent)" }}>{[a.role, a.name].filter(Boolean).join(" · ")}</div>
                  <div style={{ fontSize: 12.5, color: "var(--c-deep)", marginTop: 2, letterSpacing: ".01em" }}>{[a.bank, a.num].filter(Boolean).join(" ")}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button type="button" onClick={() => onCopy(a.num ?? "", "계좌번호가 복사되었어요. 송금 앱에 붙여넣어 주세요")} style={{ padding: "7px 13px", borderRadius: 999, border: "none", background: "var(--c-accent)", color: "#fff", fontSize: 11, cursor: "pointer" }}>송금</button>
                  <button type="button" onClick={() => onCopy(full, "계좌번호가 복사되었어요")} style={{ padding: "7px 13px", borderRadius: 999, border: "1px solid var(--c-accent)", background: "transparent", color: "var(--c-accent)", fontSize: 11, cursor: "pointer" }}>복사</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SegField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ display: "flex", gap: 8 }}>{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "var(--c-deep)", marginBottom: 8 }}>{children}</div>;
}

function Seg({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 13,
        transition: "all .2s ease",
        fontFamily: "inherit",
        border: active ? "1px solid var(--c-accent)" : "1px solid var(--c-line)",
        background: active ? "var(--c-accent)" : "transparent",
        color: active ? "#fff" : "var(--c-deep)",
      }}
    >
      {children}
    </button>
  );
}

function RoundBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid var(--c-line)", background: "transparent", fontSize: 18, color: "var(--c-deep)", cursor: "pointer" }}>
      {children}
    </button>
  );
}

function TabBtn({ onClick, label, children, bordered }: { onClick: () => void; label: string; children: React.ReactNode; bordered?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
        padding: "11px 0 calc(13px + var(--safe-bottom, 0px))",
        border: "none",
        borderLeft: bordered ? "1px solid var(--c-line)" : undefined,
        borderRight: bordered ? "1px solid var(--c-line)" : undefined,
        background: "transparent",
        cursor: "pointer",
        color: "var(--c-deep)",
        fontSize: 11,
        fontFamily: "inherit",
      }}
    >
      {children}
      {label}
    </button>
  );
}
