/**
 * 메이크업 시안 18종 — 붙여넣기용 프롬프트 자동 생성.
 *
 * seed/makeup-samples/seed.sql 의 메타데이터 + src/lib/makeupDescription.ts 의
 * describeMakeup() 엔진으로 docs/makeup-samples-prompts-generated.md 를 생성한다.
 * 실제 앱(dewy-makeup)과 같은 묘사를 쓰므로 모든 디테일이 룩마다 일관되게 반영된다.
 *
 * 실행: npx tsx scripts/genMakeupPrompts.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { describeMakeup } from "../src/lib/makeupDescription";

const sql = readFileSync("seed/makeup-samples/seed.sql", "utf8");

const re =
  /\('([^']*)',\s*'__IMG_([^']*)__',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'\{([^}]*)\}',\s*'\{([^}]*)\}'/g;

const mood2av: Record<string, string> = {
  SOFT_KOREAN: "avatar-soft_korean",
  ETHEREAL: "avatar-ethereal",
  GLAMOROUS: "avatar-glamorous",
  FRESH_NATURAL: "avatar-fresh",
  CLASSIC: "avatar-classic",
  ROMANTIC: "avatar-romantic",
};

const name2ref: Record<string, string> = {
  "한국 신부 · 본식 시그니처": "ref_3",
  "한국 신부 · 물광 글로우": "ref_1",
  "에테리얼 · 투명 햇살 본식": "ref_7",
  "에테리얼 · 글로우 라벤더 본식": "ref_6",
  "에테리얼 · 투명 글로시": "ref_2",
  "프레시 · 생기 코랄": "ref_5",
  "클래식 · 시크 에디토리얼": "ref_8",
  "로맨틱 · 핑크 그라데이션": "ref_4",
};

const lines: string[] = [
  "# 메이크업 시안 18종 — 붙여넣기용 프롬프트 (엔진 자동생성)",
  "",
  "> 이 파일은 `seed/makeup-samples/seed.sql` 메타데이터 + `describeMakeup` 엔진에서 **자동 생성**된다.",
  "> 손으로 고치지 말 것. 재생성: `npx tsx scripts/genMakeupPrompts.ts`",
  "> 실제 앱(dewy-makeup)과 동일한 묘사라, 모든 디테일(피부·눈·눈썹·블러셔·컨투어·립)이 룩마다 반영된다.",
  "> ref 룩은 해당 레퍼런스 사진을 Image 2로 함께 첨부.",
  "",
];

let m: RegExpExecArray | null;
let n = 0;
while ((m = re.exec(sql))) {
  n++;
  const [, name, img, base, lipc, lipf, eyes, eyec, blushc, blushp, brow, contour, det, mood] = m;
  const meta = {
    base_finish: base,
    lip_color: lipc,
    lip_finish: lipf,
    eye_style: eyes,
    eye_color: eyec,
    blush_color: blushc,
    blush_placement: blushp,
    brow_shape: brow,
    contour_intensity: contour,
    details: det ? det.split(",") : [],
    mood: mood ? mood.split(",") : [],
  };
  const av = mood2av[mood.split(",")[0]] ?? "avatar";
  const ref = name2ref[name];

  lines.push(`## ${img} · ${name}  〔${av}${ref ? ` + ${ref}` : ""}〕`);
  lines.push("```");
  lines.push(`[Image 1: ${av}.png]${ref ? `   [Image 2: ${ref}]` : ""}`);
  lines.push(
    "LOCK Image 1 EXACTLY — do NOT change: hair (every strand & parting), head pose & angle,",
  );
  lines.push(
    "framing, face shape, eye shape, nose, lip shape, jaw, skin tone. The ONLY change is ADDING",
  );
  lines.push(
    "makeup (eyebrows, lashes, skin-finish = makeup, NOT identity — her bare brows MUST be made up).",
  );
  if (ref) {
    lines.push(
      "Use Image 2 as a MAKEUP reference ONLY — copy makeup colors/placement; never copy its",
    );
    lines.push("face, hair, veil, crop or pose.");
  }
  lines.push(
    "APPLY FULL PROFESSIONAL BRIDAL MAKEUP — EVERY item below must be clearly visible and render",
  );
  lines.push(
    "the SPECIFIED finish faithfully (do not default skin to dewy). Editorial quality, eyes OPEN to",
  );
  lines.push("camera, visible skin pores, no veil/hands/props/text.");
  lines.push("MAKEUP:");
  lines.push(describeMakeup(meta));
  lines.push("```");
  lines.push("");
}

writeFileSync("docs/makeup-samples-prompts-generated.md", lines.join("\n"));
console.error(`generated ${n} look prompts`);
