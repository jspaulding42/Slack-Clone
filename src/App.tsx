import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ChannelSidebar } from './components/ChannelSidebar'
import { ChannelForm } from './components/ChannelForm'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import { AuthDialog } from './components/AuthDialog'
import { OrganizationDialog } from './components/OrganizationDialog'
import { InviteModal } from './components/InviteModal'
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
import {
  type AuthUser,
  type Organization,
  type OrganizationInvite,
  acceptInvite,
  createOrganization,
  declineInvite,
  inviteUserToOrganization,
  listenToInvites,
  listenToOrganizations,
  loginUser,
  registerUser
} from './lib/orgService'

function App() {
  const [user, setUser] = useLocalStorage<AuthUser | null>('slack-clone:user', null)
  const [activeOrganizationId, setActiveOrganizationId] = useLocalStorage<string | null>(
    'slack-clone:organization',
    null
  )
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showOrganizationDialog, setShowOrganizationDialog] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationsLoading, setOrganizationsLoading] = useState(false)
  const [invites, setInvites] = useState<OrganizationInvite[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }
    if (!user.id || !user.email || !user.displayName) {
      setUser(null)
      setActiveOrganizationId(null)
    }
  }, [user, setUser, setActiveOrganizationId])

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setOrganizations([])
      setOrganizationsLoading(false)
      setActiveOrganizationId(null)
      return
    }

    const db = getDb()
    setOrganizationsLoading(true)
    const unsubscribe = listenToOrganizations(db, user.id, (collection) => {
      setOrganizations(collection)
      setOrganizationsLoading(false)
      setActiveOrganizationId((current) => {
        if (current && collection.some((org) => org.id === current)) {
          return current
        }
        if (collection.length === 1) {
          return collection[0].id
        }
        return null
      })
    })

    return () => unsubscribe()
  }, [user, setActiveOrganizationId])

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setInvites([])
      return
    }

    const db = getDb()
    const unsubscribe = listenToInvites(db, user.email, (items) => {
      setInvites(items)
    })

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!isFirebaseConfigured || !activeOrganizationId) {
      setChannels([])
      setChannelsLoading(false)
      return
    }

    const db = getDb()
    setChannelsLoading(true)
    const unsubscribe = listenToChannels(db, activeOrganizationId, (collection) => {
      setChannels(collection)
      setChannelsLoading(false)
      setSelectedChannelId((current) => {
        if (current && collection.some((channel) => channel.id === current)) {
          return current
        }
        return collection[0]?.id ?? null
      })
    })

    return () => unsubscribe()
  }, [activeOrganizationId])

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

  useEffect(() => {
    setSelectedChannelId(null)
  }, [activeOrganizationId])

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  )

  const activeOrganization = useMemo(
    () => organizations.find((org) => org.id === activeOrganizationId) ?? null,
    [organizations, activeOrganizationId]
  )

  const handleCreateChannel = async (values: { name: string; topic?: string }) => {
    if (!user || !activeOrganization) {
      return
    }

    try {
      setError(null)
      const db = getDb()
      await createChannel(db, {
        ...values,
        createdBy: user.displayName,
        organizationId: activeOrganization.id
      })
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

  const handleRegister = async (values: { email: string; password: string; displayName: string }) => {
    const db = getDb()
    const newUser = await registerUser(db, values)
    setUser(newUser)
    setActiveOrganizationId(null)
  }

  const handleLogin = async (values: { email: string; password: string }) => {
    const db = getDb()
    const loggedInUser = await loginUser(db, values)
    setUser(loggedInUser)
    setActiveOrganizationId(null)
  }

  const handleLogout = () => {
    setUser(null)
    setActiveOrganizationId(null)
    setChannels([])
    setMessages([])
    setSelectedChannelId(null)
    setOrganizations([])
    setInvites([])
    setShowChannelForm(false)
    setShowInviteModal(false)
    setShowOrganizationDialog(false)
  }

  const handleCreateOrganization = async (name: string) => {
    if (!user) {
      return
    }
    setOrganizationsLoading(true)
    const db = getDb()
    const orgId = await createOrganization(db, {
      name,
      createdByUserId: user.id,
      createdByDisplayName: user.displayName
    })
    setActiveOrganizationId(orgId)
    setShowOrganizationDialog(false)
  }

  const handleAcceptInvite = async (invite: OrganizationInvite) => {
    if (!user) {
      return
    }
    const db = getDb()
    await acceptInvite(db, invite, user.id)
  }

  const handleDeclineInvite = async (inviteId: string) => {
    const db = getDb()
    await declineInvite(db, inviteId)
  }

  const handleSendInvite = async (email: string) => {
    if (!user || !activeOrganization) {
      return
    }
    const db = getDb()
    await inviteUserToOrganization(db, {
      organizationId: activeOrganization.id,
      organizationName: activeOrganization.name,
      email,
      invitedBy: user.displayName
    })
  }

  const noOrganizations = Boolean(user && !organizationsLoading && organizations.length === 0)
  const missingSelection = Boolean(user && organizations.length > 0 && !activeOrganizationId)
  const needsOrganizationSelection = noOrganizations || missingSelection
  const shouldShowOrganizationDialog = (needsOrganizationSelection || showOrganizationDialog) && !!user
  const showWorkspaceEmptyState = Boolean(user && !activeOrganization)

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
        onSwitchOrganization={() => setShowOrganizationDialog(true)}
        onInvite={() => setShowInviteModal(true)}
        onLogout={handleLogout}
        organizationName={activeOrganization?.name}
        isLoading={channelsLoading}
      />
      <main>
        {showWorkspaceEmptyState ? (
          <section className="workspace-empty">
            <h2>No organization selected</h2>
            <p>
              Create a new workspace or accept an invitation to start creating channels and sending
              messages.
            </p>
            <div className="workspace-empty__actions">
              <button className="primary-btn" type="button" onClick={() => setShowOrganizationDialog(true)}>
                Create or join organization
              </button>
              {invites.length > 0 && (
                <p className="workspace-empty__hint">
                  You have {invites.length} pending invite{invites.length > 1 ? 's' : ''}.
                </p>
              )}
            </div>
          </section>
        ) : (
          <>
            <MessageList channel={selectedChannel} messages={messages} isLoading={messagesLoading} />
            <MessageInput
              onSend={handleSendMessage}
              disabled={!selectedChannel || !user || !activeOrganization}
              channelName={selectedChannel?.name}
            />
          </>
        )}
        {error && <p className="form-error global-error">{error}</p>}
      </main>

      {showChannelForm && (
        <ChannelForm onSubmit={handleCreateChannel} onCancel={() => setShowChannelForm(false)} />
      )}

      {showInviteModal && activeOrganization && (
        <InviteModal
          organizationName={activeOrganization.name}
          onInvite={async (email) => {
            await handleSendInvite(email)
          }}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {shouldShowOrganizationDialog && user && (
        <OrganizationDialog
          organizations={organizations}
          invites={invites}
          selectedOrganizationId={activeOrganizationId}
          isLoading={organizationsLoading}
          blocking={needsOrganizationSelection}
          onSelect={(orgId) => {
            setActiveOrganizationId(orgId)
            setShowOrganizationDialog(false)
          }}
          onClose={() => setShowOrganizationDialog(false)}
          onCreateOrganization={handleCreateOrganization}
          onAcceptInvite={handleAcceptInvite}
          onDeclineInvite={handleDeclineInvite}
          onLogout={handleLogout}
        />
      )}

      {!user && <AuthDialog onLogin={handleLogin} onRegister={handleRegister} />}
    </div>
  )
}

export default App
