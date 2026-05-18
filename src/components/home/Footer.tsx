import { useNavigate } from "react-router-dom";
import DewyLogo from "./DewyLogo";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-[hsl(var(--pink-50))]">
      {/* 서비스탭 — pill 버튼 2개 */}
      <div className="flex items-start gap-[15px] px-[30px] py-[15px] border-t border-border">
        <button
          onClick={() => navigate("/faq")}
          className="flex-1 flex items-center justify-center h-[37px] bg-card rounded-[10px] text-[14px] font-medium text-foreground hover:bg-card/80 active:scale-[0.98] transition-all"
        >
          자주 묻는 질문
        </button>
        <button
          onClick={() => navigate("/contact")}
          className="flex-1 flex items-center justify-center h-[37px] bg-card rounded-[10px] text-[14px] font-medium text-foreground hover:bg-card/80 active:scale-[0.98] transition-all"
        >
          고객센터
        </button>
      </div>

      {/* 사업자정보 */}
      <div className="flex flex-col gap-[10px] px-[30px] py-[20px] border-t border-border">
        <div className="flex items-center gap-[10px]">
          <DewyLogo size={20} />
          <span className="font-logo text-[15px] text-foreground">Dewy</span>
        </div>
        <div className="text-[12px] leading-[18px] text-muted-foreground">
          <p>(주)듀이 | 대표: 김효은</p>
          <p>사업자등록번호: 123-45-67890</p>
          <p>서울특별시 강남구 테헤란로 123, 웨딩타워 10층</p>
          <p>고객센터: 1588-1234 (평일 10:00~18:00)</p>
          <p>이메일: help@dewy-wedding.com</p>
        </div>
      </div>

      {/* 이용약관 */}
      <div className="flex flex-col gap-[10px] px-[30px] py-[20px] border-t border-border">
        <div className="flex items-center gap-[10px] text-[12px] text-foreground">
          <button
            onClick={() => navigate("/terms")}
            className="hover:text-primary transition-colors"
          >
            이용약관
          </button>
          <span className="text-border">|</span>
          <button
            onClick={() => navigate("/privacy")}
            className="hover:text-primary transition-colors"
          >
            개인정보처리방침
          </button>
          <span className="text-border">|</span>
          <button
            onClick={() => navigate("/location-terms")}
            className="hover:text-primary transition-colors"
          >
            위치기반서비스 이용약관
          </button>
        </div>
        <p className="text-[12px] leading-[15px] text-muted-foreground">
          © 2025 Dewy. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
