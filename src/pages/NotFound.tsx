import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center max-w-sm">
        <div className="text-7xl mb-4" aria-hidden>💍</div>
        <h1 className="text-5xl font-extrabold text-primary mb-2">404</h1>
        <p className="text-lg font-bold text-foreground mb-1">페이지를 찾을 수 없어요</p>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          요청하신 페이지가 사라졌거나 주소가 변경됐을 수 있어요.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => navigate("/")} className="h-11 rounded-xl">
            홈으로 돌아가기
          </Button>
          <Button onClick={() => navigate(-1)} variant="outline" className="h-11 rounded-xl">
            이전 페이지
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
