import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
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
}

export type Message = {
  id: string
  text: string
  author: string
  createdAt?: Date
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
  createdAt: mapTimestamp(doc, 'createdAt')
})

const mapMessage = (doc: QueryDocumentSnapshot<DocumentData>): Message => ({
  id: doc.id,
  text: doc.get('text') ?? '',
  author: doc.get('author') ?? 'Unknown',
  createdAt: mapTimestamp(doc, 'createdAt')
})

export const listenToChannels = (
  db: Firestore,
  onUpdate: (channels: Channel[]) => void
): Unsubscribe => {
  const channelsQuery = query(channelsCollection(db), orderBy('createdAt', 'asc'))
  return onSnapshot(channelsQuery, (snapshot) => {
    onUpdate(snapshot.docs.map(mapChannel))
  })
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
  params: { name: string; topic?: string; createdBy: string }
) => {
  await addDoc(channelsCollection(db), {
    ...params,
    createdAt: serverTimestamp()
  })
}

export const sendMessage = async (
  db: Firestore,
  channelId: string,
  params: { text: string; author: string }
) => {
  await addDoc(channelMessagesCollection(db, channelId), {
    ...params,
    createdAt: serverTimestamp()
  })
}
