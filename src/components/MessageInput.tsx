import { type FormEvent, useState } from 'react'
import { FileUpload } from './FileUpload'
import { AttachmentDisplay } from './AttachmentDisplay'
import { storageService } from '../lib/storageService'
import type { MessageAttachment } from '../lib/chatService'

type MessageInputProps = {
  onSend: (text: string, attachments?: MessageAttachment[]) => Promise<void> | void
  disabled?: boolean
  channelName?: string
}

export const MessageInput = ({ onSend, disabled = false, channelName }: MessageInputProps) => {
  const [value, setValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<MessageAttachment[]>([])
  const [showFileUpload, setShowFileUpload] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if ((!value.trim() && attachments.length === 0) || disabled) {
      return
    }

    try {
      setError(null)
      setIsSending(true)
      await onSend(value.trim(), attachments.length > 0 ? attachments : undefined)
      setValue('')
      setAttachments([])
      setShowFileUpload(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.')
    } finally {
      setIsSending(false)
    }
  }

  const handleFilesSelected = (newAttachments: MessageAttachment[]) => {
    setAttachments(prev => [...prev, ...newAttachments])
    setShowFileUpload(false)
  }

  const handleRemoveAttachment = async (attachmentId: string) => {
    // Find the attachment to remove
    const attachmentToRemove = attachments.find(att => att.id === attachmentId)
    
    if (attachmentToRemove) {
      try {
        // Delete the file and its thumbnail from Firebase Storage
        await storageService.deleteFileWithThumbnail(attachmentToRemove)
      } catch (error) {
        console.error('Failed to delete attachment from storage:', error)
        // Continue with UI removal even if storage deletion fails
      }
    }
    
    // Remove from UI state
    setAttachments(prev => prev.filter(att => att.id !== attachmentId))
  }

  return (
    <div className="message-input-container">
      {attachments.length > 0 && (
        <div className="message-input__attachments">
          {attachments.map((attachment) => (
            <AttachmentDisplay
              key={attachment.id}
              attachment={attachment}
              onRemove={handleRemoveAttachment}
              showRemoveButton={true}
            />
          ))}
        </div>
      )}
      
      {showFileUpload && (
        <div className="message-input__file-upload">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            disabled={disabled || isSending}
            maxFiles={5}
          />
          <button
            type="button"
            className="message-input__cancel-upload"
            onClick={() => setShowFileUpload(false)}
          >
            Cancel
          </button>
        </div>
      )}
      
      <form className="message-input" onSubmit={handleSubmit}>
        <div className="message-input__controls">
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
          <button
            type="button"
            className="message-input__attach-btn"
            onClick={() => setShowFileUpload(!showFileUpload)}
            disabled={disabled || isSending}
            title="Attach files"
          >
            📎
          </button>
          <button type="submit" className="primary-btn" disabled={disabled || isSending || (!value.trim() && attachments.length === 0)}>
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>
    </div>
  )
}
