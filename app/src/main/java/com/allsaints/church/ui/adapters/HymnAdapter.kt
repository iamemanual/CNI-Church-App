package com.allsaints.church.ui.adapters

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.allsaints.church.R
import com.allsaints.church.engine.Song

class HymnAdapter(
    private var songs: List<Song>,
    private val onFavoriteClick: (Song) -> Unit,
    private val onItemClick: (Song) -> Unit
) : RecyclerView.Adapter<HymnAdapter.HymnViewHolder>() {

    fun updateData(newSongs: List<Song>) {
        songs = newSongs
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): HymnViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_hymn, parent, false)
        return HymnViewHolder(view)
    }

    override fun onBindViewHolder(holder: HymnViewHolder, position: Int) {
        val song = songs[position]
        holder.bind(song)
    }

    override fun getItemCount(): Int = songs.size

    inner class HymnViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val tvNumber: TextView = itemView.findViewById(R.id.tv_hymn_number)
        private val tvTitle: TextView = itemView.findViewById(R.id.tv_hymn_title)
        private val tvHindiTitle: TextView = itemView.findViewById(R.id.tv_hymn_hindi_title)
        private val tvCategory: TextView = itemView.findViewById(R.id.tv_hymn_category)
        private val tvMusicalMeta: TextView = itemView.findViewById(R.id.tv_hymn_musical_meta)
        private val tvPreview: TextView = itemView.findViewById(R.id.tv_hymn_preview)
        private val btnFavorite: ImageView = itemView.findViewById(R.id.btn_favorite)

        fun bind(song: Song) {
            tvNumber.text = song.number.toString()
            tvTitle.text = song.title
            tvHindiTitle.text = song.hindiTitle
            tvCategory.text = song.category.displayName
            tvMusicalMeta.text = "Key: ${song.musicalKey} • ${song.tempo}"
            tvPreview.text = song.verses.firstOrNull() ?: ""

            btnFavorite.setImageResource(
                if (song.isFavorite) R.drawable.ic_favorite else R.drawable.ic_favorite_border
            )

            btnFavorite.setOnClickListener {
                onFavoriteClick(song)
                notifyItemChanged(adapterPosition)
            }

            itemView.setOnClickListener {
                onItemClick(song)
            }
        }
    }
}
