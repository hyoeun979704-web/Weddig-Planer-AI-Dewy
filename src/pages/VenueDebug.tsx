// 임시 디버그 페이지 - 이 파일은 나중에 삭제하세요
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const VenueDebug = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const run = async () => {
      const errs: string[] = [];

      // 1. venues 전체 조회
      const { data: v, error: ve } = await supabase.from("venues").select("*").limit(3);
      if (ve) errs.push("venues error: " + ve.message);
      setVenues(v || []);

      // 2. venue_halls 전체 조회
      const { data: h, error: he } = await supabase.from("venue_halls").select("*").limit(5);
      if (he) errs.push("venue_halls error: " + he.message);
      setHalls(h || []);

      // 3. venue_special_points 전체 조회
      const { data: p, error: pe } = await supabase.from("venue_special_points").select("*").limit(5);
      if (pe) errs.push("venue_special_points error: " + pe.message);
      setPoints(p || []);

      // 4. venue_id로 필터 테스트
      if (v && v.length > 0) {
        const testVenue = v[0];
        errs.push(`--- Test venue: number=${testVenue.number}, venue_id=${testVenue.venue_id}, name=${testVenue.name}`);
        
        // venue_id로 halls 조회
        const { data: h1, error: h1e } = await supabase
          .from("venue_halls")
          .select("*")
          .eq("venue_id", testVenue.venue_id ?? testVenue.number);
        errs.push(`halls by venue_id(${testVenue.venue_id ?? testVenue.number}): ${h1?.length ?? 0} rows, error: ${h1e?.message ?? 'none'}`);

        // name으로 halls 조회
        const { data: h2, error: h2e } = await supabase
          .from("venue_halls")
          .select("*")
          .eq("name", testVenue.name);
        errs.push(`halls by name(${testVenue.name}): ${h2?.length ?? 0} rows, error: ${h2e?.message ?? 'none'}`);

        // number로 halls 조회
        const { data: h3, error: h3e } = await supabase
          .from("venue_halls")
          .select("*")
          .eq("venue_id", testVenue.number);
        errs.push(`halls by number(${testVenue.number}): ${h3?.length ?? 0} rows, error: ${h3e?.message ?? 'none'}`);
      }

      setErrors(errs);
    };
    run();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: "monospace", fontSize: 12, maxWidth: 430, margin: "0 auto" }}>
      <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>🔍 Venue DB Debug</h2>
      
      <h3 style={{ fontWeight: "bold", color: "red" }}>Logs:</h3>
      {errors.map((e, i) => <div key={i} style={{ marginBottom: 4, background: "#f5f5f5", padding: 4 }}>{e}</div>)}

      <h3 style={{ fontWeight: "bold", marginTop: 16 }}>venues ({venues.length}):</h3>
      <pre style={{ overflow: "auto", background: "#f0f0f0", padding: 8 }}>
        {JSON.stringify(venues, null, 2)}
      </pre>

      <h3 style={{ fontWeight: "bold", marginTop: 16 }}>venue_halls ({halls.length}):</h3>
      <pre style={{ overflow: "auto", background: "#f0f0f0", padding: 8 }}>
        {JSON.stringify(halls, null, 2)}
      </pre>

      <h3 style={{ fontWeight: "bold", marginTop: 16 }}>venue_special_points ({points.length}):</h3>
      <pre style={{ overflow: "auto", background: "#f0f0f0", padding: 8 }}>
        {JSON.stringify(points, null, 2)}
      </pre>
    </div>
  );
};

export default VenueDebug;
