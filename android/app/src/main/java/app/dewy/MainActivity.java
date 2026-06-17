package app.dewy;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private int safeAreaTopPx = 0;
    private int safeAreaBottomPx = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (bridge != null) {
            bridge.addWebViewListener(new WebViewListener() {
                @Override
                public void onPageLoaded(WebView webView) {
                    applySafeAreaCssVariables(webView);
                }
            });
        }

        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            safeAreaTopPx = insets.top;
            safeAreaBottomPx = insets.bottom;
            applySafeAreaCssVariables();
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(getWindow().getDecorView());
    }

    @Override
    public void onResume() {
        super.onResume();
        applySafeAreaCssVariables();
    }

    private void applySafeAreaCssVariables() {
        if (bridge == null || bridge.getWebView() == null) return;
        applySafeAreaCssVariables(bridge.getWebView());
    }

    private void applySafeAreaCssVariables(WebView webView) {
        // WindowInsets 는 물리 픽셀(px)이지만, CSS 의 px 는 논리 픽셀(dp = 물리px / density)이다
        // (viewport: width=device-width, initial-scale=1). 변환 없이 물리px 를 CSS px 로 주입하면
        // 고밀도 기기에서 안전영역이 density 배(예: 2.75x)로 부풀어, 하단탭 padding-bottom 이 과도해져
        // 탭이 화면 하단에서 떠 보이고 콘텐츠 영역이 깨진다. → density 로 나눠 CSS px(dp)로 변환.
        final float density = getResources().getDisplayMetrics().density;
        final float topDp = density > 0 ? safeAreaTopPx / density : safeAreaTopPx;
        final float bottomDp = density > 0 ? safeAreaBottomPx / density : safeAreaBottomPx;
        final String top = String.format(java.util.Locale.US, "%.2f", topDp);
        final String bottom = String.format(java.util.Locale.US, "%.2f", bottomDp);

        webView.post(() -> webView.evaluateJavascript(
            "(() => {" +
                "const root = document.documentElement;" +
                "if (!root) return;" +
                "root.style.setProperty('--android-safe-area-top', '" + top + "px');" +
                "root.style.setProperty('--android-safe-area-bottom', '" + bottom + "px');" +
            "})();",
            null
        ));
    }
}
