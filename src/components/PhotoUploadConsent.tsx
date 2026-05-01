import { useState } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface PhotoUploadConsentProps {
  onConsent: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
}

/**
 * AI Studio 사진 업로드 시 사용자 동의를 받는 컴포넌트.
 * 드레스 피팅·메이크업 시연 등 얼굴/전신 사진을 업로드하기 전에 표시.
 *
 * 동의 항목:
 *  1. 본인 사진만 업로드 (필수)
 *  2. AI 처리·외부 API 전송 (필수)
 *  3. 결과 이미지 저장 및 30일 자동 삭제 (필수)
 *  4. 서비스 개선 목적 익명 활용 (선택)
 */
const PhotoUploadConsent = ({
  onConsent,
  onCancel,
  title = "사진 업로드 동의",
  description = "AI Studio 서비스 이용을 위해 사진 처리에 대한 동의가 필요합니다.",
}: PhotoUploadConsentProps) => {
  const [agreeOwnPhoto, setAgreeOwnPhoto] = useState(false);
  const [agreeProcessing, setAgreeProcessing] = useState(false);
  const [agreeStorage, setAgreeStorage] = useState(false);
  const [agreeImprovement, setAgreeImprovement] = useState(false);

  const allRequiredAgreed = agreeOwnPhoto && agreeProcessing && agreeStorage;

  const toggleAll = () => {
    const next = !(agreeOwnPhoto && agreeProcessing && agreeStorage && agreeImprovement);
    setAgreeOwnPhoto(next);
    setAgreeProcessing(next);
    setAgreeStorage(next);
    setAgreeImprovement(next);
  };

  return (
    <div className="bg-card rounded-2xl p-5 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      {/* 전체 동의 */}
      <button
        type="button"
        onClick={toggleAll}
        className="w-full flex items-center gap-3 p-3 bg-muted rounded-lg mb-3 active:scale-[0.98] transition-transform"
      >
        <Checkbox
          checked={agreeOwnPhoto && agreeProcessing && agreeStorage && agreeImprovement}
          onCheckedChange={toggleAll}
          className="pointer-events-none"
        />
        <span className="text-sm font-semibold text-foreground">전체 동의</span>
      </button>

      <div className="space-y-3 mb-4">
        <ConsentItem
          required
          checked={agreeOwnPhoto}
          onChange={setAgreeOwnPhoto}
          label="본인 사진만 업로드합니다"
          description="타인의 사진을 동의 없이 업로드할 경우 초상권 침해 등 법적 책임을 질 수 있습니다."
        />

        <ConsentItem
          required
          checked={agreeProcessing}
          onChange={setAgreeProcessing}
          label="사진의 AI 처리·외부 전송에 동의합니다"
          description="업로드한 사진은 AI 결과 생성을 위해 Google AI 서비스(Nano Banana Pro 2)로 전송됩니다."
        />

        <ConsentItem
          required
          checked={agreeStorage}
          onChange={setAgreeStorage}
          label="사진 저장 및 30일 후 자동 삭제에 동의합니다"
          description="업로드된 사진은 비공개 저장소에 보관되며, 처리 완료 후 30일 이내 자동 삭제됩니다."
        />

        <ConsentItem
          checked={agreeImprovement}
          onChange={setAgreeImprovement}
          label="(선택) 서비스 개선 목적으로 익명 활용에 동의합니다"
          description="개인 식별이 불가능한 형태로 가공하여 AI 모델 개선·통계에 활용할 수 있습니다."
        />
      </div>

      {/* 주의 안내 */}
      <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          AI 결과는 통계적 모델로 생성되어 실제 드레스·메이크업과 차이가 있을 수 있습니다.
          14세 미만 미성년자의 사진을 업로드할 경우 법정대리인의 동의가 필요합니다.
        </p>
      </div>

      {/* 약관 링크 */}
      <div className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
        자세한 내용은{" "}
        <Link to="/terms" className="underline">이용약관</Link>
        {" "}및{" "}
        <Link to="/privacy" className="underline">개인정보처리방침</Link>
        을 확인해주세요.
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            취소
          </Button>
        )}
        <Button
          onClick={onConsent}
          disabled={!allRequiredAgreed}
          className="flex-1"
        >
          동의하고 시작
        </Button>
      </div>
    </div>
  );
};

interface ConsentItemProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  required?: boolean;
}

const ConsentItem = ({ checked, onChange, label, description, required }: ConsentItemProps) => (
  <label className="flex gap-3 cursor-pointer">
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => onChange(!!v)}
      className="mt-0.5 flex-shrink-0"
    />
    <div className="flex-1">
      <div className="text-sm font-medium text-foreground">
        {required && <span className="text-destructive mr-1">[필수]</span>}
        {!required && <span className="text-muted-foreground mr-1">[선택]</span>}
        {label}
      </div>
      {description && (
        <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
          {description}
        </div>
      )}
    </div>
  </label>
);

export default PhotoUploadConsent;
