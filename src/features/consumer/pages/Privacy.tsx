import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import PageHeader from "@/components/PageHeader";

const Privacy = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background app-col mx-auto relative">
      <PageHeader title="개인정보처리방침" />

      <main className="px-5 py-6 pb-24 text-[13px] leading-7 text-foreground">
        <p className="mb-4 text-muted-foreground">
          시행일: 2026년 5월 1일 · 최종 개정일: 2026년 5월 1일
        </p>

        <p className="mb-6">
          듀이(이하 "회사")는 「개인정보 보호법」 등 관련 법령을 준수하며, 회원의 개인정보를 안전하게
          보호하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        <Section title="1. 개인정보의 처리 목적">
          회사는 다음의 목적을 위해 개인정보를 처리하며, 다른 용도로는 이용하지 않습니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>회원 가입 및 본인 확인</li>
            <li>서비스 제공 및 콘텐츠 생성(AI Planner·AI Studio·예산·일정 등)</li>
            <li>요금 결제·정산 및 환불 처리</li>
            <li>고객 문의 응대 및 분쟁 처리</li>
            <li>서비스 개선·통계 분석·이용 패턴 분석</li>
            <li>법령상 의무 이행</li>
          </ul>
        </Section>

        <Section title="2. 수집하는 개인정보의 항목">
          <SubTitle>가. 회원가입 시 수집</SubTitle>
          <ul className="list-disc pl-5 space-y-1">
            <li>필수: 이메일, 비밀번호(암호화 저장), 생년월일(만 14세 이상 확인용)</li>
            <li>선택: 닉네임, 프로필 사진, 휴대전화번호, 결혼 예정일, 거주 지역</li>
          </ul>

          <SubTitle>나. 결제 시 수집</SubTitle>
          <ul className="list-disc pl-5 space-y-1">
            <li>결제 수단 정보(결제대행사가 처리, 회사는 미보관)</li>
            <li>결제 내역, 결제 일시, 결제 금액</li>
          </ul>

          <SubTitle>다. AI Studio 이용 시 수집 (민감정보 포함)</SubTitle>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원이 직접 업로드한 얼굴·전신 사진</li>
            <li>드레스·메이크업 등 선택한 옵션 정보</li>
            <li>생성된 결과 이미지</li>
          </ul>
          <p className="mt-2 text-[12px] text-muted-foreground">
            ※ 얼굴 사진은 「개인정보 보호법」상 개인정보에 해당하므로 별도 동의를 받습니다.
          </p>

          <SubTitle>라. AI Planner 이용 시 수집 (민감정보 포함)</SubTitle>
          <ul className="list-disc pl-5 space-y-1">
            <li>채팅 내용, 입력한 결혼 정보(예식일·예산·선호도 등)</li>
            <li>맞춤 추천을 위해 회원이 직접 입력하는 임신 여부 등 건강 관련 정보</li>
            <li>대화 메모리 정보(이전 대화 요약)</li>
          </ul>
          <p className="mt-2 text-[12px] text-muted-foreground">
            ※ 임신 여부 등 건강 관련 정보는 「개인정보 보호법」상 민감정보에 해당하므로 별도 동의를 받아
            맞춤 추천 목적에 한해서만 처리하며, 입력은 선택 사항입니다.
          </p>

          <SubTitle>마. 마케팅·광고 활용 동의 시 수집</SubTitle>
          <ul className="list-disc pl-5 space-y-1">
            <li>마케팅 정보 수신 동의 여부 및 동의·철회 일시</li>
            <li>이벤트·혜택 안내 발송을 위한 연락처(이메일 등)</li>
          </ul>
          <p className="mt-2 text-[12px] text-muted-foreground">
            ※ 마케팅 활용 동의는 선택 사항이며, 동의하지 않아도 서비스 이용에 제한이 없습니다. 동의는
            언제든지 철회할 수 있습니다.
          </p>

          <SubTitle>바. 자동 수집 정보</SubTitle>
          <ul className="list-disc pl-5 space-y-1">
            <li>접속 IP, 접속 일시, 서비스 이용 기록</li>
            <li>기기 정보(OS, 브라우저, 디바이스 모델)</li>
            <li>쿠키, 세션 정보</li>
          </ul>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간">
          <p className="mb-2">회사는 원칙적으로 개인정보 수집·이용 목적이 달성되면 지체 없이 파기합니다. 단, 다음의 경우에는 명시된 기간 동안 보관합니다.</p>
          <table className="w-full text-[12px] border-collapse mt-2">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-2 text-left">항목</th>
                <th className="border border-border p-2 text-left">보유 기간</th>
                <th className="border border-border p-2 text-left">근거</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2">회원 정보</td>
                <td className="border border-border p-2">탈퇴 시까지</td>
                <td className="border border-border p-2">본인 동의</td>
              </tr>
              <tr>
                <td className="border border-border p-2">AI Studio 업로드 사진</td>
                <td className="border border-border p-2">처리 후 30일(자동 삭제)</td>
                <td className="border border-border p-2">본인 동의</td>
              </tr>
              <tr>
                <td className="border border-border p-2">커뮤니티·커플다이어리 게시 사진</td>
                <td className="border border-border p-2">게시물 삭제 또는 탈퇴 시까지</td>
                <td className="border border-border p-2">본인 동의</td>
              </tr>
              <tr>
                <td className="border border-border p-2">AI 결과물</td>
                <td className="border border-border p-2">생성 후 30일(자동 삭제)</td>
                <td className="border border-border p-2">본인 동의</td>
              </tr>
              <tr>
                <td className="border border-border p-2">채팅 기록</td>
                <td className="border border-border p-2">탈퇴 시까지(요청 시 삭제)</td>
                <td className="border border-border p-2">서비스 운영</td>
              </tr>
              <tr>
                <td className="border border-border p-2">계약·결제 기록</td>
                <td className="border border-border p-2">5년</td>
                <td className="border border-border p-2">전자상거래법</td>
              </tr>
              <tr>
                <td className="border border-border p-2">소비자 분쟁 기록</td>
                <td className="border border-border p-2">3년</td>
                <td className="border border-border p-2">전자상거래법</td>
              </tr>
              <tr>
                <td className="border border-border p-2">접속 로그</td>
                <td className="border border-border p-2">3개월</td>
                <td className="border border-border p-2">통신비밀보호법</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="4. 개인정보의 제3자 제공">
          회사는 회원의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 다음의 경우에는 예외로
          합니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>회원이 사전에 동의한 경우</li>
            <li>법령에 의해 요구되는 경우</li>
            <li>수사기관의 적법한 요청이 있는 경우</li>
          </ul>
        </Section>

        <Section title="5. 개인정보 처리의 위탁">
          회사는 원활한 서비스 제공을 위해 다음의 업무를 외부에 위탁하고 있습니다.
          <table className="w-full text-[12px] border-collapse mt-2">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-2 text-left">수탁자</th>
                <th className="border border-border p-2 text-left">위탁 업무</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2">Supabase Inc.</td>
                <td className="border border-border p-2">데이터베이스·인증·파일 저장 인프라</td>
              </tr>
              <tr>
                <td className="border border-border p-2">OpenAI, L.L.C.</td>
                <td className="border border-border p-2">AI 이미지 생성(드레스·메이크업·청첩장 시뮬레이션)</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Google LLC</td>
                <td className="border border-border p-2">AI 챗봇·문구 추천 및 업로드 사진 품질 검사(Gemini)</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Kaleido AI GmbH (remove.bg)</td>
                <td className="border border-border p-2">청첩장 사진 배경 제거(누끼)</td>
              </tr>
              <tr>
                <td className="border border-border p-2">㈜카카오페이</td>
                <td className="border border-border p-2">결제 처리(웹 결제)</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Google LLC·Apple Inc.</td>
                <td className="border border-border p-2">인앱결제 처리(Google Play·App Store)</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Vercel Inc.</td>
                <td className="border border-border p-2">웹 호스팅·CDN</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Google Inc. (AdMob·AdSense)</td>
                <td className="border border-border p-2">광고 식별자 수집 및 맞춤형 광고 노출</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Google·Kakao (캘린더 연동 선택 시)</td>
                <td className="border border-border p-2">사용자 동의 시 일정(웨딩 일정·체크리스트) 연동</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-muted-foreground">
            회사는 위탁 시 개인정보의 안전한 처리를 위해 필요한 사항을 규정하고 감독합니다.
          </p>
        </Section>

        <Section title="6. 개인정보의 국외 이전">
          AI 처리(OpenAI 이미지 생성, Google Gemini 문구 추천, remove.bg 배경 제거)와 클라우드
          인프라(Supabase, Vercel) 이용 과정에서 회원의 개인정보가 미국 등 해외에 위치한 서버로 전송될 수
          있습니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>이전 항목: 사진(AI Studio), 채팅 내용(AI Planner), 인증·결제 정보, 서비스 이용 정보, 광고 식별자(AdMob·AdSense)</li>
            <li>이전 국가: 미국 등 (각 사업자 운영 국가)</li>
            <li>이전 시점: 서비스 이용 시점</li>
            <li>보유 기간: 본 방침의 보유 기간 또는 위탁사의 자체 기준에 따름</li>
            <li>이전받는 자의 연락처: 각 사 개인정보처리방침 페이지(OpenAI·Google·Kaleido AI·Supabase·Vercel)를
              통해 확인할 수 있습니다.</li>
            <li>이전 거부 방법: AI 기능(AI Studio·AI Planner)을 이용하지 않으면 사진·채팅 내용은
              이전되지 않습니다. 이전 거부·문의는 개인정보 보호책임자(아래 11항)에게 요청할 수
              있으며, 다만 거부 시 해당 AI 기능 이용이 제한됩니다.</li>
          </ul>
        </Section>

        <Section title="7. 정보주체의 권리·의무 및 행사 방법">
          회원은 언제든지 다음의 권리를 행사할 수 있습니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>개인정보 열람·정정·삭제·처리 정지 요청</li>
            <li>개인정보 처리에 대한 동의 철회</li>
            <li>회원 탈퇴(전체 정보 삭제)</li>
          </ul>
          <p className="mt-2">
            권리 행사는 마이페이지 또는 kheceo@dewy-wedding.com으로 요청 가능하며, 회사는 지체 없이
            처리합니다.
          </p>
        </Section>

        <Section title="8. 개인정보의 안전성 확보 조치">
          <ul className="list-disc pl-5 space-y-1">
            <li>비밀번호 암호화 저장</li>
            <li>개인정보 전송 시 SSL/TLS 암호화</li>
            <li>접근 권한 최소화 및 접근 통제</li>
            <li>업로드 사진 비공개 저장 및 30일 자동 삭제</li>
            <li>외부 침입 차단·악성 코드 방지 조치</li>
            <li>개인정보 처리 관련 내부 점검 정기 실시</li>
          </ul>
        </Section>

        <Section title="9. 자동 수집 정보 및 쿠키">
          <ol className="list-decimal pl-5 space-y-1">
            <li>회사는 서비스 운영·이용 분석을 위해 쿠키 및 유사 기술을 사용합니다.</li>
            <li>회원은 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 일부 서비스 이용이
              제한될 수 있습니다.</li>
          </ol>
        </Section>

        <Section title="10. 만 14세 미만 아동의 개인정보">
          회사는 만 14세 미만 아동의 개인정보를 수집·이용·제공하지 않는 것을 원칙으로 합니다. 부득이하게
          처리해야 하는 경우 법정대리인의 동의를 받아 진행합니다.
        </Section>

        <Section title="11. 개인정보 보호책임자">
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
                <td className="border border-border p-2">kheceo@dewy-wedding.com</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-muted-foreground">
            기타 개인정보 침해에 대한 신고·상담은 다음 기관에 문의할 수 있습니다.
          </p>
          <ul className="list-disc pl-5 mt-1 text-[12px] text-muted-foreground space-y-0.5">
            <li>개인정보 침해신고센터 (privacy.kisa.or.kr / 국번없이 118)</li>
            <li>개인정보 분쟁조정위원회 (kopico.go.kr / 1833-6972)</li>
            <li>대검찰청 사이버수사과 (spo.go.kr / 1301)</li>
            <li>경찰청 사이버수사국 (ecrm.cyber.go.kr / 182)</li>
          </ul>
        </Section>

        <Section title="12. AI 서비스 이용에 관한 안내">
          회사는 결혼 준비를 돕기 위해 AI 기술을 활용합니다. 회원의 이해와 신뢰를 위해 처리 내용을
          다음과 같이 투명하게 안내합니다.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <span className="font-semibold">활용 기능:</span> AI Planner(맞춤 상담·추천), AI
              Studio(드레스·메이크업·청첩장 등 이미지 생성), 문구·배경 자동 처리
            </li>
            <li>
              <span className="font-semibold">AI에 입력되는 정보:</span> 회원이 직접 입력·업로드한 정보에
              한합니다. — AI Planner: 채팅 내용, 입력한 결혼 정보(예식일·예산·지역·선호도 등), 대화 메모리 /
              AI Studio: 업로드한 얼굴·전신 사진, 선택한 옵션
            </li>
            <li>
              <span className="font-semibold">처리 위탁·국외 이전:</span> 위 정보는 추천·생성 처리를 위해
              OpenAI(이미지), Google Gemini(문구·추천), remove.bg(배경 제거) 등 위탁사로 전달되어 미국 등
              해외 서버에서 처리될 수 있습니다(제5항·제6항 참조).
            </li>
            <li>
              <span className="font-semibold">목적 제한:</span> AI에 전달된 정보는 기본적으로 회원이 요청한
              추천·생성 결과를 제공하기 위한 목적으로 이용합니다. 마케팅(이벤트·혜택 안내) 및 서비스·AI 추천
              품질 개선 목적의 활용은 회원이 별도로 동의한 경우에 한하며, 동의는 설정에서 언제든지 철회할 수
              있습니다(미동의 시 위 목적으로 이용하지 않음). 회사는 회원의 입력 정보를 외부 AI 모델 학습
              목적으로 제공하지 않습니다.
            </li>
            <li>
              <span className="font-semibold">결과의 한계:</span> AI가 제공하는 추천·견적·생성 이미지는
              참고용이며, 정확성·완전성·특정 목적에의 적합성을 보장하지 않습니다. 최종 결정과 계약은 회원이
              직접 확인 후 진행해야 합니다.
            </li>
            <li>
              <span className="font-semibold">선택권:</span> AI 기능 이용은 선택 사항입니다. 민감정보(얼굴
              사진, 건강 관련 정보 등)는 별도 동의 시에만 처리되며, 동의하지 않아도 일반 서비스 이용에는
              제한이 없습니다.
            </li>
            <li>
              <span className="font-semibold">보관·삭제:</span> AI에 업로드한 사진은 처리 후 30일 내 자동
              삭제되며, 생성 결과·대화 기록은 제3항의 보유 기간을 따릅니다. 회원은 언제든지 열람·삭제를
              요청할 수 있습니다(제7항).
            </li>
          </ul>
          <p className="mt-2 text-[12px] text-muted-foreground">
            ※ AI 추천·생성은 자동화된 처리로 제공되며, 회원에게 법적·재산적으로 중대한 영향을 미치는 결정을
            AI가 단독으로 내리지 않습니다. AI 처리에 관한 문의·거부는 kheceo@dewy-wedding.com으로 요청할 수
            있습니다.
          </p>
        </Section>

        <Section title="13. 개인정보처리방침의 변경">
          본 방침은 2026년 5월 1일부터 적용되며, 변경 시 변경 내용을 적용일 7일 전부터 서비스 화면에
          공지합니다. 회원에게 불리한 변경의 경우 30일 전부터 공지합니다.
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

const SubTitle = ({ children }: { children: ReactNode }) => (
  <h3 className="text-[13px] font-semibold mt-3 mb-1 text-foreground">{children}</h3>
);

export default Privacy;
