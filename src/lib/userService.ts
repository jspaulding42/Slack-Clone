import {
  addDoc,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type QueryDocumentSnapshot
} from 'firebase/firestore'

export type UserProfile = {
  id: string
  email: string
  displayName: string
  phoneNumber?: string
  profilePictureUrl?: string
  createdAt?: any
  updatedAt?: any
}

export type Organization = {
  id: string
  name: string
  memberIds: string[]
  createdBy: string
  createdByDisplayName?: string
}

const usersCollection = (db: Firestore) => collection(db, 'users')

const userDoc = (db: Firestore, userId: string): DocumentReference<DocumentData> =>
  doc(usersCollection(db), userId)
const organizationsCollection = (db: Firestore) => collection(db, 'organizations')

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const mapOrganization = (docSnapshot: QueryDocumentSnapshot<DocumentData>): Organization => ({
  id: docSnapshot.id,
  name: docSnapshot.get('name') ?? 'Untitled organization',
  memberIds: docSnapshot.get('memberIds') ?? [],
  createdBy: docSnapshot.get('createdBy') ?? '',
  createdByDisplayName: docSnapshot.get('createdByDisplayName') ?? undefined
})

export const ensureUserProfile = async (
  db: Firestore,
  params: { uid: string; email: string; displayName: string }
): Promise<UserProfile> => {
  const ref = userDoc(db, params.uid)
  const snapshot = await getDoc(ref)

  if (snapshot.exists()) {
    const existing = snapshot.data() as DocumentData
    return {
      id: snapshot.id,
      email: existing.email ?? params.email,
      displayName: existing.displayName ?? params.displayName,
      phoneNumber: existing.phoneNumber ?? undefined,
      profilePictureUrl: existing.profilePictureUrl ?? undefined,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt
    }
  }

  const emailLower = normalizeEmail(params.email)
  const profile = {
    email: params.email,
    emailLower,
    displayName: params.displayName,
    passwordHash: 'firebase-auth-managed',
    createdAt: serverTimestamp()
  }

  await setDoc(ref, profile)

  return {
    id: params.uid,
    email: params.email,
    displayName: params.displayName,
    phoneNumber: undefined,
    profilePictureUrl: undefined,
    createdAt: profile.createdAt,
    updatedAt: undefined
  }
}

export const getUserProfile = async (db: Firestore, userId: string): Promise<UserProfile | null> => {
  const snapshot = await getDoc(userDoc(db, userId))
  if (!snapshot.exists()) {
    return null
  }

  return mapUserProfile(snapshot.id, snapshot.data() ?? {})
}

const mapUserProfile = (id: string, data: DocumentData): UserProfile => ({
  id,
  email: data.email ?? '',
  displayName: data.displayName ?? '',
  phoneNumber: data.phoneNumber ?? undefined,
  profilePictureUrl: data.profilePictureUrl ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt
})

const chunkArray = <T>(values: T[], chunkSize: number): T[][] => {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += chunkSize) {
    result.push(values.slice(index, index + chunkSize))
  }
  return result
}

export const fetchUserProfilesByIds = async (
  db: Firestore,
  userIds: string[]
): Promise<UserProfile[]> => {
  if (userIds.length === 0) {
    return []
  }

  const uniqueIds = Array.from(new Set(userIds.filter((id) => id && id.trim().length > 0)))
  if (uniqueIds.length === 0) {
    return []
  }

  const batches = chunkArray(uniqueIds, 10)
  const results: UserProfile[] = []

  for (const batch of batches) {
    const snapshot = await getDocs(
      query(usersCollection(db), where(documentId(), 'in', batch))
    )
    snapshot.forEach((docSnapshot) => {
      results.push(mapUserProfile(docSnapshot.id, docSnapshot.data()))
    })
  }

  const profilesById = new Map(results.map((profile) => [profile.id, profile]))
  return uniqueIds
    .map((id) => profilesById.get(id))
    .filter((profile): profile is UserProfile => Boolean(profile))
}

export const fetchOrganizationsForUser = async (
  db: Firestore,
  userId: string
): Promise<Organization[]> => {
  const snapshot = await getDocs(
    query(organizationsCollection(db), where('memberIds', 'array-contains', userId))
  )
  return snapshot.docs.map(mapOrganization).sort((a, b) => a.name.localeCompare(b.name))
}

export const createOrganization = async (
  db: Firestore,
  params: { name: string; user: UserProfile }
): Promise<Organization> => {
  const name = params.name.trim()
  if (!name) {
    throw new Error('Organization name is required.')
  }

  const docRef = await addDoc(organizationsCollection(db), {
    name,
    memberIds: [params.user.id],
    createdBy: params.user.id,
    createdByDisplayName: params.user.displayName,
    createdAt: serverTimestamp()
  })

  return {
    id: docRef.id,
    name,
    memberIds: [params.user.id],
    createdBy: params.user.id,
    createdByDisplayName: params.user.displayName
  }
}

export const updateUserProfile = async (
  db: Firestore,
  userId: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'phoneNumber' | 'profilePictureUrl'>>
): Promise<void> => {
  const ref = userDoc(db, userId)
  
  // Clean up the updates - remove undefined values and convert empty strings to null
  const cleanedUpdates: any = {
    updatedAt: serverTimestamp()
  }
  
  if (updates.displayName !== undefined) {
    cleanedUpdates.displayName = updates.displayName
  }
  
  if (updates.phoneNumber !== undefined) {
    // Convert empty string to null for Firestore
    cleanedUpdates.phoneNumber = updates.phoneNumber === '' ? null : updates.phoneNumber
  }
  
  if (updates.profilePictureUrl !== undefined) {
    cleanedUpdates.profilePictureUrl = updates.profilePictureUrl
  }
  
  await updateDoc(ref, cleanedUpdates)
}
