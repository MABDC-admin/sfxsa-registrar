/**
 * Unified User Management Utilities
 * Centralizes all user creation, avatar upload, and validation logic
 * Eliminates redundancy across AdminsListPage, TeachersListPage, etc.
 */

import { api } from './apiClient'
import type { UserRole } from '../types'

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UserFormData {
  full_name: string
  email: string
  phone?: string
  password?: string
  role?: UserRole
}

export interface UserCreationOptions {
  role: UserRole
  avatarFile?: File | null
  additionalData?: Record<string, any>
}

export interface UserUpdateOptions {
  userId: string
  currentAvatarUrl?: string
  avatarFile?: File | null
}

export interface ValidationErrors {
  [key: string]: string
}

// ============================================
// AVATAR MANAGEMENT
// ============================================

/**
 * Uploads user avatar to storage
 * @param userId - User ID for file naming
 * @param avatarFile - Image file to upload
 * @param folder - Storage folder (e.g., 'admin-avatars', 'teacher-avatars')
 * @returns Public URL of uploaded avatar or null on failure
 */
export async function uploadUserAvatar(
  userId: string,
  avatarFile: File,
  folder: string = 'avatars'
): Promise<string | null> {
  if (!avatarFile) return null

  try {
    const fileExt = avatarFile.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    const { error } = await api.storage
      .from('avatars')
      .upload(filePath, avatarFile, { upsert: true })

    if (error) {
      console.error('Avatar upload error:', error)
      return null
    }

    const { data } = api.storage.from('avatars').getPublicUrl(filePath)
    return data.publicUrl
  } catch (error) {
    console.error('Avatar upload exception:', error)
    return null
  }
}

/**
 * Generates default avatar URL using DiceBear API
 * @param fullName - User's full name as seed
 * @returns Default avatar URL
 */
