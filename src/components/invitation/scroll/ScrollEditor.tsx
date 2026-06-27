import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus, Trash2, ImagePlus, Eye, EyeOff, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { computeInvitationPrice } from "@/lib/invitation/computePrice";
import TropicalGreenScroll from "@/components/invitation/scroll/TropicalGreenScroll";
import {
  SCROLL_SEED_DATA,
  type ScrollAccount,
  type ScrollInvitationData,
  type ScrollStoryItem,
  type ScrollTheme,
} from "@/lib/invitation/scrollTypes";

/**
 * 인터랙티브 스크롤 청첩장 전용 편집기.
 *
 * 슬롯-캔버스 위저드(WizardCombined)·스튜디오(Konva)로는 이 템플릿을 편집할 수
 * 없으므로, ScrollInvitationData 계약을 폼으로 직접 편집한다. 사진은 기존
 * invitation-uploads 버킷에 업로드(편집 중 24h signed URL, 발행 시 1년 signed URL).
 *
 * InvitationFlow(생성)·InvitationStudio(편집) 양쪽에서 동일하게 쓰인다.
 */

const BUCKET = "invitation-uploads";
const GALLERY_MAX = 9;
const PREVIEW_TTL = 60 * 60 * 24; // 24h (편집 프리뷰)
const PUBLISH_TTL = 60 * 60 * 24 * 365; // 1년 (발행 viewer)

export interface ScrollEditorTemplate {
  id: string;
  name: string;
  price_hearts: number;
  format?: string;
}

export interface ScrollPaths {
  cover?: string;
  gallery: string[]; // index 대응
  story: string[]; // data.story index 대응
}

interface ScrollEditorProps {
  template: ScrollEditorTemplate;
  invitationId?: string | null;
  initialData?: ScrollInvitationData | null;
  initialPaths?: ScrollPaths | null;
  /** 발행 완료 시 share URL */
  onPublished?: (url: string) => void;
}

