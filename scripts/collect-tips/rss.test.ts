import { describe, it, expect } from "vitest";
import { parseFeed } from "./rss";

// Fixture: YouTube 가 실제로 발행하는 ATOM feed 의 축약본. namespace 선언과
// entry 구조는 그대로 유지하고, 본 테스트와 무관한 노이즈(link/author detail
// 등)는 제거.
const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
  <id>yt:channel:UCsamCe8B3kvVRqwMRWWz9xA</id>
  <yt:channelId>UCsamCe8B3kvVRqwMRWWz9xA</yt:channelId>
  <title>윤메이MAY</title>
  <author>
    <name>윤메이MAY</name>
    <uri>https://www.youtube.com/channel/UCsamCe8B3kvVRqwMRWWz9xA</uri>
  </author>
  <published>2020-01-01T00:00:00+00:00</published>
  <entry>
    <id>yt:video:ABC123XYZ_1</id>
    <yt:videoId>ABC123XYZ_1</yt:videoId>
    <yt:channelId>UCsamCe8B3kvVRqwMRWWz9xA</yt:channelId>
    <title>웨딩홀 고르는 법 &amp; 후기</title>
    <author>
      <name>윤메이MAY</name>
    </author>
    <published>2025-05-10T03:00:00+00:00</published>
    <updated>2025-05-10T03:00:00+00:00</updated>
    <media:group>
      <media:title>웨딩홀 고르는 법 &amp; 후기</media:title>
      <media:thumbnail url="https://i2.ytimg.com/vi/ABC123XYZ_1/hqdefault.jpg" width="480" height="360"/>
      <media:description>본식 30일전 &lt;꿀팁&gt; 정리. 시연 &amp; 음향 체크.</media:description>
      <media:community>
        <media:starRating count="123" average="4.9" min="1" max="5"/>
        <media:statistics views="45678"/>
      </media:community>
    </media:group>
  </entry>
  <entry>
    <id>yt:video:DEF456XYZ_2</id>
    <yt:videoId>DEF456XYZ_2</yt:videoId>
    <yt:channelId>UCsamCe8B3kvVRqwMRWWz9xA</yt:channelId>
    <title>혼주 한복 색상 추천</title>
    <published>2025-04-20T03:00:00+00:00</published>
    <updated>2025-04-20T03:00:00+00:00</updated>
    <media:group>
      <media:title>혼주 한복 색상 추천</media:title>
      <media:thumbnail url="https://i2.ytimg.com/vi/DEF456XYZ_2/hqdefault.jpg" width="480" height="360"/>
      <media:description>30대&#8203;엄마용 색감.</media:description>
    </media:group>
  </entry>
</feed>`;

describe("YouTube RSS parser", () => {
  it("extracts every entry", () => {
    const items = parseFeed(FIXTURE);
    expect(items).toHaveLength(2);
  });

  it("decodes HTML entities in title and description", () => {
    const items = parseFeed(FIXTURE);
    expect(items[0].title).toBe("웨딩홀 고르는 법 & 후기");
    expect(items[0].description).toContain("<꿀팁>");
    expect(items[0].description).toContain("&");
  });

  it("captures numeric HTML entity in description", () => {
    const items = parseFeed(FIXTURE);
    // &#8203; (zero-width space) 가 풀려야 — 코드 자체는 통과 (글자 깨지지 않음)
    expect(items[1].description).toBe("30대​엄마용 색감.");
  });

  it("captures feed-level author when entry has no author tag", () => {
    const items = parseFeed(FIXTURE);
    expect(items[0].channelTitle).toBe("윤메이MAY");
    expect(items[1].channelTitle).toBe("윤메이MAY");
  });

  it("captures media:statistics views when present", () => {
    const items = parseFeed(FIXTURE);
    expect(items[0].viewCountFromFeed).toBe(45678);
    expect(items[1].viewCountFromFeed).toBeNull();
  });

  it("captures publishedAt", () => {
    const items = parseFeed(FIXTURE);
    expect(items[0].publishedAt).toBe("2025-05-10T03:00:00+00:00");
  });

  it("captures channelId and thumbnail", () => {
    const items = parseFeed(FIXTURE);
    expect(items[0].channelId).toBe("UCsamCe8B3kvVRqwMRWWz9xA");
    expect(items[0].thumbnailUrl).toBe(
      "https://i2.ytimg.com/vi/ABC123XYZ_1/hqdefault.jpg",
    );
  });

  it("returns empty array on empty feed", () => {
    const empty = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>yt:channel:UCdead</id>
  <title>Dead Channel</title>
</feed>`;
    expect(parseFeed(empty)).toEqual([]);
  });

  it("skips entries with no videoId", () => {
    const broken = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>no videoid</title>
  </entry>
  <entry>
    <yt:videoId>OK123</yt:videoId>
    <title>good</title>
  </entry>
</feed>`;
    const items = parseFeed(broken);
    expect(items).toHaveLength(1);
    expect(items[0].videoId).toBe("OK123");
  });
});
