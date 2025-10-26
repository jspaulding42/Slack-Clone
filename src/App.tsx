import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth'
import './App.css'
import { ChannelSidebar } from './components/ChannelSidebar'
import { ChannelForm } from './components/ChannelForm'
import { MessageList } from './components/MessageList'
import { MessageInput } from './components/MessageInput'
import { AuthModal } from './components/AuthModal'
import { OrganizationPicker } from './components/OrganizationPicker'
import { OrganizationForm } from './components/OrganizationForm'
import { ProfileForm } from './components/ProfileForm'
import {
  type Channel,
  type Message,
  type MessageAttachment,
  createChannel,
  listenToChannels,
  listenToMessages,
  sendMessage
} from './lib/chatService'
import { getAuthInstance, getDb, isFirebaseConfigured } from './lib/firebase'
import {
  type Organization,
  type UserProfile,
  createOrganization as createOrganizationRecord,
  ensureUserProfile,
  fetchOrganizationsForUser
} from './lib/userService'

const organizationStorageKey = (userId: string) => `slack-clone:organization:${userId}`

const readStoredOrganizationId = (userId: string) => {
  if (typeof window === 'undefined') {
    return null
  }
  return window.localStorage.getItem(organizationStorageKey(userId))
}

const persistOrganizationId = (userId: string, organizationId: string | null) => {
  if (typeof window === 'undefined') {
    return
  }
  const key = organizationStorageKey(userId)
  if (!organizationId) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, organizationId)
}

