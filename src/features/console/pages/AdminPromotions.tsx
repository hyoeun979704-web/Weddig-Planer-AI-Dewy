import { useEffect, useState, useCallback } from "react";
import { Loader2, Megaphone, Plus, Pencil, X, Star } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/features/console/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type Status = "live" | "scheduled" | "ended";
type Audience = "all" | "guest" | "user";

interface PromoRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cta_label: string;
  cta_path: string;
  badge_label: string | null;
  status: string;
  position: number;
  image_url: string | null;
  audience: string | null;
  show_as_popup: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
}

interface Draft {
  slug: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_path: string;
  badge_label: string;
  status: Status;
  position: string;
  image_url: string;
  audience: Audience;
  show_as_popup: boolean;
  starts_at: string;
  ends_at: string;
}

const emptyDraft: Draft = {
  slug: "",
  title: "",
  subtitle: "",
  cta_label: "",
  cta_path: "/events",
  badge_label: "",
  status: "live",
  position: "100",
  image_url: "",
  audience: "all",
  show_as_popup: false,
  starts_at: "",
  ends_at: "",
};

// datetime-local(브라우저 로컬) ↔ ISO 변환. 빈 값은 그대로 빈 문자열.
const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string): string => (v ? new Date(v).toISOString() : "");

/**
 * 운영자 — 이벤트/프로모션 + 홈 진입 팝업 관리.
 * promotional_events 를 작성/수정하고, "진입 팝업으로 노출"을 켜면 홈 첫 진입 시
 * 큰 팝업으로 뜬다(이미지·대상·기간 운영자 제어). 저장은 admin_upsert_promotional_event RPC.
 */
