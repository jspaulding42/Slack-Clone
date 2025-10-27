import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
  type Unsubscribe
} from 'firebase/firestore'

export type Channel = {
  id: string
  name: string
  topic?: string
  createdAt?: Date
  createdBy?: string
  organizationId: string
}

export type Message = {
  id: string
  text: string
  author: string
  createdAt?: Date
  attachments: MessageAttachment[]
  authorProfilePictureUrl?: string
}

export type MessageAttachment = {
  id: string
  name: string
  size: number
  contentType?: string
  url: string
  storagePath?: string
  thumbnailUrl?: string
  thumbnailStoragePath?: string
  thumbnailWidth?: number
  thumbnailHeight?: number
}

const channelsCollection = (db: Firestore) => collection(db, 'channels')

const channelMessagesCollection = (db: Firestore, channelId: string) =>
  collection(channelsCollection(db), channelId, 'messages')

const mapTimestamp = (doc: QueryDocumentSnapshot<DocumentData>, field: string) => {
  const timestamp = doc.get(field)
  if (!timestamp || typeof timestamp.toDate !== 'function') {
    return undefined
  }
  return timestamp.toDate() as Date
}

const mapChannel = (doc: QueryDocumentSnapshot<DocumentData>): Channel => ({
  id: doc.id,
  name: doc.get('name') ?? 'Untitled channel',
  topic: doc.get('topic') ?? undefined,
  createdBy: doc.get('createdBy') ?? undefined,
  organizationId: doc.get('organizationId') ?? '',
  createdAt: mapTimestamp(doc, 'createdAt')
})

const mapMessage = (doc: QueryDocumentSnapshot<DocumentData>): Message => {
  const profilePictureValue = doc.get('authorProfilePictureUrl')
  const authorProfilePictureUrl =
    typeof profilePictureValue === 'string' && profilePictureValue.trim().length > 0
      ? profilePictureValue
      : undefined

  return {
    id: doc.id,
    text: doc.get('text') ?? '',
    author: doc.get('author') ?? 'Unknown',
    createdAt: mapTimestamp(doc, 'createdAt'),
    attachments: mapAttachments(doc.get('attachments')),
    authorProfilePictureUrl
  }
}

const mapAttachments = (value: unknown): MessageAttachment[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => mapAttachment(item))
    .filter((attachment): attachment is MessageAttachment => Boolean(attachment))
}

const mapAttachment = (value: unknown): MessageAttachment | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const data = value as Record<string, unknown>
  if (typeof data.url !== 'string' || typeof data.name !== 'string') {
    return null
  }

  const fallbackId =
    (typeof data.storagePath === 'string' && data.storagePath) ||
    (typeof data.url === 'string' && data.url) ||
    ''

  return {
    id: typeof data.id === 'string' ? data.id : fallbackId,
    name: data.name,
    size: typeof data.size === 'number' ? data.size : 0,
    contentType: typeof data.contentType === 'string' ? data.contentType : undefined,
    url: data.url,
    storagePath: typeof data.storagePath === 'string' ? data.storagePath : undefined,
    thumbnailUrl: typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : undefined,
    thumbnailStoragePath:
      typeof data.thumbnailStoragePath === 'string' ? data.thumbnailStoragePath : undefined,
    thumbnailWidth: typeof data.thumbnailWidth === 'number' ? data.thumbnailWidth : undefined,
    thumbnailHeight: typeof data.thumbnailHeight === 'number' ? data.thumbnailHeight : undefined
  }
}

export const listenToChannels = (
  db: Firestore,
  organizationId: string,
  onUpdate: (channels: Channel[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const channelsQuery = query(channelsCollection(db), where('organizationId', '==', organizationId))
  return onSnapshot(
    channelsQuery,
    (snapshot) => {
      const channels = snapshot
        .docs
        .map(mapChannel)
        .sort((a, b) => {
          const aTime = a.createdAt?.getTime() ?? 0
          const bTime = b.createdAt?.getTime() ?? 0
          return aTime - bTime
        })
      onUpdate(channels)
    },
    (error) => {
      if (onError) {
        onError(error)
      } else {
        console.error('Channel listener error', error)
      }
    }
  )
}

export const listenToMessages = (
  db: Firestore,
  channelId: string,
  onUpdate: (messages: Message[]) => void
): Unsubscribe => {
  const messagesQuery = query(
    channelMessagesCollection(db, channelId),
    orderBy('createdAt', 'asc')
  )
  return onSnapshot(messagesQuery, (snapshot) => {
    onUpdate(snapshot.docs.map(mapMessage))
  })
}

export const createChannel = async (
  db: Firestore,
  params: { name: string; topic?: string; createdBy: string; organizationId: string }
) => {
  const { topic, ...rest } = params
  await addDoc(channelsCollection(db), {
    ...rest,
    ...(topic ? { topic } : {}),
    createdAt: serverTimestamp()
  })
}

export const sendMessage = async (
  db: Firestore,
  channelId: string,
  params: {
    text: string
    author: string
    attachments?: MessageAttachment[]
    authorProfilePictureUrl?: string | null
  }
) => {
  const trimmedText = params.text.trim()
  
  // Filter out undefined values from attachments before saving to Firestore
  const cleanAttachments = params.attachments?.map((attachment) => {
    const clean: Partial<MessageAttachment> = {}
    Object.entries(attachment).forEach(([key, value]) => {
      if (value !== undefined) {
        // TypeScript cannot infer the specific key, so cast through unknown.
        (clean as Record<string, unknown>)[key] = value
      }
    })
    return clean as MessageAttachment
  })
  
  const payload: Record<string, unknown> = {
    text: trimmedText,
    author: params.author,
    createdAt: serverTimestamp()
  }

  if (cleanAttachments?.length) {
    payload.attachments = cleanAttachments
  }

  if (params.authorProfilePictureUrl) {
    payload.authorProfilePictureUrl = params.authorProfilePictureUrl
  }

  await addDoc(channelMessagesCollection(db, channelId), payload)
}
