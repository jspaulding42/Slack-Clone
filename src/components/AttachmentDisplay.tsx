import type { MessageAttachment } from '../lib/chatService'
import { storageService } from '../lib/storageService'

type AttachmentDisplayProps = {
  attachment: MessageAttachment
  onRemove?: (attachmentId: string) => void
  showRemoveButton?: boolean
  onPreview?: (attachment: MessageAttachment) => void
}

export const AttachmentDisplay = ({ 
  attachment, 
  onRemove, 
  showRemoveButton = false,
  onPreview
}: AttachmentDisplayProps) => {
  const handleRemove = () => {
    if (onRemove) {
      onRemove(attachment.id)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = attachment.url
    link.download = attachment.name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpen = () => {
    if (onPreview) {
      onPreview(attachment)
      return
    }
    handleDownload()
  }

  const isImage = attachment.contentType?.startsWith('image/')
  const fileIcon = storageService.getFileTypeIcon(attachment.contentType || '')
  const fileSize = storageService.formatFileSize(attachment.size)

  return (
    <div className="attachment">
      <div className="attachment__content">
        {isImage && attachment.thumbnailUrl ? (
          <div 
            className="attachment__image"
            role="button"
            tabIndex={0}
            onClick={handleOpen}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleOpen()
              }
            }}
          >
            <img 
              src={attachment.thumbnailUrl} 
              alt={attachment.name}
              className="attachment__thumbnail"
            />
            <div className="attachment__overlay">
              <button 
                type="button"
                className="attachment__download-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  handleDownload()
                }}
                title="Download full image"
              >
                ⬇️
              </button>
            </div>
          </div>
        ) : (
          <button 
            type="button"
            className="attachment__file"
            onClick={handleOpen}
          >
            <div className="attachment__icon">{fileIcon}</div>
            <div className="attachment__info">
              <div className="attachment__name">{attachment.name}</div>
              <div className="attachment__size">{fileSize}</div>
            </div>
          </button>
        )}
      </div>
      
      {showRemoveButton && onRemove && (
        <button 
          className="attachment__remove"
          onClick={handleRemove}
          title="Remove attachment"
        >
          ✕
        </button>
      )}
    </div>
  )
}
