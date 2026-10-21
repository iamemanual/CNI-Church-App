package com.allsaints.church.ui.almanac

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.allsaints.church.R
import com.allsaints.church.engine.ChurchApplicationEngine
import com.allsaints.church.engine.LectionaryDay

class AlmanacFragment : Fragment() {

    private lateinit var churchEngine: ChurchApplicationEngine

    private lateinit var tvCurrentDate: TextView
    private lateinit var tvColorBadge: TextView
    private lateinit var tvDayOfWeek: TextView
    private lateinit var tvDayTitle: TextView
    private lateinit var tvDayHindiTitle: TextView
    private lateinit var tvSeasonalTheme: TextView
    private lateinit var tvMorningTitle: TextView
    private lateinit var tvMorningReadings: TextView
    private lateinit var tvEveningTitle: TextView
    private lateinit var tvEveningReadings: TextView
    private lateinit var tvEucharistTitle: TextView
    private lateinit var tvEucharistReadings: TextView

    private val availableDateKeys = listOf("2026-08-21", "2026-08-23", "2026-12-25")
    private var currentDateIndex = 0

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_almanac, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        churchEngine = ChurchApplicationEngine()

        tvCurrentDate = view.findViewById(R.id.tv_current_date_display)
        tvColorBadge = view.findViewById(R.id.tv_color_badge)
        tvDayOfWeek = view.findViewById(R.id.tv_day_of_week)
        tvDayTitle = view.findViewById(R.id.tv_day_title)
        tvDayHindiTitle = view.findViewById(R.id.tv_day_hindi_title)
        tvSeasonalTheme = view.findViewById(R.id.tv_seasonal_theme)
        tvMorningTitle = view.findViewById(R.id.tv_morning_title)
        tvMorningReadings = view.findViewById(R.id.tv_morning_readings)
        tvEveningTitle = view.findViewById(R.id.tv_evening_title)
        tvEveningReadings = view.findViewById(R.id.tv_evening_readings)
        tvEucharistTitle = view.findViewById(R.id.tv_eucharist_title)
        tvEucharistReadings = view.findViewById(R.id.tv_eucharist_readings)

        val btnPrev: Button = view.findViewById(R.id.btn_prev_day)
        val btnNext: Button = view.findViewById(R.id.btn_next_day)

        btnPrev.setOnClickListener {
            if (currentDateIndex > 0) {
                currentDateIndex--
                loadDay(availableDateKeys[currentDateIndex])
            }
        }

        btnNext.setOnClickListener {
            if (currentDateIndex < availableDateKeys.size - 1) {
                currentDateIndex++
                loadDay(availableDateKeys[currentDateIndex])
            }
        }

        loadDay(availableDateKeys[currentDateIndex])
    }

    private fun loadDay(dateKey: String) {
        val day = churchEngine.almanac.getDay(dateKey) ?: return
        bindDay(day)
    }

    private fun bindDay(day: LectionaryDay) {
        tvCurrentDate.text = day.fullDateStr
        tvColorBadge.text = "${day.liturgicalColor.emoji} ${day.liturgicalColor.colorName} • ${day.seasonName}"
        tvDayOfWeek.text = day.dayOfWeek
        tvDayTitle.text = day.dayTitle
        tvDayHindiTitle.text = day.hindiTitle
        tvSeasonalTheme.text = day.seasonalTheme

        tvMorningTitle.text = "🌅 ${day.morningWorship.title}"
        tvMorningReadings.text = day.morningWorship.readings.joinToString("\n") { "• $it" }

        tvEveningTitle.text = "🌇 ${day.eveningWorship.title}"
        tvEveningReadings.text = day.eveningWorship.readings.joinToString("\n") { "• $it" }

        tvEucharistTitle.text = "🍷 ${day.holyEucharist.title}"
        tvEucharistReadings.text = day.holyEucharist.readings.joinToString("\n") { "• $it" }
    }
}
