/**
 * 메이크업 시안 30장 일괄 생성 (로컬 실행용 — OpenAI API 직접 호출).
 *
 * ⚠️ Claude 샌드박스는 외부 egress가 막혀 있어 여기서 못 돌린다. 네트워크+키 있는
 *    로컬/CI 에서 실행할 것.
 *
 * 준비:
 *   1) export OPENAI_API_KEY=sk-...
 *   2) ./scripts/makeup-inputs/ 폴더에 아바타·레퍼런스 이미지(png) 넣기:
 *        avatar-basic.png  avatar-ethereal.png  avatar-romantic.png
 *        avatar-glamorous.png  avatar-classic.png  avatar-fresh.png
 *        ref_1.png … ref_8.png   (ref 룩에만 필요)
 *      (avatar-basic.png 이 없으면 avatar-source.png 로부터 자동 생성)
 *   3) npx tsx scripts/genMakeupImages.ts
 *
 * 출력:
 *   - ./scripts/makeup-output/<CODE>.png  (생성 이미지)
 *   - ./scripts/makeup-output/results.json (CODE→파일 매핑)
 *   콘솔에 seed.sql 의 __IMG_xx__ 치환용 안내 출력.
 *
 * 모델/규격은 dewy-makeup 과 동일(gpt-image-2, 1024x1024, images.edit).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { describeMakeup } from "../src/lib/makeupDescription";

const ROOT = process.cwd();
const IN = join(ROOT, "scripts/makeup-inputs");
const OUT = join(ROOT, "scripts/makeup-output");
const KEY = process.env.OPENAI_API_KEY;
const QUALITY = process.env.MK_QUALITY || "high";

if (!KEY) throw new Error("OPENAI_API_KEY 환경변수가 필요합니다.");
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const mood2av: Record<string, string> = {
  SOFT_KOREAN: "avatar-basic",
  ETHEREAL: "avatar-ethereal",
  GLAMOROUS: "avatar-glamorous",
  FRESH_NATURAL: "avatar-fresh",
  CLASSIC: "avatar-classic",
  ROMANTIC: "avatar-romantic",
};
const name2ref: Record<string, string> = {
  "베이직 · 본식 시그니처": "ref_3",
  "베이직 · 물광 글로우": "ref_1",
  "에테리얼 · 투명 햇살 본식": "ref_7",
  "에테리얼 · 글로우 라벤더 본식": "ref_6",
  "에테리얼 · 투명 글로시": "ref_2",
  "프레시 · 생기 코랄": "ref_5",
  "클래식 · 시크 에디토리얼": "ref_8",
  "로맨틱 · 핑크 그라데이션": "ref_4",
};

interface Look {
  code: string;
  name: string;
  av: string;
  ref?: string;
  meta: Parameters<typeof describeMakeup>[0];
}

function parseSeed(): Look[] {
  const sql = readFileSync(join(ROOT, "seed/makeup-samples/seed.sql"), "utf8");
  const re =
    /\('([^']*)',\s*'__IMG_([^']*)__',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'\{([^}]*)\}',\s*'\{([^}]*)\}'/g;
  const looks: Look[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    const [, name, code, base, lipc, lipf, eyes, eyec, blushc, blushp, brow, contour, det, mood] = m;
    looks.push({
      code,
      name,
      av: mood2av[mood.split(",")[0]] ?? "avatar-basic",
      ref: name2ref[name],
      meta: {
        base_finish: base, lip_color: lipc, lip_finish: lipf, eye_style: eyes,
        eye_color: eyec, blush_color: blushc, blush_placement: blushp, brow_shape: brow,
        contour_intensity: contour, details: det ? det.split(",") : [], mood: mood ? mood.split(",") : [],
      },
    });
  }
  return looks;
}

function buildPrompt(look: Look, hasRef: boolean): string {
  const ref = hasRef ? "\n" +
    "From Image 2 copy ONLY the makeup colours, finishes and placement — never its face, hair, veil, crop or pose." : "";
  return `Ultra-detailed editorial Korean bridal beauty close-up — photorealistic, 85mm macro, soft large-softbox beauty lighting that flatters the makeup, ultra-high resolution, razor-sharp focus on the face, lifelike skin with visible pores and fine texture.
IDENTITY LOCK — keep Image 1's exact person: hair (every strand & parting), head pose, angle, framing, face shape, eye shape, nose, lip shape, jaw and skin tone stay UNCHANGED. The only change is adding professional makeup (eyebrows, lashes and skin-finish count as makeup, not identity).${ref}
RENDER THE MAKEUP WITH HIGH PRECISION — paint every element below distinctly and true to its description, and reproduce the EXACT finishes (matte reads matte, dewy reads wet & glowing, glossy looks juicy, over-lined looks fuller). Full professional bridal makeup, clearly applied — NOT a bare face.
MAKEUP — apply each precisely:
${describeMakeup(look.meta)}
- Lashes: add natural-looking curled false lashes / extensions, defined and well-separated; fuller and more dramatic for glam / smoky / cat-eye / defined looks, softer for natural looks, with lightly defined lower lashes for doll-eye looks.
Eyes open and engaging the camera, serene refined bridal expression. No veil, hands, jewelry, props, text or watermark. One hyper-detailed photorealistic 1:1 bridal beauty portrait.`;
}

function imgFile(stem: string): string | null {
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const p = join(IN, stem + ext);
    if (existsSync(p)) return p;
  }
  return null;
}

async function openaiEdit(prompt: string, images: string[]): Promise<Buffer> {
  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("prompt", prompt);
  form.append("size", "1024x1024");
  form.append("quality", QUALITY);
  form.append("n", "1");
  for (let i = 0; i < images.length; i++) {
    const buf = readFileSync(images[i]);
    form.append("image[]", new Blob([buf], { type: "image/png" }), `img${i}.png`);
  }
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { data: { b64_json: string }[] };
  return Buffer.from(data.data[0].b64_json, "base64");
}

async function ensureBasicAvatar() {
  if (imgFile("avatar-basic")) return;
  const src = imgFile("avatar-source");
  if (!src) {
    console.warn("⚠ avatar-basic / avatar-source 둘 다 없음 → 베이직 룩 6장 생성 불가. 베이직 아바타를 넣어주세요.");
    return;
  }
  console.log("· avatar-basic 생성 중 (from avatar-source)…");
  const prompt = `EDIT this exact photo. SAME woman — preserve her face 100% (eye shape, eyelid, nose, lips, face shape, proportions, skin tone). Keep her pose, head angle, framing, neutral expression and the clean light-grey background. Keep a COMPLETELY BARE FACE (no makeup, bare natural brows and lashes, visible skin pores). Change ONLY the hairstyle. Keep eyebrows visible; forehead may be softly covered by bangs. Hair color = natural Korean dark brown (soft blackish-brown, warm sheen), NOT jet-black. Modern 2026 bridal styling with soft crown volume and fine face-framing wispy strands. HAIRSTYLE: a modern Korean slicked LOW BUN with soft crown volume, see-through bangs and deliberate fine face-framing wispy strands. 1:1 square 1024x1024, eyes open to camera, no veil, no jewelry, no props, no text. Ultra-photorealistic.`;
  const buf = await openaiEdit(prompt, [src]);
  writeFileSync(join(IN, "avatar-basic.png"), buf);
  console.log("  ✔ avatar-basic.png 저장");
}

async function main() {
  console.log("입력 폴더:", IN);
  console.log("가진 입력:", readdirSync(IN).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).join(", ") || "(없음)");
  await ensureBasicAvatar();

  const looks = parseSeed();
  const results: Record<string, string> = {};
  let ok = 0, skip = 0, fail = 0;
  for (const look of looks) {
    const avPath = imgFile(look.av);
    if (!avPath) { console.warn(`SKIP ${look.code} ${look.name} — 아바타 ${look.av} 없음`); skip++; continue; }
    const images = [avPath];
    let hasRef = false;
    if (look.ref) {
      const refPath = imgFile(look.ref);
      if (refPath) { images.push(refPath); hasRef = true; }
      else console.warn(`  (${look.code} ref ${look.ref} 없음 → 텍스트만으로 진행)`);
    }
    try {
      process.stdout.write(`· ${look.code} ${look.name} … `);
      const buf = await openaiEdit(buildPrompt(look, hasRef), images);
      const out = join(OUT, `${look.code}.png`);
      writeFileSync(out, buf);
      results[look.code] = out;
      ok++;
      console.log("✔");
    } catch (e) {
      fail++;
      console.log("FAIL:", String(e).slice(0, 200));
    }
  }
  writeFileSync(join(OUT, "results.json"), JSON.stringify(results, null, 2));
  console.log(`\n완료: 성공 ${ok} / 스킵 ${skip} / 실패 ${fail}`);
  console.log(`결과: ${OUT}/  (results.json 참고)`);
  console.log("다음: 이미지를 makeup-samples 버킷에 업로드 후 seed.sql 의 __IMG_<CODE>__ 를 public URL 로 치환해 실행하세요.");
}

main();
