import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const Terms = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background max-w-[430px] mx-auto relative">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1" aria-label="뒤로">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground">이용약관</h1>
        </div>
      </header>

      <main className="px-5 py-6 pb-24 text-[13px] leading-7 text-foreground">
        <p className="mb-4 text-muted-foreground">
          시행일: 2026년 5월 1일 · 최종 개정일: 2026년 5월 1일
        </p>

        <Section title="제1조 (목적)">
          본 약관은 듀이(이하 "회사")가 제공하는 통합 웨딩 플랫폼 서비스 'Dewy
          Wedding'(dewy-wedding.com, 이하 "서비스")의 이용과 관련하여 회사와 이용자(이하 "회원") 간의
          권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="제2조 (정의)">
          본 약관에서 사용하는 용어의 정의는 다음과 같습니다.
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>"서비스": 회사가 운영하는 웹·모바일 기반 웨딩 플랫폼 및 그에 부속된 모든 기능</li>
            <li>"회원": 본 약관에 동의하고 서비스 이용계약을 체결한 자</li>
            <li>"AI Planner": Google Gemini API 기반의 AI 챗봇 상담 서비스</li>
            <li>"AI Studio": AI 이미지 생성 및 자동화 기반의 콘텐츠 생성 서비스(드레스 피팅·메이크업
              시연·청첩장·시안·식전영상 등)</li>
            <li>"하트": AI Studio 서비스 사용을 위한 충전식 토큰</li>
            <li>"Premium": 월 정기 결제를 통한 구독형 유료 서비스</li>
            <li>"콘텐츠": 회원이 업로드한 사진·텍스트, AI가 생성한 이미지·영상·문서 등 일체</li>
          </ol>
        </Section>

        <Section title="제3조 (약관의 게시 및 개정)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 본 약관을 회원이 쉽게 확인할 수 있도록 서비스 화면에 게시합니다.</li>
            <li>회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 적용일자
              7일 전부터 공지합니다. 회원에게 불리한 개정의 경우 30일 전부터 공지합니다.</li>
            <li>회원이 개정 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제4조 (이용계약의 성립)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>이용계약은 회원이 본 약관 및 개인정보처리방침에 동의하고 회사가 정한 절차에 따라 가입
              신청을 완료한 후, 회사가 이를 승낙함으로써 성립합니다.</li>
            <li>회사는 다음 각 호의 경우 가입을 거절하거나 사후에 이용계약을 해지할 수 있습니다.
              <ul className="list-disc pl-5 mt-1">
                <li>타인의 명의·정보를 도용한 경우</li>
                <li>허위 정보를 기재한 경우</li>
                <li>14세 미만이 법정대리인의 동의 없이 가입한 경우</li>
                <li>관련 법령 또는 본 약관을 위반한 경우</li>
              </ul>
            </li>
          </ol>
        </Section>

        <Section title="제5조 (서비스 내용)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 다음 서비스를 제공합니다.
              <ul className="list-disc pl-5 mt-1">
                <li>결혼식장·스튜디오·드레스·메이크업·한복·예복·신혼여행·가전 등 통합 정보 제공</li>
                <li>예산·일정·체크리스트 등 결혼 준비 디지털 도구</li>
                <li>커뮤니티·매거진·인플루언서·후기 등 콘텐츠</li>
                <li>커머스(상품 판매·장바구니·결제·주문 관리)</li>
                <li>AI Planner (AI 챗봇 상담)</li>
                <li>AI Studio (AI 이미지 생성 및 자동 콘텐츠 생성)</li>
                <li>커플 다이어리·커플 투표 등 부가 기능</li>
              </ul>
            </li>
            <li>회사는 운영상·기술상 필요에 따라 서비스 내용을 변경할 수 있으며, 중요한 변경은 사전에
              공지합니다.</li>
          </ol>
        </Section>

        <Section title="제6조 (요금 및 결제)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사가 제공하는 유료 서비스는 다음과 같습니다.
              <ul className="list-disc pl-5 mt-1">
                <li>Premium 구독: 월 정기 결제, AI Planner 무제한 이용 등</li>
                <li>하트 충전: 1,900원 / 4,900원 / 11,900원 / 24,900원 / 54,900원 등 패키지</li>
                <li>식전영상 외주: 건별 정액 결제 (29,900원~89,900원)</li>
              </ul>
            </li>
            <li>결제는 회사가 지정한 결제대행사(PG)를 통해 카드·계좌이체·간편결제 등으로 이루어집니다.</li>
            <li>회사는 결제 시 부가가치세 등 관련 세금을 포함한 금액을 표시합니다.</li>
          </ol>
        </Section>

        <Section title="제7조 (하트 시스템)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>하트는 AI Studio 서비스 이용을 위한 충전식 토큰이며, 1 하트의 가치는 회사가 정한 환산
              기준에 따릅니다.</li>
            <li>신규 가입 시 회사가 정하는 수량의 무료 하트가 자동 적립됩니다.</li>
            <li>하트는 양도·매매·환금이 불가능합니다.</li>
            <li>충전한 하트는 서비스 정책상 충전일로부터 5년간 유효하며, 무료 적립 하트는 적립일로부터
              30일~90일 내에서 회사가 정한 기간 동안 유효합니다.</li>
            <li>회원 탈퇴 시 잔여 하트는 소멸하며, 환불되지 않습니다.</li>
            <li>부정한 방법으로 적립·획득한 하트는 회수될 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="제8조 (Premium 구독)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Premium은 월 정기 결제를 통해 AI Planner 무제한 이용, AI 견적서·예산 분석 리포트 PDF
              생성 등 추가 기능을 제공하는 유료 서비스입니다.</li>
            <li>구독은 회원이 별도로 해지하지 않는 한 매월 자동 갱신됩니다.</li>
            <li>회원은 언제든지 마이페이지에서 자동 갱신을 해지할 수 있으며, 해지 시 다음 결제 주기부터
              구독이 종료됩니다.</li>
          </ol>
        </Section>

        <Section title="제9조 (환불 정책)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>전자상거래 등에서의 소비자보호에 관한 법률에 따라 회원은 결제일로부터 7일 이내에
              청약철회를 요청할 수 있습니다. 단, 다음의 경우에는 청약철회가 제한됩니다.
              <ul className="list-disc pl-5 mt-1">
                <li>충전한 하트의 일부 또는 전부를 사용한 경우</li>
                <li>Premium 구독 사용 기간이 경과한 경우</li>
                <li>식전영상 외주 등 회원 맞춤형 서비스가 제작에 착수된 경우</li>
                <li>기타 관련 법령에서 청약철회를 제한하는 경우</li>
              </ul>
            </li>
            <li>환불은 결제 수단과 동일한 방법으로 이루어지며, 결제대행사 절차에 따라 영업일 3~7일 내
              처리됩니다.</li>
          </ol>
        </Section>

        <Section title="제10조 (사진 업로드 및 AI 결과물)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 AI Studio 서비스 이용을 위해 본인의 사진을 업로드할 수 있으며, 다음 사항을
              준수해야 합니다.
              <ul className="list-disc pl-5 mt-1">
                <li>본인의 사진만 업로드할 것</li>
                <li>타인의 사진을 본인의 동의 없이 업로드하지 않을 것</li>
                <li>14세 미만 미성년자의 사진을 법정대리인의 동의 없이 업로드하지 않을 것</li>
                <li>음란·폭력·혐오 등 부적절한 사진을 업로드하지 않을 것</li>
              </ul>
            </li>
            <li>회사는 업로드된 사진을 AI 처리 목적으로만 사용하며, 처리 완료 후 30일 이내에 자동
              삭제합니다.</li>
            <li>AI가 생성한 결과물은 다음 권리 구조를 따릅니다.
              <ul className="list-disc pl-5 mt-1">
                <li>회원은 본인이 생성한 결과물을 개인적·비영리적 목적으로 자유롭게 활용할 수 있습니다.</li>
                <li>회사는 결과물을 서비스 운영·홍보·통계·품질 개선 목적으로 활용할 수 있습니다(개인을
                  특정할 수 없도록 가공한 형태에 한합니다).</li>
                <li>상업적 활용은 회사와 별도 협의가 필요합니다.</li>
              </ul>
            </li>
            <li>AI 결과물은 통계적 모델에 의해 생성되므로 실제 드레스·메이크업·예식 결과와 차이가 있을
              수 있습니다. 이는 서비스의 본질적 한계이며 환불 사유에 해당하지 않습니다.</li>
          </ol>
        </Section>

        <Section title="제11조 (회원의 의무)">
          회원은 다음 각 호의 행위를 해서는 안 됩니다.
          <ol className="list-decimal pl-5 mt-2 space-y-1">
            <li>타인의 정보를 도용하거나 허위 정보를 기재하는 행위</li>
            <li>회사의 서비스를 자동화 도구·봇 등을 이용해 비정상적으로 이용하는 행위</li>
            <li>서비스의 안정적 운영을 방해하거나 서버에 과도한 부하를 주는 행위</li>
            <li>회사의 지식재산권 또는 제3자의 권리를 침해하는 행위</li>
            <li>음란·폭력·차별·혐오·불법 정보를 등록·유포하는 행위</li>
            <li>관련 법령 또는 본 약관을 위반하는 모든 행위</li>
          </ol>
        </Section>

        <Section title="제12조 (회사의 의무 및 면책)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 안정적인 서비스 제공을 위해 노력하며, 회원의 개인정보 보호를 위해 보안 시스템을
              운영합니다.</li>
            <li>회사는 외부 AI API(예: Google Gemini, Nano Banana)를 활용하여 일부 기능을 제공하며,
              해당 외부 서비스의 장애·정책 변경으로 인한 서비스 중단·변경에 대해 회사가 통제할 수 없는
              범위에서는 책임을 지지 않습니다.</li>
            <li>회사는 천재지변, 정전, 외부 공급자의 장애 등 회사의 통제를 벗어난 사유로 발생한 서비스
              중단에 대해 책임을 지지 않습니다.</li>
            <li>회사는 회원이 서비스 이용을 통해 기대하는 수익을 보장하지 않으며, 결과물에 대한 만족도는
              주관적 판단의 영역임을 회원은 동의합니다.</li>
          </ol>
        </Section>

        <Section title="제13조 (지식재산권)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>서비스에 게재된 회사의 콘텐츠(브랜드·로고·디자인·소스코드·텍스트·이미지 등)에 관한 권리는
              회사 또는 정당한 권리자에게 귀속됩니다.</li>
            <li>회원은 회사의 사전 승낙 없이 위 콘텐츠를 복제·전송·출판·배포·방송·기타 방법으로 이용하거나
              제3자에게 이용하게 해서는 안 됩니다.</li>
          </ol>
        </Section>

        <Section title="제14조 (서비스 이용 제한)">
          회사는 회원이 본 약관 또는 관련 법령을 위반한 경우, 사전 통지 없이 서비스 이용을 일시 정지하거나
          영구 제한할 수 있습니다. 중대한 위반의 경우 이용계약을 즉시 해지할 수 있습니다.
        </Section>

        <Section title="제15조 (계약 해지)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회원은 언제든지 마이페이지를 통해 회원 탈퇴를 요청할 수 있으며, 회사는 관련 법령이
              정하는 경우를 제외하고 즉시 이를 처리합니다.</li>
            <li>탈퇴 시 잔여 하트·구독 기간은 소멸하며 환불되지 않습니다.</li>
          </ol>
        </Section>

        <Section title="제16조 (분쟁 해결 및 관할)">
          <ol className="list-decimal pl-5 space-y-1">
            <li>본 약관 및 서비스 이용과 관련한 분쟁은 회사와 회원이 상호 협의를 통해 해결하는 것을
              원칙으로 합니다.</li>
            <li>협의가 이루어지지 않을 경우 관련 법령 및 대한민국 민사소송법에 따른 관할 법원에 소를
              제기할 수 있습니다.</li>
            <li>본 약관은 대한민국 법령에 따라 해석됩니다.</li>
          </ol>
        </Section>

        <Section title="부칙">
          본 약관은 2026년 5월 1일부터 시행됩니다.
        </Section>

        <p className="mt-8 text-muted-foreground text-[12px]">
          문의: help@dewy-wedding.com
        </p>
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

export default Terms;
