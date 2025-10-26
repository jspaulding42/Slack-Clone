import { FormEvent, useState } from 'react'

type UserSetupProps = {
  onComplete: (displayName: string) => void
}

export const UserSetup = ({ onComplete }: UserSetupProps) => {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!value.trim()) {
      setError('Display name is required.')
      return
    }
    onComplete(value.trim())
  }

  return (
    <div className="modal-backdrop full-screen">
      <div className="modal">
        <h3>Choose a display name</h3>
        <p>This name is used when sending messages to Firebase.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Display name
            <input
              type="text"
              placeholder="Ada Lovelace"
            value={value}
              onChange={(event) => {
                setValue(event.target.value)
                if (error) {
                  setError(null)
                }
              }}
              autoFocus
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="primary-btn">
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
