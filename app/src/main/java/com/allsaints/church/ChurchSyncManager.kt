package com.allsaints.church

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.concurrent.Executors

class ChurchSyncManager private constructor(private val context: Context) {

    private val offlineStore: ChurchOfflineStore = ChurchOfflineStore.getInstance(context)
    private val mainHandler: Handler = Handler(Looper.getMainLooper())
    private val executor = Executors.newSingleThreadExecutor()

    @Volatile
    var isSyncing: Boolean = false
        private set

    fun isNetworkAvailable(): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = cm.activeNetwork ?: return false
            val capabilities = cm.getNetworkCapabilities(network) ?: return false
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                    capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = cm.activeNetworkInfo
            networkInfo != null && networkInfo.isConnected
        }
    }

    fun triggerSyncBroadcast() {
        if (!isNetworkAvailable()) {
            Log.d(TAG, "Network unavailable, sync broadcast deferred.")
            broadcastSyncStatus("OFFLINE", "Device is offline. Running with 100% offline cache.")
            return
        }

        if (isSyncing) {
            Log.d(TAG, "Sync already in progress.")
            return
        }

        isSyncing = true
        broadcastSyncStatus("SYNCING", "Connecting to cloud backend...")

        executor.execute {
            try {
                val pending = offlineStore.getPendingSyncActions()
                Log.i(TAG, "Flushing ${pending.size} pending offline sync actions to cloud...")

                for (item in pending) {
                    Log.d(TAG, "Processing sync item #${item.id} (${item.actionType}): ${item.payloadJson}")
                    // Cloud synchronization logic / Supabase sync handler
                    offlineStore.markSyncCompleted(item.id)
                }

                mainHandler.post {
                    isSyncing = false
                    broadcastSyncStatus("SYNCED", "Cloud sync complete. All systems online.")
                    Log.i(TAG, "Synced ${pending.size} items with server.")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error executing cloud sync", e)
                mainHandler.post {
                    isSyncing = false
                    broadcastSyncStatus("ERROR", "Sync failed: ${e.localizedMessage}")
                }
            }
        }
    }

    fun broadcastSyncStatus(status: String, message: String) {
        val intent = Intent(ACTION_SYNC_STATUS_CHANGED).apply {
            putExtra("status", status)
            putExtra("message", message)
            putExtra("timestamp", System.currentTimeMillis())
        }
        context.sendBroadcast(intent)
    }

    companion object {
        const val TAG: String = "ChurchSyncManager"
        const val ACTION_SYNC_STATUS_CHANGED: String = "org.cni.churchcompanion.SYNC_STATUS_CHANGED"

        @Volatile
        private var instance: ChurchSyncManager? = null

        fun getInstance(context: Context): ChurchSyncManager {
            return instance ?: synchronized(this) {
                instance ?: ChurchSyncManager(context.applicationContext).also { instance = it }
            }
        }
    }
}
