import { FormEvent, useState } from 'react'

type OrganizationFormProps = {
  onSubmit: (name: string) => Promise<void> | void
  onCancel: () => void
}

export const OrganizationForm = ({ onSubmit, onCancel }: OrganizationFormProps) => {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Organization name is required.')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(name.trim())
      setName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create organization.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <h3>Create an organization</h3>
          <button className="ghost-btn" type="button" onClick={onCancel}>
            Close
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <label>
            Organization name
            <input
              type="text"
              placeholder="Acme Corp"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (error) {
                  setError(null)
                }
              }}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create organization'}
          </button>
        </form>
      </div>
    </div>
  )
}
