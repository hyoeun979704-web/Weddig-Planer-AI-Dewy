import { Sparkles } from "lucide-react";
import ComingSoonAdminPage from "@/components/admin/ComingSoonAdminPage";

const AdminMakeupSamples = () => (
  <ComingSoonAdminPage
    title="메이크업 카탈로그"
    description="신부 메이크업 시연용 샘플 관리 (v1.5)"
    icon={Sparkles}
    expectedPhase="b-3 이후 추가"
    notes={[
      "메이크업 스타일별 마네킹/얼굴 reference 이미지 등록",
      "톤·립·아이·블러셔 등 메타 필터 (드레스 카탈로그와 같은 패턴)",
      "노출 활성/비활성 토글, 표시 순서 조정",
      "사용자 갤러리에서 필터링하여 선택, AI 합성 reference로 사용",
    ]}
  />
);

export default AdminMakeupSamples;
