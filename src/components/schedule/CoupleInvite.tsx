import { useState } from "react";
import { Heart, Copy, Check, UserPlus, Unlink, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCoupleLink } from "@/hooks/useCoupleLink";
import { toast } from "sonner";

const CoupleInvite = () => {
  const {
    coupleLink,
    partnerProfile,
    isLinked,
    isLoading,
    generateInviteCode,
    linkWithCode,
    unlinkCouple,
  } = useCoupleLink();

  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUnlink, setShowUnlink] = useState(false);

  const handleGenerateCode = async () => {
    setIsProcessing(true);
    await generateInviteCode();
    setIsProcessing(false);
  };

  const handleLink = async () => {
    if (!inputCode.trim()) return;
    setIsProcessing(true);
    const success = await linkWithCode(inputCode.trim());
    if (success) setInputCode("");
    setIsProcessing(false);
  };

  // Web Share API first; falls back to clipboard when the browser doesn't
  // expose it (desktop Safari/Chrome on http, older Android WebView, etc.).
  // The copy fallback keeps the green-check feedback the user already
  // recognizes from the previous button.
  const handleShareOrCopy = async () => {
    const code = coupleLink?.invite_code;
    if (!code) return;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const message = `우리 결혼 준비 같이 해요! Dewy 초대 코드: ${code}\n${url}`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Dewy 커플 연결 초대",
          text: message,
        });
        return;
      } catch (err) {
        // User dismissed share sheet — fall through to clipboard.
        if ((err as { name?: string })?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("초대 메시지를 복사했어요. 카톡에 붙여넣기 해주세요");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했어요");
    }
  };

  const handleUnlink = async () => {
    setIsProcessing(true);
    await unlinkCouple();
    setShowUnlink(false);
    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-card rounded-2xl border border-border">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // 연결 완료 상태
  if (isLinked && partnerProfile) {
    return (
      <div className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 rounded-2xl border border-pink-200/50 dark:border-pink-800/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
            <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              💕 {partnerProfile.display_name || "내 파트너"}님과 연결됨
            </p>
            <p className="text-xs text-muted-foreground">
              일정과 일기를 함께 공유하고 있어요
            </p>
          </div>
        </div>
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
            <Button variant="outline" size="sm" onClick={() => setShowUnlink(false)} className="flex-1">
              취소
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowUnlink(true)}
            className="text-xs text-muted-foreground mt-2 flex items-center gap-1 hover:text-destructive transition-colors"
          >
            <Unlink className="w-3 h-3" />
            연결 해제
          </button>
        )}
      </div>
    );
  }

  // 초대 코드가 있는 대기 상태
  if (coupleLink && coupleLink.status === "pending") {
    return (
      <div className="p-4 bg-card rounded-2xl border border-border">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">커플 연결</h3>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          아래 초대 코드를 상대방에게 공유하세요
        </p>

        <div className="flex gap-2 mb-2">
          <div className="flex-1 px-4 py-3 bg-muted rounded-xl text-center font-mono text-lg font-bold tracking-widest text-foreground">
            {coupleLink.invite_code}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (!coupleLink?.invite_code) return;
              navigator.clipboard.writeText(coupleLink.invite_code).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            className="h-12 w-12"
            title="코드만 복사"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        <Button
          onClick={handleShareOrCopy}
          className="w-full mb-4 flex items-center gap-2"
          variant="default"
        >
          <Share2 className="w-4 h-4" />
          파트너에게 공유하기
        </Button>

        <div className="border-t border-border pt-3">
          <p className="text-sm text-muted-foreground mb-2">상대방의 초대 코드가 있나요?</p>
          <div className="flex gap-2">
            <Input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
              placeholder="코드 입력"
              maxLength={6}
              className="font-mono tracking-widest text-center"
            />
            <Button onClick={handleLink} disabled={!inputCode.trim() || isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "연결"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 초기 상태 - 코드 생성 또는 입력
  return (
    <div className="p-4 bg-card rounded-2xl border border-dashed border-primary/30">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">파트너와 연결하기</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        파트너와 연결하면 일정을 함께 관리하고 공유 일기를 작성할 수 있어요
      </p>

      <Button onClick={handleGenerateCode} disabled={isProcessing} className="w-full mb-3">
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Heart className="w-4 h-4 mr-2" />
        )}
        초대 코드 생성
      </Button>

      <div className="border-t border-border pt-3">
        <p className="text-xs text-muted-foreground mb-2">또는 상대방의 초대 코드 입력</p>
        <div className="flex gap-2">
          <Input
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="코드 입력"
            maxLength={6}
            className="font-mono tracking-widest text-center"
          />
          <Button onClick={handleLink} disabled={!inputCode.trim() || isProcessing} variant="outline">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : "연결"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CoupleInvite;
