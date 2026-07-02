import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

/**
 * Google Play Console 의 "데이터 보안 → 계정 삭제 URL" 요구사항을 위한 외부
 * 공개 페이지. Play 가 직접 fetch 해 검토하므로 인증 없이 누구나 접근 가능해야
 * 한다.
 *
 * 표시 의무 (Play Console 가이드):
 *  1. 스토어 등록정보에 표시되는 앱 또는 개발자 이름 기재
 *  2. 사용자가 계정 삭제를 요청하기 위해 취해야 할 단계를 눈에 띄게 표시
 *  3. 삭제되거나 보관되는 데이터 유형 및 추가 보관 기간 지정
 */
const AccountDeletion = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader title="계정 및 데이터 삭제 요청" />

      <main className="px-5 py-6 pb-24 text-[13px] leading-7 text-foreground">
        <p className="mb-4 text-muted-foreground">
          앱 이름: Dewy (듀이) · 개발자: Dewy · 최종 개정일: 2026년 5월 26일
        </p>

        <p className="mb-6">
          Dewy 는 회원의 개인정보 보호와 데이터 통제권을 존중합니다. 본 페이지는
          회원이 계정과 관련된 개인정보 및 서비스 이용 데이터의 삭제를 요청하는
          방법을 안내합니다.
        </p>

        <Section title="1. 앱 내에서 계정 삭제 (권장)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Dewy 앱 실행</li>
            <li>하단 메뉴에서 <strong>마이페이지</strong> 탭 선택</li>
            <li>
              <strong>설정 → 계정 → 계정 삭제</strong> 메뉴 진입
            </li>
            <li>삭제되는 데이터 안내를 확인하고 삭제를 확정</li>
            <li>본인 확인 후 탈퇴 처리가 즉시 완료됩니다</li>
          </ol>
          <p className="mt-3 text-muted-foreground">
            앱이 정상 동작하지 않거나 로그인이 불가한 경우, 아래 이메일로 요청해
            주세요.
          </p>
        </Section>

        <Section title="2. 이메일로 계정 삭제 요청">
          <p>
            로그인이 어렵거나 앱 내 탈퇴가 불가능한 경우 아래 이메일로 본인
            인증 정보와 함께 삭제 요청을 보내주시면 영업일 기준 3일 이내에
            처리해 드립니다.
          </p>
          <div className="mt-3 p-3 bg-muted/40 rounded-lg">
            <p className="font-semibold mb-1">담당자 이메일</p>
            <a
              href="mailto:kheceo@dewy-wedding.com?subject=Dewy%20계정%20삭제%20요청"
              className="text-primary underline break-all"
            >
              kheceo@dewy-wedding.com
            </a>
            <p className="mt-3 text-[12px] text-muted-foreground">
              메일 제목: <em>Dewy 계정 삭제 요청</em>
              <br />
              포함 내용: 가입 이메일, 가입 시 사용한 소셜 로그인 종류
              (Google/Kakao), 가입 시점 추정 일자
            </p>
          </div>
        </Section>

        <Section title="3. 삭제되는 데이터">
          <p className="mb-2">계정 탈퇴 처리 시 다음 데이터가 <strong>즉시 삭제</strong>됩니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 식별 정보 (이메일, 닉네임, 프로필 사진)</li>
            <li>결혼 정보 (예식일, 지역, 파트너 이름, 결혼 스타일, 페르소나 설정)</li>
            <li>예산 항목 및 일정 항목 (사용자가 직접 작성·체크한 모든 항목)</li>
            <li>찜·장바구니·하트·포인트 잔액</li>
            <li>커뮤니티 게시글 및 댓글 (회원 식별 정보는 비식별 처리)</li>
            <li>튜토리얼 진행 이력, AI 사용 이력 (콘텐츠 본문은 즉시 파기)</li>
            <li>광고 식별자 (AdMob) 와 연동된 행동 데이터</li>
          </ul>
        </Section>

        <Section title="4. 법령에 따라 보관되는 데이터">
          <p className="mb-2">
            다음 정보는 관련 법령에 따라 정해진 기간 동안 별도 보관 후 자동 파기
            됩니다. 보관 기간 동안에는 식별이 어려운 형태로 분리·암호화 보관
            되며, 보관 기간 종료 시 안전하게 파기됩니다.
          </p>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr className="bg-muted/40">
                <th className="border border-border p-2 text-left">항목</th>
                <th className="border border-border p-2 text-left">보관 기간</th>
                <th className="border border-border p-2 text-left">근거 법령</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2">계약·결제·구매 기록</td>
                <td className="border border-border p-2">5년</td>
                <td className="border border-border p-2">전자상거래법</td>
              </tr>
              <tr>
                <td className="border border-border p-2">소비자 불만·분쟁 처리 기록</td>
                <td className="border border-border p-2">3년</td>
                <td className="border border-border p-2">전자상거래법</td>
              </tr>
              <tr>
                <td className="border border-border p-2">로그인·접속 기록</td>
                <td className="border border-border p-2">3개월</td>
                <td className="border border-border p-2">통신비밀보호법</td>
              </tr>
              <tr>
                <td className="border border-border p-2">표시·광고 기록</td>
                <td className="border border-border p-2">6개월</td>
                <td className="border border-border p-2">전자상거래법</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-muted-foreground">
            위 보관 데이터는 사용자 식별이 가능한 형태로 사용되지 않으며,
            법령상 요청 (수사기관·과세관청 등) 외 어떤 경우에도 이용되지
            않습니다.
          </p>
        </Section>

        <Section title="5. 데이터 일부만 삭제 요청">
          <p>
            계정을 유지하면서 일부 데이터만 삭제하고 싶은 경우 위 이메일로
            구체적인 항목을 명시해 요청해 주세요. (예: 결혼 정보만 삭제, 작성
            글만 삭제 등)
          </p>
        </Section>

        <Section title="6. 문의">
          <p>
            계정 삭제 절차나 본 안내에 대한 문의는 위 이메일로 연락해 주시기
            바랍니다. 영업일 기준 3일 이내 답변드립니다.
          </p>
        </Section>
      </main>

      <BottomNav
        activeTab={location.pathname}
        onTabChange={(href) => navigate(href)}
      />
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mb-6">
    <h2 className="text-[14px] font-bold mb-2 text-foreground">{title}</h2>
    <div className="text-foreground/85">{children}</div>
  </section>
);

export default AccountDeletion;
