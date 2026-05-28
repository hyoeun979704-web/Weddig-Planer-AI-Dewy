import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";

type Mode = "subscription" | "one_time";

interface PaymentTermsConsentProps {
  mode: Mode;
  onAllAgreedChange: (allAgreed: boolean) => void;
}

interface ConsentItem {
  key: string;
  label: ReactNode;
}

const PaymentTermsConsent = ({ mode, onAllAgreedChange }: PaymentTermsConsentProps) => {
  const navigate = useNavigate();

  const openTerms = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/terms");
  };
  const openPrivacy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/privacy");
  };

  const items: ConsentItem[] = [
    {
      key: "terms",
      label: (
        <>
          <span className="text-destructive">(필수)</span>{" "}
          <button type="button" onClick={openTerms} className="underline">
            이용약관
          </button>
          에 동의합니다
        </>
      ),
    },
    {
      key: "privacy",
      label: (
        <>
          <span className="text-destructive">(필수)</span>{" "}
          <button type="button" onClick={openPrivacy} className="underline">
            개인정보 수집·이용
          </button>
          에 동의합니다
        </>
      ),
    },
    {
      key: "delegation",
      label: (
        <>
          <span className="text-destructive">(필수)</span> 결제 처리를 위해 결제대행사(코리아포트원
          및 연동 PG사)에 결제 정보가 위탁됨에 동의합니다
        </>
      ),
    },
    {
      key: "refund",
      label:
        mode === "subscription" ? (
          <>
            <span className="text-destructive">(필수)</span> 정기 결제의{" "}
            <button type="button" onClick={openTerms} className="underline">
              자동 갱신 및 환불 정책
            </button>
            을 확인했으며 동의합니다
          </>
        ) : (
          <>
            <span className="text-destructive">(필수)</span> 디지털 콘텐츠 특성상 사용 후{" "}
            <button type="button" onClick={openTerms} className="underline">
              환불이 제한
            </button>
            됨을 확인했으며 동의합니다
          </>
        ),
    },
  ];

  const [agreed, setAgreed] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.key, false])),
  );

  const allAgreed = items.every((i) => agreed[i.key]);

  const setAll = (val: boolean) => {
    const next = Object.fromEntries(items.map((i) => [i.key, val]));
    setAgreed(next);
    onAllAgreedChange(val);
  };

  const setOne = (key: string, val: boolean) => {
    const next = { ...agreed, [key]: val };
    setAgreed(next);
    onAllAgreedChange(items.every((i) => next[i.key]));
  };

  return (
    <div className="p-4 bg-card rounded-2xl border border-border space-y-3">
      <label className="flex items-center gap-3 cursor-pointer">
        <Checkbox
          checked={allAgreed}
          onCheckedChange={(v) => setAll(v === true)}
        />
        <span className="text-sm font-semibold text-foreground">전체 동의</span>
      </label>
      <div className="border-t border-border" />
      <div className="space-y-2.5">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex items-start gap-3 cursor-pointer"
          >
            <Checkbox
              checked={agreed[item.key]}
              onCheckedChange={(v) => setOne(item.key, v === true)}
              className="mt-0.5"
            />
            <span className="text-[13px] text-foreground leading-relaxed">
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default PaymentTermsConsent;
