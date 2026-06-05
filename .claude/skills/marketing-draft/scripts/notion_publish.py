#!/usr/bin/env python3
"""Publish a Markdown file to Notion as a child page (no third-party deps).

Usage:
  python3 notion_publish.py --file draft.md --title "제목" \
      [--token $NOTION_TOKEN] [--parent $NOTION_PARENT_PAGE_ID] [--dry-run]

Token / parent fall back to env NOTION_TOKEN / NOTION_PARENT_PAGE_ID.
--dry-run converts the Markdown to Notion blocks and prints a summary
WITHOUT calling the Notion API (use to verify conversion offline).

Supports: # / ## / ### headings, - / * bullets, 1. numbered lists,
[ ] / [x] to-dos, > quotes, --- dividers, ``` code fences, | markdown
tables |, and inline **bold** / `code`.
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

NOTION_VERSION = "2022-06-28"
API = "https://api.notion.com/v1"
MAX_BLOCKS = 100          # Notion: max children per create/append request
MAX_TEXT = 1900           # safety margin under Notion's 2000-char rich_text cap

# Notion's code block accepts a fixed language set; map a few, default safe.
_LANGS = {
    "js": "javascript", "javascript": "javascript", "ts": "typescript",
    "typescript": "typescript", "py": "python", "python": "python",
    "json": "json", "bash": "bash", "sh": "shell", "shell": "shell",
    "html": "html", "css": "css", "sql": "sql", "yaml": "yaml",
    "md": "markdown", "markdown": "markdown",
}


def normalize_lang(lang):
    return _LANGS.get((lang or "").lower().strip(), "plain text")


def rich_text(s):
    """String with **bold** and `code` -> Notion rich_text list, chunked."""
    segments = []
    parts = re.split(r"(\*\*.+?\*\*|`[^`]+`)", s)
    for part in parts:
        if not part:
            continue
        anno = None
        text = part
        if len(part) >= 4 and part.startswith("**") and part.endswith("**"):
            text, anno = part[2:-2], {"bold": True}
        elif len(part) >= 2 and part.startswith("`") and part.endswith("`"):
            text, anno = part[1:-1], {"code": True}
        for i in range(0, max(len(text), 1), MAX_TEXT):
            chunk = text[i:i + MAX_TEXT]
            rt = {"type": "text", "text": {"content": chunk}}
            if anno:
                rt["annotations"] = anno
            segments.append(rt)
    return segments or [{"type": "text", "text": {"content": ""}}]


def block(btype, text=None, extra=None):
    payload = {}
    if text is not None:
        payload["rich_text"] = rich_text(text)
    if extra:
        payload.update(extra)
    return {"object": "block", "type": btype, btype: payload}


def table_to_blocks(rows):
    """Markdown table lines (incl. header + separator) -> one Notion table block."""
    def cells(line):
        return [c.strip() for c in line.strip().strip("|").split("|")]

    parsed = [cells(r) for r in rows]
    # drop separator row like |---|---|
    body = [r for r in parsed if not all(re.fullmatch(r":?-+:?", c or "-") for c in r)]
    if not body:
        return []
    width = max(len(r) for r in body)
    table_rows = []
    for r in body:
        r = r + [""] * (width - len(r))
        table_rows.append({
            "type": "table_row",
            "table_row": {"cells": [rich_text(c) for c in r]},
        })
    return [{
        "object": "block",
        "type": "table",
        "table": {
            "table_width": width,
            "has_column_header": True,
            "has_row_header": False,
            "children": table_rows,
        },
    }]


def md_to_blocks(md):
    blocks = []
    lines = md.split("\n")
    i = 0
    while i < len(lines):
        raw = lines[i]
        s = raw.strip()

        if s.startswith("```"):
            lang = s[3:].strip()
            buf = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                buf.append(lines[i])
                i += 1
            i += 1  # closing fence
            code = "\n".join(buf)[:MAX_TEXT]
            blocks.append({"object": "block", "type": "code", "code": {
                "rich_text": [{"type": "text", "text": {"content": code}}],
                "language": normalize_lang(lang)}})
            continue

        if not s:
            i += 1
            continue

        if s in ("---", "***", "___"):
            blocks.append({"object": "block", "type": "divider", "divider": {}})
            i += 1
            continue

        m = re.match(r"^(#{1,3})\s+(.*)", s)
        if m:
            blocks.append(block(f"heading_{len(m.group(1))}", m.group(2)))
            i += 1
            continue

        if s.startswith("> "):
            blocks.append(block("quote", s[2:]))
            i += 1
            continue

        if s.startswith("|") and s.endswith("|"):
            tbl = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                tbl.append(lines[i])
                i += 1
            blocks.extend(table_to_blocks(tbl))
            continue

        m = re.match(r"^[-*]\s+\[([ xX])\]\s+(.*)", s)  # - [ ] todo
        if m:
            blocks.append(block("to_do", m.group(2),
                                {"checked": m.group(1).lower() == "x"}))
            i += 1
            continue

        m = re.match(r"^[-*]\s+(.*)", s)
        if m:
            blocks.append(block("bulleted_list_item", m.group(1)))
            i += 1
            continue

        m = re.match(r"^\d+\.\s+(.*)", s)
        if m:
            blocks.append(block("numbered_list_item", m.group(1)))
            i += 1
            continue

        blocks.append(block("paragraph", s))
        i += 1
    return blocks


def _request(method, path, body, token):
    req = urllib.request.Request(
        API + path, data=json.dumps(body).encode("utf-8"), method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Notion-Version", NOTION_VERSION)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.stderr.write(f"Notion API {method} {path} -> {e.code}: "
                         f"{e.read().decode()}\n")
        raise


def publish(title, blocks, token, parent):
    page = _request("POST", "/pages", {
        "parent": {"type": "page_id", "page_id": parent},
        "properties": {"title": {"title": rich_text(title)}},
        "children": blocks[:MAX_BLOCKS],
    }, token)
    page_id = page["id"]
    rest = blocks[MAX_BLOCKS:]
    for j in range(0, len(rest), MAX_BLOCKS):
        _request("PATCH", f"/blocks/{page_id}/children",
                 {"children": rest[j:j + MAX_BLOCKS]}, token)
    return page.get("url", page_id)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    ap.add_argument("--title")
    ap.add_argument("--token", default=os.environ.get("NOTION_TOKEN"))
    ap.add_argument("--parent", default=os.environ.get("NOTION_PARENT_PAGE_ID"))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    with open(a.file, encoding="utf-8") as f:
        md = f.read()

    title = a.title
    if not title:
        m = re.search(r"^#\s+(.*)", md, re.M)
        title = m.group(1).strip() if m else os.path.basename(a.file)

    blocks = md_to_blocks(md)

    if a.dry_run:
        print(f"[dry-run] title: {title}")
        print(f"[dry-run] blocks: {len(blocks)} "
              f"({(len(blocks) - 1) // MAX_BLOCKS + 1} API request(s))")
        types = {}
        for b in blocks:
            types[b["type"]] = types.get(b["type"], 0) + 1
        print(f"[dry-run] block types: {json.dumps(types, ensure_ascii=False)}")
        print("[dry-run] first 3 blocks:")
        print(json.dumps(blocks[:3], ensure_ascii=False, indent=2))
        return

    if not a.token or not a.parent:
        sys.stderr.write(
            "ERROR: NOTION_TOKEN and NOTION_PARENT_PAGE_ID required "
            "(env vars or --token/--parent).\n")
        sys.exit(2)

    url = publish(title, blocks, a.token, a.parent)
    print(url)


if __name__ == "__main__":
    main()
