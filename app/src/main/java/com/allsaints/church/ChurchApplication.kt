package com.allsaints.church

import android.app.Application
import android.util.Log

class ChurchApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        instance = this
        Log.i(TAG, "Initialized Church Companion $APP_VERSION with Offline & Cloud Sync Store.")
        cleanPendingUpdateApks()
        ChurchOfflineStore.getInstance(this)
        ChurchSyncManager.getInstance(this)
    }

    private fun cleanPendingUpdateApks() {
        try {
            val updatesDir = java.io.File(filesDir, "updates")
            if (updatesDir.exists() && updatesDir.isDirectory) {
                updatesDir.listFiles()?.forEach { file ->
                    if (file.name.endsWith(".apk", ignoreCase = true)) {
                        file.delete()
                        Log.i(TAG, "Cleaned up installed update APK from internal storage: ${file.name}")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error cleaning update APKs", e)
        }
    }

    companion object {
        const val TAG: String = "ChurchCompanion"
        const val APP_NAME: String = "Church Companion"
        const val APP_VERSION: String = "v26.08.31"

        lateinit var instance: ChurchApplication
            private set
    }
}
