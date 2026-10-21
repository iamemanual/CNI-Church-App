package com.allsaints.church

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Log

data class SyncQueueItem(
    val id: Long,
    val actionType: String,
    val payloadJson: String,
    val status: String,
    val createdAt: Long
)

data class AuditRecord(
    val id: Long,
    val module: String,
    val action: String,
    val details: String,
    val timestamp: Long
)

class ChurchOfflineStore private constructor(context: Context) :
    SQLiteOpenHelper(context.applicationContext, DATABASE_NAME, null, DATABASE_VERSION) {

    init {
        initializeDefaults()
    }

    override fun onCreate(db: SQLiteDatabase) {
        Log.i(TAG, "Creating local offline database schema...")
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS local_cache (
                cache_key TEXT PRIMARY KEY,
                cache_value TEXT,
                updated_at INTEGER
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_type TEXT,
                payload_json TEXT,
                status TEXT DEFAULT 'PENDING',
                created_at INTEGER
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                module TEXT,
                action TEXT,
                details TEXT,
                timestamp INTEGER
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS bookmarks (
                item_id TEXT PRIMARY KEY,
                item_type TEXT,
                title TEXT,
                content TEXT,
                created_at INTEGER
            )
            """.trimIndent()
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS local_cache")
        db.execSQL("DROP TABLE IF EXISTS sync_queue")
        db.execSQL("DROP TABLE IF EXISTS audit_logs")
        db.execSQL("DROP TABLE IF EXISTS bookmarks")
        onCreate(db)
    }

    private fun initializeDefaults() {
        try {
            putCache("app_initialized", "true")
            logAudit("SystemCore", "OFFLINE_STORE_INIT", "Church offline database ready for 100% offline usage.")
        } catch (e: Exception) {
            Log.e(TAG, "Error during offline store initialization", e)
        }
    }

    fun putCache(key: String, value: String) {
        try {
            val db = writableDatabase
            val values = ContentValues().apply {
                put("cache_key", key)
                put("cache_value", value)
                put("updated_at", System.currentTimeMillis())
            }
            db.insertWithOnConflict("local_cache", null, values, SQLiteDatabase.CONFLICT_REPLACE)
        } catch (e: Exception) {
            Log.e(TAG, "Error caching key: $key", e)
        }
    }

    fun getCache(key: String): String? {
        return try {
            val db = readableDatabase
            val cursor = db.query(
                "local_cache",
                arrayOf("cache_value"),
                "cache_key = ?",
                arrayOf(key),
                null,
                null,
                null
            )
            cursor.use {
                if (it.moveToFirst()) {
                    it.getString(0)
                } else null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading cache key: $key", e)
            null
        }
    }

    fun enqueueSyncAction(actionType: String, payloadJson: String): Long {
        return try {
            val db = writableDatabase
            val values = ContentValues().apply {
                put("action_type", actionType)
                put("payload_json", payloadJson)
                put("status", "PENDING")
                put("created_at", System.currentTimeMillis())
            }
            db.insert("sync_queue", null, values)
        } catch (e: Exception) {
            Log.e(TAG, "Error enqueueing sync action: $actionType", e)
            -1L
        }
    }

    fun getPendingSyncActions(): List<SyncQueueItem> {
        val list = mutableListOf<SyncQueueItem>()
        try {
            val db = readableDatabase
            val cursor = db.query(
                "sync_queue",
                null,
                "status = ?",
                arrayOf("PENDING"),
                null,
                null,
                "created_at ASC"
            )
            cursor.use {
                while (it.moveToNext()) {
                    list.add(
                        SyncQueueItem(
                            id = it.getLong(it.getColumnIndexOrThrow("id")),
                            actionType = it.getString(it.getColumnIndexOrThrow("action_type")),
                            payloadJson = it.getString(it.getColumnIndexOrThrow("payload_json")),
                            status = it.getString(it.getColumnIndexOrThrow("status")),
                            createdAt = it.getLong(it.getColumnIndexOrThrow("created_at"))
                        )
                    )
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading pending sync actions", e)
        }
        return list
    }

    fun markSyncCompleted(id: Long) {
        try {
            val db = writableDatabase
            val values = ContentValues().apply {
                put("status", "COMPLETED")
            }
            db.update("sync_queue", values, "id = ?", arrayOf(id.toString()))
        } catch (e: Exception) {
            Log.e(TAG, "Error marking sync completed: $id", e)
        }
    }

    fun logAudit(module: String, action: String, details: String) {
        try {
            val db = writableDatabase
            val values = ContentValues().apply {
                put("module", module)
                put("action", action)
                put("details", details)
                put("timestamp", System.currentTimeMillis())
            }
            db.insert("audit_logs", null, values)
        } catch (e: Exception) {
            Log.e(TAG, "Error logging audit event", e)
        }
    }

    companion object {
        const val TAG: String = "ChurchOfflineStore"
        const val DATABASE_NAME: String = "church_offline.db"
        const val DATABASE_VERSION: Int = 1

        @Volatile
        private var instance: ChurchOfflineStore? = null

        fun getInstance(context: Context): ChurchOfflineStore {
            return instance ?: synchronized(this) {
                instance ?: ChurchOfflineStore(context).also { instance = it }
            }
        }
    }
}
