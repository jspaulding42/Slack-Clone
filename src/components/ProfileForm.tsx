import { useState, useRef } from 'react'
import { type UserProfile } from '../lib/userService'
import { updateProfile, uploadProfilePicture, deleteProfilePicture } from '../lib/profileService'
import './ProfileForm.css'

interface ProfileFormProps {
  profile: UserProfile
  onClose: () => void
  onProfileUpdate: (profile: UserProfile) => void
}

export const ProfileForm = ({ profile, onClose, onProfileUpdate }: ProfileFormProps) => {
  const [formData, setFormData] = useState({
    displayName: profile.displayName,
    phoneNumber: profile.phoneNumber || ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Create preview URL
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const file = fileInputRef.current?.files?.[0]
      
      // Update profile data
      const updatedProfile = { ...profile, ...formData }
      await updateProfile(profile.id, formData)
      
      // Handle profile picture upload if a new file was selected
      if (file) {
        // Delete old profile picture if it exists
        if (profile.profilePictureUrl) {
          await deleteProfilePicture(profile.id, profile.profilePictureUrl)
        }
        
        // Upload new profile picture
        const newPictureUrl = await uploadProfilePicture(profile.id, file)
        updatedProfile.profilePictureUrl = newPictureUrl
      }
      
      onProfileUpdate(updatedProfile)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePicture = async () => {
    if (!profile.profilePictureUrl) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      await deleteProfilePicture(profile.id, profile.profilePictureUrl)
      const updatedProfile = { ...profile, profilePictureUrl: undefined }
      onProfileUpdate(updatedProfile)
      setPreviewUrl(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove profile picture'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const currentPictureUrl = previewUrl || profile.profilePictureUrl

  return (
    <div className="profile-form-overlay">
      <div className="profile-form">
        <div className="profile-form__header">
          <h2>Edit Profile</h2>
          <button 
            className="profile-form__close" 
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="profile-form__content">
          <div className="profile-form__picture-section">
            <div className="profile-form__picture">
              {currentPictureUrl ? (
                <img 
                  src={currentPictureUrl} 
                  alt="Profile preview" 
                  className="profile-form__picture-img"
                />
              ) : (
                <div className="profile-form__picture-placeholder">
                  {profile.displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="profile-form__picture-controls">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="profile-form__file-input"
                id="profile-picture"
              />
              <label htmlFor="profile-picture" className="profile-form__file-label">
                Choose Photo
              </label>
              
              {profile.profilePictureUrl && (
                <button
                  type="button"
                  onClick={handleRemovePicture}
                  className="profile-form__remove-picture"
                  disabled={isLoading}
                >
                  Remove Photo
                </button>
              )}
            </div>
          </div>

          <div className="profile-form__field">
            <label htmlFor="displayName" className="profile-form__label">
              Display Name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={formData.displayName}
              onChange={handleInputChange}
              className="profile-form__input"
              required
              disabled={isLoading}
            />
          </div>

          <div className="profile-form__field">
            <label htmlFor="email" className="profile-form__label">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={profile.email}
              className="profile-form__input profile-form__input--readonly"
              disabled
            />
            <p className="profile-form__help">
              Email cannot be changed. Contact support if you need to update your email.
            </p>
          </div>

          <div className="profile-form__field">
            <label htmlFor="phoneNumber" className="profile-form__label">
              Phone Number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              className="profile-form__input"
              placeholder="+1 (555) 123-4567"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="profile-form__error">
              {error}
            </div>
          )}

          <div className="profile-form__actions">
            <button
              type="button"
              onClick={onClose}
              className="profile-form__cancel"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="profile-form__save"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}