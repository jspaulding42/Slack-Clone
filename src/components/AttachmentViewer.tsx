import { useEffect } from 'react'
import type { MessageAttachment } from '../lib/chatService'
import { storageService } from '../lib/storageService'

type AttachmentViewerProps = {
  attachment: MessageAttachment
  onClose: () => void
}

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'm4v', 'avi', 'mkv']

export const AttachmentViewer = ({ attachment, onClose }: AttachmentViewerProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = attachment.url
    link.download = attachment.name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const fileSize = storageService.formatFileSize(attachment.size)
  const normalizedContentType = attachment.contentType?.toLowerCase() ?? ''
  const fileExtension = attachment.name.split('.').pop()?.toLowerCase() ?? ''
  const isImage = normalizedContentType.startsWith('image/') || imageExtensions.includes(fileExtension)
  const isVideo = normalizedContentType.startsWith('video/') || videoExtensions.includes(fileExtension)
  const isPdf = normalizedContentType === 'application/pdf' || fileExtension === 'pdf'

  const renderPreview = () => {
    if (isImage) {
      return (
        <img
          src={attachment.url}
          alt={attachment.name}
          className="attachment-viewer__image"
        />
      )
    }

    if (isVideo) {
      return (
        <video
          src={attachment.url}
          controls
          className="attachment-viewer__video"
        />
      )
    }

    if (isPdf) {
      return (
        <iframe
          src={attachment.url}
          title={attachment.name}
          className="attachment-viewer__pdf"
        />
      )
    }

    return (
      <div className="attachment-viewer__unsupported">
        <p>Preview is not available for this file type.</p>
        <button type="button" className="attachment-viewer__download-fallback" onClick={handleDownload}>
          Download file
        </button>
      </div>
    )
  }

  return (
    <div className="attachment-viewer" role="dialog" aria-modal="true">
      <div className="attachment-viewer__backdrop" onClick={onClose} />
      <div className="attachment-viewer__container">
        <div className="attachment-viewer__actions">
          <button
            type="button"
            className="attachment-viewer__action"
            onClick={handleDownload}
          >
            Download
          </button>
          <button
            type="button"
            className="attachment-viewer__action attachment-viewer__action--dismiss"
            onClick={onClose}
          >
            Dismiss
          </button>
        </div>
        <div className="attachment-viewer__content">
          {renderPreview()}
        </div>
        <div className="attachment-viewer__meta">
          <strong className="attachment-viewer__name">{attachment.name}</strong>
          <span className="attachment-viewer__size">{fileSize}</span>
        </div>
      </div>
    </div>
  )
}
