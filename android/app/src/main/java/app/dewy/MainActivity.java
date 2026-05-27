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
        final int top = safeAreaTopPx;
        final int bottom = safeAreaBottomPx;

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
