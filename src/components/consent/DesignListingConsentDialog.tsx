import { useState } from "react";
import { FileText, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * 디자인 상품 등록 동의 게이트(게시자=작가용).
 *
 * 작가가 "상품 등록"을 누르면 이 팝업이 뜨고, 약관·고지를 읽고 **동의 체크 후 '확인'**을
 * 눌러야 실제 등록(onConfirm)이 진행된다. 미체크면 확인 버튼 비활성.
 * (라이선스 포함 가격은 작가 본인이 책정 — 플랫폼은 법적 내용을 '고지'만 한다.)
 *
 * 설계: docs/260616_invitation_design_marketplace.md · docs/260616_invitation_product_types.md.
 */
interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const DesignListingConsentDialog = ({ isOpen, onConfirm, onClose }: Props) => {
  const [agreed, setAgreed] = useState(false);

  const handleConfirm = () => {
    if (!agreed) return;
    onConfirm();
    setAgreed(false); // 다음 등록 위해 초기화
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) { setAgreed(false); onClose(); }
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <DialogHeader className="text-left">
                <DialogTitle className="text-base font-bold text-foreground">디자인 등록 전 확인</DialogTitle>
                <p className="text-[12px] text-muted-foreground mt-0.5">아래 내용에 동의하시면 등록돼요</p>
              </DialogHeader>
            </div>
            <button type="button" onClick={() => { setAgreed(false); onClose(); }} className="p-1" aria-label="닫기">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto text-[12px] text-foreground/85 leading-relaxed">
          <section className="space-y-1.5">
            <h3 className="text-[13px] font-bold text-foreground">저작권·권리 보증</h3>
            <ul className="space-y-1 pl-4 list-disc">
              <li>등록 디자인의 <b>저작권은 작가(본인)에게</b> 있으며, 판매·전시 권한이 있음을 보증합니다.</li>
              <li>디자인에 사용된 <b>폰트·이미지·소스의 상업/임베드 라이선스</b>가 적법함을 확인합니다.</li>
              <li>타인의 저작물을 무단 사용하지 않았으며, 침해 발생 시 <b>책임은 작가에게</b> 있습니다.</li>
            </ul>
          </section>
          <section className="space-y-1.5">
            <h3 className="text-[13px] font-bold text-foreground">가격·이용허락</h3>
            <ul className="space-y-1 pl-4 list-disc">
              <li>판매 가격은 <b>이용허락(라이선스) 범위를 포함</b>해 작가가 직접 책정합니다.</li>
              <li>구매자에게 제공하는 이용 범위(본인 결혼식 사용·인쇄 허용 여부 등)를 정확히 안내합니다.</li>
            </ul>
          </section>
          <section className="space-y-1.5">
            <h3 className="text-[13px] font-bold text-foreground">판매·정산</h3>
            <ul className="space-y-1 pl-4 list-disc">
              <li>Dewy는 작가와 구매자의 거래를 <b>중개</b>하며, 거래 당사자는 작가입니다.</li>
              <li>정산 시 관련 <b>수수료·세금(원천징수 등)</b>이 처리될 수 있습니다.</li>
              <li>등록 디자인은 <b>운영자 검토 후</b> 노출되며, 정책 위반 시 게시가 제한될 수 있습니다.</li>
            </ul>
          </section>
          <p className="text-[11px] text-muted-foreground">
            자세한 내용은 <a href="/terms" className="underline font-semibold">이용약관</a> 및{" "}
            <a href="/privacy" className="underline font-semibold">개인정보처리방침</a>을 따릅니다.
          </p>
        </div>

        <div className="px-5 pb-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
            <span className="text-[13px] text-foreground">위 내용을 모두 확인했고 이에 동의합니다.</span>
          </label>
        </div>

        <div className="px-5 pb-5 pt-1 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => { setAgreed(false); onClose(); }}>취소</Button>
          <Button onClick={handleConfirm} disabled={!agreed}>확인하고 등록</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DesignListingConsentDialog;
