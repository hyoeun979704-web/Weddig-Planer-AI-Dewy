import { Sparkles, type LucideIcon } from "lucide-react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";

interface ComingSoonAdminPageProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  notes: string[];
  expectedPhase?: string;
}

/**
 * 출시 예정 어드민 페이지의 공통 placeholder.
 * 카탈로그 종류별로 똑같은 패턴이라 향후 실제 구현 시 AdminDressSamples를
 * 참고해 빠르게 작성 가능.
 */
const ComingSoonAdminPage = ({
  title,
  description,
  icon: Icon = Sparkles,
  notes,
  expectedPhase,
}: ComingSoonAdminPageProps) => (
  <AdminGuard>
    <AdminLayout title={title} description={description}>
      <div className="max-w-2xl mx-auto py-12 px-6">
        <div className="bg-background rounded-lg border border-border p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
            <Icon className="w-7 h-7 text-primary" />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">준비 중인 메뉴</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {description ?? "이 어드민 페이지는 곧 추가될 예정입니다."}
          </p>

          {expectedPhase && (
            <div className="inline-block text-[11px] font-semibold bg-muted text-muted-foreground px-3 py-1 rounded-full mb-6">
              예정 단계: {expectedPhase}
            </div>
          )}

          {notes.length > 0 && (
            <div className="text-left bg-muted/50 rounded-lg p-4 text-sm text-foreground/85">
              <h3 className="font-semibold mb-2 text-foreground">예상 기능</h3>
              <ul className="space-y-1.5 list-disc pl-5">
                {notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-6 text-[11px] text-muted-foreground">
            현 단계에서는 자리만 잡혀 있으며, 향후 동일한 어드민 패턴으로 빠르게 추가됩니다.
          </p>
        </div>
      </div>
    </AdminLayout>
  </AdminGuard>
);

export default ComingSoonAdminPage;
