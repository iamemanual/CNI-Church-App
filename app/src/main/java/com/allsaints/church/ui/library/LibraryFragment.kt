package com.allsaints.church.ui.library

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment
import com.allsaints.church.R
import com.allsaints.church.engine.ChurchApplicationEngine
import com.google.android.material.card.MaterialCardView

class LibraryFragment : Fragment() {

    private lateinit var churchEngine: ChurchApplicationEngine

    private lateinit var cardReader: MaterialCardView
    private lateinit var tvReaderTitle: TextView
    private lateinit var tvReaderPageText: TextView
    private lateinit var tvPageIndicator: TextView

    private val sampleExcerpts = mapOf(
        "prabhuBhoj" to listOf(
            "THE ORDER FOR THE ADMINISTRATION OF THE LORD'S SUPPER\n\nOur Father, which art in heaven, Hallowed be thy Name. Thy kingdom come. Thy will be done in earth, As it is in heaven.\n\nAlmighty God, unto whom all hearts be open, all desires known, and from whom no secrets are hid: Cleanse the thoughts of our hearts by the inspiration of thy Holy Spirit.",
            "THE TEN COMMANDMENTS\n\nGod spake these words, and said; I am the Lord thy God: Thou shalt have none other gods but me.\n\nPeople: Lord, have mercy upon us, and incline our hearts to keep this law.",
            "THE PRAYER OF CONSECRATION\n\nAlmighty God, our heavenly Father, who of thy tender mercy didst give thine only Son Jesus Christ to suffer death upon the Cross for our redemption; who made there by his one oblation of himself once offered a full, perfect, and sufficient sacrifice for the sins of the whole world."
        ),
        "ashayeRabbani" to listOf(
            "अशाये रब्बानी — पवित्र प्रभु भोज की विधि\n\nहे हमारे पिता, तू जो स्वर्ग में है, तेरा नाम पवित्र माना जाए। तेरा राज्य आए। तेरी इच्छा जैसी स्वर्ग में पूरी होती है, वैसे पृथ्वी पर भी हो।\n\nहे सर्वशक्तिमान परमेश्वर, जिस के सम्मुख सारे मन खुले हैं...",
            "पाप स्वीकार प्रार्थना\n\nहे सर्वशक्तिमान ईश्वर, हमारे प्रभु यीशु मसीह के पिता, तू जो सब वस्तुओं का रचने वाला और सब मनुष्यों का न्यायी है, हम अपने अनेक पापों और अपराधों को मान लेते हैं..."
        ),
        "aaradhanaa" to listOf(
            "प्रातःकालीन प्रार्थना व आराधना\n\nप्रभु अपने पवित्र मन्दिर में है; समस्त पृथ्वी उसके सामने शान्त रहे। (हबक्कूक २:२०)\n\nआओ, हम यहोवा के लिये जयजयकार करें; अपने उद्धार की चट्टान का जयजयकार करें!",
            "सायंकालीन स्तुति व आराधना\n\nमेरी प्रार्थना तेरे सम्मुख धूप के समान और मेरे हाथों का उठाना संध्या के अन्नबलि के समान ठहरे। (भजन १४१:२)"
        )
    )

    private var activeBookId: String? = null
    private var currentPage: Int = 1

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_library, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        churchEngine = ChurchApplicationEngine()

        cardReader = view.findViewById(R.id.card_active_reader)
        tvReaderTitle = view.findViewById(R.id.tv_reader_book_title)
        tvReaderPageText = view.findViewById(R.id.tv_reader_page_text)
        tvPageIndicator = view.findViewById(R.id.tv_reader_page_indicator)

        val btnPrabhuBhoj: Button = view.findViewById(R.id.btn_open_prabhu_bhoj)
        val btnAshayeRabbani: Button = view.findViewById(R.id.btn_open_ashaye_rabbani)
        val btnAaradhanaa: Button = view.findViewById(R.id.btn_open_aaradhanaa)

        btnPrabhuBhoj.setOnClickListener { openBook("prabhuBhoj", "The Lord's Supper (प्रभु भोज)") }
        btnAshayeRabbani.setOnClickListener { openBook("ashayeRabbani", "The Desires of the Lord (अशाये रब्बानी)") }
        btnAaradhanaa.setOnClickListener { openBook("aaradhanaa", "Morning & Evening Worship (प्रातःकालीन व सायंकालीन)") }

        val btnPrev: Button = view.findViewById(R.id.btn_reader_prev)
        val btnNext: Button = view.findViewById(R.id.btn_reader_next)

        btnPrev.setOnClickListener {
            if (currentPage > 1) {
                currentPage--
                updateReaderPage()
            }
        }

        btnNext.setOnClickListener {
            val maxPages = sampleExcerpts[activeBookId]?.size ?: 1
            if (currentPage < maxPages) {
                currentPage++
                updateReaderPage()
            }
        }
    }

    private fun openBook(bookId: String, title: String) {
        activeBookId = bookId
        currentPage = 1
        tvReaderTitle.text = "📖 $title"
        cardReader.visibility = View.VISIBLE
        updateReaderPage()
    }

    private fun updateReaderPage() {
        val pages = sampleExcerpts[activeBookId] ?: return
        val maxPages = pages.size
        tvReaderPageText.text = pages.getOrElse(currentPage - 1) { "" }
        tvPageIndicator.text = "Page $currentPage of $maxPages"
    }
}
