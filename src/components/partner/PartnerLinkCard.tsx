import { useState } from "react";
import {
  Heart,
  Copy,
  Check,
  UserPlus,
  Loader2,
  Share2,
  Sparkles,
  Wallet,
  Calendar,
  ChevronRight,
  Unlink,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCoupleLink } from "@/hooks/useCoupleLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type PartnerLinkVariant = "mypage" | "budget" | "schedule";

interface PartnerLinkCardProps {
  variant: PartnerLinkVariant;
  /** Hide the card entirely when there's no logged-in user. Each tab handles
   *  the logged-out CTA differently, so we default to hidden. */
  hideWhenLoggedOut?: boolean;
}

/**
 * Tab-specific copy. Each variant shows the same three states but tunes the
 * value proposition + the linked-state CTA to the surrounding context.
 *
 * Putting copy in one place (rather than three near-duplicate components)
 * keeps the messaging consistent if a future product change wants to swap
 * "분담" → "공동 결제" globally.
 */
const VARIANT_CONFIG: Record<
  PartnerLinkVariant,
  {
    title: string;
    unlinkedSubtitle: string;
    linkedSubtitle: string;
    Icon: typeof Heart;
    benefits: string[];
    linkedCta?: { label: string; href: string };
  }
> = {
  mypage: {
    title: "파트너와 함께 준비해요",
    unlinkedSubtitle: "일정·예산·일기를 둘이서 함께 관리",
    linkedSubtitle: "둘이서 함께 준비 중",
    Icon: Heart,
    benefits: [" 일정 공유", " 분담 관리", " 공유 일기"],
    linkedCta: { label: "공유 일기 보기", href: "/couple-diary" },
  },
  budget: {
    title: "예산을 함께 관리해요",
    unlinkedSubtitle: "양가 분담·잔금 일정도 함께 체크",
    linkedSubtitle: "예산을 함께 관리 중",
    Icon: Wallet,
    benefits: [" 양가 분담", " 잔금 알림 공유", " 합계 한눈에"],
    linkedCta: { label: "분담 시뮬레이션", href: "/budget/split-simulator" },
  },
  schedule: {
    title: "일정을 함께 관리해요",
    unlinkedSubtitle: "체크리스트·D-Day를 둘이서 공유",
    linkedSubtitle: "일정을 함께 관리 중",
    Icon: Calendar,
    benefits: [" 체크리스트 공유", " 공유 일기", " 같이 투표"],
    linkedCta: { label: "공유 일기 보기", href: "/couple-diary" },
  },
};

