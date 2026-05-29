import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Copy, Check, Trash2, Users, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import {
  useFamilyInvites,
  FAMILY_ROLE_LABEL,
  SCOPE_LABEL,
  type FamilyRole,
  type DelegatedScope,
} from "@/hooks/useFamilyInvites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ALL_SCOPES: DelegatedScope[] = [
  "budget_view",
  "schedule_view",
  "guest_manage",
  "meal_taste",
];

const REDEEM_ERROR_MESSAGES: Record<string, string> = {
  not_found_or_used: "유효하지 않거나 이미 사용된 코드입니다",
  expired: "만료된 코드입니다",
  self_redeem: "본인이 발급한 코드는 사용할 수 없어요",
  unauthenticated: "로그인 후 사용 가능합니다",
};

const FamilyInvite = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const invites = useFamilyInvites();
  const [createOpen, setCreateOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) navigate("/auth");
  }, [user, navigate]);

  // 공유 링크 ?code=XXX → 코드 입력란 자동 채움 (자동 사용 X — 사용자 확인 후 연결).
  useEffect(() => {
    const c = searchParams.get("code");
    if (c) {
      setRedeemCode(c.trim().toUpperCase().slice(0, 8));
      searchParams.delete("code");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCopy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("코드가 복사되었어요");
  };

  const handleShare = async (inv: { invite_code: string; display_name: string | null; role: FamilyRole }) => {
    const url = `https://www.dewy-wedding.com/family-invite?code=${inv.invite_code}`;
    const roleLabel = FAMILY_ROLE_LABEL[inv.role];
    const text = `Dewy 웨딩 준비에 가족으로 함께해요!\n\n역할: ${roleLabel}${inv.display_name ? ` (${inv.display_name})` : ""}\n초대 코드: ${inv.invite_code}\n\n${url}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Dewy 가족 초대", text, url });
        return;
      } catch (err: any) {
        if (err?.name !== "AbortError") console.error(err);
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("초대 메시지를 복사했어요");
    } catch {
      toast.error("복사에 실패했어요");
    }
  };

  const handleRedeem = async () => {
    const trimmed = redeemCode.trim().toUpperCase();
    if (trimmed.length !== 8) {
      toast.error("8자리 코드를 입력해주세요");
      return;
    }
    const result = await invites.redeem(trimmed);
    if (result.ok) {
      toast.success(`가족 연결 완료 (${FAMILY_ROLE_LABEL[result.role!]})`);
      setRedeemCode("");
    } else {
      toast.error(REDEEM_ERROR_MESSAGES[result.error ?? ""] ?? "처리에 실패했어요");
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("이 초대를 삭제할까요? 이미 연결된 가족과의 연결도 끊깁니다.")) return;
    const ok = await invites.revoke(id);
    if (ok) toast.success("삭제했어요");
    else toast.error("삭제에 실패했어요");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative pb-24">
      <PageHeader title="가족 초대" />

      <main className="px-4 py-4 space-y-4">
        {/* 안내 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-amber-700" />
            <p className="font-bold text-foreground">가족·플래너와 함께 준비하세요</p>
          </div>
          <ul className="text-sm text-foreground space-y-1.5">
            <li>• 부모님·형제·플래너에게 초대 코드 전송</li>
            <li>• 권한 위임 범위 (예산·일정·하객·시식) 선택 가능</li>
            <li>• 초대 코드는 30일간 유효</li>
          </ul>
        </div>

        {/* 새 초대 만들기 */}
        <Button
          onClick={() => setCreateOpen(true)}
          className="w-full h-12 rounded-2xl"
        >
          + 새 초대 만들기
        </Button>

        {/* 내가 발급한 초대 */}
        <section>
          <h2 className="text-sm font-bold text-foreground mb-2">내가 발급한 초대</h2>
          {invites.isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto my-4" />
          ) : invites.owned.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              아직 발급한 초대가 없어요.
            </p>
          ) : (
            <div className="space-y-2">
              {invites.owned.map((inv) => {
                const isLinked = inv.status === "linked";
                const isExpired =
                  inv.status === "expired" || new Date(inv.expires_at) < new Date();
                return (
                  <div
                    key={inv.id}
                    className="p-4 rounded-2xl border border-border bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">
                          {inv.display_name || FAMILY_ROLE_LABEL[inv.role]}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            isLinked
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isExpired
                                ? "bg-muted text-muted-foreground"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }
                        >
                          {isLinked ? "연결됨" : isExpired ? "만료" : "대기 중"}
                        </Badge>
                      </div>
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        aria-label="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {FAMILY_ROLE_LABEL[inv.role]}
                      {inv.delegated_scopes.length > 0 && (
                        <>
                          {" · "}
                          {inv.delegated_scopes
                            .map((s) => SCOPE_LABEL[s as DelegatedScope] ?? s)
                            .join(", ")}
                        </>
                      )}
                    </p>
                    {!isLinked && !isExpired && (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-center text-base font-bold tracking-widest text-foreground">
                          {inv.invite_code}
                        </code>
                        <button
                          onClick={() => handleCopy(inv.invite_code, inv.id)}
                          className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium flex items-center gap-1"
                        >
                          {copiedId === inv.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          복사
                        </button>
                        <button
                          onClick={() => handleShare(inv)}
                          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium"
                        >
                          공유
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 코드로 가족 연결하기 */}
        <section className="p-5 rounded-2xl border border-border bg-card">
          <p className="text-sm font-semibold text-foreground mb-1">초대 코드 입력</p>
          <p className="text-xs text-muted-foreground mb-3">
            받은 8자리 코드를 입력하면 해당 가족 그룹에 연결됩니다.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase().slice(0, 8))}
              placeholder="ABCD1234"
              maxLength={8}
              className="text-center text-lg font-bold tracking-widest"
            />
            <Button
              onClick={handleRedeem}
              disabled={invites.isWorking || redeemCode.length !== 8}
            >
              {invites.isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : "연결"}
            </Button>
          </div>
        </section>

        {/* 내가 연결된 가족 그룹 */}
        {invites.linkedAs.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-foreground mb-2">내가 연결된 그룹</h2>
            <div className="space-y-2">
              {invites.linkedAs.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-2xl border border-border bg-card"
                >
                  <p className="text-sm font-bold text-foreground">
                    {FAMILY_ROLE_LABEL[inv.role]}
                  </p>
                  {inv.delegated_scopes.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      위임된 권한:{" "}
                      {inv.delegated_scopes
                        .map((s) => SCOPE_LABEL[s as DelegatedScope] ?? s)
                        .join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <CreateInviteDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          const r = await invites.create(input);
          if (r.ok) {
            toast.success(`초대 코드 발급: ${r.inviteCode}`);
            setCreateOpen(false);
          } else {
            toast.error("발급에 실패했어요");
          }
        }}
        isWorking={invites.isWorking}
      />

      <BottomNav activeTab="/mypage" onTabChange={(href) => navigate(href)} />
    </div>
  );
};

function CreateInviteDialog({
  open,
  onClose,
  onCreate,
  isWorking,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: {
    role: FamilyRole;
    displayName: string;
    delegatedScopes: DelegatedScope[];
  }) => Promise<void>;
  isWorking: boolean;
}) {
  const [role, setRole] = useState<FamilyRole>("parent_bride");
  const [displayName, setDisplayName] = useState("");
  const [scopes, setScopes] = useState<Set<DelegatedScope>>(
    new Set(["budget_view", "schedule_view"]),
  );

  const toggleScope = (s: DelegatedScope) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const reset = () => {
    setRole("parent_bride");
    setDisplayName("");
    setScopes(new Set(["budget_view", "schedule_view"]));
  };

  const handleSubmit = async () => {
    await onCreate({
      role,
      displayName: displayName.trim(),
      delegatedScopes: Array.from(scopes),
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>새 가족 초대</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">역할</Label>
            <Select value={role} onValueChange={(v) => setRole(v as FamilyRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(FAMILY_ROLE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">
              이름 <span className="text-xs text-muted-foreground font-normal">(표시용)</span>
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 어머니, 김플래너"
              maxLength={40}
            />
          </div>
          <div>
            <Label className="mb-2 block">위임할 권한</Label>
            <div className="space-y-2">
              {ALL_SCOPES.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox
                    checked={scopes.has(s)}
                    onCheckedChange={() => toggleScope(s)}
                  />
                  <span className="text-sm">{SCOPE_LABEL[s]}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isWorking}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isWorking}>
            {isWorking ? "발급 중..." : "코드 발급"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FamilyInvite;
