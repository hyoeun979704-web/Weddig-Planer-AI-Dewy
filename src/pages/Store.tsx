import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Tag, Gift, Percent } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const storeCategories = [
  { icon: Tag, title: "특가 상품", description: "한정 특가 혜택", color: "bg-rose-100 text-rose-500" },
  { icon: Gift, title: "혼수 패키지", description: "가전·가구 세트", color: "bg-amber-100 text-amber-500" },
  { icon: Percent, title: "할인 쿠폰", description: "제휴 할인 쿠폰", color: "bg-emerald-100 text-emerald-500" },
  { icon: ShoppingBag, title: "웨딩 용품", description: "웨딩 필수품 모음", color: "bg-sky-100 text-sky-500" },
];

const Store = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabChange = (href: string) => {
    navigate(href);
  };

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">스토어</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {/* Hero Banner */}
        <div className="px-4 py-6 bg-gradient-to-br from-primary/10 via-accent to-background">
          <h2 className="text-xl font-bold text-foreground mb-2">웨딩 스토어</h2>
          <p className="text-sm text-muted-foreground">
            결혼 준비에 필요한 모든 것을<br />
            특별한 가격에 만나보세요
          </p>
        </div>

        {/* Categories */}
        <div className="px-4 py-6">
          <h3 className="text-base font-semibold text-foreground mb-4">카테고리</h3>
          <div className="grid grid-cols-2 gap-3">
            {storeCategories.map((category, index) => (
              <button
                key={index}
                className="p-4 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${category.color}`}>
                  <category.icon className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-1">{category.title}</h4>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Coming Soon */}
        <div className="px-4 py-6">
          <div className="p-6 bg-muted/50 rounded-2xl text-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-2">서비스 준비중</h3>
            <p className="text-sm text-muted-foreground">
              더 다양한 상품과 혜택으로<br />
              곧 찾아뵙겠습니다
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={location.pathname} onTabChange={handleTabChange} />
    </div>
  );
};

export default Store;
