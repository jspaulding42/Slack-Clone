import { useEffect, useMemo, useRef, useState } from 'react'
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
  listenForNewMessages,
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
  fetchOrganizationsForUser,
  fetchUserProfilesByIds
} from './lib/userService'
import { buildUsernameCandidates, extractMentionsFromHtml } from './lib/mentionUtils'
import type { Unsubscribe } from 'firebase/firestore'

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

const channelStorageKey = (userId: string, organizationId: string) =>
  `slack-clone:channel:${userId}:${organizationId}`

const readStoredChannelId = (userId: string, organizationId: string | null) => {
  if (typeof window === 'undefined' || !organizationId) {
    return null
  }
  return window.localStorage.getItem(channelStorageKey(userId, organizationId))
}

const persistChannelId = (
  userId: string,
  organizationId: string | null,
  channelId: string | null
) => {
  if (typeof window === 'undefined' || !organizationId) {
    return
  }
  const key = channelStorageKey(userId, organizationId)
  if (!channelId) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, channelId)
}

const clearStoredSelectionsForUser = (userId: string) => {
  if (typeof window === 'undefined') {
    return
  }
  persistOrganizationId(userId, null)
  const channelPrefix = `slack-clone:channel:${userId}:`
  const keysToRemove: string[] = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key && key.startsWith(channelPrefix)) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key))
}

