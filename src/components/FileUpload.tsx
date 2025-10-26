import { useRef, useState, useCallback } from 'react'
import { storageService, type FileUploadProgress } from '../lib/storageService'
import type { MessageAttachment } from '../lib/chatService'

type FileUploadProps = {
  onFilesSelected: (attachments: MessageAttachment[]) => void
  onUploadProgress?: (progress: FileUploadProgress) => void
  disabled?: boolean
  maxFiles?: number
  acceptedTypes?: string
}

export const FileUpload = ({ 
  onFilesSelected, 
  onUploadProgress,
  disabled = false,
  maxFiles = 5,
  acceptedTypes = "*"
}: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    if (files.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed`)
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      const attachments: MessageAttachment[] = []
      const basePath = `attachments/${Date.now()}`

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        try {
          const attachment = await storageService.uploadFileWithThumbnail(
            file,
            basePath,
            onUploadProgress
          )
          attachments.push(attachment)
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error)
          setUploadError(`Failed to upload ${file.name}`)
        }
      }

      if (attachments.length > 0) {
        onFilesSelected(attachments)
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [onFilesSelected, onUploadProgress, maxFiles])

  const handleClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (disabled || isUploading) return
    
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  return (
    <div className="file-upload">
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxFiles > 1}
        accept={acceptedTypes}
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />
      
      <div
        className={`file-upload__dropzone ${disabled ? 'file-upload__dropzone--disabled' : ''} ${isUploading ? 'file-upload__dropzone--uploading' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="file-upload__uploading">
            <div className="file-upload__spinner"></div>
            <span>Uploading files...</span>
          </div>
        ) : (
          <div className="file-upload__content">
            <div className="file-upload__icon">📎</div>
            <div className="file-upload__text">
              <span>Click to upload files or drag and drop</span>
              <small>Max {maxFiles} files</small>
            </div>
          </div>
        )}
      </div>
      
      {uploadError && (
        <div className="file-upload__error">
          {uploadError}
        </div>
      )}
    </div>
  )
}