import { Shield, Database, Eye, Clock, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * 데이터 수집 동의 모달.
 *
 * 마이페이지 / AI 플래너 / 일정 / 예산 등 사용자 정보를 입력받기 직전에
 * 한 번 표시. 동의·거부 결과는 user_consents 테이블에 기록되어 다시
 * 묻지 않는다.
 *
 * 거부 시 (onRefuse) — 정보 수집 모달 트리거를 중단해야 한다. 거부한
 * 사용자에게 다시 묻지 않으려면 호출자가 새 sessionStorage 또는 비슷한
 * 가드를 두는 게 좋다 (이 컴포넌트는 모달 UI 만).
 */

interface Props {
  isOpen: boolean;
  onAgree: () => void;
  onRefuse: () => void;
  /** 닫기 X 클릭 시 — UX 상 거부와 동일하게 처리 권장 */
  onClose?: () => void;
}

const DataCollectionConsentModal = ({
  isOpen,
  onAgree,
  onRefuse,
  onClose,
}: Props) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) (onClose ?? onRefuse)();
      }}
    >
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <DialogHeader className="text-left">
                <DialogTitle className="text-base font-bold text-foreground">
                  정보 수집 안내
                </DialogTitle>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  맞춤 서비스를 위해 일부 정보를 수집해요
                </p>
              </DialogHeader>
            </div>
            <button
              type="button"
              onClick={() => (onClose ?? onRefuse)()}
              className="p-1"
              aria-label="닫기"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* 수집 항목 */}
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-[13px] font-bold text-foreground">
                수집 항목
              </h3>
            </div>
            <ul className="text-[12px] text-foreground/85 space-y-1 pl-5 list-disc">
              <li>결혼 정보 — 예정일·지역·진행 단계·파트너</li>
              <li>예산 정보 — 총 예산·항목별 금액·양가 분담</li>
              <li>일정·체크리스트 — D-Day 기준 할 일</li>
              <li>AI 플래너 입력 — 선호 스타일·중요도</li>
              <li>찜 / 후기 / 커뮤니티 활동</li>
            </ul>
          </section>

          {/* 사용 목적 */}
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-[13px] font-bold text-foreground">
                사용 목적
              </h3>
            </div>
            <ul className="text-[12px] text-foreground/85 space-y-1 pl-5 list-disc">
              <li>나에게 맞는 업체·일정·예산 가이드 추천</li>
              <li>지역·시기·규모에 따른 통계 비교 (익명 집계)</li>
              <li>웨딩 카운트다운·체크리스트 자동 생성</li>
              <li>AI 청첩장·드레스·메이크업 시뮬레이션 결과 개인 갤러리</li>
            </ul>
          </section>

          {/* 보관 기간 */}
          <section className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <h3 className="text-[13px] font-bold text-foreground">
                보관 기간
              </h3>
            </div>
            <ul className="text-[12px] text-foreground/85 space-y-1 pl-5 list-disc">
              <li>회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</li>
              <li>AI 업로드 사진은 30일 자동 삭제</li>
              <li>법령상 보관 의무가 있는 항목은 해당 기간까지</li>
            </ul>
          </section>

          {/* 동의 거부 안내 */}
          <section className="p-3 bg-amber-50 rounded-lg text-[11px] text-amber-900 leading-relaxed">
            동의하지 않으셔도 앱은 사용 가능하지만 결혼 정보·예산·일정·AI
            플래너 등 맞춤 기능은 제한돼요. 자세한 내용은{" "}
            <a href="/privacy" className="underline font-semibold">
              개인정보처리방침
            </a>{" "}
            을 참고해주세요.
          </section>
        </div>

        <div className="px-5 pb-5 pt-1 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onRefuse}>
            동의 안 함
          </Button>
          <Button onClick={onAgree}>동의하고 계속</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataCollectionConsentModal;
