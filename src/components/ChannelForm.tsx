import { type FormEvent, useState } from 'react'

type ChannelFormProps = {
  onSubmit: (values: { name: string; topic?: string }) => Promise<void> | void
  onCancel: () => void
}

export const ChannelForm = ({ onSubmit, onCancel }: ChannelFormProps) => {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Channel name is required.')
      return
    }

    try {
      setError(null)
      setIsSubmitting(true)
      const payload: { name: string; topic?: string } = { name: name.trim() }
      const cleanedTopic = topic.trim()
      if (cleanedTopic) {
        payload.topic = cleanedTopic
      }
      await onSubmit(payload)
      setName('')
      setTopic('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create channel.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <h3>Create a channel</h3>
          <button className="ghost-btn" type="button" onClick={onCancel}>
            Close
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <label>
            Channel name
            <input
              type="text"
              placeholder="team-updates"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (error) {
                  setError(null)
                }
              }}
            />
          </label>

          <label>
            Topic (optional)
            <input
              type="text"
              placeholder="Daily stand-up notes"
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value)
                if (error) {
                  setError(null)
                }
              }}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create channel'}
          </button>
        </form>
      </div>
    </div>
  )
}
