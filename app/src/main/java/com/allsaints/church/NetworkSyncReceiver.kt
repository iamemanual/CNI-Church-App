package com.allsaints.church

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.util.Log

class NetworkSyncReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Received broadcast action: $action")

        val syncManager = ChurchSyncManager.getInstance(context)
        if (syncManager.isNetworkAvailable()) {
            Log.i(TAG, "Network connection detected! Triggering automatic cloud sync broadcast.")
            syncManager.triggerSyncBroadcast()
        } else {
            Log.d(TAG, "Device went offline. Preserving local SQLite state.")
        }
    }

    companion object {
        const val TAG: String = "NetworkSyncReceiver"
    }
}
