package com.allsaints.church.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.allsaints.church.R
import com.allsaints.church.engine.TimelineEvent

class TimelineAdapter(
    private var events: List<TimelineEvent>
) : RecyclerView.Adapter<TimelineAdapter.TimelineViewHolder>() {

    fun updateData(newEvents: List<TimelineEvent>) {
        events = newEvents
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TimelineViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_timeline_event, parent, false)
        return TimelineViewHolder(view)
    }

    override fun onBindViewHolder(holder: TimelineViewHolder, position: Int) {
        holder.bind(events[position])
    }

    override fun getItemCount(): Int = events.size

    inner class TimelineViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvYear: TextView = itemView.findViewById(R.id.tv_event_year)
        private val tvTitle: TextView = itemView.findViewById(R.id.tv_event_title)
        private val tvHindiTitle: TextView = itemView.findViewById(R.id.tv_event_hindi_title)
        private val tvDescription: TextView = itemView.findViewById(R.id.tv_event_description)

        fun bind(event: TimelineEvent) {
            tvYear.text = event.year
            tvTitle.text = event.title
            tvHindiTitle.text = event.hindiTitle
            tvDescription.text = event.description
        }
    }
}