export function getDefaultAvatarUrl(fullName: string): string {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    fullName
  )}&backgroundColor=transparent`
}

// ============================================
// FORM VALIDATION
// ============================================

/**
 * Validates user form data
 * @param formData - Form data to validate
 * @param isEditing - Whether this is an edit operation (password optional)
 * @returns Validation errors object (empty if valid)
 */
export function validateUserForm(
  formData: UserFormData,
  isEditing: boolean = false
): ValidationErrors {
  const errors: ValidationErrors = {}

  // Name validation
  if (!formData.full_name?.trim()) {
    errors.full_name = 'Full name is required'
  } else if (formData.full_name.trim().length < 2) {
    errors.full_name = 'Name must be at least 2 characters'
  }

  // Email validation
  if (!formData.email?.trim()) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Invalid email format'
  }

  // Password validation (only for new users)
  if (!isEditing) {
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
  }

  // Phone validation (optional but must be valid if provided)
  if (formData.phone && formData.phone.trim() && formData.phone.length < 10) {
    errors.phone = 'Invalid phone number'
  }

  return errors
}

// ============================================
// USER CREATION
// ============================================

/**
 * Creates a new user with auth account and profile
 * This is the SINGLE SOURCE OF TRUTH for user creation
 * 
 * @param formData - User form data
 * @param options - Creation options (role, avatar, additional data)
 * @returns Created user data or throws error
 */
export async function createUser(
  formData: UserFormData,
  options: UserCreationOptions
) {
  const { role, avatarFile, additionalData = {} } = options

  // 1. Validate form data
  const errors = validateUserForm(formData, false)
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0])
  }

  // 2. Create auth user account
  const { data: authData, error: authError } = await api.auth.signUp({
    email: formData.email,
    password: formData.password!,
    options: {
      data: {
        full_name: formData.full_name,
        role,
        ...additionalData,
      },
    },
  })

  if (authError) {
    throw new Error(authError.message || 'Failed to create auth account')
  }

  if (!authData?.user) {
    throw new Error('No user data returned from auth service')
  }

  // 3. Handle avatar upload
  let avatarUrl = getDefaultAvatarUrl(formData.full_name)
  if (avatarFile) {
    const folder = `${role}-avatars`
    const uploadedUrl = await uploadUserAvatar(authData.user.id, avatarFile, folder)
    if (uploadedUrl) {
      avatarUrl = uploadedUrl
    }
  }

  // 4. Create profile record
  // IMPORTANT: Railway schema has 'id' as PRIMARY KEY that references auth_users(id)
  // The 'user_id' field is auto-populated by a trigger
  const profileData = {
    id: authData.user.id,  // PRIMARY KEY - must match auth_users.id
    full_name: formData.full_name,
    email: formData.email,
    phone: formData.phone || null,
    role,
    avatar_url: avatarUrl,
    is_active: true,
    ...additionalData,
  }

  const { data: profile, error: profileError } = await api
    .from('profiles')
    .upsert(profileData)
    .select()
    .single()

  if (profileError) {
    // Profile creation failed - auth account exists but profile doesn't
    // This is a critical error that needs manual intervention
    console.error('Profile creation failed after auth account created:', profileError)
    throw new Error('User account created but profile setup failed. Please contact support.')
  }

  return {
    user: authData.user,
    profile,
  }
}

// ============================================
// USER UPDATE
// ============================================

/**
 * Updates an existing user's profile
 * 
 * @param formData - Updated form data
 * @param options - Update options (userId, avatar)
 * @returns Updated profile data or throws error
 */
export async function updateUser(
  formData: UserFormData,
  options: UserUpdateOptions
) {
  const { userId, currentAvatarUrl, avatarFile } = options

  // 1. Validate form data (editing mode - password optional)
  const errors = validateUserForm(formData, true)
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0])
  }

  // 2. Handle avatar upload if new file provided
  let avatarUrl = currentAvatarUrl || getDefaultAvatarUrl(formData.full_name)
  if (avatarFile) {
    // Extract role from current avatar URL or use generic folder
    const folder = currentAvatarUrl?.includes('-avatars/')
      ? currentAvatarUrl.split('/').find(part => part.includes('-avatars'))?.replace('-avatars', '') + '-avatars'
      : 'avatars'
    
    const uploadedUrl = await uploadUserAvatar(userId, avatarFile, folder)
    if (uploadedUrl) {
      avatarUrl = uploadedUrl
    }
  }

  // 3. Update profile record
  const updateData = {
    full_name: formData.full_name,
    email: formData.email,
    phone: formData.phone || null,
    avatar_url: avatarUrl,
  }

  const { data, error } = await api
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to update profile')
  }

  return data
}

// ============================================
// USER STATUS MANAGEMENT
// ============================================

/**
 * Toggles user active status
 * @param userId - User ID to toggle
 * @param currentStatus - Current active status
 * @returns Updated profile or throws error
 */
export async function toggleUserStatus(
  userId: string,
  currentStatus: boolean
) {
  const { data, error } = await api
    .from('profiles')
    .update({ is_active: !currentStatus })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to update user status')
  }

  return data
}

/**
 * Soft deletes a user (sets is_active to false)
 * @param userId - User ID to delete
 * @returns Success boolean
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const { error } = await api
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message || 'Failed to delete user')
  }

  return true
}

/**
 * Hard deletes a user (removes from database - use with caution)
 * @param userId - User ID to permanently delete
 * @returns Success boolean
 */
export async function permanentlyDeleteUser(userId: string): Promise<boolean> {
  const { error } = await api.from('profiles').delete().eq('id', userId)

  if (error) {
    throw new Error(error.message || 'Failed to permanently delete user')
  }

  return true
}

// ============================================
// AVATAR FILE HANDLING UTILITIES
// ============================================

/**
 * Creates a preview URL for avatar file
 * @param file - Image file
 * @returns Promise that resolves to data URL
 */
export function createAvatarPreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Validates avatar file
 * @param file - Image file to validate
 * @returns Error message or null if valid
 */
export function validateAvatarFile(file: File): string | null {
  const maxSize = 2 * 1024 * 1024 // 2MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

  if (!allowedTypes.includes(file.type)) {
    return 'Only JPEG, PNG, GIF, and WebP images are allowed'
  }

  if (file.size > maxSize) {
    return 'Image size must be less than 2MB'
  }

  return null
}
