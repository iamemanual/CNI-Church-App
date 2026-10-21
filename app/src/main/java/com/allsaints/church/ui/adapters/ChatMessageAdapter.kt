package com.allsaints.church.ui.adapters

import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.allsaints.church.R
import com.allsaints.church.engine.ChatMessage

class ChatMessageAdapter(
    private var messages: List<ChatMessage>,
    private val currentUserId: String
) : RecyclerView.Adapter<ChatMessageAdapter.MessageViewHolder>() {

    fun updateData(newMessages: List<ChatMessage>) {
        messages = newMessages
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_chat_message, parent, false)
        return MessageViewHolder(view)
    }

    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        holder.bind(messages[position])
    }

    override fun getItemCount(): Int = messages.size

    inner class MessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val container: LinearLayout = itemView.findViewById(R.id.layout_message_container)
        private val bubble: LinearLayout = itemView.findViewById(R.id.bubble_message)
        private val tvSender: TextView = itemView.findViewById(R.id.tv_sender_name)
        private val tvRole: TextView = itemView.findViewById(R.id.tv_role_badge)
        private val tvText: TextView = itemView.findViewById(R.id.tv_message_text)
        private val tvTime: TextView = itemView.findViewById(R.id.tv_message_time)

        fun bind(msg: ChatMessage) {
            val isMe = msg.senderId == currentUserId

            if (isMe) {
                container.gravity = Gravity.END
                bubble.layoutParams = (bubble.layoutParams as LinearLayout.LayoutParams).apply {
                    gravity = Gravity.END
                }
                tvSender.text = "You"
                tvRole.visibility = View.GONE
            } else {
                container.gravity = Gravity.START
                bubble.layoutParams = (bubble.layoutParams as LinearLayout.LayoutParams).apply {
                    gravity = Gravity.START
                }
                tvSender.text = msg.senderName
                tvRole.visibility = View.VISIBLE
            }

            tvText.text = msg.text
            tvTime.text = msg.timestamp.substringAfter(" ").take(5)
        }
    }
}
