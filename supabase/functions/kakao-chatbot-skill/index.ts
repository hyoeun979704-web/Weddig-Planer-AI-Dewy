import { corsHeaders } from "../_shared/cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";


const APP_URL = Deno.env.get("DEWY_APP_URL") ?? "https://dewy.kr";
const APP_LOGO_URL = Deno.env.get("DEWY_LOGO_URL") ??
  `${APP_URL}/dewy-logo.png`;

type SkillButton = {
  label: string;
  action: "webLink" | "message" | "block" | "phone" | "share" | "operator";
  webLinkUrl?: string;
  messageText?: string;
  blockId?: string;
  phoneNumber?: string;
};

type SkillOutput =
  | { simpleText: { text: string } }
  | {
      basicCard: {
        title?: string;
        description?: string;
        thumbnail?: { imageUrl: string };
        buttons?: SkillButton[];
      };
    }
  | {
      listCard: {
        header: { title: string };
        items: Array<{
          title: string;
          description?: string;
          imageUrl?: string;
          link?: { web: string };
        }>;
        buttons?: SkillButton[];
      };
    };

type QuickReply = {
  label: string;
  action: "message" | "block";
  messageText?: string;
  blockId?: string;
};

function skillResponse(outputs: SkillOutput[], quickReplies?: QuickReply[]) {
  return {
    version: "2.0",
    template: {
      outputs,
      ...(quickReplies && quickReplies.length > 0 ? { quickReplies } : {}),
    },
  };
}

const installButton: SkillButton = {
  label: "Dewy 앱 열기",
  action: "webLink",
  webLinkUrl: APP_URL,
};

const defaultQuickReplies: QuickReply[] = [
  { label: "서비스 소개", action: "message", messageText: "서비스 소개" },
  { label: "주요 기능", action: "message", messageText: "주요 기능" },
  { label: "요금 안내", action: "message", messageText: "요금 안내" },
  { label: "앱 설치", action: "message", messageText: "앱 설치" },
];

function welcome() {
  return skillResponse(
    [
      {
        basicCard: {
          title: "Dewy — AI 웨딩 플래너",
          description:
            "예비 부부의 모든 결혼 준비를 AI가 함께해요.\n일정·예산·업체 매칭까지 한 번에!",
          thumbnail: { imageUrl: APP_LOGO_URL },
          buttons: [installButton],
        },
      },
    ],
    defaultQuickReplies,
  );
}

function about() {
  return skillResponse(
    [
      {
        simpleText: {
          text:
            "Dewy는 AI 웨딩 플래너 서비스예요.\n\n" +
            "• 결혼 준비 일정/체크리스트 자동 생성\n" +
            "• 예산 시뮬레이션과 카테고리별 추천\n" +
            "• 스튜디오·드레스·메이크업·식장 매칭\n" +
            "• 커플 공유 가계부와 할 일 관리\n\n" +
            "지금 앱에서 무료로 시작해보세요!",
        },
      },
      {
        basicCard: {
          title: "Dewy 앱에서 시작하기",
          description: "회원가입 후 첫 AI 상담 5회는 무료에요.",
          thumbnail: { imageUrl: APP_LOGO_URL },
          buttons: [installButton],
        },
      },
    ],
    defaultQuickReplies,
  );
}

function features() {
  return skillResponse(
    [
      {
        listCard: {
          header: { title: "Dewy 주요 기능" },
          items: [
            {
              title: "AI 웨딩 플래너",
              description: "대화형으로 일정·예산·할 일을 자동 정리",
              imageUrl: APP_LOGO_URL,
            },
            {
              title: "업체 매칭",
              description: "스튜디오·드레스·메이크업·식장 큐레이션",
            },
            {
              title: "커플 공유",
              description: "예비 신랑/신부가 함께 보는 일정·가계부",
            },
            {
              title: "스마트 체크리스트",
              description: "결혼식 D-day 기준 자동 진행 체크",
            },
          ],
          buttons: [installButton],
        },
      },
    ],
    defaultQuickReplies,
  );
}

function pricing() {
  return skillResponse(
    [
      {
        simpleText: {
          text:
            "💍 요금 안내\n\n" +
            "• 무료: 가입 즉시 / AI 상담 하루 5회\n" +
            "• 프리미엄: 무제한 AI 상담 + 고급 기능\n\n" +
            "자세한 플랜과 결제는 앱에서 확인하실 수 있어요.",
        },
      },
      {
        basicCard: {
          title: "프리미엄 둘러보기",
          description: "앱에서 7일 무료 체험을 받아보세요.",
          thumbnail: { imageUrl: APP_LOGO_URL },
          buttons: [installButton],
        },
      },
    ],
    defaultQuickReplies,
  );
}

function install() {
  return skillResponse(
    [
      {
        basicCard: {
          title: "Dewy 앱 설치/실행",
          description:
            "아래 버튼을 누르면 Dewy 웹앱이 열리며,\n홈 화면에 추가하면 앱처럼 사용할 수 있어요.",
          thumbnail: { imageUrl: APP_LOGO_URL },
          buttons: [
            installButton,
            {
              label: "카카오로 로그인",
              action: "webLink",
              webLinkUrl: `${APP_URL}/auth`,
            },
          ],
        },
      },
    ],
    defaultQuickReplies,
  );
}

function fallback() {
  return skillResponse(
    [
      {
        simpleText: {
          text:
            "죄송해요, 아직 학습 중인 질문이에요. 😅\n" +
            "Dewy 앱에서는 AI 플래너가 더 자세히 도와드릴 수 있어요.",
        },
      },
      {
        basicCard: {
          title: "Dewy 앱에서 물어보기",
          description: "AI 웨딩 플래너에게 직접 질문해보세요.",
          thumbnail: { imageUrl: APP_LOGO_URL },
          buttons: [installButton],
        },
      },
    ],
    defaultQuickReplies,
  );
}

function routeByKeyword(utterance: string) {
  const text = utterance.replace(/\s+/g, "").toLowerCase();
  if (/(시작|안녕|hi|hello|처음|시작하기)/.test(text)) return welcome();
  if (/(서비스|소개|dewy|듀이|뭐야|뭐예요|무엇)/.test(text)) return about();
  if (/(기능|할수있는|기능안내|feature)/.test(text)) return features();
  if (/(요금|가격|결제|구독|프리미엄|얼마|price)/.test(text)) return pricing();
  if (/(앱|설치|다운|시작하기|링크|실행|install|app)/.test(text)) return install();
  return fallback();
}

function routeByAction(actionName: string) {
  switch (actionName) {
    case "welcome":
    case "fallback_welcome":
      return welcome();
    case "about":
      return about();
    case "features":
      return features();
    case "pricing":
      return pricing();
    case "install":
      return install();
    case "fallback":
      return fallback();
    default:
      return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, name: "kakao-chatbot-skill" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const actionName: string = body?.action?.name ?? "";
    const utterance: string = body?.userRequest?.utterance ?? "";

    const byAction = actionName ? routeByAction(actionName) : null;
    const result = byAction ?? routeByKeyword(utterance);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify(fallback()), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
