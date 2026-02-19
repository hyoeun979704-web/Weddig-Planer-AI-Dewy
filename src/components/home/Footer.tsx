import { ChevronRight } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t border-border">
      {/* Quick Links */}
      <div className="px-4 py-4 border-b border-border">
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-between p-3 bg-card rounded-xl text-left hover:bg-muted transition-colors">
            <span className="text-sm font-medium text-foreground">고객센터</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="flex items-center justify-between p-3 bg-card rounded-xl text-left hover:bg-muted transition-colors">
            <span className="text-sm font-medium text-foreground">자주 묻는 질문</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Company Info */}
      <div className="px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-bold">D</span>
          </div>
          <span className="text-sm font-bold text-foreground">Dewy</span>
        </div>
        
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>(주)듀이 | 대표: 홍길동</p>
          <p>사업자등록번호: 123-45-67890</p>
          <p>서울특별시 강남구 테헤란로 123, 웨딩타워 10층</p>
          <p>고객센터: 1588-1234 (평일 10:00~18:00)</p>
          <p>이메일: help@dewy.kr</p>
        </div>

        {/* Legal Links */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
          <button className="text-xs text-muted-foreground hover:text-foreground">이용약관</button>
          <span className="text-xs text-border">|</span>
          <button className="text-xs font-medium text-foreground hover:text-primary">개인정보처리방침</button>
          <span className="text-xs text-border">|</span>
          <button className="text-xs text-muted-foreground hover:text-foreground">위치기반서비스 이용약관</button>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          © 2025 Dewy. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
