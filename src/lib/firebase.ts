import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { firebaseConfig } from '../firebaseConfig'

const isFirebaseConfigured = Object.values(firebaseConfig).every((value) => Boolean(value))

let firebaseApp: FirebaseApp | null = null
let db: Firestore | null = null

if (isFirebaseConfigured) {
  firebaseApp = initializeApp(firebaseConfig)
  db = getFirestore(firebaseApp)
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

export { firebaseApp, isFirebaseConfigured }
