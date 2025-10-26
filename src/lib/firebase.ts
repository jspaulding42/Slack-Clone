import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'
import { firebaseConfig } from '../firebaseConfig'

const isFirebaseConfigured = Object.values(firebaseConfig).every((value) => Boolean(value))

let firebaseApp: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null
let storage: FirebaseStorage | null = null

if (isFirebaseConfigured) {
  firebaseApp = initializeApp(firebaseConfig)
  db = getFirestore(firebaseApp)
  auth = getAuth(firebaseApp)
  storage = getStorage(firebaseApp)
} else {
  console.warn('Firebase config is missing. Update src/firebaseConfig.ts when ready.')
}

export const getDb = () => {
  if (!db) {
    throw new Error(
      'Firebase has not been configured yet. Please update src/firebaseConfig.ts with your project credentials.'
    )
  }

  return db
}

export const getAuthInstance = () => {
  if (!auth) {
    throw new Error(
      'Firebase has not been configured yet. Please update src/firebaseConfig.ts with your project credentials.'
    )
  }

  return auth
}

export const getStorageInstance = () => {
  if (!storage) {
    throw new Error(
      'Firebase Storage has not been configured yet. Please update src/firebaseConfig.ts with your project credentials.'
    )
  }

  return storage
}

export { firebaseApp, isFirebaseConfigured }
