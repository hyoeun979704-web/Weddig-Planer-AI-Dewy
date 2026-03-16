import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, Image, Star, Save, Plus, Trash2,
  ChevronUp, ChevronDown, AlertCircle, CheckCircle2, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Tab = 'info' | 'advantages' | 'gallery';

interface AdvantageCard {
  id?: string;
  emoji: string;
  title: string;
  description: string;
  sort_order: number;
  isNew?: boolean;
}

interface GalleryImage {
  id?: string;
  image_url: string;
  caption: string;
  sort_order: number;
  isNew?: boolean;
}

interface VendorInfo {
  name: string;
  category_type: string;
  region: string;
  address: string;
  tel: string;
  business_hours: string;
  tagline: string;
  description: string;
  keywords: string;
  amenities: string;
  thumbnail_url: string;
  sns_instagram: string;
  sns_blog: string;
  sns_kakao: string;
}

const STATUS_CONFIG = {
  pending:  { label: '검토 중', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: '승인 완료', icon: CheckCircle2, className: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: '승인 거절', icon: AlertCircle, className: 'bg-red-50 text-red-700 border-red-200' },
};

const EMOJI_PRESETS = ['⭐', '💍', '📸', '🌸', '🎊', '🍽️', '🚗', '💐', '✨', '🎵', '🏆', '💎'];

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { user, businessProfile, isBusinessUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('info');

  // ── 기본 정보 상태 ──────────────────────────────────────────────────
  const [vendorInfo, setVendorInfo] = useState<VendorInfo>({
    name: '', category_type: '', region: '', address: '', tel: '',
    business_hours: '', tagline: '', description: '', keywords: '',
    amenities: '', thumbnail_url: '', sns_instagram: '', sns_blog: '', sns_kakao: '',
  });
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // ── 장점 카드 상태 ──────────────────────────────────────────────────
  const [advantages, setAdvantages] = useState<AdvantageCard[]>([]);
  const [isSavingAdvantages, setIsSavingAdvantages] = useState(false);

  // ── 갤러리 상태 ────────────────────────────────────────────────────
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [isSavingGallery, setIsSavingGallery] = useState(false);

  const vendorId = businessProfile?.vendor_id;
  const status = businessProfile?.verification_status ?? 'pending';
  const statusConfig = STATUS_CONFIG[status];

  // 업체 정보 로드
  const loadVendorData = useCallback(async () => {
    if (!vendorId) return;

    const [vendorRes, advantagesRes, galleryRes] = await Promise.all([
      supabase.from('vendors').select('*').eq('vendor_id', vendorId).single(),
      supabase.from('vendor_advantage_cards').select('*').eq('vendor_id', vendorId).order('sort_order'),
      supabase.from('vendor_gallery_images').select('*').eq('vendor_id', vendorId).order('sort_order'),
    ]);

    if (vendorRes.data) {
      const v = vendorRes.data as Record<string, unknown>;
      const sns = (v.sns_info as Record<string, string> | null) ?? {};
      setVendorInfo({
        name: (v.name as string) ?? '',
        category_type: (v.category_type as string) ?? '',
        region: (v.region as string) ?? '',
        address: (v.address as string) ?? '',
        tel: (v.tel as string) ?? '',
        business_hours: (v.business_hours as string) ?? '',
        tagline: (v.tagline as string) ?? '',
        description: (v.description as string) ?? '',
        keywords: (v.keywords as string) ?? '',
        amenities: (v.amenities as string) ?? '',
        thumbnail_url: (v.thumbnail_url as string) ?? '',
        sns_instagram: sns.instagram ?? '',
        sns_blog: sns.blog ?? '',
        sns_kakao: sns.kakao ?? '',
      });
    }

    if (advantagesRes.data) {
      setAdvantages(advantagesRes.data.map((a) => ({
        id: a.id,
        emoji: a.emoji,
        title: a.title,
        description: a.description ?? '',
        sort_order: a.sort_order,
      })));
    }

    if (galleryRes.data) {
      setGallery(galleryRes.data.map((g) => ({
        id: g.id,
        image_url: g.image_url,
        caption: g.caption ?? '',
        sort_order: g.sort_order,
      })));
    }
  }, [vendorId]);

  useEffect(() => {
    if (!isBusinessUser) {
      navigate('/');
      return;
    }
    if (!businessProfile) {
      navigate('/vendor/setup');
      return;
    }
    loadVendorData();
  }, [isBusinessUser, businessProfile, loadVendorData, navigate]);

  // ── 기본 정보 저장 ──────────────────────────────────────────────────
  const saveVendorInfo = async () => {
    if (!vendorId || !user) return;
    setIsSavingInfo(true);
    try {
      const snsInfo: Record<string, string> = {};
      if (vendorInfo.sns_instagram) snsInfo.instagram = vendorInfo.sns_instagram;
      if (vendorInfo.sns_blog) snsInfo.blog = vendorInfo.sns_blog;
      if (vendorInfo.sns_kakao) snsInfo.kakao = vendorInfo.sns_kakao;

      const { error } = await supabase
        .from('vendors')
        .update({
          name: vendorInfo.name,
          region: vendorInfo.region || null,
          address: vendorInfo.address,
          tel: vendorInfo.tel,
          business_hours: vendorInfo.business_hours || null,
          tagline: vendorInfo.tagline || null,
          description: vendorInfo.description || null,
          keywords: vendorInfo.keywords || null,
          amenities: vendorInfo.amenities || null,
          thumbnail_url: vendorInfo.thumbnail_url || null,
          sns_info: Object.keys(snsInfo).length > 0 ? snsInfo : null,
        } as Record<string, unknown>)
        .eq('vendor_id', vendorId);

      if (error) throw error;
      toast.success("기본 정보가 저장되었습니다");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다");
    } finally {
      setIsSavingInfo(false);
    }
  };

  // ── 장점 카드 저장 ──────────────────────────────────────────────────
  const saveAdvantages = async () => {
    if (!vendorId) return;
    setIsSavingAdvantages(true);
    try {
      // 기존 전체 삭제 후 재삽입 (단순 upsert 전략)
      const existingIds = advantages.filter(a => a.id && !a.isNew).map(a => a.id!);
      const allExisting = await supabase
        .from('vendor_advantage_cards')
        .select('id')
        .eq('vendor_id', vendorId);

      const toDelete = (allExisting.data ?? [])
        .filter(r => !existingIds.includes(r.id))
        .map(r => r.id);

      if (toDelete.length > 0) {
        await supabase.from('vendor_advantage_cards').delete().in('id', toDelete);
      }

      for (const [i, card] of advantages.entries()) {
        if (card.isNew || !card.id) {
          await supabase.from('vendor_advantage_cards').insert({
            vendor_id: vendorId,
            emoji: card.emoji,
            title: card.title,
            description: card.description || null,
            sort_order: i,
          });
        } else {
          await supabase.from('vendor_advantage_cards').update({
            emoji: card.emoji,
            title: card.title,
            description: card.description || null,
            sort_order: i,
          }).eq('id', card.id);
        }
      }

      await loadVendorData();
      toast.success("장점 카드가 저장되었습니다");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다");
    } finally {
      setIsSavingAdvantages(false);
    }
  };

  // ── 갤러리 저장 ────────────────────────────────────────────────────
  const saveGallery = async () => {
    if (!vendorId) return;
    setIsSavingGallery(true);
    try {
      const existingIds = gallery.filter(g => g.id && !g.isNew).map(g => g.id!);
      const allExisting = await supabase
        .from('vendor_gallery_images')
        .select('id')
        .eq('vendor_id', vendorId);

      const toDelete = (allExisting.data ?? [])
        .filter(r => !existingIds.includes(r.id))
        .map(r => r.id);

      if (toDelete.length > 0) {
        await supabase.from('vendor_gallery_images').delete().in('id', toDelete);
      }

      for (const [i, img] of gallery.entries()) {
        if (!img.image_url.trim()) continue;
        if (img.isNew || !img.id) {
          await supabase.from('vendor_gallery_images').insert({
            vendor_id: vendorId,
            image_url: img.image_url,
            caption: img.caption || null,
            sort_order: i,
          });
        } else {
          await supabase.from('vendor_gallery_images').update({
            image_url: img.image_url,
            caption: img.caption || null,
            sort_order: i,
          }).eq('id', img.id);
        }
      }

      await loadVendorData();
      toast.success("갤러리가 저장되었습니다");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다");
    } finally {
      setIsSavingGallery(false);
    }
  };

  // ── 장점 카드 조작 ──────────────────────────────────────────────────
  const addAdvantage = () => {
    if (advantages.length >= 6) {
      toast.error("장점 카드는 최대 6개까지 등록할 수 있습니다");
      return;
    }
    setAdvantages(prev => [...prev, {
      emoji: '⭐', title: '', description: '', sort_order: prev.length, isNew: true
    }]);
  };

  const removeAdvantage = (index: number) => {
    setAdvantages(prev => prev.filter((_, i) => i !== index));
  };

  const moveAdvantage = (index: number, dir: 'up' | 'down') => {
    setAdvantages(prev => {
      const arr = [...prev];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  };

  // ── 갤러리 조작 ────────────────────────────────────────────────────
  const addGalleryImage = () => {
    if (gallery.length >= 10) {
      toast.error("갤러리는 최대 10개까지 등록할 수 있습니다");
      return;
    }
    setGallery(prev => [...prev, {
      image_url: '', caption: '', sort_order: prev.length, isNew: true
    }]);
  };

  const removeGalleryImage = (index: number) => {
    setGallery(prev => prev.filter((_, i) => i !== index));
  };

  if (!businessProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => navigate('/mypage')} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-lg pr-10">업체 관리</h1>
        </div>
      </header>

      {/* 인증 상태 배너 */}
      <div className={`mx-4 mt-3 flex items-center gap-2 px-4 py-3 rounded-xl border ${statusConfig.className}`}>
        <statusConfig.icon className="w-4 h-4 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">{statusConfig.label}</p>
          {status === 'pending' && (
            <p className="text-xs opacity-75 mt-0.5">검토 중에도 정보를 미리 입력하실 수 있습니다</p>
          )}
          {status === 'rejected' && businessProfile.rejection_reason && (
            <p className="text-xs opacity-75 mt-0.5">사유: {businessProfile.rejection_reason}</p>
          )}
        </div>
        <span className="text-xs font-medium opacity-60">{businessProfile.business_name}</span>
      </div>

      {/* 탭 */}
      <div className="flex mx-4 mt-3 bg-muted rounded-xl p-1 gap-1">
        {[
          { key: 'info' as Tab, label: '기본 정보', icon: Building2 },
          { key: 'advantages' as Tab, label: '장점 카드', icon: Star },
          { key: 'gallery' as Tab, label: '포토 갤러리', icon: Image },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all
              ${activeTab === key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 pb-24 space-y-4">

        {/* ═══════════════════════════════════════
            탭 1: 기본 정보
        ═══════════════════════════════════════ */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">업체 기본 정보</p>

              <Field label="업체명" required>
                <Input value={vendorInfo.name} onChange={(e) => setVendorInfo(p => ({ ...p, name: e.target.value }))} placeholder="업체명" />
              </Field>

              <Field label="한 줄 소개 (태그라인)">
                <Input value={vendorInfo.tagline} onChange={(e) => setVendorInfo(p => ({ ...p, tagline: e.target.value }))} placeholder="예: 강남 최고의 웨딩홀" maxLength={40} />
                <p className="text-xs text-muted-foreground text-right">{vendorInfo.tagline.length}/40</p>
              </Field>

              <Field label="업체 상세 소개">
                <Textarea
                  value={vendorInfo.description}
                  onChange={(e) => setVendorInfo(p => ({ ...p, description: e.target.value }))}
                  placeholder="업체의 특징, 서비스, 역사 등을 자세히 소개해주세요"
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">{vendorInfo.description.length}/500</p>
              </Field>

              <Field label="썸네일 이미지 URL">
                <Input
                  value={vendorInfo.thumbnail_url}
                  onChange={(e) => setVendorInfo(p => ({ ...p, thumbnail_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  type="url"
                />
                {vendorInfo.thumbnail_url && (
                  <img src={vendorInfo.thumbnail_url} alt="thumbnail preview" className="mt-2 w-full h-40 object-cover rounded-xl border border-border" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                )}
              </Field>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">연락처 및 위치</p>

              <Field label="지역">
                <Input value={vendorInfo.region} onChange={(e) => setVendorInfo(p => ({ ...p, region: e.target.value }))} placeholder="서울 강남구" />
              </Field>

              <Field label="주소" required>
                <Input value={vendorInfo.address} onChange={(e) => setVendorInfo(p => ({ ...p, address: e.target.value }))} placeholder="서울시 강남구 테헤란로 123" />
              </Field>

              <Field label="전화번호" required>
                <Input value={vendorInfo.tel} onChange={(e) => setVendorInfo(p => ({ ...p, tel: e.target.value }))} placeholder="02-1234-5678" type="tel" />
              </Field>

              <Field label="영업시간">
                <Input value={vendorInfo.business_hours} onChange={(e) => setVendorInfo(p => ({ ...p, business_hours: e.target.value }))} placeholder="평일 09:00~18:00 / 주말 10:00~17:00" />
              </Field>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">키워드 & 편의시설</p>

              <Field label="검색 키워드" hint="쉼표로 구분, 최대 10개">
                <Input value={vendorInfo.keywords} onChange={(e) => setVendorInfo(p => ({ ...p, keywords: e.target.value }))} placeholder="예: 야외정원, 소규모, 한식뷔페" />
              </Field>

              <Field label="편의시설" hint="쉼표로 구분">
                <Input value={vendorInfo.amenities} onChange={(e) => setVendorInfo(p => ({ ...p, amenities: e.target.value }))} placeholder="예: 주차 200대, 수유실, 장애인 화장실" />
              </Field>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">SNS 링크</p>
              <Field label="Instagram">
                <Input value={vendorInfo.sns_instagram} onChange={(e) => setVendorInfo(p => ({ ...p, sns_instagram: e.target.value }))} placeholder="https://instagram.com/..." type="url" />
              </Field>
              <Field label="블로그">
                <Input value={vendorInfo.sns_blog} onChange={(e) => setVendorInfo(p => ({ ...p, sns_blog: e.target.value }))} placeholder="https://blog.naver.com/..." type="url" />
              </Field>
              <Field label="카카오채널">
                <Input value={vendorInfo.sns_kakao} onChange={(e) => setVendorInfo(p => ({ ...p, sns_kakao: e.target.value }))} placeholder="https://pf.kakao.com/..." type="url" />
              </Field>
            </div>

            <Button className="w-full h-12 font-semibold" onClick={saveVendorInfo} disabled={isSavingInfo}>
              <Save className="w-4 h-4 mr-2" />
              {isSavingInfo ? "저장 중..." : "기본 정보 저장"}
            </Button>
          </div>
        )}

        {/* ═══════════════════════════════════════
            탭 2: 장점 카드
        ═══════════════════════════════════════ */}
        {activeTab === 'advantages' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">최대 6개 · 고객에게 업체 장점을 어필하세요</p>
              <span className="text-xs font-medium text-primary">{advantages.length}/6</span>
            </div>

            {advantages.map((card, i) => (
              <div key={card.id ?? `new-${i}`} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">카드 {i + 1}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveAdvantage(i, 'up')} disabled={i === 0} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveAdvantage(i, 'down')} disabled={i === advantages.length - 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeAdvantage(i)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 이모지 선택 */}
                <div>
                  <Label className="text-xs">이모지</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {EMOJI_PRESETS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAdvantages(prev => prev.map((c, idx) => idx === i ? { ...c, emoji } : c))}
                        className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center transition-all
                          ${card.emoji === emoji ? 'bg-primary/20 ring-1 ring-primary' : 'bg-muted hover:bg-primary/10'}`}
                      >
                        {emoji}
                      </button>
                    ))}
                    <Input
                      value={card.emoji}
                      onChange={(e) => setAdvantages(prev => prev.map((c, idx) => idx === i ? { ...c, emoji: e.target.value } : c))}
                      className="w-12 h-8 text-center text-lg p-0"
                      maxLength={2}
                    />
                  </div>
                </div>

                <Field label="제목" required>
                  <Input
                    value={card.title}
                    onChange={(e) => setAdvantages(prev => prev.map((c, idx) => idx === i ? { ...c, title: e.target.value } : c))}
                    placeholder="예: 최대 500명 수용 가능"
                    maxLength={30}
                  />
                </Field>

                <Field label="설명">
                  <Textarea
                    value={card.description}
                    onChange={(e) => setAdvantages(prev => prev.map((c, idx) => idx === i ? { ...c, description: e.target.value } : c))}
                    placeholder="장점에 대한 간략한 설명"
                    rows={2}
                    maxLength={100}
                  />
                </Field>

                {/* 미리보기 */}
                <div className="bg-primary/5 rounded-xl p-3 flex items-start gap-3">
                  <span className="text-2xl">{card.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{card.title || '제목 미입력'}</p>
                    {card.description && <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>}
                  </div>
                </div>
              </div>
            ))}

            {advantages.length < 6 && (
              <button
                type="button"
                onClick={addAdvantage}
                className="w-full h-14 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">장점 카드 추가</span>
              </button>
            )}

            <Button className="w-full h-12 font-semibold" onClick={saveAdvantages} disabled={isSavingAdvantages}>
              <Save className="w-4 h-4 mr-2" />
              {isSavingAdvantages ? "저장 중..." : "장점 카드 저장"}
            </Button>
          </div>
        )}

        {/* ═══════════════════════════════════════
            탭 3: 포토 갤러리
        ═══════════════════════════════════════ */}
        {activeTab === 'gallery' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">최대 10개 · 이미지 URL을 입력하세요</p>
              <span className="text-xs font-medium text-primary">{gallery.length}/10</span>
            </div>

            {gallery.map((img, i) => (
              <div key={img.id ?? `new-${i}`} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">이미지 {i + 1}</span>
                  <button onClick={() => removeGalleryImage(i)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <Field label="이미지 URL" required>
                  <Input
                    value={img.image_url}
                    onChange={(e) => setGallery(prev => prev.map((g, idx) => idx === i ? { ...g, image_url: e.target.value } : g))}
                    placeholder="https://example.com/photo.jpg"
                    type="url"
                  />
                </Field>

                {img.image_url && (
                  <img
                    src={img.image_url}
                    alt={`gallery ${i + 1}`}
                    className="w-full h-40 object-cover rounded-xl border border-border"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                  />
                )}

                <Field label="사진 설명 (캡션)">
                  <Input
                    value={img.caption}
                    onChange={(e) => setGallery(prev => prev.map((g, idx) => idx === i ? { ...g, caption: e.target.value } : g))}
                    placeholder="예: 그랜드 홀 전경"
                    maxLength={50}
                  />
                </Field>
              </div>
            ))}

            {gallery.length < 10 && (
              <button
                type="button"
                onClick={addGalleryImage}
                className="w-full h-14 border-2 border-dashed border-border rounded-2xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">이미지 추가</span>
              </button>
            )}

            <Button className="w-full h-12 font-semibold" onClick={saveGallery} disabled={isSavingGallery}>
              <Save className="w-4 h-4 mr-2" />
              {isSavingGallery ? "저장 중..." : "갤러리 저장"}
            </Button>

            {vendorId && (
              <button
                type="button"
                onClick={() => navigate(`/vendor/${vendorId}`)}
                className="w-full h-10 text-sm text-muted-foreground border border-border rounded-xl hover:border-primary hover:text-primary transition-colors"
              >
                업체 상세페이지 미리보기 →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 공통 필드 래퍼
function Field({ label, children, required, hint }: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {hint && <span className="ml-1 text-muted-foreground font-normal">({hint})</span>}
      </Label>
      {children}
    </div>
  );
}

export default VendorDashboard;
