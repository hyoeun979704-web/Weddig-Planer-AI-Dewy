import type { CapacitorConfig } from '@capacitor/cli';

// 환경변수 CAP_DEV_SERVER_URL 로 "라이브 리로드 모드"를 토글한다.
//   - 미지정(기본, `npm run cap:build`): 번들된 dist/를 그대로 띄움.
//   - 지정 시: Vite dev 서버(또는 Vercel preview URL)를 그대로 띄워
//     실기기에서 핫리로드 개발이 가능. OAuth 콜백은 dev 환경에서도
//     동일한 커스텀 스킴(app.dewy://...)으로 돌아오게 한다.
const devUrl = process.env.CAP_DEV_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'app.dewy',
  appName: 'Dewy',
  // vercel.json 의 outputDirectory 와 동일한 Vite 산출물 경로.
  webDir: 'dist',
  android: {
    // Supabase 등 secure-context 전제 API가 동작하도록 mixed content 금지.
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
    ...(devUrl
      ? { url: devUrl, cleartext: devUrl.startsWith('http://') }
      : {}),
  },
};

export default config;
