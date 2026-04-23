import { useNavigate } from "react-router-dom";
import DewyLogo from "./DewyLogo";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-[hsl(var(--pink-50))]">
      {/* 서비스탭 — pill 버튼 2개 */}
      <div className="flex items-start gap-[15px] px-[30px] py-[15px] border-t border-[#ececec]">
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
      <div className="flex flex-col gap-[10px] px-[30px] py-[20px] border-t border-[#ececec]">
        <div className="flex items-center gap-[10px]">
          <DewyLogo size={20} />
          <span className="font-logo text-[15px] text-black">Dewy</span>
        </div>
        <div className="text-[12px] leading-[15px] text-black">
          <p>(주)듀이 | 대표: 김효은</p>
          <p>사업자등록번호: 123-45-67890</p>
          <p>서울특별시 강남구 테헤란로 123, 웨딩타워 10층</p>
          <p>고객센터: 1588-1234 (평일 10:00~18:00)</p>
          <p>이메일: help@dewy.kr</p>
        </div>
      </div>

      {/* 이용약관 */}
      <div className="flex flex-col gap-[10px] px-[30px] py-[20px] border-t border-[#ececec]">
        <div className="flex items-center gap-[10px] text-[12px] text-black">
          <button onClick={() => navigate("/terms")}>이용약관</button>
          <span className="text-[#ececec]">|</span>
          <button onClick={() => navigate("/privacy")}>개인정보처리방침</button>
          <span className="text-[#ececec]">|</span>
          <button onClick={() => navigate("/location-terms")}>
            위치기반서비스 이용약관
          </button>
        </div>
        <p className="text-[12px] leading-[15px] text-black">
          © 2025 Dewy. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
