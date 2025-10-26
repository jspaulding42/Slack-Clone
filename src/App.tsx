import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ChannelSidebar } from './components/ChannelSidebar'
import { ChannelForm } from './components/ChannelForm'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import { UserSetup } from './components/UserSetup'
import { useLocalStorage } from './hooks/useLocalStorage'
import {
  type Channel,
  type Message,
  createChannel,
  listenToChannels,
  listenToMessages,
  sendMessage
} from './lib/chatService'
import { getDb, isFirebaseConfigured } from './lib/firebase'

type StoredUser = { displayName: string }

function App() {
  const [user, setUser] = useLocalStorage<StoredUser | null>('slack-clone:user', null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return
    }

    const db = getDb()
    setChannelsLoading(true)
    const unsubscribe = listenToChannels(db, (collection) => {
      setChannels(collection)
      setChannelsLoading(false)
      setSelectedChannelId((current) => {
        if (current) {
          return current
        }

        return collection[0]?.id ?? null
      })
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (channels.length === 0) {
      setSelectedChannelId(null)
      return
    }

    if (selectedChannelId && channels.some((channel) => channel.id === selectedChannelId)) {
      return
    }

    setSelectedChannelId(channels[0]?.id ?? null)
  }, [channels, selectedChannelId])

  useEffect(() => {
    if (!isFirebaseConfigured || !selectedChannelId) {
      setMessages([])
      setMessagesLoading(false)
      return
    }

    const db = getDb()
    setMessagesLoading(true)
    const unsubscribe = listenToMessages(db, selectedChannelId, (items) => {
      setMessages(items)
      setMessagesLoading(false)
    })

    return () => unsubscribe()
  }, [selectedChannelId])

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  )

  const handleCreateChannel = async (values: { name: string; topic?: string }) => {
    if (!user) {
      return
    }

    try {
      setError(null)
      const db = getDb()
      await createChannel(db, { ...values, createdBy: user.displayName })
      setShowChannelForm(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create channel.'
      setError(message)
      throw err
    }
  }

  const handleSendMessage = async (text: string) => {
    if (!user || !selectedChannelId) {
      return
    }

    try {
      setError(null)
      const db = getDb()
      await sendMessage(db, selectedChannelId, { text, author: user.displayName })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send message.'
      setError(message)
      throw err
    }
  }

  if (!isFirebaseConfigured) {
    return (
      <div className="app-shell setup-state">
        <div className="config-card">
          <h1>Connect Firebase</h1>
          <p>
            Update <code>src/firebaseConfig.ts</code> with the credentials from your Firebase project.
          </p>
          <ol>
            <li>Create a Firebase project with Firestore enabled.</li>
            <li>Register a Web app in Project Settings.</li>
            <li>Copy the config object into <code>firebaseConfig.ts</code>.</li>
          </ol>
          <p>The Slack clone will load automatically after the file is saved.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <ChannelSidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={setSelectedChannelId}
        onCreateChannel={() => setShowChannelForm(true)}
        isLoading={channelsLoading}
      />
      <main>
        <MessageList channel={selectedChannel} messages={messages} isLoading={messagesLoading} />
        <MessageInput
          onSend={handleSendMessage}
          disabled={!selectedChannel || !user}
          channelName={selectedChannel?.name}
        />
        {error && <p className="form-error global-error">{error}</p>}
      </main>

      {showChannelForm && (
        <ChannelForm onSubmit={handleCreateChannel} onCancel={() => setShowChannelForm(false)} />
      )}

      {!user && <UserSetup onComplete={(displayName) => setUser({ displayName })} />}
    </div>
  )
}

export default App
