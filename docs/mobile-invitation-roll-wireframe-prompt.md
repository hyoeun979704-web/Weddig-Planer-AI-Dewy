# Mobile Invitation Roll Template Prompt

## Why a flat image is not enough

An image with names, photos, a map, a calendar, and button labels already painted
into it is only a visual reference. It cannot be registered as an editable Dewy
template. A registration-ready package must separate:

1. Decorative background images with no customer-specific content.
2. Editable `text`, `image`, `calendar`, `map`, `qr`, and `asset` slots.
3. One `layout.json` file with exact canvas coordinates.

The Dewy mobile roll format accepts up to 10 frames. Each frame is
`1080x1920px`, and the combined roll can be up to `1080x19200px`.

## Copy-paste prompt

Use this prompt in a coding-capable AI tool. Ask it to generate deterministic SVG
or HTML first and export PNG files from that source. Do not ask an image model to
freely paint the final template: free-form output bakes text and photos into the
background and often returns the wrong number of files.

```text
You are preparing a registration-ready mobile wedding invitation template package
for Dewy. This is a production asset task, not a mood-board image-generation task.

Deliver one ZIP package with:
1. layout.json
2. 10 independent PNG background files named frame-01.png through frame-10.png
3. one preview.png showing the connected roll only for thumbnail review
4. one manifest.md table listing every editable slot with page id, slot id, type,
   x, y, w, h, field, and role

Hard format rules:
- Each background PNG must be exactly 1080x1920px.
- layout.json canvas must be exactly {"w":1080,"h":19200,"bg":"#FFFFFF"}.
- layout.json must contain product_kind:"mobile_roll" and
  presentation:"seamless_roll".
- layout.json pages must contain exactly 10 pages ordered frame-01 to frame-10.
- Every page canvas must be exactly {"w":1080,"h":1920,"bg":"#FFFFFF",
  "background_url":""}. The operator uploads PNG files and fills background_url.
- Coordinates in layout.json are local to each 1080x1920 frame.
- Every slot must stay inside its frame.

Critical layer separation rules:
- Background PNG files may contain only non-editable decoration: paper texture,
  borders, botanical line art, dividers, neutral ornaments, and blank containers.
- Do not paint customer names, wedding date, wedding time, venue name, venue
  address, account numbers, phone numbers, greeting body, RSVP text, or dress-code
  copy into background PNG files.
- Do not paint real photos, photo placeholders, fake map content, calendar numbers,
  QR codes, or button labels into background PNG files.
- Represent every replaceable photo area as an image slot in layout.json.
- Represent the calendar as a calendar slot, the venue map as a map slot, and QR
  as a qr slot.
- Represent editable labels and paragraphs as text slots. Give each text slot a
  useful placeholder and editable_font:true.
- Lock decorative slots and backgrounds. Keep editable content movable and
  resizable unless a strict composition requires otherwise.
- Do not make a phone mockup, contact sheet, perspective scene, or poster montage.
- Keep the top and bottom 72px of every frame free from essential content.
- Design the seam between adjacent frames so the full roll reads continuously.

Required content plan:
- frame-01: cover, hero photo, couple names, short intro
- frame-02: greeting body and couple or parents names
- frame-03: wedding date countdown visual area and real calendar slot
- frame-04: timing / ceremony schedule
- frame-05: replaceable photo gallery
- frame-06: venue name, venue address, replaceable map slot
- frame-07: contact text and account guidance
- frame-08: dress code and point-color guidance
- frame-09: replaceable photo gallery and memory text
- frame-10: closing message, QR area, share guidance

Use only these Dewy slot types:
- "text"
- "image"
- "asset"
- "calendar"
- "qr"
- "map"

Use these common user-data fields where applicable:
- groom_name
- bride_name
- groom_parents
- bride_parents
- wedding_date
- wedding_time
- venue_name
- venue_address
- contact_groom
- contact_bride
- account_groom
- account_bride

Use this exact JSON structure:
{
  "product_kind": "mobile_roll",
  "presentation": "seamless_roll",
  "canvas": { "w": 1080, "h": 19200, "bg": "#FFFFFF" },
  "slots": [],
  "pages": [
    {
      "id": "frame-01",
      "label": "1번 프레임",
      "order": 1,
      "canvas": {
        "w": 1080,
        "h": 1920,
        "bg": "#FFFFFF",
        "background_url": ""
      },
      "slots": [
        {
          "id": "cover-photo",
          "type": "image",
          "x": 120,
          "y": 240,
          "w": 840,
          "h": 940,
          "image_order": 1,
          "fit": "cover",
          "movable": true,
          "resizable": true
        },
        {
          "id": "cover-names",
          "type": "text",
          "x": 100,
          "y": 1300,
          "w": 880,
          "h": 130,
          "field": "couple_names",
          "role": "names",
          "placeholder": "신랑 이름 · 신부 이름",
          "font_size": 54,
          "align": "center",
          "editable_font": true,
          "editable_color": true
        }
      ]
    }
  ]
}

The example shows only frame-01. Expand pages to all 10 frames and include every
editable slot. Before returning the ZIP package, validate:
- 10 PNG files exist and each is exactly 1080x1920px.
- layout.json has 10 pages and total height 19200.
- backgrounds contain decoration only.
- every editable text, photo, map, calendar, and QR area exists as JSON slots.
- JSON parses successfully.
```

## Admin registration

1. Open `Admin > Invitation Templates`.
2. Create a mobile template.
3. Import the generated `layout.json`, or start from
   `public/invitation-templates/mobile-roll-10-frame-starter/layout.json`.
4. Upload the decorative backgrounds with `9:16 프레임 일괄 등록`.
5. The upload replaces background URLs while preserving the imported editable
   slots. Importing an updated JSON also preserves uploaded background URLs when
   the frame count matches.

The current editor renders CTA-looking areas as canvas design elements. Clickable
RSVP, map, account-copy, and contact hotspots should be implemented as a separate
interactive layer before advertising them as working buttons.
