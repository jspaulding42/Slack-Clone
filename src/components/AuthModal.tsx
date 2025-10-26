import { FormEvent, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { getAuthInstance, getDb } from '../lib/firebase'
import { ensureUserProfile } from '../lib/userService'

const normalize = (value: string) => value.trim()

export const AuthModal = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }

    if (mode === 'signup' && !displayName.trim()) {
      setError('Display name is required to create an account.')
      return
    }

    try {
      setIsSubmitting(true)
      const auth = getAuthInstance()
      const db = getDb()
      const cleanEmail = email.trim().toLowerCase()

      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password.trim())
        if (displayName.trim()) {
          await updateProfile(credential.user, { displayName: normalize(displayName) })
        }
        await ensureUserProfile(db, {
          uid: credential.user.uid,
          email: cleanEmail,
          displayName: normalize(displayName) || cleanEmail
        })
      } else {
        const credential = await signInWithEmailAndPassword(auth, cleanEmail, password.trim())
        await ensureUserProfile(db, {
          uid: credential.user.uid,
          email: credential.user.email ?? cleanEmail,
          displayName: credential.user.displayName ?? credential.user.email ?? cleanEmail
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop full-screen">
      <div className="modal">
        <header>
          <h3>{mode === 'login' ? 'Log in' : 'Create your account'}</h3>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError(null)
            }}
          >
            {mode === 'login' ? 'Need an account?' : 'Have an account?'}
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {mode === 'signup' && (
            <label>
              Display name
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Ada Lovelace"
              />
            </label>
          )}

          <label>
            Password
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Working…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
