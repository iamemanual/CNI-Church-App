package com.allsaints.church

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

/**
 * Authentic MainActivity from Church Companion APK (v04092030).
 * Edge-to-Edge WebView container hosting the authentic Church Companion web assets
 * while providing deep integration to native Kotlin services via WebAppBridgeInterface.
 */
class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
        private const val FILE_CHOOSER_REQUEST_CODE = 1001
    }

    private lateinit var webView: WebView
    private lateinit var bridge: WebAppBridgeInterface

    private var connectivityManager: ConnectivityManager? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var syncStatusReceiver: BroadcastReceiver? = null

    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionRequest: PermissionRequest? = null

    private var currentTopInsetDp: Int = 0
    private var currentBottomInsetDp: Int = 0

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.i(TAG, "Starting Church Companion Native Android App (Edge-to-Edge)...")

        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.auto(Color.TRANSPARENT, Color.TRANSPARENT)
        )

        applyTrueEdgeToEdgeFullscreen()

        bridge = WebAppBridgeInterface(this)

        val initialBg = Color.parseColor("#030B18")
        window.decorView.setBackgroundColor(initialBg)

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(initialBg)
        }
        setContentView(webView)

        configureWebView()
        setupWindowInsetsListener()
        setupNetworkMonitoring()
        registerSyncBroadcastReceiver()
        setupBackNavigation()

        webView.loadUrl("file:///android_asset/index.html")
    }

    private fun applyTrueEdgeToEdgeFullscreen() {
        WindowCompat.setDecorFitsSystemWindows(window, false)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.isNavigationBarContrastEnforced = false
            window.isStatusBarContrastEnforced = false
        }

        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.displayZoomControls = false
        settings.builtInZoomControls = false
        settings.setSupportZoom(false)
        settings.mediaPlaybackRequiresUserGesture = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.safeBrowsingEnabled = false
        }

        // Add native bridge bindings
        webView.addJavascriptInterface(bridge, "bridge")
        webView.addJavascriptInterface(bridge, "AndroidBridge")
        webView.addJavascriptInterface(bridge, "AndroidApp")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("http://") || url.startsWith("https://")) {
                    if (url.contains("localhost") || url.contains("127.0.0.1") || url.contains("supabase.co")) {
                        return false
                    }
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        return true
                    } catch (e: Exception) {
                        Log.e(TAG, "Error launching external browser: $url", e)
                    }
                }
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectSafeAreaInsets(currentTopInsetDp, currentBottomInsetDp)
                broadcastNetworkStateToJs(bridge.isDeviceOnline())
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback
                launchFileChooserIntent()
                return true
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                pendingPermissionRequest = request
                request?.resources?.forEach { res ->
                    if (res == PermissionRequest.RESOURCE_VIDEO_CAPTURE) {
                        bridge.requestCameraPermission()
                    }
                }
                request?.grant(request.resources)
            }
        }
    }

    private fun launchFileChooserIntent() {
        try {
            val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                type = "*/*"
                addCategory(Intent.CATEGORY_OPENABLE)
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            }
            @Suppress("DEPRECATION")
            startActivityForResult(Intent.createChooser(intent, "Select File"), FILE_CHOOSER_REQUEST_CODE)
        } catch (e: Exception) {
            Log.e(TAG, "Error launching file chooser", e)
            fileChooserCallback?.onReceiveValue(null)
            fileChooserCallback = null
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                val clipData = data.clipData
                val uriList = mutableListOf<Uri>()
                if (clipData != null) {
                    for (i in 0 until clipData.itemCount) {
                        uriList.add(clipData.getItemAt(i).uri)
                    }
                } else {
                    data.data?.let { uriList.add(it) }
                }
                fileChooserCallback?.onReceiveValue(uriList.toTypedArray())
            } else {
                fileChooserCallback?.onReceiveValue(null)
            }
            fileChooserCallback = null
        }
    }

    private fun setupWindowInsetsListener() {
        ViewCompat.setOnApplyWindowInsetsListener(window.decorView) { _, insets ->
            val systemBars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            val density = resources.displayMetrics.density

            currentTopInsetDp = if (density > 0) (systemBars.top / density).toInt() else systemBars.top
            currentBottomInsetDp = if (density > 0) (systemBars.bottom / density).toInt() else systemBars.bottom

            injectSafeAreaInsets(currentTopInsetDp, currentBottomInsetDp)
            insets
        }
        ViewCompat.requestApplyInsets(window.decorView)
    }

    private fun injectSafeAreaInsets(top: Int, bottom: Int) {
        val script = """
            (function() {
                var topVal = '${top}px';
                var botVal = '${bottom}px';
                document.documentElement.style.setProperty('--safe-area-top', topVal);
                document.documentElement.style.setProperty('--safe-area-bottom', botVal);
                var iframes = document.querySelectorAll('iframe');
                iframes.forEach(function(f) {
                    try {
                        if (f.contentDocument && f.contentDocument.documentElement) {
                            f.contentDocument.documentElement.style.setProperty('--safe-area-top', topVal);
                            f.contentDocument.documentElement.style.setProperty('--safe-area-bottom', botVal);
                        }
                    } catch(e) {}
                });
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }


    fun updateSystemBarsTheme(isLight: Boolean) {
        runOnUiThread {
            try {
                val insetsController = WindowCompat.getInsetsController(window, window.decorView)
                insetsController.isAppearanceLightStatusBars = isLight
                insetsController.isAppearanceLightNavigationBars = isLight

                val bgColor = if (isLight) Color.parseColor("#FCFAF7") else Color.parseColor("#030B18")
                window.decorView.setBackgroundColor(bgColor)
                webView.setBackgroundColor(bgColor)

                window.statusBarColor = Color.TRANSPARENT
                window.navigationBarColor = Color.TRANSPARENT
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    window.isNavigationBarContrastEnforced = false
                    window.isStatusBarContrastEnforced = false
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error updating system bars theme", e)
            }
        }
    }

    fun setFullscreenMode(fullscreen: Boolean) {
        runOnUiThread {
            try {
                val insetsController = WindowCompat.getInsetsController(window, window.decorView)
                if (fullscreen) {
                    insetsController.systemBarsBehavior =
                        WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    insetsController.hide(WindowInsetsCompat.Type.systemBars())
                } else {
                    insetsController.show(WindowInsetsCompat.Type.systemBars())
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error toggling fullscreen", e)
            }
        }
    }

    private fun setupNetworkMonitoring() {
        try {
            connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            val request = NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build()

            networkCallback = object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    runOnUiThread { broadcastNetworkStateToJs(true) }
                }

                override fun onLost(network: Network) {
                    runOnUiThread { broadcastNetworkStateToJs(false) }
                }
            }
            connectivityManager?.registerNetworkCallback(request, networkCallback!!)
        } catch (e: Exception) {
            Log.e(TAG, "Error registering network callback", e)
        }
    }

    private fun broadcastNetworkStateToJs(isOnline: Boolean) {
        val script = """
            (function() {
                window.isNativeOnline = $isOnline;
                var event = new CustomEvent('network_status_change', { detail: { online: $isOnline } });
                window.dispatchEvent(event);
                if (window.updateNetworkBanner) {
                    window.updateNetworkBanner($isOnline);
                }
            })();
        """.trimIndent()
        webView.evaluateJavascript(script, null)
    }


    private fun registerSyncBroadcastReceiver() {
        syncStatusReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == "org.cni.churchcompanion.SYNC_STATUS_CHANGED") {
                    val script = "if (window.onNativeSyncCompleted) window.onNativeSyncCompleted();"
                    webView.evaluateJavascript(script, null)
                }
            }
        }
        val filter = IntentFilter("org.cni.churchcompanion.SYNC_STATUS_CHANGED")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(syncStatusReceiver, filter, RECEIVER_NOT_EXPORTPORTED_COMPAT)
        } else {
            registerReceiver(syncStatusReceiver, filter)
        }
    }

    private val RECEIVER_NOT_EXPORTPORTED_COMPAT: Int
        get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) Context.RECEIVER_NOT_EXPORTED else 0

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val script = """
                    (function() {
                        if (typeof window.handleAppBackAction === 'function' && window.handleAppBackAction()) {
                            return 'HANDLED';
                        }
                        var pdf = document.getElementById('pdfReaderScreen');
                        if (pdf && !pdf.classList.contains('hidden')) {
                            if (typeof window.closePdfBook === 'function') {
                                window.closePdfBook();
                            } else {
                                pdf.classList.add('hidden');
                            }
                            if (typeof window.switchTab === 'function') {
                                window.switchTab('viewHome', true);
                            }
                            return 'PDF_CLOSED';
                        }
                        var modal = document.querySelector('.modal.active, .modal.show, [data-modal].active, .dialog-overlay.active, .modal-overlay:not(.hidden)');
                        if (modal) {
                            modal.classList.add('hidden');
                            modal.classList.remove('active', 'show');
                            document.body.classList.remove('modal-open');
                            var closeBtn = modal.querySelector('.close-modal, .modal-close, [data-dismiss]');
                            if (closeBtn) {
                                try { closeBtn.click(); } catch(e){}
                            }
                            return 'MODAL_CLOSED';
                        }
                        var drawer = document.querySelector('.drawer.open, .sidebar.open, #sidebar.active, .nav-drawer.active');
                        if (drawer) {
                            drawer.classList.remove('open', 'active');
                            return 'DRAWER_CLOSED';
                        }
                        var activeView = document.querySelector('.view-panel.active, .tab-pane.active');
                        if (activeView && activeView.id !== 'viewHome' && activeView.id !== 'home') {
                            if (typeof window.switchTab === 'function') {
                                window.switchTab('viewHome', true);
                                return 'NAVIGATED_HOME';
                            }
                        }
                        return 'EXIT_APP';
                    })();
                """.trimIndent()

                webView.evaluateJavascript(script) { result ->
                    val clean = result?.replace("\"", "")?.trim() ?: "EXIT_APP"
                    if (clean == "EXIT_APP") {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })
    }

    fun evaluateJavascript(script: String) {
        runOnUiThread {
            webView.evaluateJavascript(script, null)
        }
    }

    override fun onResume() {
        super.onResume()
        cleanPendingUpdateApks()
    }

    private fun cleanPendingUpdateApks() {
        try {
            val updatesDir = java.io.File(filesDir, "updates")
            if (updatesDir.exists() && updatesDir.isDirectory) {
                updatesDir.listFiles()?.forEach { file ->
                    if (file.name.endsWith(".apk", ignoreCase = true)) {
                        file.delete()
                        Log.i(TAG, "Cleaned up residual update APK from internal storage: ${file.name}")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error cleaning update APKs", e)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        networkCallback?.let { connectivityManager?.unregisterNetworkCallback(it) }
        syncStatusReceiver?.let { unregisterReceiver(it) }
        webView.removeJavascriptInterface("bridge")
        webView.removeJavascriptInterface("AndroidBridge")
        webView.removeJavascriptInterface("AndroidApp")
        webView.destroy()
    }
}