function App() {
  const [authReady, setAuthReady] = useState(false)
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [organizationsLoading, setOrganizationsLoading] = useState(false)
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [showOrganizationPicker, setShowOrganizationPicker] = useState(false)
  const [showOrganizationForm, setShowOrganizationForm] = useState(false)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return
    }

    const auth = getAuthInstance()
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user)
      setAuthReady(true)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!authUser) {
      setProfile(null)
      return
    }

    let cancelled = false
    const loadProfile = async () => {
      try {
        const db = getDb()
        const userProfile = await ensureUserProfile(db, {
          uid: authUser.uid,
          email: authUser.email ?? '',
          displayName: authUser.displayName ?? authUser.email ?? 'Anonymous'
        })
        if (!cancelled) {
          setProfile(userProfile)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unable to load profile.'
          setError(message)
        }
      }
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [authUser])

  useEffect(() => {
    if (!authUser) {
      setOrganizations([])
      setSelectedOrganizationId(null)
      setOrganizationsLoading(false)
      setChannels([])
      setSelectedChannelId(null)
      setMessages([])
      setShowChannelForm(false)
      setShowOrganizationPicker(false)
      setShowOrganizationForm(false)
      setShowProfileForm(false)
      return
    }

    let cancelled = false
    const loadOrganizations = async () => {
      try {
        setOrganizationsLoading(true)
        const db = getDb()
        const collection = await fetchOrganizationsForUser(db, authUser.uid)
        if (cancelled) {
          return
        }
        setOrganizations(collection)
        setOrganizationsLoading(false)
        setSelectedOrganizationId((current) => {
          if (current && collection.some((org) => org.id === current)) {
            return current
          }
          const stored = readStoredOrganizationId(authUser.uid)
          if (stored && collection.some((org) => org.id === stored)) {
            return stored
          }
          return collection[0]?.id ?? null
        })
        if (collection.length > 1 && !readStoredOrganizationId(authUser.uid)) {
          setShowOrganizationPicker(true)
        } else {
          setShowOrganizationPicker(false)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Unable to load organizations.'
          setError(message)
          setOrganizationsLoading(false)
        }
      }
    }

    loadOrganizations()
    return () => {
      cancelled = true
    }
  }, [authUser])

  useEffect(() => {
    if (!authUser) {
      return
    }
    persistOrganizationId(authUser.uid, selectedOrganizationId)
  }, [authUser, selectedOrganizationId])

  useEffect(() => {
    if (!isFirebaseConfigured || !selectedOrganizationId) {
      setChannels([])
      setChannelsLoading(false)
      setSelectedChannelId(null)
      return
    }

    const db = getDb()
    setChannelsLoading(true)
    const unsubscribe = listenToChannels(
      db,
      selectedOrganizationId,
      (collection) => {
        setChannels(collection)
        setChannelsLoading(false)
        setSelectedChannelId((current) => {
          if (current && collection.some((channel) => channel.id === current)) {
            return current
          }
          return collection[0]?.id ?? null
        })
      },
      (listenerError) => {
        setChannels([])
        setChannelsLoading(false)
        const message =
          listenerError instanceof Error ? listenerError.message : 'Unable to load channels right now.'
        setError(message)
      }
    )

    return () => unsubscribe()
  }, [selectedOrganizationId])

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
    setSearchQuery('')
  }, [selectedChannelId])

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.id === selectedOrganizationId) ?? null,
    [organizations, selectedOrganizationId]
  )

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) ?? null,
    [channels, selectedChannelId]
  )

  const handleCreateChannel = async (values: { name: string; topic?: string }) => {
    if (!profile || !selectedOrganizationId) {
      return
    }

    try {
      setError(null)
      const db = getDb()
      await createChannel(db, {
        ...values,
        createdBy: profile.displayName,
        organizationId: selectedOrganizationId
      })
      setShowChannelForm(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create channel.'
      setError(message)
      throw err
    }
  }

  const handleSendMessage = async (text: string, attachments?: MessageAttachment[]) => {
    if (!profile || !selectedChannelId) {
      return
    }

    try {
      setError(null)
      const db = getDb()
      await sendMessage(db, selectedChannelId, { 
        text, 
        author: profile.displayName,
        attachments 
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send message.'
      setError(message)
      throw err
    }
  }

  const handleSignOut = async () => {
    try {
      const auth = getAuthInstance()
      await signOut(auth)
      setSelectedOrganizationId(null)
      setOrganizations([])
      setChannels([])
      setMessages([])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign out right now.'
      setError(message)
    }
  }

  const handleSelectOrganization = (organizationId: string) => {
    setSelectedOrganizationId(organizationId)
    setShowOrganizationPicker(false)
  }

  const handleCreateOrganization = async (name: string) => {
    if (!profile) {
      throw new Error('You need an account to create an organization.')
    }

    const db = getDb()
    const organization = await createOrganizationRecord(db, { name, user: profile })
    setOrganizations((current) => [...current, organization].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedOrganizationId(organization.id)
    setShowOrganizationForm(false)
    setShowOrganizationPicker(false)
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

  if (!authReady) {
    return (
      <div className="app-shell setup-state">
        <div className="config-card">
          <h1>Loading workspace…</h1>
          <p>Connecting to Firebase. Hang tight!</p>
        </div>
      </div>
    )
  }

  const userDisplayName = profile?.displayName ?? authUser?.displayName ?? authUser?.email ?? 'Anonymous'
  const userEmail = profile?.email ?? authUser?.email ?? null
  const userProfilePictureUrl = profile?.profilePictureUrl ?? null
  const canSwitchOrganization = organizations.length > 1

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile)
  }

  return (
    <div className="app-shell">
      <ChannelSidebar
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={setSelectedChannelId}
        onCreateChannel={() => setShowChannelForm(true)}
        onSwitchOrganization={() => setShowOrganizationPicker(true)}
        onCreateOrganization={() => setShowOrganizationForm(true)}
        onSignOut={handleSignOut}
        onEditProfile={() => setShowProfileForm(true)}
        organizationName={selectedOrganization?.name}
        canSwitchOrganization={canSwitchOrganization}
        userDisplayName={userDisplayName}
        userEmail={userEmail}
        userProfilePictureUrl={userProfilePictureUrl}
        isLoading={channelsLoading}
      />
      <main>
        {selectedOrganization ? (
          <>
            <MessageList
              channel={selectedChannel}
              messages={messages}
              isLoading={messagesLoading}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />
            <MessageInput
              onSend={handleSendMessage}
              disabled={!selectedChannel || !profile}
              channelName={selectedChannel?.name}
            />
          </>
        ) : (
          <section className="message-panel">
            <div className="message-panel__empty">
              <h3>{organizations.length === 0 ? 'Create your first organization' : 'Select an organization'}</h3>
              {organizationsLoading ? (
                <p>Loading your organizations…</p>
              ) : (
                <>
                  <p>Workspaces keep your channels separated. Create one or choose an existing workspace.</p>
                  <div className="message-panel__actions">
                    <button className="primary-btn" type="button" onClick={() => setShowOrganizationForm(true)}>
                      Create organization
                    </button>
                    {canSwitchOrganization && (
                      <button className="ghost-btn" type="button" onClick={() => setShowOrganizationPicker(true)}>
                        Choose organization
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}
        {error && <p className="form-error global-error">{error}</p>}
      </main>

      {showChannelForm && selectedOrganization && (
        <ChannelForm onSubmit={handleCreateChannel} onCancel={() => setShowChannelForm(false)} />
      )}

      {showOrganizationPicker && organizations.length > 1 && (
        <OrganizationPicker
          organizations={organizations}
          isOpen={showOrganizationPicker}
          onSelect={handleSelectOrganization}
          onClose={() => setShowOrganizationPicker(false)}
          onCreateRequested={() => {
            setShowOrganizationPicker(false)
            setShowOrganizationForm(true)
          }}
        />
      )}

      {showOrganizationForm && (
        <OrganizationForm
          onSubmit={handleCreateOrganization}
          onCancel={() => setShowOrganizationForm(false)}
        />
      )}

      {showProfileForm && profile && (
        <ProfileForm
          profile={profile}
          onClose={() => setShowProfileForm(false)}
          onProfileUpdate={handleProfileUpdate}
        />
      )}

      {authReady && !authUser && <AuthModal />}
    </div>
  )
}

export default App
