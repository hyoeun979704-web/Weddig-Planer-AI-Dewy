import { FileText } from "lucide-react";
import ComingSoonAdminPage from "@/components/admin/ComingSoonAdminPage";

const AdminInvitationTemplates = () => (
  <ComingSoonAdminPage
    title="청첩장 템플릿"
    description="모바일·종이 청첩장 디자인 템플릿 관리 (v1.5)"
    icon={FileText}
    expectedPhase="b-3 이후 추가"
    notes={[
      "Figma에서 디자인한 청첩장 템플릿을 SVG/PDF로 등록",
      "모바일·종이 두 형식 분리, 같은 디자인의 변형 관리",
      "필드 매핑 (이름·날짜·식장·연락처 자리표시자)",
      "사용자가 정보만 입력하면 Python 자동 합성으로 생성",
    ]}
  />
);

export default AdminInvitationTemplates;
