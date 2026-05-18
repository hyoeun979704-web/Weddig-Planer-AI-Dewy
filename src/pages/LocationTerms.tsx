import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const LocationTerms = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1" aria-label="뒤로">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground">위치기반서비스 이용약관</h1>
        </div>
      </header>

      <main className="px-5 py-6 pb-24 text-[13px] leading-7 text-foreground">
        <p className="mb-4 text-muted-foreground">
          시행일: 2026년 5월 1일
        </p>

        <Section title="제1조 (목적)">
          본 약관은 듀이(이하 "회사")가 제공하는 위치기반서비스에 대해 회사와 이용자(이하 "회원") 간의
          권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (위치정보의 수집 방법)">
          회사는 회원의 동의를 받아 다음의 방법으로 위치정보를 수집합니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>회원의 단말기에서 GPS, Wi-Fi, 기지국 정보 등을 통해 수집</li>
            <li>회원이 직접 입력한 주소·지역 정보</li>
            <li>IP 기반의 대략적 지역 정보(시/도 단위)</li>
          </ul>
        </Section>

        <Section title="제3조 (위치정보의 이용 목적)">
          회사는 다음 목적을 위해 위치정보를 이용합니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>회원 인근의 결혼식장·스튜디오·드레스샵·메이크업 매장 등 추천</li>
            <li>지역별 평균 가격·트렌드 정보 제공</li>
            <li>지역 기반 콘텐츠 큐레이션</li>
            <li>위치기반 마케팅·이벤트 정보 제공(별도 동의 시)</li>
          </ul>
        </Section>

        <Section title="제4조 (위치정보의 보유 기간)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 회원의 위치정보를 수집한 시점부터 6개월간 보관 후 자동 삭제합니다.</li>
            <li>법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.</li>
            <li>회원이 요청 시 즉시 파기합니다.</li>
          </ol>
        </Section>

        <Section title="제5조 (위치정보의 제3자 제공)">
          회사는 회원의 위치정보를 사전 동의 없이 제3자에게 제공하지 않으며, 제공이 필요한 경우 별도의
          동의를 받습니다.
        </Section>

        <Section title="제6조 (회원의 권리 및 행사 방법)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 언제든지 위치기반서비스 이용에 대한 동의를 철회할 수 있습니다.</li>
            <li>회원은 자신의 위치정보 수집·이용·제공 사실의 확인 및 정정을 요청할 수 있습니다.</li>
            <li>철회·확인·정정 요청은 마이페이지 또는 help@dewy-wedding.com을 통해 가능합니다.</li>
          </ol>
        </Section>

        <Section title="제7조 (8세 이하의 아동 등의 보호의무자의 권리·의무)">
          회사는 8세 이하의 아동, 피성년후견인, 장애인복지법 제2조 제2항 제2호에 따른 정신적 장애가
          있는 자로서 장애인고용촉진 및 직업재활법 제2조 제2호에 따른 중증 장애인에 해당하는 자(보호의
          무자가 동의하는 경우에 한함)에 대한 위치정보 처리 시 보호의무자의 동의를 받습니다.
        </Section>

        <Section title="제8조 (회사의 면책사유)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 천재지변·전쟁·서비스 설비 장애 등 회사의 통제를 벗어난 사유로 인한 서비스 중단에
              대해 책임을 지지 않습니다.</li>
            <li>회원의 단말기 환경, GPS 정밀도 등으로 인한 위치정보의 오차에 대해 회사는 책임을 지지
              않습니다.</li>
          </ol>
        </Section>

        <Section title="제9조 (위치정보관리책임자)">
          <table className="w-full text-[12px] border-collapse">
            <tbody>
              <tr>
                <td className="border border-border p-2 font-semibold w-1/3">성명</td>
                <td className="border border-border p-2">김효은</td>
              </tr>
              <tr>
                <td className="border border-border p-2 font-semibold">직책</td>
                <td className="border border-border p-2">대표자</td>
              </tr>
              <tr>
                <td className="border border-border p-2 font-semibold">이메일</td>
                <td className="border border-border p-2">help@dewy-wedding.com</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="부칙">
          본 약관은 2026년 5월 1일부터 시행됩니다.
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

export default LocationTerms;