const AdminPromotions = () => {
  const [rows, setRows] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // "new" | slug | null
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promotional_events")
      .select(
        "id, slug, title, subtitle, cta_label, cta_path, badge_label, status, position, image_url, audience, show_as_popup, starts_at, ends_at",
      )
      .order("position", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error("목록을 불러오지 못했어요.");
      return;
    }
    setRows((data ?? []) as PromoRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setDraft(emptyDraft);
    setEditing("new");
  };
  const openEdit = (r: PromoRow) => {
    setDraft({
      slug: r.slug,
      title: r.title ?? "",
      subtitle: r.subtitle ?? "",
      cta_label: r.cta_label ?? "",
      cta_path: r.cta_path ?? "",
      badge_label: r.badge_label ?? "",
      status: (["live", "scheduled", "ended"].includes(r.status) ? r.status : "live") as Status,
      position: String(r.position ?? 100),
      image_url: r.image_url ?? "",
      audience: (["all", "guest", "user"].includes(r.audience ?? "") ? r.audience : "all") as Audience,
      show_as_popup: !!r.show_as_popup,
      starts_at: toLocalInput(r.starts_at),
      ends_at: toLocalInput(r.ends_at),
    });
    setEditing(r.slug);
  };
  const closeForm = () => {
    setEditing(null);
    setDraft(emptyDraft);
  };

  const save = async () => {
    const slug = draft.slug.trim();
    if (!slug || !/^[a-z0-9_-]+$/.test(slug)) {
      toast.error("슬러그는 영문 소문자/숫자/-/_ 만 사용하세요.");
      return;
    }
    if (!draft.title.trim() || !draft.cta_label.trim() || !draft.cta_path.trim()) {
      toast.error("제목·CTA 문구·CTA 경로는 필수예요.");
      return;
    }
    if (draft.show_as_popup && draft.image_url && !/^https?:\/\//.test(draft.image_url.trim())) {
      toast.error("이미지 URL은 http:// 또는 https:// 로 입력하세요.");
      return;
    }
    setSaving(true);
    const payload = {
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim() || null,
      cta_label: draft.cta_label.trim(),
      cta_path: draft.cta_path.trim(),
      badge_label: draft.badge_label.trim() || null,
      status: draft.status,
      position: Number(draft.position) || 100,
      image_url: draft.image_url.trim() || null,
      audience: draft.audience,
      show_as_popup: draft.show_as_popup,
      starts_at: fromLocalInput(draft.starts_at),
      ends_at: fromLocalInput(draft.ends_at),
    };
    const { data, error } = await (supabase as any).rpc("admin_upsert_promotional_event", {
      p_slug: slug,
      p_payload: payload,
    });
    setSaving(false);
    const res = data as { ok?: boolean; error?: string } | null;
    if (error || !res?.ok) {
      toast.error(res?.error === "forbidden" ? "권한이 없어요." : "저장에 실패했어요.");
      return;
    }
    toast.success("저장했어요.");
    closeForm();
    void load();
  };

  // 진입 팝업 노출 빠른 토글(다른 필드 보존 위해 현재 행 값으로 재upsert).
  const togglePopup = async (r: PromoRow) => {
    const { data, error } = await (supabase as any).rpc("admin_upsert_promotional_event", {
      p_slug: r.slug,
      p_payload: {
        title: r.title,
        subtitle: r.subtitle,
        cta_label: r.cta_label,
        cta_path: r.cta_path,
        badge_label: r.badge_label,
        status: r.status,
        position: r.position,
        image_url: r.image_url,
        audience: r.audience ?? "all",
        show_as_popup: !r.show_as_popup,
        starts_at: r.starts_at ?? "",
        ends_at: r.ends_at ?? "",
      },
    });
    const res = data as { ok?: boolean } | null;
    if (error || !res?.ok) {
      toast.error("변경하지 못했어요.");
      return;
    }
    void load();
  };

  const fieldCls = "w-full";

  return (
    <AdminLayout
      title="이벤트 · 진입 팝업"
      description="이벤트/프로모션을 관리하고, 홈 첫 진입 팝업으로 노출할 항목을 지정합니다."
      rightAction={
        editing === null ? (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> 새 이벤트
          </Button>
        ) : undefined
      }
    >
      {editing !== null && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground">{editing === "new" ? "새 이벤트" : "이벤트 수정"}</h3>
            <button onClick={closeForm} aria-label="닫기" className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-muted-foreground col-span-1">
              슬러그(고유 ID)
              <Input
                className={fieldCls}
                placeholder="welcome"
                value={draft.slug}
                disabled={editing !== "new"}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground col-span-1">
              노출 순서(작을수록 먼저)
              <Input
                className={fieldCls}
                type="number"
                value={draft.position}
                onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value }))}
              />
            </label>
          </div>

          <Input
            placeholder="제목 (줄바꿈은 \n 대신 엔터)"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />
          <Textarea
            placeholder="본문 / 부제"
            value={draft.subtitle}
            onChange={(e) => setDraft((d) => ({ ...d, subtitle: e.target.value }))}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="CTA 문구 (예: 지금 시작하기)"
              value={draft.cta_label}
              onChange={(e) => setDraft((d) => ({ ...d, cta_label: e.target.value }))}
            />
            <Input
              placeholder="CTA 경로 (예: /events)"
              value={draft.cta_path}
              onChange={(e) => setDraft((d) => ({ ...d, cta_path: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="배지 문구 (예: 신규 한정)"
              value={draft.badge_label}
              onChange={(e) => setDraft((d) => ({ ...d, badge_label: e.target.value }))}
            />
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as Status }))}
            >
              <option value="live">live (노출)</option>
              <option value="scheduled">scheduled (예정)</option>
              <option value="ended">ended (종료)</option>
            </select>
          </div>

          {/* 진입 팝업 전용 설정 */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={draft.show_as_popup}
                onChange={(e) => setDraft((d) => ({ ...d, show_as_popup: e.target.checked }))}
              />
              <Star className="w-4 h-4 text-primary" /> 홈 진입 팝업으로 노출
            </label>
            {draft.show_as_popup && (
              <>
                <Input
                  placeholder="팝업 이미지 URL (https://... 없으면 그라데이션)"
                  value={draft.image_url}
                  onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    노출 대상
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={draft.audience}
                      onChange={(e) => setDraft((d) => ({ ...d, audience: e.target.value as Audience }))}
                    >
                      <option value="all">전체</option>
                      <option value="guest">비로그인만</option>
                      <option value="user">로그인만</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    시작(선택)
                    <Input
                      type="datetime-local"
                      value={draft.starts_at}
                      onChange={(e) => setDraft((d) => ({ ...d, starts_at: e.target.value }))}
                    />
                  </label>
                  <label className="text-xs font-medium text-muted-foreground">
                    종료(선택)
                    <Input
                      type="datetime-local"
                      value={draft.ends_at}
                      onChange={(e) => setDraft((d) => ({ ...d, ends_at: e.target.value }))}
                    />
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={closeForm}>취소</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">등록된 이벤트가 없어요. "새 이벤트"로 추가하세요.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`rounded-2xl border p-4 ${
                r.status === "live" ? "border-border bg-card" : "border-dashed border-border bg-muted/40 opacity-80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {r.show_as_popup && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary shrink-0">
                        <Star className="w-3 h-3" /> 팝업
                      </span>
                    )}
                    <p className="font-bold text-foreground truncate">{r.title}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                      {r.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground truncate">
                    {r.slug} · CTA {r.cta_label} → {r.cta_path}
                    {r.show_as_popup && ` · 대상 ${r.audience ?? "all"}`}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(r)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted shrink-0"
                  aria-label="수정"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => togglePopup(r)}
                className="mt-2 text-[12px] font-semibold text-primary active:scale-95 transition-transform"
              >
                {r.show_as_popup ? "진입 팝업 끄기" : "진입 팝업으로 노출"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </AdminLayout>
  );
};

export default AdminPromotions;
