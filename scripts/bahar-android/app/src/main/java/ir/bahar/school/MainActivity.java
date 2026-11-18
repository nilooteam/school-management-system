package ir.bahar.school;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.view.View;

import java.util.Locale;

/**
 * بهار | سامانه مدیریت هنرستان — پوسته اندروید
 *
 * آدرس نصب بهار را در SERVER_URL تنظیم کنید. فقط همان مبدأ داخل برنامه
 * باز می‌شود؛ لینک‌های وب بیرونی در مرورگر و طرح‌های ناشناخته مسدود می‌شوند.
 */
public class MainActivity extends Activity {

    // آدرس واقعی نصب مدرسه را پیش از انتشار جایگزین کنید.
    private static final String SERVER_URL = "https://bahar.example.com";
    private static final int FILE_CHOOSER_REQUEST = 57001;

    private WebView webView;
    private ProgressBar progressBar;
    private View errorPane;
    private String loadedUrl;
    private ValueCallback<Uri[]> filePathCallback;
    private long lastBackPress = 0L;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        progressBar = findViewById(R.id.progress);
        errorPane = findViewById(R.id.error_pane);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        // انتخاب فایل از طریق FileChooser انجام می‌شود؛ دسترسی مستقیم file:// لازم نیست.
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, false);

        webView.setWebViewClient(new BaharWebViewClient());
        webView.setWebChromeClient(new BaharChromeClient());
        webView.setDownloadListener(new BaharDownloadListener());
        findViewById(R.id.retry_button).setOnClickListener(v -> loadHome());

        if (savedInstanceState != null) {
            loadedUrl = savedInstanceState.getString("loadedUrl", SERVER_URL);
            if (webView.restoreState(savedInstanceState) == null) {
                loadHome();
            }
        } else {
            loadHome();
        }
    }

    private void loadHome() {
        errorPane.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        loadedUrl = SERVER_URL;
        webView.loadUrl(SERVER_URL);
    }

    private boolean isSameOrigin(Uri candidate) {
        Uri server = Uri.parse(SERVER_URL);
        String candidateScheme = candidate.getScheme() == null ? "" : candidate.getScheme().toLowerCase(Locale.ROOT);
        String serverScheme = server.getScheme() == null ? "" : server.getScheme().toLowerCase(Locale.ROOT);
        String candidateHost = candidate.getHost() == null ? "" : candidate.getHost().toLowerCase(Locale.ROOT);
        String serverHost = server.getHost() == null ? "" : server.getHost().toLowerCase(Locale.ROOT);
        int candidatePort = candidate.getPort() == -1 ? defaultPort(candidateScheme) : candidate.getPort();
        int serverPort = server.getPort() == -1 ? defaultPort(serverScheme) : server.getPort();

        return (candidateScheme.equals("https") || candidateScheme.equals("http"))
                && candidateScheme.equals(serverScheme)
                && candidateHost.equals(serverHost)
                && candidatePort == serverPort;
    }

    private int defaultPort(String scheme) {
        if ("https".equals(scheme)) return 443;
        if ("http".equals(scheme)) return 80;
        return -1;
    }

    private class BaharWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handleUrl(request.getUrl());
        }

        @SuppressWarnings("deprecation")
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleUrl(Uri.parse(url));
        }

        private boolean handleUrl(Uri uri) {
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (("https".equals(scheme) || "http".equals(scheme)) && isSameOrigin(uri)) {
                return false;
            }
            if ("https".equals(scheme) || "http".equals(scheme)
                    || "tel".equals(scheme) || "mailto".equals(scheme)) {
                openExternal(uri);
            }
            // طرح‌هایی مانند javascript:, file: و intent: از WebView خارج نمی‌شوند.
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            progressBar.setVisibility(View.VISIBLE);
            errorPane.setVisibility(View.GONE);
            loadedUrl = url;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            progressBar.setVisibility(View.GONE);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                showError();
            }
        }

        @SuppressWarnings("deprecation")
        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            // سازگاری با پیاده‌سازی‌های قدیمی WebView
            if (failingUrl != null && failingUrl.equals(loadedUrl)) {
                showError();
            }
        }
    }

    private void openExternal(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, R.string.no_app_for_link, Toast.LENGTH_SHORT).show();
        }
    }

    private void showError() {
        webView.setVisibility(View.GONE);
        errorPane.setVisibility(View.VISIBLE);
        progressBar.setVisibility(View.GONE);
    }

    private class BaharChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(null);
            }
            filePathCallback = callback;
            try {
                Intent intent = params.createIntent();
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                return true;
            } catch (ActivityNotFoundException | IllegalArgumentException e) {
                filePathCallback.onReceiveValue(null);
                filePathCallback = null;
                Toast.makeText(MainActivity.this, R.string.no_app_for_file, Toast.LENGTH_SHORT).show();
                return false;
            }
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            callback.invoke(origin, false, false);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST) return;

        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int i = 0; i < count; i++) {
                    results[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else if (data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
        }
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    private class BaharDownloadListener implements DownloadListener {
        @Override
        public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                    String mimeType, long contentLength) {
            Uri uri = Uri.parse(url);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!"https".equals(scheme) && !"http".equals(scheme)) {
                Toast.makeText(MainActivity.this, R.string.download_failed, Toast.LENGTH_SHORT).show();
                return;
            }

            try {
                DownloadManager.Request request = new DownloadManager.Request(uri);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                String name = android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                if (mimeType != null) request.setMimeType(mimeType);
                if (userAgent != null) request.addRequestHeader("User-Agent", userAgent);
                String cookie = CookieManager.getInstance().getCookie(url);
                if (cookie != null) request.addRequestHeader("Cookie", cookie);

                DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (manager == null) throw new IllegalStateException("Download service unavailable");
                manager.enqueue(request);
                Toast.makeText(MainActivity.this, R.string.download_started, Toast.LENGTH_SHORT).show();
            } catch (Exception e) {
                Toast.makeText(MainActivity.this, R.string.download_failed, Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (errorPane.getVisibility() == View.VISIBLE) {
            handleExitBackPress();
            return;
        }
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        handleExitBackPress();
    }

    private void handleExitBackPress() {
        long now = System.currentTimeMillis();
        if (now - lastBackPress <= 2000L) {
            finish();
        } else {
            lastBackPress = now;
            Toast.makeText(this, R.string.exit_hint, Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) webView.saveState(outState);
        outState.putString("loadedUrl", loadedUrl);
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }
        if (webView != null) {
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
