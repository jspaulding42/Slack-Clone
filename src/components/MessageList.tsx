import type { Message, Channel } from '../lib/chatService'
import { sanitizeMessageHtml } from '../lib/sanitizeMessageHtml'
import { AttachmentDisplay } from './AttachmentDisplay'

type MessageListProps = {
  channel?: Channel | null
  messages: Message[]
  isLoading?: boolean
}

const formatTime = (date?: Date) => {
  if (!date) {
    return 'pending…'
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const MessageList = ({ channel, messages, isLoading = false }: MessageListProps) => {
  if (!channel) {
    return (
      <section className="message-panel">
        <div className="message-panel__empty">
          <h3>Select a channel</h3>
          <p>Pick a channel from the left sidebar to load the conversation.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="message-panel">
      <header>
        <div>
          <h2># {channel.name}</h2>
          {channel.topic && <p className="topic">{channel.topic}</p>}
        </div>
      </header>

      <div className="message-panel__scroll">
        {isLoading && <p className="message-panel__hint">Loading messages…</p>}
        {!isLoading && messages.length === 0 && (
          <p className="message-panel__hint">No messages yet. Say hello!</p>
        )}
        {messages.map((message) => (
          <article key={message.id} className="message">
            <div className="message__avatar">{message.author?.[0]?.toUpperCase() ?? '?'}</div>
            <div>
              <div className="message__meta">
                <strong>{message.author}</strong>
                <span>{formatTime(message.createdAt)}</span>
              </div>
              {message.text && (
                <div
                  className="message__body"
                  dangerouslySetInnerHTML={{ __html: sanitizeMessageHtml(message.text) }}
                />
              )}
              {message.attachments && message.attachments.length > 0 && (
                <div className="message__attachments">
                  {message.attachments.map((attachment) => (
                    <AttachmentDisplay
                      key={attachment.id}
                      attachment={attachment}
                    />
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
