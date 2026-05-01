import { Camera } from "lucide-react";
import ComingSoonAdminPage from "@/components/admin/ComingSoonAdminPage";

const AdminWeddingPhotoRefs = () => (
  <ComingSoonAdminPage
    title="촬영 시안"
    description="웨딩촬영 컨셉 reference 이미지 관리 (v2)"
    icon={Camera}
    expectedPhase="b-3 이후 추가"
    notes={[
      "야외·실내·스튜디오·테마별 컨셉 reference 이미지 등록",
      "포즈·구도·조명·소품 메타 필터",
      "계절·드레스코드·예산대 분류",
      "사용자가 컨셉 선택 → 본인 사진 합성 또는 가이드 자동 생성",
    ]}
  />
);

export default AdminWeddingPhotoRefs;
