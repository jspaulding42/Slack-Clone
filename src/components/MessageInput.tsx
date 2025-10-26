import { FormEvent, useState } from 'react'

type MessageInputProps = {
  onSend: (text: string) => Promise<void> | void
  disabled?: boolean
  channelName?: string
}

export const MessageInput = ({ onSend, disabled = false, channelName }: MessageInputProps) => {
  const [value, setValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!value.trim() || disabled) {
      return
    }

    try {
      setError(null)
      setIsSending(true)
      await onSend(value.trim())
      setValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder={channelName ? `Message #${channelName}` : 'Choose a channel'}
        value={value}
        onChange={(event) => {
          setValue(event.target.value)
          if (error) {
            setError(null)
          }
        }}
        disabled={disabled || isSending}
      />
      <button type="submit" className="primary-btn" disabled={disabled || isSending}>
        {isSending ? 'Sending…' : 'Send'}
      </button>
      {error && <p className="form-error">{error}</p>}
    </form>
  )
}