const emptyPaths: ScrollPaths = { gallery: [], story: [] };

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export default function ScrollEditor({
  template,
  invitationId: invitationIdProp,
  initialData,
  initialPaths,
  onPublished,
}: ScrollEditorProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<ScrollInvitationData>(() =>
    initialData ? { ...clone(SCROLL_SEED_DATA), ...clone(initialData) } : clone(SCROLL_SEED_DATA),
  );
  const [paths, setPaths] = useState<ScrollPaths>(() =>
    initialPaths ? { ...emptyPaths, ...clone(initialPaths) } : clone(emptyPaths),
  );
  const [invitationId, setInvitationId] = useState<string | null>(invitationIdProp ?? null);
  const [hearts, setHearts] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const update = useCallback((patch: Partial<ScrollInvitationData>) => {
    setData((d) => ({ ...d, ...patch }));
  }, []);

  // ── 하트 잔액 ──
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: row } = await (supabase as any)
        .from("user_hearts")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      setHearts(row?.balance ?? 0);
    })();
  }, [user]);

  // ── 편집 진입 시 저장된 storage path 로 프리뷰 signed URL 재발급
  //    (draft 의 24h URL 이 만료됐을 수 있으므로 항상 새로 서명) ──
  const refreshedRef = useRef(false);
  useEffect(() => {
    if (refreshedRef.current) return;
    if (!initialPaths) return;
    refreshedRef.current = true;
    (async () => {
      const next = clone(data);
      if (initialPaths.cover) {
        const u = await signUrl(initialPaths.cover, PREVIEW_TTL);
        if (u) next.cover_image_url = u;
      }
      if (initialPaths.gallery?.length) {
        const urls = await Promise.all(
          initialPaths.gallery.map((p) => (p ? signUrl(p, PREVIEW_TTL) : Promise.resolve(""))),
        );
        next.gallery = urls.filter(Boolean) as string[];
      }
      if (initialPaths.story?.length && next.story) {
        for (let i = 0; i < next.story.length; i++) {
          const p = initialPaths.story[i];
          if (p) {
            const u = await signUrl(p, PREVIEW_TTL);
            if (u) next.story[i].image_url = u;
          }
        }
      }
      setData(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPaths]);

  async function signUrl(path: string, ttl: number): Promise<string> {
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttl);
    return signed?.signedUrl ?? "";
  }

  async function uploadFile(file: File): Promise<{ path: string; url: string } | null> {
    if (!user) {
      toast({ title: "로그인이 필요해요" });
      return null;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: `${file.name} 이 너무 커요 (20MB 초과)` });
      return null;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "이미지 파일만 올릴 수 있어요" });
      return null;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      toast({ title: "업로드 실패", description: error.message, variant: "destructive" });
      return null;
    }
    const url = await signUrl(path, PREVIEW_TTL);
    return { path, url };
  }

  // ── 커버 ──
  const coverInput = useRef<HTMLInputElement>(null);
  const onCoverSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const up = await uploadFile(file);
    setUploading(false);
    if (!up) return;
    update({ cover_image_url: up.url });
    setPaths((p) => ({ ...p, cover: up.path }));
  };

  // ── 갤러리 ──
  const galleryInput = useRef<HTMLInputElement>(null);
  const onGallerySelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const remaining = GALLERY_MAX - (data.gallery?.length ?? 0);
    if (remaining <= 0) {
      toast({ title: `갤러리는 최대 ${GALLERY_MAX}장이에요` });
      return;
    }
    setUploading(true);
    for (const file of files.slice(0, remaining)) {
      const up = await uploadFile(file);
      if (up) {
        setData((d) => ({ ...d, gallery: [...(d.gallery ?? []), up.url] }));
        setPaths((p) => ({ ...p, gallery: [...p.gallery, up.path] }));
      }
    }
    setUploading(false);
  };
  const removeGallery = (idx: number) => {
    setData((d) => ({ ...d, gallery: (d.gallery ?? []).filter((_, i) => i !== idx) }));
    setPaths((p) => ({ ...p, gallery: p.gallery.filter((_, i) => i !== idx) }));
  };

  // ── 스토리 사진 ──
  const storyInputRef = useRef<HTMLInputElement>(null);
  const storyTargetRef = useRef<number>(-1);
  const onStorySelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const idx = storyTargetRef.current;
    if (!file || idx < 0) return;
    setUploading(true);
    const up = await uploadFile(file);
    setUploading(false);
    if (!up) return;
    setData((d) => {
      const story = clone(d.story ?? []);
      if (story[idx]) story[idx].image_url = up.url;
      return { ...d, story };
    });
    setPaths((p) => {
      const story = [...p.story];
      story[idx] = up.path;
      return { ...p, story };
    });
  };

  const updateStory = (idx: number, patch: Partial<ScrollStoryItem>) => {
    setData((d) => {
      const story = clone(d.story ?? []);
      story[idx] = { ...story[idx], ...patch };
      return { ...d, story };
    });
  };

  // ── 계좌 ──
  const updateAccount = (side: "groom" | "bride", idx: number, patch: Partial<ScrollAccount>) => {
    setData((d) => {
      const accounts = clone(d.accounts ?? {});
      const list = [...(accounts[side] ?? [])];
      list[idx] = { ...list[idx], ...patch };
      accounts[side] = list;
      return { ...d, accounts };
    });
  };
  const addAccount = (side: "groom" | "bride") => {
    setData((d) => {
      const accounts = clone(d.accounts ?? {});
      accounts[side] = [...(accounts[side] ?? []), { role: "", name: "", bank: "", num: "" }];
      return { ...d, accounts };
    });
  };
  const removeAccount = (side: "groom" | "bride", idx: number) => {
    setData((d) => {
      const accounts = clone(d.accounts ?? {});
      accounts[side] = (accounts[side] ?? []).filter((_, i) => i !== idx);
      return { ...d, accounts };
    });
  };

  // ── 저장(draft) ──
  const buildLayoutMeta = () => ({ scrollPaths: paths });

  const saveRow = async (status?: "draft"): Promise<string | null> => {
    if (!user) {
      toast({ title: "로그인이 필요해요" });
      return null;
    }
    const payload: Record<string, unknown> = {
      user_id: user.id,
      template_id: template.id,
      user_data: data,
      layout: buildLayoutMeta(),
    };
    if (invitationId) {
      const { error } = await (supabase as any)
        .from("invitations")
        .update(payload)
        .eq("id", invitationId);
      if (error) {
        toast({ title: "저장 실패", description: error.message, variant: "destructive" });
        return null;
      }
      return invitationId;
    }
    const { data: row, error } = await (supabase as any)
      .from("invitations")
      .insert({ ...payload, status: status ?? "draft" })
      .select("id")
      .single();
    if (error || !row?.id) {
      toast({ title: "저장 실패", description: error?.message, variant: "destructive" });
      return null;
    }
    setInvitationId(row.id);
    return row.id;
  };

  const handleSaveDraft = async () => {
    const id = await saveRow("draft");
    if (id) toast({ title: "임시저장 완료" });
  };

  // ── 발행 ──
  const handlePublish = async () => {
    if (!user) {
      toast({ title: "로그인이 필요해요" });
      navigate("/auth");
      return;
    }
    if (!data.groom?.name?.trim() || !data.bride?.name?.trim()) {
      toast({ title: "신랑·신부 이름을 입력해주세요" });
      return;
    }
    if (!data.wedding_at) {
      toast({ title: "예식 일시를 입력해주세요" });
      return;
    }
    setPublishing(true);
    try {
      // 1) 먼저 현재 내용 저장(행 확보)
      const id = await saveRow("draft");
      if (!id) {
        setPublishing(false);
        return;
      }

      // 2) 이미 발행된 행인지 확인 — 발행 전환 시에만 하트 차감(재발행 무료)
      const { data: cur } = await (supabase as any)
        .from("invitations")
        .select("status")
        .eq("id", id)
        .single();
      const alreadyPublished = cur?.status === "published";

      if (!alreadyPublished) {
        const { count: priorCount } = await (supabase as any)
          .from("invitations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "published");
        const isFirstUse = (priorCount ?? 0) === 0;
        const charge = computeInvitationPrice(template.price_hearts, { firstUse: isFirstUse });
        if (charge > 0) {
          if ((hearts ?? 0) < charge) {
            toast({
              title: "하트가 부족해요",
              description: `발행에 ${charge} 하트가 필요해요. 현재 ${hearts ?? 0}하트. 작성한 내용은 저장돼 있어요.`,
              variant: "destructive",
              action: { label: "충전하기", onClick: () => navigate("/points") },
            });
            setPublishing(false);
            return;
          }
          const { data: spendData, error: spendError } = await (supabase as any).rpc("spend_hearts", {
            p_user_id: user.id,
            p_amount: charge,
            p_reason: "invitation_publish",
            p_ref_id: id,
          });
          const spendRow = Array.isArray(spendData) ? spendData[0] : spendData;
          if (spendError || !spendRow?.success) {
            toast({
              title: spendError ? "하트 차감 실패" : "하트가 부족해요",
              description: spendError ? spendError.message : spendRow?.message ?? "",
              variant: "destructive",
            });
            setPublishing(false);
            return;
          }
          setHearts((h) => (h ?? 0) - charge);
        }
      }

      // 3) 사진을 1년 signed URL 로 재서명해 user_data 에 박아 저장(공개 viewer 용)
      const publishData = clone(data);
      if (paths.cover) {
        const u = await signUrl(paths.cover, PUBLISH_TTL);
        if (u) publishData.cover_image_url = u;
      }
      if (paths.gallery.length) {
        const urls = await Promise.all(paths.gallery.map((p) => (p ? signUrl(p, PUBLISH_TTL) : Promise.resolve(""))));
        publishData.gallery = urls.filter(Boolean) as string[];
      }
      if (paths.story.length && publishData.story) {
        for (let i = 0; i < publishData.story.length; i++) {
          if (paths.story[i]) {
            const u = await signUrl(paths.story[i], PUBLISH_TTL);
            if (u) publishData.story[i].image_url = u;
          }
        }
      }
      const { error: saveErr } = await (supabase as any)
        .from("invitations")
        .update({ user_data: publishData, layout: buildLayoutMeta() })
        .eq("id", id);
      if (saveErr) throw saveErr;

      // 4) slug 발급
      const { data: pub, error: pubErr } = await (supabase as any).rpc("publish_invitation", {
        p_invitation_id: id,
      });
      if (pubErr) throw pubErr;
      const pubRow = Array.isArray(pub) ? pub[0] : pub;
      if (!pubRow?.share_slug) throw new Error("slug 발급 실패");

      const url = `${window.location.origin}/i/${pubRow.share_slug}`;
      setShareUrl(url);
      onPublished?.(url);
      toast({ title: "청첩장이 발행됐어요!" });
    } catch (e) {
      toast({
        title: "발행 실패",
        description: e instanceof Error ? e.message : "오류",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  // ── 렌더 ──
  const charge = computeInvitationPrice(template.price_hearts, { firstUse: false });

  return (
    <div className="px-5 py-5 space-y-6 pb-40">
      <section>
        <p className="text-[12px] text-muted-foreground mb-1">선택한 디자인</p>
        <p className="text-sm font-semibold text-foreground">{template.name}</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          인터랙티브 모바일 청첩장 · 발행 {charge}하트{template.format === "mobile" ? " (첫 청첩장 반값)" : ""}
        </p>
      </section>

      {/* 테마 */}
      <FormSection title="테마">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { k: "A", label: "유칼립투스" },
              { k: "B", label: "트로피컬 그린" },
              { k: "C", label: "모던 미니멀" },
            ] as { k: ScrollTheme; label: string }[]
          ).map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => update({ theme: t.k })}
              className={`h-11 rounded-md text-[12px] font-medium border transition-colors ${
                (data.theme ?? "B") === t.k
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-input"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </FormSection>

      {/* 신랑 */}
      <FormSection title="신랑">
        <Person
          person={data.groom ?? {}}
          onChange={(p) => update({ groom: { ...data.groom, ...p } })}
        />
      </FormSection>

      {/* 신부 */}
      <FormSection title="신부">
        <Person
          person={data.bride ?? {}}
          onChange={(p) => update({ bride: { ...data.bride, ...p } })}
        />
      </FormSection>

      {/* 인사말 */}
      <FormSection title="인사말">
        <Labeled label="제목">
          <Input
            value={data.greeting?.title ?? ""}
            onChange={(e) => update({ greeting: { ...data.greeting, title: e.target.value } })}
            placeholder="초대합니다"
          />
        </Labeled>
        <Labeled label="본문">
          <Textarea
            rows={6}
            value={data.greeting?.body ?? ""}
            onChange={(e) => update({ greeting: { ...data.greeting, body: e.target.value } })}
            placeholder="초대 인사말을 입력해주세요"
          />
        </Labeled>
      </FormSection>

      {/* 예식 정보 */}
      <FormSection title="예식 일시·장소">
        <Labeled label="예식 일시">
          <Input
            type="datetime-local"
            value={data.wedding_at ?? ""}
            onChange={(e) => update({ wedding_at: e.target.value })}
          />
        </Labeled>
        <Labeled label="예식장 이름">
          <Input
            value={data.venue?.name ?? ""}
            onChange={(e) => update({ venue: { ...data.venue, name: e.target.value } })}
            placeholder="OO웨딩홀"
          />
        </Labeled>
        <Labeled label="주소">
          <Input
            value={data.venue?.address ?? ""}
            onChange={(e) => update({ venue: { ...data.venue, address: e.target.value } })}
            placeholder="시/군/구 도로명 주소"
          />
        </Labeled>
        <Labeled label="상세 (층/홀)">
          <Input
            value={data.venue?.detail ?? ""}
            onChange={(e) => update({ venue: { ...data.venue, detail: e.target.value } })}
            placeholder="5층 그레이스홀"
          />
        </Labeled>
        <Labeled label="대중교통 안내">
          <Input
            value={data.venue?.transport ?? ""}
            onChange={(e) => update({ venue: { ...data.venue, transport: e.target.value } })}
            placeholder="OO역 도보 8분 · 버스 12, 24번"
          />
        </Labeled>
        <Labeled label="주차 안내">
          <Input
            value={data.venue?.parking ?? ""}
            onChange={(e) => update({ venue: { ...data.venue, parking: e.target.value } })}
            placeholder="지하 1~4층 · 2시간 무료"
          />
        </Labeled>
      </FormSection>

      {/* 커플 소개 */}
      <FormSection title="커플 소개">
        <Labeled label="신랑 한 줄 소개">
          <Input
            value={data.couple_intro?.groom_blurb ?? ""}
            onChange={(e) => update({ couple_intro: { ...data.couple_intro, groom_blurb: e.target.value } })}
            placeholder="신랑을 한 줄로 소개해주세요"
          />
        </Labeled>
        <Labeled label="신부 한 줄 소개">
          <Input
            value={data.couple_intro?.bride_blurb ?? ""}
            onChange={(e) => update({ couple_intro: { ...data.couple_intro, bride_blurb: e.target.value } })}
            placeholder="신부를 한 줄로 소개해주세요"
          />
        </Labeled>
      </FormSection>

      {/* 커버 사진 */}
      <FormSection title="대표 사진 (커버)">
        <input ref={coverInput} type="file" accept="image/*" className="hidden" onChange={onCoverSelected} />
        {data.cover_image_url ? (
          <div className="relative w-full aspect-[3/4] max-w-[200px] rounded-lg overflow-hidden border border-border">
            <img src={data.cover_image_url} alt="커버" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              className="absolute bottom-2 right-2 text-[11px] px-2 py-1 rounded bg-black/60 text-white"
            >
              변경
            </button>
          </div>
        ) : (
          <UploadButton onClick={() => coverInput.current?.click()} label="커버 사진 올리기" />
        )}
      </FormSection>

      {/* 갤러리 */}
      <FormSection title={`갤러리 (${data.gallery?.length ?? 0}/${GALLERY_MAX})`}>
        <input ref={galleryInput} type="file" accept="image/*" multiple className="hidden" onChange={onGallerySelected} />
        <div className="grid grid-cols-3 gap-2">
          {(data.gallery ?? []).map((url, i) => (
            <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-border">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeGallery(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                aria-label="삭제"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {(data.gallery?.length ?? 0) < GALLERY_MAX && (
            <button
              type="button"
              onClick={() => galleryInput.current?.click()}
              className="aspect-square rounded-md border border-dashed border-border flex items-center justify-center text-muted-foreground"
              aria-label="사진 추가"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
          )}
        </div>
      </FormSection>

      {/* 러브스토리 */}
      <FormSection title="러브스토리 타임라인">
        <input ref={storyInputRef} type="file" accept="image/*" className="hidden" onChange={onStorySelected} />
        <div className="space-y-4">
          {(data.story ?? []).map((s, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    storyTargetRef.current = i;
                    storyInputRef.current?.click();
                  }}
                  className="w-16 h-16 rounded-md border border-dashed border-border flex-shrink-0 overflow-hidden flex items-center justify-center text-muted-foreground"
                >
                  {s.image_url ? (
                    <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                </button>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <Input
                    value={s.year ?? ""}
                    onChange={(e) => updateStory(i, { year: e.target.value })}
                    placeholder="연도 (2018)"
                  />
                  <Input
                    value={s.title ?? ""}
                    onChange={(e) => updateStory(i, { title: e.target.value })}
                    placeholder="제목 (첫 만남)"
                  />
                </div>
              </div>
              <Input
                value={s.tag ?? ""}
                onChange={(e) => updateStory(i, { tag: e.target.value })}
                placeholder="영문 캡션 (First Meet)"
              />
              <Textarea
                rows={2}
                value={s.desc ?? ""}
                onChange={(e) => updateStory(i, { desc: e.target.value })}
                placeholder="설명을 입력해주세요"
              />
            </div>
          ))}
        </div>
      </FormSection>

      {/* 계좌 */}
      <FormSection title="마음 전하실 곳 (계좌)">
        <AccountList side="groom" label="신랑측" list={data.accounts?.groom ?? []} onUpdate={updateAccount} onAdd={addAccount} onRemove={removeAccount} />
        <div className="h-3" />
        <AccountList side="bride" label="신부측" list={data.accounts?.bride ?? []} onUpdate={updateAccount} onAdd={addAccount} onRemove={removeAccount} />
      </FormSection>

      {/* 미리보기 토글 */}
      <div>
        <Button variant="outline" className="w-full" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showPreview ? "미리보기 닫기" : "미리보기 보기"}
        </Button>
        {showPreview && (
          <div className="mt-3 rounded-2xl border border-border overflow-hidden">
            <div className="h-[600px] overflow-y-auto bg-muted/20">
              <TropicalGreenScroll data={data} mode="preview" />
            </div>
          </div>
        )}
      </div>

      {/* 발행/저장 */}
      {shareUrl ? (
        <div className="space-y-3 rounded-2xl border border-border p-4 bg-card">
          <p className="text-sm font-semibold text-foreground">발행 완료 🎉</p>
          <p className="text-[12px] text-muted-foreground break-all">{shareUrl}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(shareUrl);
                toast({ title: "링크 복사됨" });
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              링크 복사
            </Button>
            <Button onClick={() => navigate(shareUrl.replace(window.location.origin, ""))}>
              <Share2 className="w-4 h-4 mr-2" />
              청첩장 보기
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button className="w-full h-12" onClick={handlePublish} disabled={publishing || uploading}>
            {publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {publishing ? "발행 중…" : "청첩장 발행하기"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleSaveDraft} disabled={publishing}>
            임시저장
          </Button>
        </div>
      )}
    </div>
  );
}

// ── 폼 빌딩 블록 ────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Person({
  person,
  onChange,
}: {
  person: { name?: string; father?: string; mother?: string; role_label?: string; phone?: string };
  onChange: (p: Partial<typeof person>) => void;
}) {
  return (
    <div className="space-y-2">
      <Input value={person.name ?? ""} onChange={(e) => onChange({ name: e.target.value })} placeholder="이름" />
      <div className="grid grid-cols-2 gap-2">
        <Input value={person.father ?? ""} onChange={(e) => onChange({ father: e.target.value })} placeholder="아버지 성함" />
        <Input value={person.mother ?? ""} onChange={(e) => onChange({ mother: e.target.value })} placeholder="어머니 성함" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={person.role_label ?? ""} onChange={(e) => onChange({ role_label: e.target.value })} placeholder="관계 (아들/딸)" />
        <Input value={person.phone ?? ""} onChange={(e) => onChange({ phone: e.target.value })} placeholder="연락처" />
      </div>
    </div>
  );
}

function UploadButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full h-12 rounded-md border border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <ImagePlus className="w-4 h-4" />
      {label}
    </button>
  );
}

function AccountList({
  side,
  label,
  list,
  onUpdate,
  onAdd,
  onRemove,
}: {
  side: "groom" | "bride";
  label: string;
  list: ScrollAccount[];
  onUpdate: (side: "groom" | "bride", idx: number, patch: Partial<ScrollAccount>) => void;
  onAdd: (side: "groom" | "bride") => void;
  onRemove: (side: "groom" | "bride", idx: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] font-medium text-foreground">{label}</p>
      {list.map((a, i) => (
        <div key={i} className="rounded-md border border-border p-2.5 space-y-2">
          <div className="flex gap-2">
            <Input value={a.role ?? ""} onChange={(e) => onUpdate(side, i, { role: e.target.value })} placeholder="관계 (신랑/아버지)" />
            <Input value={a.name ?? ""} onChange={(e) => onUpdate(side, i, { name: e.target.value })} placeholder="예금주" />
            <button
              type="button"
              onClick={() => onRemove(side, i)}
              className="w-9 flex-shrink-0 flex items-center justify-center text-muted-foreground"
              aria-label="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <Input value={a.bank ?? ""} onChange={(e) => onUpdate(side, i, { bank: e.target.value })} placeholder="은행" />
            <Input value={a.num ?? ""} onChange={(e) => onUpdate(side, i, { num: e.target.value })} placeholder="계좌번호" />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={() => onAdd(side)}>
        <Plus className="w-4 h-4 mr-1" />
        {label} 계좌 추가
      </Button>
    </div>
  );
}
