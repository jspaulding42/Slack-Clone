import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { getStorageInstance, getAuthInstance } from './firebase'
import { updateUserProfile, type UserProfile } from './userService'
import { getDb } from './firebase'

export const uploadProfilePicture = async (
  userId: string,
  file: File
): Promise<string> => {
  const storage = getStorageInstance()
  const db = getDb()
  const auth = getAuthInstance()
  
  // Check if user is authenticated
  if (!auth.currentUser) {
    throw new Error('User must be authenticated to upload profile picture')
  }
  
  if (auth.currentUser.uid !== userId) {
    throw new Error('User can only upload their own profile picture')
  }
  
  console.log('Uploading profile picture for user:', userId)
  console.log('File details:', { name: file.name, size: file.size, type: file.type })
  console.log('Current user:', auth.currentUser.uid)
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }
  
  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB')
  }
  
  // Create a unique filename
  const fileExtension = file.name.split('.').pop() || 'jpg'
  const fileName = `profile-pictures/${userId}/${Date.now()}.${fileExtension}`
  
  console.log('Uploading to path:', fileName)
  
  try {
    // Upload file to Firebase Storage
    const storageRef = ref(storage, fileName)
    console.log('Storage ref created:', storageRef.fullPath)
    
    const snapshot = await uploadBytes(storageRef, file)
    console.log('Upload successful, getting download URL...')
    
    const downloadURL = await getDownloadURL(snapshot.ref)
    console.log('Download URL obtained:', downloadURL)
    
    // Update user profile with new picture URL
    await updateUserProfile(db, userId, { profilePictureUrl: downloadURL })
    console.log('Profile updated successfully')
    
    return downloadURL
  } catch (error) {
    console.error('Error uploading profile picture:', error)
    throw error
  }
}

export const deleteProfilePicture = async (userId: string, currentUrl: string): Promise<void> => {
  const storage = getStorageInstance()
  const db = getDb()
  
  try {
    // Extract the file path from the URL
    const url = new URL(currentUrl)
    const pathMatch = url.pathname.match(/\/o\/(.+)\?/)
    if (pathMatch) {
      const filePath = decodeURIComponent(pathMatch[1])
      const fileRef = ref(storage, filePath)
      await deleteObject(fileRef)
    }
  } catch (error) {
    console.warn('Failed to delete old profile picture from storage:', error)
    // Continue with updating the profile even if storage deletion fails
  }
  
  // Update user profile to remove picture URL
  await updateUserProfile(db, userId, { profilePictureUrl: undefined })
}

export const updateProfile = async (
  userId: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'phoneNumber'>>
): Promise<void> => {
  const db = getDb()
  await updateUserProfile(db, userId, updates)
}