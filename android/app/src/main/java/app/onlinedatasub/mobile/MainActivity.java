package app.onlinedatasub.mobile;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Native shell polish:
 * - Disable WebView overscroll bounce
 * - Show branded offline.html when the remote server fails to load
 */
public class MainActivity extends BridgeActivity {
    private static final String OFFLINE_ASSET = "file:///android_asset/public/offline.html";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleNativeAuthPlugin.class);
        registerPlugin(BiometricAuthPlugin.class);
        super.onCreate(savedInstanceState);

        Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        WebView webView = bridge.getWebView();
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        // Wrap Capacitor's client so main-frame load failures show our UI, not Chrome's.
        webView.setWebViewClient(
            new BridgeWebViewClient(bridge) {
                @Override
                public void onReceivedError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceError error
                ) {
                    if (request != null && request.isForMainFrame()) {
                        view.stopLoading();
                        view.loadUrl(OFFLINE_ASSET);
                        return;
                    }
                    super.onReceivedError(view, request, error);
                }

                @Override
                @SuppressWarnings("deprecation")
                public void onReceivedError(
                    WebView view,
                    int errorCode,
                    String description,
                    String failingUrl
                ) {
                    // Pre-API 23 path
                    view.stopLoading();
                    view.loadUrl(OFFLINE_ASSET);
                }
            }
        );
    }
}
