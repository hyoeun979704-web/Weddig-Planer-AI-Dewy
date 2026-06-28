import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Building2, ExternalLink } from "lucide-react";
import { openExternal } from "@/lib/native/openExternal";

// 네이티브(설치앱) 전용 폴백 — 앱=소비자 전용이라 바이너리에 기업(partners) 코드가
// 빠져 있다(App.tsx 의 IS_NATIVE 게이트). 그래서 앱 안에서 /business* 로 이동하면 라우트가
// 없어 404 가 된다. 입점 배너·마이페이지 "업체 관리"·로그인 리다이렉트(Auth → /business/onboard)
// 등 모든 진입을 이 한 곳이 받아, 같은 경로의 웹 포털을 시스템 브라우저로 열어 끊김 없이 잇는다.
// (기업 포털은 웹=데스크톱+모바일 브라우저에서 운영 — 모바일 미지원이 아니라 '설치앱 밖'에서 제공.)
const WEB_ORIGIN = "https://dewy-wedding.com";

const BusinessWebRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // 들어온 경로(서브패스·쿼리 포함)를 그대로 웹 포털 경로로 매핑 → /business/dashboard 도 보존.
  const webUrl = `${WEB_ORIGIN}${location.pathname}${location.search}`;
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    // 진입 즉시 1회만 외부 브라우저 오픈(effect 1회 — 중복 팝업 방지).
    void openExternal(webUrl);
    setOpened(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-lg font-bold text-foreground mb-2">기업 기능은 웹에서 이용해요</h1>
        <p className="text-sm text-muted-foreground mb-6">
          업체 입점·관리는 모바일 웹(브라우저)에서 제공돼요.
          {opened ? " 브라우저로 이동했어요 — 안 열렸다면 아래 버튼을 눌러주세요." : ""}
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void openExternal(webUrl)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm"
          >
            <ExternalLink className="w-4 h-4" /> 웹에서 열기
          </button>
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="px-4 py-3 bg-muted text-foreground rounded-xl font-medium text-sm"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessWebRedirect;
