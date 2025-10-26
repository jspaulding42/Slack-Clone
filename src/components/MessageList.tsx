import type { Message, Channel } from '../lib/chatService'

type MessageListProps = {
  channel?: Channel | null
  messages: Message[]
  isLoading?: boolean
  searchQuery?: string
  onSearchQueryChange?: (value: string) => void
}

const formatTime = (date?: Date) => {
  if (!date) {
    return 'pending…'
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export const MessageList = ({
  channel,
  messages,
  isLoading = false,
  searchQuery,
  onSearchQueryChange
}: MessageListProps) => {
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

  const normalizedQuery = searchQuery?.trim().toLowerCase() ?? ''
  const filteredMessages =
    normalizedQuery.length === 0
      ? messages
      : messages.filter((message) => {
          const text = message.text.toLowerCase()
          const author = message.author.toLowerCase()
          return text.includes(normalizedQuery) || author.includes(normalizedQuery)
        })

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const highlightText = (text: string) => {
    if (!normalizedQuery) {
      return text
    }
    const regex = new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'gi')
    return text.split(regex).map((part, index) => {
      if (part.toLowerCase() === normalizedQuery) {
        return (
          <mark key={`${part}-${index}`} className="message-search__highlight">
            {part}
          </mark>
        )
      }
      return <span key={`${part}-${index}`}>{part}</span>
    })
  }

  return (
    <section className="message-panel">
      <header>
        <div>
          <h2># {channel.name}</h2>
          {channel.topic && <p className="topic">{channel.topic}</p>}
        </div>
        <div className="message-search">
          <input
            type="search"
            placeholder="Search this channel"
            value={searchQuery ?? ''}
            onChange={(event) => onSearchQueryChange?.(event.target.value)}
            aria-label="Search messages in this channel"
          />
          {normalizedQuery && (
            <button
              className="ghost-btn"
              type="button"
              onClick={() => onSearchQueryChange?.('')}
            >
              Clear
            </button>
          )}
        </div>
      </header>

      <div className="message-panel__scroll">
        {isLoading && <p className="message-panel__hint">Loading messages…</p>}
        {!isLoading && messages.length === 0 && (
          <p className="message-panel__hint">No messages yet. Say hello!</p>
        )}
        {!isLoading && normalizedQuery && filteredMessages.length === 0 && (
          <p className="message-panel__hint">
            No messages found for “{searchQuery}”.
          </p>
        )}
        {!isLoading && normalizedQuery && filteredMessages.length > 0 && (
          <p className="message-panel__hint">
            {filteredMessages.length} message{filteredMessages.length === 1 ? '' : 's'} matching “{searchQuery}”.
          </p>
        )}
        {filteredMessages.map((message) => (
          <article key={message.id} className="message">
            <div className="message__avatar">{message.author?.[0]?.toUpperCase() ?? '?'}</div>
            <div>
              <div className="message__meta">
                <strong>{message.author}</strong>
                <span>{formatTime(message.createdAt)}</span>
              </div>
              <p>{highlightText(message.text)}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
