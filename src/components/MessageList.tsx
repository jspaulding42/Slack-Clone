import { useCallback, useEffect, useRef, useState } from 'react'
import type { Message, Channel, MessageAttachment } from '../lib/chatService'
import { sanitizeMessageHtml } from '../lib/sanitizeMessageHtml'
import { AttachmentDisplay } from './AttachmentDisplay'
import { AttachmentViewer } from './AttachmentViewer'

type MessageListProps = {
  channel?: Channel | null
  messages: Message[]
  isLoading?: boolean
  searchQuery?: string
  onSearchQueryChange?: (query: string) => void
  currentUserName?: string | null
}

const formatTime = (date?: Date) => {
  if (!date) {
    return 'pending…'
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const isNearBottom = (node: HTMLDivElement, threshold = 48) => {
  const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight
  return distanceFromBottom <= threshold
}

export const MessageList = ({
  channel,
  messages,
  isLoading = false,
  searchQuery,
  onSearchQueryChange,
  currentUserName
}: MessageListProps) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const lastMessageCountRef = useRef(0)
  const lastChannelIdRef = useRef<string | null>(null)
  const [activeAttachment, setActiveAttachment] = useState<MessageAttachment | null>(null)

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const node = scrollContainerRef.current
      if (!node) {
        return
      }
      requestAnimationFrame(() => {
        node.scrollTo({ top: node.scrollHeight, behavior })
      })
    },
    []
  )

  const handleScroll = useCallback(() => {
    const node = scrollContainerRef.current
    if (!node) {
      return
    }
    setIsAtBottom(isNearBottom(node))
  }, [])

  useEffect(() => {
    const node = scrollContainerRef.current
    if (!node) {
      return
    }
    node.addEventListener('scroll', handleScroll, { passive: true })
    setIsAtBottom(isNearBottom(node))
    return () => node.removeEventListener('scroll', handleScroll)
  }, [handleScroll, channel?.id])

  useEffect(() => {
    if (!channel) {
      setIsAtBottom(true)
      lastChannelIdRef.current = null
      lastMessageCountRef.current = 0
      return
    }
    if (channel.id !== lastChannelIdRef.current) {
      lastChannelIdRef.current = channel.id
      lastMessageCountRef.current = messages.length
      scrollToBottom('auto')
      setIsAtBottom(true)
      return
    }
    if (isAtBottom) {
      scrollToBottom(messages.length > 0 ? 'smooth' : 'auto')
    }
  }, [channel, messages.length, isAtBottom, scrollToBottom])

  useEffect(() => {
    if (!channel || !currentUserName) {
      lastMessageCountRef.current = messages.length
      return
    }

    const previousCount = lastMessageCountRef.current
    lastMessageCountRef.current = messages.length
    if (messages.length <= previousCount) {
      return
    }

    const addedMessages = messages.slice(previousCount)
    const normalizedCurrentUser = currentUserName.trim().toLowerCase()
    const selfPosted = addedMessages.some((message) => {
      const normalizedAuthor = message.author?.trim().toLowerCase()
      return normalizedAuthor === normalizedCurrentUser
    })

    if (selfPosted) {
      scrollToBottom()
      setIsAtBottom(true)
    }
  }, [channel, messages, currentUserName, scrollToBottom])

  const normalizedQuery = searchQuery?.trim().toLowerCase()
  const filteredMessages =
    normalizedQuery && normalizedQuery.length > 0
      ? messages.filter((message) => {
          const haystacks = [
            message.author,
            message.text,
            message.attachments?.map((attachment) => attachment.name).join(' ')
          ]
          return haystacks.some((value) => {
            const normalizedValue = value?.toLowerCase()
            return normalizedValue ? normalizedValue.includes(normalizedQuery) : false
          })
        })
      : messages

  const shouldShowScrollButton = !!channel && !isAtBottom

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
        {onSearchQueryChange && (
          <div className="message-search">
            <input
              type="search"
              value={searchQuery ?? ''}
              placeholder="Search messages"
              onChange={(event) => onSearchQueryChange(event.target.value)}
            />
          </div>
        )}
      </header>

      <div className="message-panel__scroll" ref={scrollContainerRef}>
        {isLoading && <p className="message-panel__hint">Loading messages…</p>}
        {!isLoading && filteredMessages.length === 0 && (
          <p className="message-panel__hint">No messages yet. Say hello!</p>
        )}
        {filteredMessages.map((message) => (
          <article key={message.id} className="message">
            <div className="message__avatar">
              {message.authorProfilePictureUrl ? (
                <img
                  src={message.authorProfilePictureUrl}
                  alt={`${message.author}'s avatar`}
                  className="message__avatar-image"
                  loading="lazy"
                />
              ) : (
                message.author?.[0]?.toUpperCase() ?? '?'
              )}
            </div>
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
                      onPreview={(selected) => setActiveAttachment(selected)}
                    />
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
        {shouldShowScrollButton && (
          <button
            type="button"
            className="message-panel__scroll-button"
            onClick={() => scrollToBottom()}
          >
            Scroll to bottom
          </button>
        )}
      </div>
      {activeAttachment && (
        <AttachmentViewer
          attachment={activeAttachment}
          onClose={() => setActiveAttachment(null)}
        />
      )}
    </section>
  )
}