type MentionableUser = {
  id: string
  displayName: string
  username: string
  aliases: string[]
  profilePictureUrl?: string
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
  const [mentionCounts, setMentionCounts] = useState<Record<string, number>>({})
  const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showChannelForm, setShowChannelForm] = useState(false)
  const [showOrganizationPicker, setShowOrganizationPicker] = useState(false)
  const [showOrganizationForm, setShowOrganizationForm] = useState(false)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastUserIdRef = useRef<string | null>(null)
  const mentionListenersRef = useRef<Record<string, Unsubscribe>>({})
  const selectedChannelIdRef = useRef<string | null>(null)
  const profileRef = useRef<UserProfile | null>(null)
  const currentUsernameRef = useRef<string | null>(null)
  const currentUsernameAliasesRef = useRef<string[]>([])
  const activeUserId = authUser?.uid ?? null

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId
    if (!selectedChannelId) {
      return
    }
    setMentionCounts((current) => {
      if (!current[selectedChannelId]) {
        return current
      }
      const { [selectedChannelId]: _cleared, ...rest } = current
      return rest
    })
  }, [selectedChannelId])

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
    if (activeUserId) {
      lastUserIdRef.current = activeUserId
      return
    }
    if (lastUserIdRef.current) {
      clearStoredSelectionsForUser(lastUserIdRef.current)
      lastUserIdRef.current = null
    }
  }, [activeUserId])

  useEffect(() => {
    if (!activeUserId) {
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
        const collection = await fetchOrganizationsForUser(db, activeUserId)
        if (cancelled) {
          return
        }
        const storedOrganizationId = readStoredOrganizationId(activeUserId)
        const storedOrganizationIsValid =
          !!storedOrganizationId && collection.some((org) => org.id === storedOrganizationId)
        setOrganizations(collection)
        setOrganizationsLoading(false)
        setSelectedOrganizationId((current) => {
          if (current && collection.some((org) => org.id === current)) {
            return current
          }
          if (storedOrganizationIsValid && storedOrganizationId) {
            return storedOrganizationId
          }
          return collection[0]?.id ?? null
        })
        if (collection.length > 1 && !storedOrganizationIsValid) {
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
  }, [activeUserId])

  useEffect(() => {
    if (!activeUserId || !selectedOrganizationId) {
      return
    }
    persistOrganizationId(activeUserId, selectedOrganizationId)
  }, [activeUserId, selectedOrganizationId])

  useEffect(() => {
    if (!activeUserId || !selectedOrganizationId || !selectedChannelId) {
      return
    }
    persistChannelId(activeUserId, selectedOrganizationId, selectedChannelId)
  }, [activeUserId, selectedOrganizationId, selectedChannelId])

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
          if (activeUserId) {
            const storedChannelId = readStoredChannelId(activeUserId, selectedOrganizationId)
            if (storedChannelId && collection.some((channel) => channel.id === storedChannelId)) {
              return storedChannelId
            }
          }
          return collection[0]?.id ?? null
        })
        if (activeUserId && collection.length === 0) {
          persistChannelId(activeUserId, selectedOrganizationId, null)
        }
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
  }, [selectedOrganizationId, activeUserId])

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

  const currentUsernameCandidates = useMemo(() => {
    if (!profile) {
      return []
    }
    const fallback = profile.email ? profile.email.split('@')[0] : undefined
    return buildUsernameCandidates(profile.displayName, fallback)
  }, [profile])

  const currentUsername = currentUsernameCandidates.length > 0 ? currentUsernameCandidates[0] : null

  const currentUsernameAliases = useMemo(
    () => (currentUsernameCandidates.length > 1 ? currentUsernameCandidates.slice(1) : []),
    [currentUsernameCandidates]
  )

  useEffect(() => {
    currentUsernameRef.current = currentUsername
  }, [currentUsername])

  useEffect(() => {
    currentUsernameAliasesRef.current = currentUsernameAliases
  }, [currentUsernameAliases])

  const selectedOrganizationMemberKey = useMemo(
    () => selectedOrganization?.memberIds?.join('|') ?? '',
    [selectedOrganization]
  )

  useEffect(() => {
    if (!isFirebaseConfigured || !selectedOrganization) {
      setMentionableUsers([])
      return
    }

    const memberIds = selectedOrganization.memberIds ?? []
    if (memberIds.length === 0) {
      setMentionableUsers([])
      return
    }

    let cancelled = false

    const loadMembers = async () => {
      try {
        const db = getDb()
        const profiles = await fetchUserProfilesByIds(db, memberIds)
        if (cancelled) {
          return
        }
        const mentionables = profiles
          .map((member) => {
            const fallback = member.email ? member.email.split('@')[0] : undefined
            const candidates = buildUsernameCandidates(member.displayName, fallback)
            if (candidates.length === 0) {
              return null
            }
            const [username, ...aliases] = candidates
            return {
              id: member.id,
              displayName: member.displayName,
              username,
              aliases,
              profilePictureUrl: member.profilePictureUrl
            } as MentionableUser
          })
          .filter((value): value is MentionableUser => Boolean(value))
          .sort((a, b) => a.username.localeCompare(b.username))
        setMentionableUsers(mentionables)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load organization members', err)
          setMentionableUsers([])
        }
      }
    }

    loadMembers()

    return () => {
      cancelled = true
    }
  }, [isFirebaseConfigured, selectedOrganization, selectedOrganizationMemberKey])

  const mentionSuggestions = useMemo(() => {
    if (!profile) {
      return mentionableUsers
    }
    return mentionableUsers.filter((user) => user.id !== profile.id)
  }, [mentionableUsers, profile])

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return
    }

    const listeners = mentionListenersRef.current

    if (!profile || !currentUsername) {
      Object.values(listeners).forEach((unsubscribe) => unsubscribe())
      mentionListenersRef.current = {}
      if (!profile) {
        setMentionCounts({})
      }
      return
    }

    const db = getDb()
    const activeChannelIds = new Set(channels.map((channel) => channel.id))

    Object.entries(listeners).forEach(([channelId, unsubscribe]) => {
      if (!activeChannelIds.has(channelId)) {
        unsubscribe()
        delete listeners[channelId]
      }
    })

    if (channels.length === 0) {
      setMentionCounts({})
      return
    }

    channels.forEach((channel) => {
      if (listeners[channel.id]) {
        return
      }
      listeners[channel.id] = listenForNewMessages(db, channel.id, (message) => {
        const username = currentUsernameRef.current
        const currentProfile = profileRef.current
        const activeChannelId = selectedChannelIdRef.current
        const usernameAliases = currentUsernameAliasesRef.current

        if (!username || !currentProfile) {
          return
        }

        const normalizedAuthor = message.author?.trim().toLowerCase() ?? ''
        if (
          normalizedAuthor.length > 0 &&
          normalizedAuthor === currentProfile.displayName.trim().toLowerCase()
        ) {
          return
        }

        const mentionTokens = extractMentionsFromHtml(message.text ?? '')
        const matchesMention =
          mentionTokens.includes(username.toLowerCase()) ||
          usernameAliases.some((alias) => mentionTokens.includes(alias))

        if (!matchesMention) {
          return
        }

        if (activeChannelId === channel.id) {
          return
        }

        setMentionCounts((current) => ({
          ...current,
          [channel.id]: (current[channel.id] ?? 0) + 1
        }))
      })
    })
  }, [channels, profile, currentUsername, isFirebaseConfigured])

  useEffect(() => {
    return () => {
      Object.values(mentionListenersRef.current).forEach((unsubscribe) => unsubscribe())
      mentionListenersRef.current = {}
    }
  }, [])

  useEffect(() => {
    setMentionCounts({})
  }, [selectedOrganizationId])

  useEffect(() => {
    if (currentUsername === null) {
      return
    }
    setMentionCounts({})
  }, [currentUsername])

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
        attachments,
        authorProfilePictureUrl: profile.profilePictureUrl ?? null
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
      if (activeUserId) {
        clearStoredSelectionsForUser(activeUserId)
      }
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
        mentionCounts={mentionCounts}
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
              currentUserName={userDisplayName}
            />
            <MessageInput
              onSend={handleSendMessage}
              disabled={!selectedChannel || !profile}
              channelName={selectedChannel?.name}
              mentionableUsers={mentionSuggestions}
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
