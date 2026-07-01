import { useQuery } from "@tanstack/react-query";
import { Armchair, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGuestList } from "@/hooks/useGuestList";
import { useWeddingSchedule } from "@/hooks/useWeddingSchedule";
import { computeSeatingDraft } from "@/lib/seatingDraft";

interface HallStructure {
  tableCount: number | null;
  seatsPerTable: number | null;
}

/**
 * 좌석배치 자동 초안 미리보기(B2 안전 1차) — 하객 명단의 관계(side·relationship)로 테이블 초안을
 * 계산해 보여준다. 저장·드래그 편집(seating_assignments)은 데이터가 쌓인 뒤로 이월(로드맵).
 * 빈 데이터 폴백: 참석 확정 하객이 없으면 안내만(빈 캔버스/ dead-end 금지). 명단 자체가 0이면
 * 상위 페이지의 빈 상태가 담당하므로 렌더하지 않는다.
 */
const SeatingDraftPreview = () => {
  const { items } = useGuestList();
  const { weddingSettings } = useWeddingSchedule();
  const venueId = weddingSettings.wedding_venue_place_id ?? null;

  // 내 식장 홀 구조(table_count·seats_per_table) — 없으면 기본값 가정으로 계산.
  const { data: hall } = useQuery<HallStructure>({
    queryKey: ["hall-structure", venueId],
    enabled: !!venueId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("place_wedding_halls")
        .select("table_count, seats_per_table")
        .eq("place_id", venueId)
        .maybeSingle();
      if (error) throw error;
      return {
        tableCount: data?.table_count ?? null,
        seatsPerTable: data?.seats_per_table ?? null,
      };
    },
  });

  if (items.length === 0) return null; // 명단 0 → 상위 빈 상태가 담당

  const draft = computeSeatingDraft(items, {
    tableCount: hall?.tableCount ?? null,
    seatsPerTable: hall?.seatsPerTable ?? null,
  });

  return (
    <section className="px-4 pb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Armchair className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">좌석 배치 초안</h2>
      </div>

      {draft.tables.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-[13px] text-muted-foreground">
            참석 확정 하객이 생기면 관계별로 테이블 배치 초안을 자동으로 만들어드려요.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> 참석 {draft.totalHeads}명 · {draft.tables.length}테이블
            </span>
            <span>테이블당 {draft.seatsPerTable}석{draft.seatsAssumed ? "(가정)" : ""}</span>
          </div>

          {draft.seatsAssumed && (
            <p className="text-[11px] text-muted-foreground">
              식장 테이블 정보가 없어 {draft.seatsPerTable}인석으로 가정했어요. 식장 정보가 등록되면 실제 좌석수로 계산돼요.
            </p>
          )}
          {draft.tableCountCapped && (
            <p className="text-[11px] text-amber-600">
              식장 테이블 수({hall?.tableCount}개)를 초과해 {draft.unseatedHeads}명은 아직 배치되지 않았어요.
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {draft.tables.map((t) => (
              <div key={t.index} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[12px] font-bold text-foreground">{t.label}</p>
                  <span className="text-[10px] text-muted-foreground">{t.heads}명</span>
                </div>
                <p className="text-[11px] text-primary font-medium mb-1 truncate">{t.groupLabel}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-3">
                  {t.guests.map((g) => g.name).join(", ")}
                </p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground/80">
            관계 기반 자동 초안이에요. 실제 배치는 식장과 확인해 조정하세요.
          </p>
        </div>
      )}
    </section>
  );
};

export default SeatingDraftPreview;
