package com.allsaints.church.ui.chat

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.allsaints.church.R
import com.allsaints.church.engine.ChannelId
import com.allsaints.church.engine.ChurchApplicationEngine
import com.allsaints.church.ui.adapters.ChatMessageAdapter
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.android.material.tabs.TabLayout

class ChatFragment : Fragment() {

    private lateinit var churchEngine: ChurchApplicationEngine
    private lateinit var messageAdapter: ChatMessageAdapter
    private lateinit var recyclerView: RecyclerView
    private lateinit var etMessage: EditText
    private var activeChannel: ChannelId = ChannelId.GENERAL

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_chat, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        churchEngine = ChurchApplicationEngine()

        recyclerView = view.findViewById(R.id.recycler_chat_messages)
        etMessage = view.findViewById(R.id.et_message_input)
        val btnSend: FloatingActionButton = view.findViewById(R.id.btn_send_message)
        val tabLayout: TabLayout = view.findViewById(R.id.tab_channels)

        recyclerView.layoutManager = LinearLayoutManager(requireContext()).apply {
            stackFromEnd = true
        }

        messageAdapter = ChatMessageAdapter(
            messages = emptyList(),
            currentUserId = churchEngine.auth.currentSession.id
        )
        recyclerView.adapter = messageAdapter

        setupChannels(tabLayout)
        loadChannelMessages(activeChannel)

        btnSend.setOnClickListener {
            val text = etMessage.text.toString().trim()
            if (text.isNotEmpty()) {
                val result = churchEngine.postMessage(activeChannel.name, text)
                if (result.startsWith("SUCCESS")) {
                    etMessage.text.clear()
                    loadChannelMessages(activeChannel)
                    recyclerView.scrollToPosition(messageAdapter.itemCount - 1)
                } else {
                    Toast.makeText(requireContext(), "Permission denied for Youth channel.", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun setupChannels(tabLayout: TabLayout) {
        val channels = listOf(
            ChannelId.GENERAL to "General",
            ChannelId.CHOIR to "Choir",
            ChannelId.PRAYER_REQUESTS to "Prayers",
            ChannelId.YOUTH to "Youth",
            ChannelId.PARISH_ANNOUNCEMENTS to "Announcements"
        )

        channels.forEach { (ch, label) ->
            val tab = tabLayout.newTab().setText(label).setTag(ch)
            tabLayout.addTab(tab)
        }

        tabLayout.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                val ch = tab?.tag as? ChannelId ?: ChannelId.GENERAL
                activeChannel = ch
                loadChannelMessages(ch)
            }
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })
    }

    private fun loadChannelMessages(channelId: ChannelId) {
        val msgs = churchEngine.chat.getMessagesForChannel(channelId)
        messageAdapter.updateData(msgs)
    }
}
