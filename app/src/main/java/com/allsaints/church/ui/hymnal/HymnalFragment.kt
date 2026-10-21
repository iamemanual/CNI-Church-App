package com.allsaints.church.ui.hymnal

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.allsaints.church.R
import com.allsaints.church.engine.ChurchApplicationEngine
import com.allsaints.church.engine.Song
import com.allsaints.church.engine.SongCategory
import com.allsaints.church.ui.adapters.HymnAdapter
import com.google.android.material.chip.ChipGroup

class HymnalFragment : Fragment() {

    private lateinit var churchEngine: ChurchApplicationEngine
    private lateinit var hymnAdapter: HymnAdapter
    private var allSongs: List<Song> = emptyList()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_hymnal, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        churchEngine = ChurchApplicationEngine()
        allSongs = churchEngine.hymnal.getAllSongs()

        val recyclerView: RecyclerView = view.findViewById(R.id.recycler_hymns)
        recyclerView.layoutManager = LinearLayoutManager(requireContext())

        hymnAdapter = HymnAdapter(
            songs = allSongs,
            onFavoriteClick = { song ->
                churchEngine.hymnal.toggleFavorite(song.number)
                Toast.makeText(
                    requireContext(),
                    if (song.isFavorite) "Added to Favorites" else "Removed from Favorites",
                    Toast.LENGTH_SHORT
                ).show()
            },
            onItemClick = { song ->
                Toast.makeText(
                    requireContext(),
                    "Opening Hymn #${song.number}: ${song.title}",
                    Toast.LENGTH_SHORT
                ).show()
            }
        )
        recyclerView.adapter = hymnAdapter

        val etSearch: EditText = view.findViewById(R.id.et_search_hymn)
        etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                filterSongs(s?.toString() ?: "")
            }
            override fun afterTextChanged(s: Editable?) {}
        })

        val chipGroup: ChipGroup = view.findViewById(R.id.chip_group_categories)
        chipGroup.setOnCheckedChangeListener { _, checkedId ->
            when (checkedId) {
                R.id.chip_hindi -> filterByCategory(SongCategory.HINDI_HYMN)
                R.id.chip_english -> filterByCategory(SongCategory.ENGLISH_HYMN)
                R.id.chip_zaboor -> filterByCategory(SongCategory.ZABOOR)
                R.id.chip_christmas -> filterByCategory(SongCategory.CHRISTMAS)
                else -> hymnAdapter.updateData(allSongs)
            }
        }
    }

    private fun filterSongs(query: String) {
        if (query.isBlank()) {
            hymnAdapter.updateData(allSongs)
        } else {
            val results = churchEngine.hymnal.searchSongs(query)
            hymnAdapter.updateData(results)
        }
    }

    private fun filterByCategory(cat: SongCategory) {
        val filtered = churchEngine.hymnal.getByCategory(cat)
        hymnAdapter.updateData(filtered)
    }
}
