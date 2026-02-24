import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VenueDebug = () => {
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const run = async () => {
      const logs: string[] = [];

      // 0. Supabase 클라이언트 확인
      logs.push("=== Supabase Client ===");
      logs.push("URL: " + (supabase as any).supabaseUrl);
      logs.push("Key (first 20): " + (supabase as any).supabaseKey?.substring(0, 20) + "...");

      // 1. venues 조회
      logs.push("");
      logs.push("=== 1. venues SELECT * LIMIT 2 ===");
      try {
        const res = await supabase.from("venues").select("*").limit(2);
        logs.push("status: " + res.status);
        logs.push("statusText: " + res.statusText);
        logs.push("error: " + JSON.stringify(res.error));
        logs.push("data length: " + (res.data?.length ?? "null"));
        logs.push("data: " + JSON.stringify(res.data?.slice(0, 1), null, 2));
      } catch (e: any) {
        logs.push("CATCH error: " + e.message);
      }

      // 2. venue_halls 조회
      logs.push("");
      logs.push("=== 2. venue_halls SELECT * LIMIT 2 ===");
      try {
        const res = await supabase.from("venue_halls").select("*").limit(2);
        logs.push("status: " + res.status);
        logs.push("error: " + JSON.stringify(res.error));
        logs.push("data length: " + (res.data?.length ?? "null"));
        logs.push("data: " + JSON.stringify(res.data?.slice(0, 1), null, 2));
      } catch (e: any) {
        logs.push("CATCH error: " + e.message);
      }

      // 3. venue_special_points 조회
      logs.push("");
      logs.push("=== 3. venue_special_points SELECT * LIMIT 2 ===");
      try {
        const res = await supabase.from("venue_special_points").select("*").limit(2);
        logs.push("status: " + res.status);
        logs.push("error: " + JSON.stringify(res.error));
        logs.push("data length: " + (res.data?.length ?? "null"));
        logs.push("data: " + JSON.stringify(res.data?.slice(0, 1), null, 2));
      } catch (e: any) {
        logs.push("CATCH error: " + e.message);
      }

      // 4. 다른 테이블 (존재 확인용) - products
      logs.push("");
      logs.push("=== 4. products (비교용) SELECT * LIMIT 1 ===");
      try {
        const res = await supabase.from("products").select("*").limit(1);
        logs.push("status: " + res.status);
        logs.push("error: " + JSON.stringify(res.error));
        logs.push("data length: " + (res.data?.length ?? "null"));
      } catch (e: any) {
        logs.push("CATCH error: " + e.message);
      }

      // 5. raw fetch 테스트
      logs.push("");
      logs.push("=== 5. Raw fetch test ===");
      try {
        const url = (supabase as any).supabaseUrl + "/rest/v1/venues?select=name&limit=1";
        const key = (supabase as any).supabaseKey;
        logs.push("Fetching: " + url);
        const resp = await fetch(url, {
          headers: {
            "apikey": key,
            "Authorization": "Bearer " + key,
          }
        });
        logs.push("HTTP status: " + resp.status);
        const text = await resp.text();
        logs.push("Response: " + text.substring(0, 500));
      } catch (e: any) {
        logs.push("CATCH error: " + e.message);
      }

      setLog(logs);
    };
    run();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "monospace", fontSize: 11, maxWidth: 500, margin: "0 auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
      <h2 style={{ fontSize: 18, fontWeight: "bold" }}>🔍 Venue DB Debug v2</h2>
      {log.length === 0 && <p>Loading...</p>}
      {log.map((line, i) => (
        <div key={i} style={{ 
          background: line.startsWith("===") ? "#ffe0e0" : line.startsWith("error") || line.startsWith("CATCH") ? "#ffcccc" : "#f5f5f5",
          padding: "2px 6px",
          marginBottom: 1,
          fontWeight: line.startsWith("===") ? "bold" : "normal"
        }}>
          {line || " "}
        </div>
      ))}
    </div>
  );
};

export default VenueDebug;