const PartnerLinkCard = ({ variant, hideWhenLoggedOut = false }: PartnerLinkCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = VARIANT_CONFIG[variant];
  const Icon = config.Icon;

  const {
    coupleLink,
    partnerProfile,
    isLinked,
    settingsSynced,
    isLoading,
    generateInviteCode,
    linkWithCode,
    unlinkCouple,
    resyncSettings,
  } = useCoupleLink();

  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUnlink, setShowUnlink] = useState(false);
  const [showInputField, setShowInputField] = useState(false);

  if (hideWhenLoggedOut && !user) return null;

  const handleGenerateCode = async () => {
    setIsProcessing(true);
    await generateInviteCode();
    setIsProcessing(false);
  };

  const handleLink = async () => {
    if (!inputCode.trim()) return;
    setIsProcessing(true);
    const success = await linkWithCode(inputCode.trim());
    if (success) {
      setInputCode("");
      setShowInputField(false);
    }
    setIsProcessing(false);
  };

  const handleShareOrCopy = async () => {
    const code = coupleLink?.invite_code;
    if (!code) return;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const message = `우리 결혼 준비 같이 해요! Dewy 초대 코드: ${code}\n${url}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Dewy 커플 연결 초대", text: message });
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("초대 메시지를 복사했어요. 카톡에 붙여넣기 하세요");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했어요");
    }
  };

  const handleCopyCode = () => {
    if (!coupleLink?.invite_code) return;
    navigator.clipboard
      .writeText(coupleLink.invite_code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => toast.error("복사에 실패했어요"));
  };

  const handleUnlink = async () => {
    setIsProcessing(true);
    await unlinkCouple();
    setShowUnlink(false);
    setIsProcessing(false);
  };

  const handleResync = async () => {
    setIsProcessing(true);
    await resyncSettings();
    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <div
        data-testid="partner-link-card"
        data-state="loading"
        className="p-4 bg-card rounded-2xl border border-border flex items-center justify-center"
      >
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  // ── Linked: partner connected ────────────────────────────────────────
  if (isLinked && partnerProfile) {
    const partnerName = partnerProfile.display_name || "내 파트너";
    const partnerInitial = partnerName.charAt(0).toUpperCase();

    return (
      <div
        data-testid="partner-link-card"
        data-state="linked"
        className="rounded-2xl bg-gradient-to-br from-pink-50 via-rose-50/60 to-card border border-pink-200/70 dark:from-pink-950/20 dark:via-rose-950/10 dark:to-card dark:border-pink-800/30 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-700 dark:text-pink-300 font-bold">
              {partnerInitial}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center border-2 border-card">
              <Heart className="w-2.5 h-2.5 text-white fill-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-muted-foreground">{config.linkedSubtitle}</p>
            <p className="font-semibold text-foreground truncate">
              {partnerName}
              <span className="text-muted-foreground font-normal text-sm"> 님과 연결됨</span>
            </p>
          </div>
        </div>

        {!settingsSynced && (
          <div className="mt-3 rounded-xl border border-amber-300/70 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[12px] text-amber-800 dark:text-amber-200 leading-snug">
                연결은 됐지만 공유 정보 동기화가 끊겨 있어요. 재동기화하면 일정·예산·일기 공유가 정상 동작해요.
              </p>
            </div>
            <Button
              onClick={handleResync}
              disabled={isProcessing}
              size="sm"
              variant="outline"
              className="mt-2 w-full gap-2 border-amber-300 text-amber-800 dark:text-amber-200"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              재동기화
            </Button>
          </div>
        )}

        {config.linkedCta && (
          <button
            onClick={() => navigate(config.linkedCta!.href)}
            className="mt-3 w-full flex items-center justify-between px-3.5 py-2.5 bg-card rounded-xl border border-pink-200/60 dark:border-pink-800/30 active:scale-[0.99] transition-transform"
          >
            <span className="text-sm font-medium text-foreground">{config.linkedCta.label}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        )}

        {showUnlink ? (
          <div className="flex gap-2 mt-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleUnlink}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "연결 해제"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnlink(false)}
              className="flex-1"
            >
              취소
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowUnlink(true)}
            className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1 hover:text-destructive transition-colors"
          >
            <Unlink className="w-3 h-3" />
            연결 해제
          </button>
        )}
      </div>
    );
  }

  // ── Pending: code generated, waiting for partner ─────────────────────
  if (coupleLink && coupleLink.status === "pending") {
    return (
      <div
        data-testid="partner-link-card"
        data-state="pending"
        className="rounded-2xl bg-card border border-primary/30 p-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="w-4 h-4 text-primary" />
          <h3 className="text-[15px] font-bold text-foreground">파트너의 합류를 기다리는 중</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          아래 6자리 초대 코드를 파트너에게 공유해주세요
        </p>

        <div className="flex gap-2 mb-3">
          <div className="flex-1 px-3 py-3 bg-primary/5 border border-primary/20 rounded-xl text-center font-mono text-xl font-bold tracking-[0.3em] text-primary">
            {coupleLink.invite_code}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyCode}
            className="h-auto w-12"
            title="코드만 복사"
            aria-label="초대 코드 복사"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>

        <Button
          onClick={handleShareOrCopy}
          className="w-full gap-2"
          variant="default"
          aria-label="파트너에게 초대 코드 공유"
        >
          <Share2 className="w-4 h-4" />
          파트너에게 공유하기
        </Button>

        <div className="mt-3 pt-3 border-t border-border">
          {showInputField ? (
            <>
              <p className="text-xs text-muted-foreground mb-2">파트너의 초대 코드를 받았다면 입력하세요</p>
              <div className="flex gap-2">
                <Input
                  value={inputCode}
                  onChange={(e) =>
                    setInputCode(e.target.value.toUpperCase().replace(/\s+/g, ""))
                  }
                  placeholder="6자리 코드"
                  maxLength={6}
                  className="font-mono tracking-widest text-center"
                  aria-label="파트너의 초대 코드"
                />
                <Button onClick={handleLink} disabled={!inputCode.trim() || isProcessing}>
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "연결"}
                </Button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setShowInputField(true)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors w-full text-center"
            >
              파트너가 먼저 코드를 만들었어요 →
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Unlinked: initial state ──────────────────────────────────────────
  return (
    <div
      data-testid="partner-link-card"
      data-state="unlinked"
      className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 p-4"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Icon className={cn("w-5 h-5 text-primary", variant === "mypage" && "fill-primary/30")} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-foreground leading-tight">{config.title}</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
            {config.unlinkedSubtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {config.benefits.map((b) => (
          <span
            key={b}
            className="text-[11px] px-2 py-1 bg-background border border-border rounded-full text-foreground"
          >
            {b}
          </span>
        ))}
      </div>

      <Button
        onClick={handleGenerateCode}
        disabled={isProcessing}
        className="w-full gap-2"
        aria-label="초대 코드 생성"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        초대 코드 만들어 공유하기
      </Button>

      <div className="mt-3 pt-3 border-t border-border">
        {showInputField ? (
          <div className="flex gap-2">
            <Input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
              placeholder="6자리 코드"
              maxLength={6}
              className="font-mono tracking-widest text-center"
              aria-label="파트너의 초대 코드"
            />
            <Button
              onClick={handleLink}
              disabled={!inputCode.trim() || isProcessing}
              variant="outline"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "연결"}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowInputField(true)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors w-full text-center"
          >
            파트너가 먼저 코드를 만들었나요? 코드 입력 →
          </button>
        )}
      </div>
    </div>
  );
};

export default PartnerLinkCard;
