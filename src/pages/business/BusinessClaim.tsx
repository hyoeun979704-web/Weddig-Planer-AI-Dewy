import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Check } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { confirm } from "@/components/ui/confirm-dialog";

interface PlaceRow {
  place_id: string;
  name: string;
  city: string | null;
  category: string | null;
}

// 기존 등록 업체(주인 없음) 관리권한 요청 — 검색 → 한 번에 신청. 운영자 승인 시 소유권 연결.
const BusinessClaim = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState<Set<string>>(new Set());

  const search = async () => {
    const term = q.trim();
    if (term.length < 2) {
      toast({ title: "두 글자 이상 입력해주세요" });
      return;
    }
    setLoading(true);
    // 공개 read 가능. 아직 주인 없는(owner_user_id null) 업체만 신청 대상.
    const { data, error } = await (supabase as any)
      .from("places")
      .select("place_id,name,city,category,owner_user_id")
      .ilike("name", `%${term}%`)
      .is("owner_user_id", null)
      .limit(20);
    setLoading(false);
    setSearched(true);
    if (error) {
      toast({ title: "검색 실패", description: error.message, variant: "destructive" });
      return;
    }
    setResults((data ?? []) as PlaceRow[]);
  };

  const requestClaim = async (place: PlaceRow) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const ok = await confirm({
      title: `'${place.name}' 관리권한을 요청할까요?`,
      description: "운영자 확인 후 이 업체 페이지를 인수해 직접 관리할 수 있어요.",
      confirmText: "요청",
    });
    if (!ok) return;
    const { data, error } = await (supabase as any).rpc("request_place_claim", { p_place_id: place.place_id });
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) {
      const msg =
        res?.error === "not_approved" ? "기업회원 승인 후 신청할 수 있어요"
        : res?.error === "already_owned" ? "이미 다른 회원이 관리 중인 업체예요"
        : "요청에 실패했어요";
      toast({ title: msg, variant: "destructive" });
      return;
    }
    setRequested((prev) => new Set(prev).add(place.place_id));
    toast({ title: "관리권한을 요청했어요", description: "운영자 확인 후 알려드릴게요." });
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <PageHeader title="기존 업체 관리권한 요청" />
      <main className="p-4 pb-20 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          이미 듀이에 등록된 업체라면, 새로 만들지 말고 <b className="text-foreground">기존 페이지를 검색해 관리권한을 요청</b>하세요.
          운영자 확인 후 그 페이지를 인수해 직접 관리할 수 있어요.
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="업체명 검색"
              className="w-full pl-9 pr-3 h-11 rounded-xl border border-border bg-card text-sm"
            />
          </div>
          <button onClick={search} disabled={loading} className="px-4 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
            {loading ? "검색 중" : "검색"}
          </button>
        </div>

        {searched && results.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            검색 결과가 없어요. 등록된 업체가 없다면 <button onClick={() => navigate("/business/edit")} className="text-primary underline">새 업체로 등록</button>하세요.
          </div>
        )}

        <div className="space-y-2">
          {results.map((p) => {
            const done = requested.has(p.place_id);
            return (
              <div key={p.place_id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{p.name}</p>
                  {p.city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {p.city}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => requestClaim(p)}
                  disabled={done}
                  className={`shrink-0 px-3 h-9 rounded-lg text-xs font-bold ${done ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}`}
                >
                  {done ? <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> 요청됨</span> : "권한 요청"}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default BusinessClaim;
