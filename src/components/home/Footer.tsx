import { useNavigate } from "react-router-dom";
import DewyLogo from "./DewyLogo";
import { COMPANY } from "@/lib/companyInfo";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-[hsl(var(--pink-50))]">
      {/* 서비스탭 — pill 버튼 2개 */}
      <div className="flex items-start gap-[15px] px-[30px] py-[15px] border-t border-border">
        <button
          onClick={() => navigate("/faq")}
          className="flex-1 flex items-center justify-center h-[37px] bg-white rounded-[10px] text-[14px] font-medium text-black"
        >
          자주 묻는 질문
        </button>
        <button
          onClick={() => navigate("/contact")}
          className="flex-1 flex items-center justify-center h-[37px] bg-white rounded-[10px] text-[14px] font-medium text-black"
        >
          고객센터
        </button>
      </div>

      {/* 사업자정보 */}
      <div className="flex flex-col gap-[10px] px-[30px] py-[20px] border-t border-border">
        <div className="flex items-center gap-[10px]">
          <DewyLogo size={20} />
          <span className="font-logo text-[15px] text-black">Dewy</span>
        </div>
        <div className="text-[12px] leading-[18px] text-black">
          <p>{COMPANY.name} ({COMPANY.nameEn}) | 대표: {COMPANY.ceo}</p>
          <p>사업자등록번호: {COMPANY.bizRegNo}</p>
          <p>통신판매업신고: {COMPANY.telecomSalesNo}</p>
          <p>{COMPANY.address}</p>
          <p>고객센터: {COMPANY.phone} ({COMPANY.operatingHours})</p>
          <p>이메일: {COMPANY.email}</p>
        </div>
        {/* 통신판매중개자 책임 제한 고지(전자상거래법 §20-2) — 거래 당사자가 아님을 명확히 */}
        <p className="text-[11px] leading-[16px] text-muted-foreground border-t border-border/60 pt-[10px] mt-[2px]">
          듀이(Dewy)는 통신판매중개자로서 통신판매의 당사자가 아니며, 입점 업체가 등록한 상품·서비스
          정보 및 거래에 대한 책임은 해당 판매자(업체)에게 있습니다.
        </p>
      </div>

      {/* 이용약관 */}
      <div className="flex flex-col gap-[10px] px-[30px] py-[20px] border-t border-border">
        <div className="flex items-center gap-[10px] text-[12px] text-black">
          <button onClick={() => navigate("/terms")}>이용약관</button>
          <span className="text-primary/40">|</span>
          <button onClick={() => navigate("/privacy")}>개인정보처리방침</button>
          <span className="text-primary/40">|</span>
          <button onClick={() => navigate("/location-terms")}>
            위치기반서비스 이용약관
          </button>
        </div>
        <p className="text-[12px] leading-[15px] text-black">
          © 2026 Dewy. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
