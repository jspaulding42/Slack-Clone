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

import { mapTimestamp } from './timestamp'

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
}

const channelsCollection = (db: Firestore) => collection(db, 'channels')

const channelMessagesCollection = (db: Firestore, channelId: string) =>
  collection(channelsCollection(db), channelId, 'messages')

const mapChannel = (doc: QueryDocumentSnapshot<DocumentData>): Channel => ({
  id: doc.id,
  name: doc.get('name') ?? 'Untitled channel',
  topic: doc.get('topic') ?? undefined,
  createdBy: doc.get('createdBy') ?? undefined,
  createdAt: mapTimestamp(doc, 'createdAt'),
  organizationId: doc.get('organizationId') ?? ''
})

const mapMessage = (doc: QueryDocumentSnapshot<DocumentData>): Message => ({
  id: doc.id,
  text: doc.get('text') ?? '',
  author: doc.get('author') ?? 'Unknown',
  createdAt: mapTimestamp(doc, 'createdAt')
})

export const listenToChannels = (
  db: Firestore,
  organizationId: string,
  onUpdate: (channels: Channel[]) => void
): Unsubscribe => {
  const channelsQuery = query(channelsCollection(db), where('organizationId', '==', organizationId))
  return onSnapshot(channelsQuery, (snapshot) => {
    const items = snapshot.docs.map(mapChannel)
    items.sort((a, b) => {
      if (!a.createdAt && !b.createdAt) {
        return a.name.localeCompare(b.name)
      }
      if (!a.createdAt) {
        return 1
      }
      if (!b.createdAt) {
        return -1
      }
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
    onUpdate(items)
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
  params: { name: string; topic?: string; createdBy: string; organizationId: string }
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
