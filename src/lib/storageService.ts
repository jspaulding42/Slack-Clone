import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type UploadResult
} from 'firebase/storage'
import { getStorageInstance } from './firebase'
import type { MessageAttachment } from './chatService'

export interface FileUploadProgress {
  bytesTransferred: number
  totalBytes: number
  percentage: number
}

export interface ThumbnailOptions {
  maxWidth: number
  maxHeight: number
  quality: number
}

export class StorageService {
  private storage = getStorageInstance()

  /**
   * Upload a file to Firebase Storage
   */
  async uploadFile(
    file: File,
    path: string,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<UploadResult> {
    const storageRef = ref(this.storage, path)
    
    // For now, we'll use uploadBytes which doesn't support progress
    // In a production app, you'd want to use uploadBytesResumable for progress tracking
    const result = await uploadBytes(storageRef, file)
    
    // Simulate progress for demo purposes
    if (onProgress) {
      onProgress({
        bytesTransferred: file.size,
        totalBytes: file.size,
        percentage: 100
      })
    }
    
    return result
  }

  /**
   * Get download URL for a file
   */
  async getDownloadURL(path: string): Promise<string> {
    const storageRef = ref(this.storage, path)
    return await getDownloadURL(storageRef)
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    const storageRef = ref(this.storage, path)
    await deleteObject(storageRef)
  }

  /**
   * Generate a thumbnail for an image file
   */
  async generateImageThumbnail(
    file: File,
    options: ThumbnailOptions = { maxWidth: 200, maxHeight: 200, quality: 0.8 }
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate thumbnail dimensions
        const { width, height } = this.calculateThumbnailDimensions(
          img.width,
          img.height,
          options.maxWidth,
          options.maxHeight
        )

        canvas.width = width
        canvas.height = height

        // Draw the resized image
        ctx?.drawImage(img, 0, 0, width, height)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const thumbnailFile = new File([blob], `thumb_${file.name}`, {
                type: 'image/jpeg'
              })
              resolve(thumbnailFile)
            } else {
              reject(new Error('Failed to generate thumbnail'))
            }
          },
          'image/jpeg',
          options.quality
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Generate a thumbnail for a document (PDF, etc.)
   */
  async generateDocumentThumbnail(
    file: File,
    _options: ThumbnailOptions = { maxWidth: 200, maxHeight: 200, quality: 0.8 }
  ): Promise<File | null> {
    // For PDFs, we'd need a PDF.js library
    // For now, return null to indicate no thumbnail available
    if (file.type === 'application/pdf') {
      return null
    }

    // For other document types, we could implement specific thumbnail generation
    return null
  }

  /**
   * Upload a file with thumbnail generation
   */
  async uploadFileWithThumbnail(
    file: File,
    basePath: string,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<MessageAttachment> {
    const fileId = this.generateFileId()
    const fileExtension = this.getFileExtension(file.name)
    const fileName = `${fileId}${fileExtension}`
    const filePath = `${basePath}/${fileName}`

    // Upload the main file
    const uploadResult = await this.uploadFile(file, filePath, onProgress)
    const fileUrl = await this.getDownloadURL(uploadResult.ref.fullPath)

    let thumbnailUrl: string | undefined
    let thumbnailStoragePath: string | undefined
    let thumbnailWidth: number | undefined
    let thumbnailHeight: number | undefined

    // Generate thumbnail for images
    if (this.isImageFile(file)) {
      try {
        const thumbnailFile = await this.generateImageThumbnail(file)
        const thumbnailPath = `${basePath}/thumbnails/${fileId}.jpg`
        
        const thumbnailUploadResult = await this.uploadFile(thumbnailFile, thumbnailPath)
        thumbnailUrl = await this.getDownloadURL(thumbnailUploadResult.ref.fullPath)
        thumbnailStoragePath = thumbnailUploadResult.ref.fullPath

        // Get thumbnail dimensions
        const img = new Image()
        
        img.onload = () => {
          const { width, height } = this.calculateThumbnailDimensions(
            img.width,
            img.height,
            200,
            200
          )
          thumbnailWidth = width
          thumbnailHeight = height
        }
        
        img.src = URL.createObjectURL(thumbnailFile)
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error)
      }
    }

    return {
      id: fileId,
      name: file.name,
      size: file.size,
      contentType: file.type,
      url: fileUrl,
      storagePath: uploadResult.ref.fullPath,
      thumbnailUrl,
      thumbnailStoragePath,
      thumbnailWidth,
      thumbnailHeight
    }
  }

  /**
   * Delete a file and its thumbnail
   */
  async deleteFileWithThumbnail(attachment: MessageAttachment): Promise<void> {
    try {
      // Delete main file
      if (attachment.storagePath) {
        await this.deleteFile(attachment.storagePath)
      }

      // Delete thumbnail
      if (attachment.thumbnailStoragePath) {
        await this.deleteFile(attachment.thumbnailStoragePath)
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      throw error
    }
  }

  /**
   * Check if file is an image
   */
  private isImageFile(file: File): boolean {
    return file.type.startsWith('image/')
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    return lastDot !== -1 ? filename.substring(lastDot) : ''
  }

  /**
   * Generate a unique file ID
   */
  private generateFileId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Calculate thumbnail dimensions maintaining aspect ratio
   */
  private calculateThumbnailDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight

    let width = maxWidth
    let height = maxWidth / aspectRatio

    if (height > maxHeight) {
      height = maxHeight
      width = maxHeight * aspectRatio
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    }
  }

  /**
   * Get file type icon based on content type
   */
  getFileTypeIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return '🖼️'
    if (contentType === 'application/pdf') return '📄'
    if (contentType.includes('text/')) return '📝'
    if (contentType.includes('video/')) return '🎥'
    if (contentType.includes('audio/')) return '🎵'
    if (contentType.includes('zip') || contentType.includes('rar')) return '📦'
    return '📎'
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Export a singleton instance
export const storageService = new StorageService()