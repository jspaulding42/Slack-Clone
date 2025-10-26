import type { MessageAttachment } from '../lib/chatService'
import { storageService } from '../lib/storageService'

type AttachmentDisplayProps = {
  attachment: MessageAttachment
  onRemove?: (attachmentId: string) => void
  showRemoveButton?: boolean
}

export const AttachmentDisplay = ({ 
  attachment, 
  onRemove, 
  showRemoveButton = false 
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

  const isImage = attachment.contentType?.startsWith('image/')
  const fileIcon = storageService.getFileTypeIcon(attachment.contentType || '')
  const fileSize = storageService.formatFileSize(attachment.size)

  return (
    <div className="attachment">
      <div className="attachment__content">
        {isImage && attachment.thumbnailUrl ? (
          <div className="attachment__image">
            <img 
              src={attachment.thumbnailUrl} 
              alt={attachment.name}
              onClick={handleDownload}
              className="attachment__thumbnail"
            />
            <div className="attachment__overlay">
              <button 
                className="attachment__download-btn"
                onClick={handleDownload}
                title="Download full image"
              >
                ⬇️
              </button>
            </div>
          </div>
        ) : (
          <div className="attachment__file">
            <div className="attachment__icon">{fileIcon}</div>
            <div className="attachment__info">
              <div className="attachment__name" onClick={handleDownload}>
                {attachment.name}
              </div>
              <div className="attachment__size">{fileSize}</div>
            </div>
          </div>
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