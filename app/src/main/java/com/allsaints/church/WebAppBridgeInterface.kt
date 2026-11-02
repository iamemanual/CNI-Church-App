package com.allsaints.church

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.Log
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.allsaints.church.engine.ChurchApplicationEngine
import com.allsaints.church.engine.UserProfile
import com.allsaints.church.engine.UserRole
import org.json.JSONArray
import org.json.JSONObject

/**
 * Authentic WebAppBridgeInterface from Church Companion APK.
 * Bridges WebView UI to native Android subsystems:
 * - ChurchApplicationEngine (Liturgical almanac, hymnal, chat, devotionals)
 * - ChurchOfflineStore (SQLite local cache & sync queue)
 * - ChurchSyncManager (Cloud synchronization)
 * - MediaPlayer & Android Vibrator
 */
class WebAppBridgeInterface(
    private val activity: Activity,
    private val churchEngine: ChurchApplicationEngine = ChurchApplicationEngine(),
    private val offlineStore: ChurchOfflineStore = ChurchOfflineStore.getInstance(activity),
    private val syncManager: ChurchSyncManager = ChurchSyncManager.getInstance(activity)
) {

    companion object {
        const val TAG = "WebAppBridge"
    }

    private var mediaPlayer: MediaPlayer? = null

    @JavascriptInterface
    fun getAppName(): String = "Church Companion"

    @JavascriptInterface
    fun getAppVersion(): String {
        return try {
            val pInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                activity.packageManager.getPackageInfo(activity.packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                activity.packageManager.getPackageInfo(activity.packageName, 0)
            }
            pInfo.versionName ?: BuildConfig.VERSION_NAME
        } catch (e: Exception) {
            BuildConfig.VERSION_NAME
        }
    }

    @JavascriptInterface
    fun getAppVersionCode(): Long {
        return try {
            val pInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                activity.packageManager.getPackageInfo(activity.packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                activity.packageManager.getPackageInfo(activity.packageName, 0)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toLong()
            }
        } catch (e: Exception) {
            BuildConfig.VERSION_CODE.toLong()
        }
    }

    @JavascriptInterface
    fun getApkVersionCode(apkFilePath: String): Long {
        return try {
            val pInfo = activity.packageManager.getPackageArchiveInfo(apkFilePath, 0)
            if (pInfo != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    pInfo.longVersionCode
                } else {
                    @Suppress("DEPRECATION")
                    pInfo.versionCode.toLong()
                }
            } else {
                -1L
            }
        } catch (e: Exception) {
            -1L
        }
    }

    @JavascriptInterface
    fun updateSystemBars(isLight: Boolean) {
        if (activity is MainActivity) {
            activity.updateSystemBarsTheme(isLight)
        }
    }

    @JavascriptInterface
    fun updateSystemBars(themeName: String) {
        val isLight = themeName.equals("light", ignoreCase = true)
        if (activity is MainActivity) {
            activity.updateSystemBarsTheme(isLight)
        }
    }

    @JavascriptInterface
    fun setSystemBarTheme(isLight: Boolean) {
        if (activity is MainActivity) {
            activity.updateSystemBarsTheme(isLight)
        }
    }

    @JavascriptInterface
    fun setSystemBarTheme(themeName: String) {
        val isLight = themeName.equals("light", ignoreCase = true)
        if (activity is MainActivity) {
            activity.updateSystemBarsTheme(isLight)
        }
    }

    @JavascriptInterface
    fun setFullscreen(fullscreen: Boolean) {
        if (activity is MainActivity) {
            activity.setFullscreenMode(fullscreen)
        }
    }

    @JavascriptInterface
    fun setStatusBarHidden(hidden: Boolean) {
        if (activity is MainActivity) {
            activity.setStatusBarHidden(hidden)
        }
    }

    @JavascriptInterface
    fun isDeviceOnline(): Boolean = syncManager.isNetworkAvailable()

    @JavascriptInterface
    fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            activity,
            android.Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    @JavascriptInterface
    fun hasMediaPermission(): Boolean {
        val perm = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            android.Manifest.permission.READ_MEDIA_IMAGES
        } else {
            android.Manifest.permission.READ_EXTERNAL_STORAGE
        }
        return ContextCompat.checkSelfPermission(activity, perm) == PackageManager.PERMISSION_GRANTED
    }

    @JavascriptInterface
    fun requestCameraPermission() {
        ActivityCompat.requestPermissions(
            activity,
            arrayOf(android.Manifest.permission.CAMERA),
            101
        )
    }

    @JavascriptInterface
    fun requestMediaPermission() {
        val perms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            arrayOf(
                android.Manifest.permission.READ_MEDIA_IMAGES,
                android.Manifest.permission.READ_MEDIA_VIDEO,
                android.Manifest.permission.READ_MEDIA_AUDIO
            )
        } else {
            arrayOf(android.Manifest.permission.READ_EXTERNAL_STORAGE)
        }
        ActivityCompat.requestPermissions(activity, perms, 102)
    }

    @JavascriptInterface
    fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                activity,
                android.Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            NotificationManagerCompat.from(activity).areNotificationsEnabled()
        }
    }

    @JavascriptInterface
    fun requestNotificationPermission() {
        activity.runOnUiThread {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (!hasNotificationPermission()) {
                    ActivityCompat.requestPermissions(
                        activity,
                        arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                        103
                    )
                } else {
                    notifyJsNotificationPermissionResult(true)
                }
            } else {
                val enabled = NotificationManagerCompat.from(activity).areNotificationsEnabled()
                if (!enabled) {
                    openNotificationSettings()
                }
                notifyJsNotificationPermissionResult(enabled)
            }
        }
    }

    @JavascriptInterface
    fun openNotificationSettings() {
        activity.runOnUiThread {
            try {
                val intent = Intent().apply {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
                        putExtra(Settings.EXTRA_APP_PACKAGE, activity.packageName)
                    } else {
                        action = "android.settings.APP_NOTIFICATION_SETTINGS"
                        putExtra("app_package", activity.packageName)
                        putExtra("app_uid", activity.applicationInfo.uid)
                    }
                }
                activity.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Cannot open notification settings", e)
            }
        }
    }

    @JavascriptInterface
    fun showNotification(title: String, body: String) {
        showNotification(title, body, "", "open_announcements")
    }

    @JavascriptInterface
    fun showNotification(title: String, body: String, tag: String = "") {
        val action = if (tag.startsWith("timeline_")) "open_timeline" else "open_announcements"
        showNotification(title, body, tag, action)
    }

    @JavascriptInterface
    fun showNotification(title: String, body: String, tag: String, action: String) {
        activity.runOnUiThread {
            try {
                createNotificationChannels()
                val isTimeline = action == "open_timeline" || tag.startsWith("timeline_")
                val channelId = if (isTimeline) "church_timeline_channel" else "church_announcements_channel"
                val resolvedAction = if (isTimeline) "open_timeline" else "open_announcements"

                val intent = Intent(activity, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("action", resolvedAction)
                    if (tag.isNotEmpty()) {
                        putExtra("tag", tag)
                    }
                }
                val requestCode = if (tag.isNotEmpty()) (tag.hashCode() and 0x7FFFFFFF) else (if (isTimeline) 2001 else 1001)
                val pendingIntent = PendingIntent.getActivity(
                    activity,
                    requestCode,
                    intent,
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    } else {
                        PendingIntent.FLAG_UPDATE_CURRENT
                    }
                )

                val resolvedTitle = if (title.isBlank()) {
                    if (isTimeline) "New Timeline Update" else "New Announcement"
                } else {
                    title
                }

                val builder = NotificationCompat.Builder(activity, channelId)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(resolvedTitle)
                    .setContentText(body)
                    .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)

                val notificationManager = NotificationManagerCompat.from(activity)
                if (hasNotificationPermission()) {
                    val notificationId = if (tag.isNotEmpty()) (tag.hashCode() and 0x7FFFFFFF) else (if (isTimeline) 2001 else 1001)
                    notificationManager.notify(notificationId, builder.build())
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error showing native notification", e)
            }
        }
    }

    fun notifyJsNotificationPermissionResult(granted: Boolean) {
        activity.runOnUiThread {
            val script = "if (typeof window.onNativeNotificationPermissionResult === 'function') { window.onNativeNotificationPermissionResult($granted); }"
            if (activity is MainActivity) {
                activity.evaluateJavascript(script)
            }
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = activity.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // 1. Announcements Channel
            val annChannelId = "church_announcements_channel"
            val annChannelName = "Church Announcements & Notices"
            val annChannelDesc = "Alerts for church notices, prayer requests, and announcements"
            val annChannel = NotificationChannel(annChannelId, annChannelName, NotificationManager.IMPORTANCE_HIGH).apply {
                description = annChannelDesc
                enableLights(true)
                lightColor = Color.parseColor("#4997D0")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 180, 80, 180)
            }
            notificationManager.createNotificationChannel(annChannel)

            // 2. Timeline Channel
            val tlChannelId = "church_timeline_channel"
            val tlChannelName = "Parish Timeline & Milestones"
            val tlChannelDesc = "Notifications for parish heritage, milestones, and timeline updates"
            val tlChannel = NotificationChannel(tlChannelId, tlChannelName, NotificationManager.IMPORTANCE_HIGH).apply {
                description = tlChannelDesc
                enableLights(true)
                lightColor = Color.parseColor("#C59B27")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 180, 80, 180)
            }
            notificationManager.createNotificationChannel(tlChannel)
        }
    }

    private fun createNotificationChannel() {
        createNotificationChannels()
    }

    @JavascriptInterface
    fun showToast(message: String) {
        activity.runOnUiThread {
            Toast.makeText(activity, message, Toast.LENGTH_SHORT).show()
        }
    }

    @JavascriptInterface
    fun shareText(text: String, title: String = "Share Verse") {
        activity.runOnUiThread {
            try {
                val sendIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    putExtra(Intent.EXTRA_TEXT, text)
                    type = "text/plain"
                }
                val shareIntent = Intent.createChooser(sendIntent, title)
                activity.startActivity(shareIntent)
            } catch (e: Exception) {
                Log.e(TAG, "Error sharing text via AndroidBridge", e)
            }
        }
    }

    @JavascriptInterface
    fun shareImage(base64Data: String, title: String = "Share Verse Image", caption: String = "") {
        activity.runOnUiThread {
            try {
                val cleanBase64 = if (base64Data.contains(",")) {
                    base64Data.substringAfter(",")
                } else {
                    base64Data
                }
                val imageBytes = android.util.Base64.decode(cleanBase64, android.util.Base64.DEFAULT)
                val imagesDir = java.io.File(activity.cacheDir, "images")
                if (!imagesDir.exists()) {
                    imagesDir.mkdirs()
                }
                val imageFile = java.io.File(imagesDir, "verse_of_the_day.png")
                val fos = java.io.FileOutputStream(imageFile)
                fos.write(imageBytes)
                fos.flush()
                fos.close()

                val contentUri = androidx.core.content.FileProvider.getUriForFile(
                    activity,
                    "${activity.packageName}.fileprovider",
                    imageFile
                )

                val shareIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    putExtra(Intent.EXTRA_STREAM, contentUri)
                    if (caption.isNotEmpty()) {
                        putExtra(Intent.EXTRA_TEXT, caption)
                    }
                    type = "image/png"
                }
                val chooser = Intent.createChooser(shareIntent, title)
                val resInfoList = activity.packageManager.queryIntentActivities(
                    chooser,
                    android.content.pm.PackageManager.MATCH_DEFAULT_ONLY
                )
                for (resolveInfo in resInfoList) {
                    val packageName = resolveInfo.activityInfo.packageName
                    activity.grantUriPermission(
                        packageName,
                        contentUri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )
                }
                activity.startActivity(chooser)
            } catch (e: Exception) {
                Log.e(TAG, "Error sharing image via AndroidBridge", e)
                Toast.makeText(activity, "Unable to share image: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    @JavascriptInterface
    fun saveImageToGallery(base64Data: String): Boolean {
        return try {
            val cleanBase64 = if (base64Data.contains(",")) base64Data.substringAfter(",") else base64Data
            val imageBytes = android.util.Base64.decode(cleanBase64, android.util.Base64.DEFAULT)
            val bitmap = android.graphics.BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)

            val resolver = activity.contentResolver
            val contentValues = android.content.ContentValues().apply {
                put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, "Verse_${System.currentTimeMillis()}.png")
                put(android.provider.MediaStore.MediaColumns.MIME_TYPE, "image/png")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(android.provider.MediaStore.MediaColumns.RELATIVE_PATH, android.os.Environment.DIRECTORY_PICTURES + "/ChurchCompanion")
                    put(android.provider.MediaStore.MediaColumns.IS_PENDING, 1)
                }
            }

            val imageUri = resolver.insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues)
            if (imageUri != null) {
                resolver.openOutputStream(imageUri)?.use { out ->
                    bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, out)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    contentValues.clear()
                    contentValues.put(android.provider.MediaStore.MediaColumns.IS_PENDING, 0)
                    resolver.update(imageUri, contentValues, null, null)
                }
                activity.runOnUiThread {
                    Toast.makeText(activity, "Verse image saved to Gallery", Toast.LENGTH_SHORT).show()
                }
                true
            } else {
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error saving image to gallery", e)
            false
        }
    }

    @JavascriptInterface
    fun triggerVibration(ms: Long) {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager =
                    activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(ms)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Vibration failed", e)
        }
    }

    @JavascriptInterface
    fun playAudioTrack(trackUrl: String): Boolean {
        return try {
            stopAudioTrack()
            mediaPlayer = MediaPlayer().apply {
                setDataSource(trackUrl)
                prepare()
                start()
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Audio playback error: $trackUrl", e)
            false
        }
    }

    @JavascriptInterface
    fun stopAudioTrack() {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping audio", e)
        }
    }

    private var downloadThread: Thread? = null
    @Volatile private var isDownloadCancelled = false

    @JavascriptInterface
    fun downloadUpdateApk(downloadUrl: String, fileName: String = "ChurchCompanion_update.apk"): Boolean {
        if (downloadThread != null && downloadThread!!.isAlive) {
            Log.w(TAG, "Download already in progress")
            return false
        }
        isDownloadCancelled = false

        downloadThread = Thread {
            var connection: java.net.HttpURLConnection? = null
            var inputStream: java.io.InputStream? = null
            var outputStream: java.io.FileOutputStream? = null
            try {
                val updatesDir = java.io.File(activity.filesDir, "updates")
                if (!updatesDir.exists()) {
                    updatesDir.mkdirs()
                }
                val outputFile = java.io.File(updatesDir, "ChurchCompanion_update.apk")
                if (outputFile.exists()) {
                    outputFile.delete()
                }

                var currentUrl = downloadUrl
                var redirects = 0
                while (redirects < 5) {
                    val url = java.net.URL(currentUrl)
                    connection = url.openConnection() as java.net.HttpURLConnection
                    connection.connectTimeout = 15000
                    connection.readTimeout = 30000
                    connection.instanceFollowRedirects = true
                    connection.connect()

                    val responseCode = connection.responseCode
                    if (responseCode == java.net.HttpURLConnection.HTTP_MOVED_PERM ||
                        responseCode == java.net.HttpURLConnection.HTTP_MOVED_TEMP ||
                        responseCode == 307 || responseCode == 308) {
                        currentUrl = connection.getHeaderField("Location") ?: break
                        connection.disconnect()
                        redirects++
                    } else if (responseCode == java.net.HttpURLConnection.HTTP_OK) {
                        break
                    } else {
                        throw java.io.IOException("Server returned HTTP $responseCode")
                    }
                }

                val totalLength = connection!!.contentLength.toLong()
                val totalMb = if (totalLength > 0) {
                    String.format(java.util.Locale.US, "%.1f", totalLength / (1024.0 * 1024.0))
                } else {
                    "44.8"
                }

                inputStream = java.io.BufferedInputStream(connection.inputStream)
                outputStream = java.io.FileOutputStream(outputFile)

                val buffer = ByteArray(8192)
                var bytesRead: Int
                var totalBytesRead = 0L
                var lastProgressTime = 0L

                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    if (isDownloadCancelled) {
                        outputStream.close()
                        outputFile.delete()
                        return@Thread
                    }
                    outputStream.write(buffer, 0, bytesRead)
                    totalBytesRead += bytesRead

                    val now = System.currentTimeMillis()
                    if (now - lastProgressTime >= 100 || totalBytesRead == totalLength) {
                        lastProgressTime = now
                        val percent = if (totalLength > 0) ((totalBytesRead * 100) / totalLength).toInt().coerceIn(0, 100) else 0
                        val currentMb = String.format(java.util.Locale.US, "%.1f", totalBytesRead / (1024.0 * 1024.0))

                        activity.runOnUiThread {
                            (activity as? MainActivity)?.evaluateJavascript("if (window.onNativeDownloadProgress) window.onNativeDownloadProgress($percent, '$currentMb', '$totalMb');")
                        }
                    }
                }

                outputStream.flush()
                outputStream.close()
                inputStream.close()
                connection.disconnect()

                val finalPath = outputFile.absolutePath
                activity.runOnUiThread {
                    (activity as? MainActivity)?.evaluateJavascript("if (window.onNativeDownloadComplete) window.onNativeDownloadComplete('$finalPath');")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Download error", e)
                try {
                    val outputFile = java.io.File(activity.filesDir, "updates/ChurchCompanion_update.apk")
                    if (outputFile.exists()) outputFile.delete()
                } catch (ignored: Exception) {}
                activity.runOnUiThread {
                    (activity as? MainActivity)?.evaluateJavascript("if (window.onNativeDownloadError) window.onNativeDownloadError('${e.message?.replace("'", "\\'")}');")
                }
            } finally {
                try { inputStream?.close() } catch (ignored: Exception) {}
                try { outputStream?.close() } catch (ignored: Exception) {}
                try { connection?.disconnect() } catch (ignored: Exception) {}
            }
        }.apply {
            name = "ApkDownloadThread"
            start()
        }
        return true
    }

    @JavascriptInterface
    fun cancelUpdateDownload(): Boolean {
        isDownloadCancelled = true
        try {
            val updatesDir = java.io.File(activity.filesDir, "updates")
            if (updatesDir.exists()) {
                updatesDir.listFiles()?.forEach { it.delete() }
            }
        } catch (ignored: Exception) {}
        return true
    }

    @JavascriptInterface
    fun cleanupUpdateApk(): Boolean {
        return try {
            val updatesDir = java.io.File(activity.filesDir, "updates")
            if (updatesDir.exists()) {
                updatesDir.listFiles()?.forEach { it.delete() }
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error cleaning up update APK", e)
            false
        }
    }

    @JavascriptInterface
    fun canInstallApk(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            activity.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
    }

    @JavascriptInterface
    fun hasInstallPermission(): Boolean {
        return canInstallApk()
    }

    @JavascriptInterface
    fun requestInstallPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val intent = Intent(
                    android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    android.net.Uri.parse("package:${activity.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Error opening install permission settings", e)
            }
        }
    }

    @JavascriptInterface
    fun installApk(filePath: String = ""): Boolean {
        return try {
            // Check Android 8.0+ Unknown App Sources Permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!activity.packageManager.canRequestPackageInstalls()) {
                    activity.runOnUiThread {
                        Toast.makeText(
                            activity,
                            "Please allow Church Companion to install updates from this source",
                            Toast.LENGTH_LONG
                        ).show()
                        try {
                            val manageIntent = Intent(
                                android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                                android.net.Uri.parse("package:${activity.packageName}")
                            ).apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            activity.startActivity(manageIntent)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to open install settings", e)
                        }
                    }
                    return false
                }
            }

            val defaultUpdateFile = java.io.File(activity.filesDir, "updates/ChurchCompanion_update.apk")
            val file = if (filePath.isNotEmpty()) {
                try {
                    val candidate = java.io.File(filePath).canonicalFile
                    val allowedParent1 = java.io.File(activity.filesDir, "updates").canonicalFile
                    val allowedParent2 = activity.cacheDir.canonicalFile
                    if ((candidate.path.startsWith(allowedParent1.path) || candidate.path.startsWith(allowedParent2.path)) &&
                        candidate.name.endsWith(".apk", ignoreCase = true) && candidate.exists()) {
                        candidate
                    } else {
                        Log.w(TAG, "installApk: Untrusted or non-APK file path rejected: $filePath")
                        defaultUpdateFile
                    }
                } catch (e: Exception) {
                    defaultUpdateFile
                }
            } else {
                defaultUpdateFile
            }
            if (!file.exists()) {
                activity.runOnUiThread {
                    Toast.makeText(activity, "Update package not found. Please download again.", Toast.LENGTH_SHORT).show()
                }
                return false
            }

            file.setReadable(true, false)

            val uri = androidx.core.content.FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                file
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val resInfoList = activity.packageManager.queryIntentActivities(
                intent,
                android.content.pm.PackageManager.MATCH_DEFAULT_ONLY
            )
            for (resolveInfo in resInfoList) {
                val packageName = resolveInfo.activityInfo.packageName
                activity.grantUriPermission(
                    packageName,
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                )
            }

            activity.startActivity(intent)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch package installer", e)
            activity.runOnUiThread {
                Toast.makeText(activity, "Installation error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
            false
        }
    }

    @JavascriptInterface
    fun exitApp() {
        activity.runOnUiThread {
            activity.finishAffinity()
        }
    }

    @JavascriptInterface
    fun evaluatePermissionsJson(roleStr: String, isYouth: Boolean): String {
        return try {
            val role = UserRole.fromString(roleStr)
            val profile = UserProfile(
                displayName = "Believer",
                email = "user@allsaints.org",
                role = role,
                isYouth = isYouth
            )
            val perms = churchEngine.auth.computePermissions(profile)
            val json = JSONObject()
            json.put("role", role.name as Any)
            json.put("roleName", role.roleName as Any)
            json.put("isYouth", isYouth)
            json.put("canCreate", perms.canCreate)
            json.put("canEdit", perms.canEdit)
            json.put("canDelete", perms.canDelete)
            json.put("canAddSong", perms.canAddSong)
            json.put("canEditTimeline", perms.canEditTimeline)
            json.put("canApproveAdmins", perms.canApproveAdmins)
            json.put("canApproveYouth", perms.canApproveYouth)
            json.put("canAccessYouthChat", perms.canAccessYouthChat)
            json.put("canDeleteAnyMessage", perms.canDeleteAnyMessage)
            json.toString()
        } catch (e: Exception) {
            Log.e(TAG, "Error evaluating permissions", e)
            "{}"
        }
    }

    @JavascriptInterface
    fun getLiturgicalDayJson(dateStr: String): String {
        return try {
            val day = churchEngine.almanac.getDay(dateStr)
            if (day != null) {
                JSONObject().apply {
                    put("dateKey", day.dateKey)
                    put("dayName", day.dayOfWeek)
                    put("season", day.seasonName)
                    put("colorName", day.liturgicalColor.colorName)
                    put("colorHex", day.liturgicalColor.hexCode)
                    put("title", day.dayTitle)
                    put("hindiTitle", day.hindiTitle)
                    put("theme", day.seasonalTheme)
                }.toString()
            } else "{}"
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching liturgical day", e)
            "{}"
        }
    }

    @JavascriptInterface
    fun getTodayDailyVerseJson(): String {
        return try {
            val verse = churchEngine.dailyVerses.getTodayVerse()
            JSONObject().apply {
                put("mmdd", verse.mmdd)
                put("monthName", verse.monthName)
                put("day", verse.day)
                put("ref", verse.ref)
                put("text", verse.text)
                put("hindi", verse.hindi)
                put("tradition", verse.tradition)
                put("contemplation", verse.contemplation)
            }.toString()
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching native daily verse", e)
            "{}"
        }
    }

    @JavascriptInterface
    fun getTimelineEventsJson(): String {
        return try {
            val events = churchEngine.timeline.getAllEvents()
            val arr = JSONArray()
            for (evt in events) {
                arr.put(JSONObject().apply {
                    put("id", evt.id)
                    put("year", evt.year)
                    put("title", evt.title)
                    put("hindiTitle", evt.hindiTitle)
                    put("description", evt.description)
                    put("dotColor", evt.dotColor)
                    put("sortOrder", evt.sortOrder)
                })
            }
            arr.toString()
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching timeline events", e)
            "[]"
        }
    }

    @JavascriptInterface
    fun getOfflineCache(key: String): String {
        return offlineStore.getCache(key) ?: ""
    }

    @JavascriptInterface
    fun saveOfflineCache(key: String, value: String) {
        offlineStore.putCache(key, value)
    }

    @JavascriptInterface
    fun queueSyncItem(actionType: String, jsonPayload: String): Boolean {
        offlineStore.enqueueSyncAction(actionType, jsonPayload)
        return true
    }

    @JavascriptInterface
    fun triggerImmediateSync() {
        syncManager.triggerSyncBroadcast()
    }

    @JavascriptInterface
    fun runEngineDiagnostics(): String {
        return try {
            val result = churchEngine.runSelfDiagnosticSuite()
            JSONObject().apply {
                put("status", if (result) "PASSED" else "FAILED")
                put("timestamp", System.currentTimeMillis())
            }.toString()
        } catch (e: Exception) {
            Log.e(TAG, "Diagnostics failed", e)
            JSONObject().apply {
                put("status", "ERROR")
                put("error", e.message)
            }.toString()
        }
    }

    @JavascriptInterface
    fun logAuditEvent(module: String, action: String, details: String) {
        try {
            churchEngine.audit.log(
                userId = "native-user",
                userName = "Believer",
                action = action,
                module = module,
                details = details
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error in native audit log", e)
        }
    }

    /**
     * Directly launches YouTube link or video ID in native YouTube application.
     * Pinpoint implementation: Opens YouTube app directly without issues.
     */
    @JavascriptInterface
    fun openYouTube(urlOrId: String): Boolean {
        return try {
            val input = urlOrId.trim()
            if (input.isEmpty()) return false

            val videoId = extractYoutubeVideoId(input)
            val ytPackage = "com.google.android.youtube"
            val pm = activity.packageManager

            // Canonical web URL as fallback
            val webUrl = if (!videoId.isNullOrEmpty()) {
                "https://www.youtube.com/watch?v=$videoId"
            } else if (input.startsWith("http://", ignoreCase = true) || input.startsWith("https://", ignoreCase = true)) {
                input
            } else {
                "https://$input"
            }

            activity.runOnUiThread {
                var launched = false

                // 1. Explicitly launch YouTube app using vnd.youtube scheme
                if (!videoId.isNullOrEmpty()) {
                    try {
                        val appIntent = Intent(Intent.ACTION_VIEW, Uri.parse("vnd.youtube:$videoId")).apply {
                            setPackage(ytPackage)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (appIntent.resolveActivity(pm) != null) {
                            activity.startActivity(appIntent)
                            launched = true
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "vnd.youtube targeted intent failed: ${e.message}")
                    }
                }

                // 2. Explicitly launch YouTube app using canonical web URL
                if (!launched) {
                    try {
                        val webYtIntent = Intent(Intent.ACTION_VIEW, Uri.parse(webUrl)).apply {
                            setPackage(ytPackage)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (webYtIntent.resolveActivity(pm) != null) {
                            activity.startActivity(webYtIntent)
                            launched = true
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "webUrl targeted intent failed: ${e.message}")
                    }
                }

                // 3. Generic vnd.youtube scheme (allows alternative clients like Vanced/NewPipe)
                if (!launched && !videoId.isNullOrEmpty()) {
                    try {
                        val genericYtIntent = Intent(Intent.ACTION_VIEW, Uri.parse("vnd.youtube:$videoId")).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        if (genericYtIntent.resolveActivity(pm) != null) {
                            activity.startActivity(genericYtIntent)
                            launched = true
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Generic vnd.youtube intent failed: ${e.message}")
                    }
                }

                // 4. Fallback to system browser
                if (!launched) {
                    try {
                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(webUrl)).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        activity.startActivity(browserIntent)
                    } catch (e: Exception) {
                        Log.e(TAG, "Browser fallback failed for $webUrl", e)
                    }
                }
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed in openYouTube: $urlOrId", e)
            false
        }
    }

    private fun extractYoutubeVideoId(url: String): String? {
        val trimmed = url.trim()
        if (trimmed.isEmpty()) return null
        if (trimmed.matches(Regex("^[a-zA-Z0-9_-]{11}$"))) return trimmed
        val regex = Regex("""(?:(?:www\.|m\.|music\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|v\/|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})""", RegexOption.IGNORE_CASE)
        val match = regex.find(trimmed)
        if (match != null && match.groupValues.size > 1) {
            return match.groupValues[1]
        }
        return try {
            val uri = Uri.parse(if (trimmed.startsWith("http://", ignoreCase = true) || trimmed.startsWith("https://", ignoreCase = true)) trimmed else "https://$trimmed")
            val v = uri.getQueryParameter("v")
            if (!v.isNullOrEmpty() && v.matches(Regex("^[a-zA-Z0-9_-]{11}$"))) {
                v
            } else {
                val lastSeg = uri.lastPathSegment
                if (!lastSeg.isNullOrEmpty() && lastSeg.matches(Regex("^[a-zA-Z0-9_-]{11}$"))) {
                    lastSeg
                } else null
            }
        } catch (_: Exception) {
            null
        }
    }
}
