// Snapshot cache so a failed upsert doesn't waste the Gemini analysis cost.
// Every run dumps the analyzed CollectedPlace[] to .collect-cache/<category>-<ts>.json
// right before calling upsertPlaces. If the upsert fails (or the script crashes),
// the snapshot can be replayed via --from-snapshot=<path> to redo only the DB write.

import * as fs from "fs";
import * as path from "path";
import type { CollectedPlace } from "./types";

const CACHE_DIR = path.join(process.cwd(), ".collect-cache");

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export function saveSnapshot(category: string, items: CollectedPlace[]): string {
  ensureCacheDir();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(CACHE_DIR, `${category}-${ts}.json`);
  fs.writeFileSync(file, JSON.stringify(items, null, 2), "utf8");
  return file;
}

export function loadSnapshot(file: string): CollectedPlace[] {
  const data = fs.readFileSync(file, "utf8");
  return JSON.parse(data) as CollectedPlace[];
}
