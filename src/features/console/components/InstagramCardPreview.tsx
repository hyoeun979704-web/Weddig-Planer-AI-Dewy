// 인스타 카드뉴스 라이브 미리보기 — instagram-card-renderer(Figma 227-2)의 레이아웃을 CSS로 미러.
// 편집 중 즉시 확인용(실제 발행 PNG 는 렌더러가 생성). 표지 썸네일·CTA 그리드·표지 핸들은
// 본문 카드의 image_url·handle 에서 자동 도출(렌더러와 동일 규칙). 폰트는 앱 전역 SUITE Variable.
import type { CSSProperties } from "react";
import type { InstagramCardText } from "@/types/instagramPostDraft";

const W = 1080;
const H = 1350;
const PINK = "#f6909b";
const FF = '"SUITE Variable", "Pretendard", sans-serif';
const GRAD_COVER =
  "linear-gradient(to bottom, rgba(255,255,255,0) 71.635%, rgba(252,215,219,0.62) 83.654%, rgba(249,182,189,0.8) 100%)";
const GRAD_BODY =
  "linear-gradient(to bottom, rgba(255,255,255,0) 75.481%, rgba(252,215,219,0.62) 87.019%, rgba(249,182,189,0.8) 100%)";
const CTA_DEFAULT =
  "나에게 딱 맞는 결혼정보가 궁금하다면?\nAI 웨딩플래너 DEWY에게 물어봐!";

const fill: CSSProperties = { position: "absolute", top: 0, left: 0, width: W, height: H };

function bgImgStyle(c: InstagramCardText): CSSProperties {
  const zoom = Math.max(50, Math.min(300, c.image_zoom ?? 100)) / 100;
  return {
    ...fill,
    objectFit: c.image_fit === "contain" ? "contain" : "cover",
    objectPosition: `${c.image_pos_x ?? 50}% ${c.image_pos_y ?? 50}%`,
    transform: `scale(${zoom})`,
    transformOrigin: "center center",
  };
}

/** 본문 카드(표지·CTA 제외)의 사진·핸들 수집 — 렌더러 자동 도출 규칙과 동일. */
function deriveBody(cards: InstagramCardText[]) {
  const imgs: string[] = [];
  const handles: string[] = [];
  for (let i = 1; i < cards.length - 1; i++) {
    const u = cards[i]?.image_url;
    if (u) imgs.push(u);
    const h = cards[i]?.handle;
    if (h && !handles.includes(h)) handles.push(h);
  }
  return { imgs, handles };
}

function CardInner({ cards, idx }: { cards: InstagramCardText[]; idx: number }) {
  const c = cards[idx] ?? {};
  const isCover = idx === 0;
  const isCta = cards.length > 1 && idx === cards.length - 1;
  const { imgs: bodyImgs, handles: bodyHandles } = deriveBody(cards);
  const base: CSSProperties = {
    width: W, height: H, position: "relative", overflow: "hidden",
    background: "#fff", fontFamily: FF,
  };

  if (isCta) {
    const grid = (c.grid_urls?.length ? c.grid_urls : bodyImgs).slice(0, 4);
    return (
      <div style={{ ...base, display: "flex", flexDirection: "column", alignItems: "center", gap: 40, padding: "80px 60px" }}>
        <div style={{ ...fill, backgroundImage: GRAD_COVER }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10 }}>
          <span style={{ fontSize: 72, color: PINK, lineHeight: 1 }}>♥</span>
          <span style={{ fontSize: 70, fontWeight: 800, color: "#000" }}>DEWY</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", width: 870, height: 870, gap: 40 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 415, height: 415, overflow: "hidden", background: "#e9e9e9" }}>
              {grid[i] ? <img src={grid[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
            </div>
          ))}
        </div>
        <div style={{ width: 960, fontSize: 50, fontWeight: 400, color: "#000", textAlign: "center", lineHeight: 1.25, whiteSpace: "pre-wrap" }}>
          {c.body || c.footer || CTA_DEFAULT}
        </div>
      </div>
    );
  }

  const handles = isCover
    ? Array.from(new Set([c.handle, ...bodyHandles].filter((h): h is string => !!h))).slice(0, 3)
    : (c.handle ? [c.handle] : []);
  const thumbs = isCover ? (c.thumb_urls?.length ? c.thumb_urls : bodyImgs).slice(0, 3) : [];

  return (
    <div style={base}>
      {c.image_url ? <img src={c.image_url} alt="" style={bgImgStyle(c)} /> : <div style={{ ...fill, background: "#d8d8d8" }} />}
      <div style={{ ...fill, backgroundImage: isCover ? GRAD_COVER : GRAD_BODY }} />
      {isCover
        ? thumbs.map((u, i) => (
            <div key={i} style={{ position: "absolute", left: 770, top: 60 + i * 300, width: 250, height: 250, border: `5px solid ${PINK}`, background: "#fff", overflow: "hidden" }}>
              <img src={u} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ))
        : null}
      {isCover ? (
        <div style={{ position: "absolute", left: 60, top: 831, width: 960, display: "flex", flexDirection: "column" }}>
          {handles.map((h, i) => (
            <div key={i} style={{ height: 60, fontSize: 48, fontWeight: 600, color: "#fff", lineHeight: "60px" }}>{h}</div>
          ))}
        </div>
      ) : (
        handles[0] ? (
          <div style={{ position: "absolute", left: 60, top: 980, width: 960, height: 60, fontSize: 48, fontWeight: 600, color: "#fff" }}>{handles[0]}</div>
        ) : null
      )}
      <div style={{ position: "absolute", left: 60, top: isCover ? 1030 : 1090, width: 960, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: isCover ? 80 : 64, fontWeight: 800, color: "#000", lineHeight: isCover ? 1.18 : 1.1, whiteSpace: "pre-wrap", wordBreak: "keep-all" }}>
          {c.title}
        </div>
        {c.body ? (
          <div style={{ marginTop: 10, fontSize: 48, fontWeight: 600, color: "#000", lineHeight: 1.25, whiteSpace: "pre-wrap", wordBreak: "keep-all" }}>
            {c.body}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** 카드 배열을 1080×1350 비율로 축소 미리보기(기본 0.25 = 270×337). */
const InstagramCardPreview = ({ cards, scale = 0.25 }: { cards: InstagramCardText[]; scale?: number }) => {
  if (!cards.length) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {cards.map((_, idx) => (
        <div key={idx} className="shrink-0 rounded-lg border border-border overflow-hidden" style={{ width: W * scale, height: H * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: W, height: H }}>
            <CardInner cards={cards} idx={idx} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default InstagramCardPreview;
