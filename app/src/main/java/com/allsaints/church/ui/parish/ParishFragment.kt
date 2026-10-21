package com.allsaints.church.ui.parish

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.allsaints.church.R
import com.allsaints.church.engine.ChurchApplicationEngine

class ParishFragment : Fragment() {

    private lateinit var churchEngine: ChurchApplicationEngine

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_parish, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        churchEngine = ChurchApplicationEngine()

        // Bind Daily Verse
        val tvVerseRef: TextView = view.findViewById(R.id.tv_verse_ref)
        val tvVerseText: TextView = view.findViewById(R.id.tv_verse_text)
        val tvVerseHindi: TextView = view.findViewById(R.id.tv_verse_hindi)
        val tvVerseContemplation: TextView = view.findViewById(R.id.tv_verse_contemplation)

        val verse = churchEngine.dailyVerses.getTodayVerse()
        tvVerseRef.text = verse.ref
        tvVerseText.text = "\"${verse.text}\""
        tvVerseHindi.text = "\"${verse.hindi}\""
        tvVerseContemplation.text = verse.contemplation

        // Bind Session User
        val tvUserNameRole: TextView = view.findViewById(R.id.tv_user_name_role)
        val tvUserEmail: TextView = view.findViewById(R.id.tv_user_email)
        val user = churchEngine.auth.currentSession
        tvUserNameRole.text = "${user.displayName} • ${user.role.roleName} (${user.parishRole})"
        tvUserEmail.text = user.email

        val btnDiagnostics: Button = view.findViewById(R.id.btn_run_diagnostics)
        btnDiagnostics.setOnClickListener {
            val passed = churchEngine.runSelfDiagnosticSuite()
            Toast.makeText(
                requireContext(),
                if (passed) "✨ All 8 Kotlin Modules Passed Diagnostics!" else "Diagnostic Errors Detected",
                Toast.LENGTH_LONG
            ).show()
        }

        // Bind Timeline Events
        val timelineContainer: LinearLayout = view.findViewById(R.id.layout_timeline_container)
        val events = churchEngine.timeline.getAllEvents()
        val inflater = LayoutInflater.from(requireContext())

        events.forEach { ev ->
            val itemView = inflater.inflate(R.layout.item_timeline_event, timelineContainer, false)
            val tvYear: TextView = itemView.findViewById(R.id.tv_event_year)
            val tvTitle: TextView = itemView.findViewById(R.id.tv_event_title)
            val tvHindiTitle: TextView = itemView.findViewById(R.id.tv_event_hindi_title)
            val tvDesc: TextView = itemView.findViewById(R.id.tv_event_description)

            tvYear.text = ev.year
            tvTitle.text = ev.title
            tvHindiTitle.text = ev.hindiTitle
            tvDesc.text = ev.description

            timelineContainer.addView(itemView)
        }
    }
}
