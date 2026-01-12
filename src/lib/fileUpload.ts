/**
 * File Upload Utilities for Educational Content Management
 * Handles file uploads to Railway PostgreSQL storage_blobs table
 * Supports documents, images, videos, and various file types
 */

import { api } from './apiClient'

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface FileUploadResult {
  success: boolean
  fileUrl?: string
  fileId?: string
  fileName?: string
  fileType?: string
  fileSize?: number
  error?: string
}

export interface FileMetadata {
  id: string
  name: string
  mimeType: string
  size: number
  url: string
  uploadedBy?: string
  folder?: string
  createdAt: string
}

// Allowed file types
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
]

export const ALLOWED_ARCHIVE_TYPES = [
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
]

// ============================================
// FILE VALIDATION
// ============================================

/**
 * Validates file before upload
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB (default 10MB)
 * @param allowedTypes - Array of allowed MIME types (optional)
 * @returns Error message or null if valid
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 10,
  allowedTypes?: string[]
): string | null {
  // Check if file exists
  if (!file) {
    return 'No file selected'
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return `File size must be less than ${maxSizeMB}MB`
  }

  // Check file type if specified
  if (allowedTypes && allowedTypes.length > 0) {
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed`
    }
  }

  return null
}

/**
 * Gets allowed file types for a specific category
 * @param category - Category: 'document', 'image', 'video', 'all'
 * @returns Array of allowed MIME types
 */
export function getAllowedFileTypes(category: string): string[] {
  switch (category) {
    case 'document':
      return ALLOWED_DOCUMENT_TYPES
    case 'image':
      return ALLOWED_IMAGE_TYPES
    case 'video':
      return ALLOWED_VIDEO_TYPES
    case 'archive':
      return ALLOWED_ARCHIVE_TYPES
    case 'all':
      return [
        ...ALLOWED_DOCUMENT_TYPES,
        ...ALLOWED_IMAGE_TYPES,
        ...ALLOWED_VIDEO_TYPES,
        ...ALLOWED_ARCHIVE_TYPES,
      ]
    default:
      return []
  }
}

// ============================================
// FILE UPLOAD TO DATABASE (storage_blobs)
// ============================================

/**
 * Uploads a file to Railway PostgreSQL storage_blobs table
 * @param file - File to upload
 * @param userId - ID of user uploading the file
 * @param folder - Folder/category for organization (e.g., 'assignments', 'lessons')
 * @param description - Optional description
 * @returns FileUploadResult with success status and file metadata
 */
export async function uploadFileToDatabase(
  file: File,
  userId: string,
  folder: string = 'general',
  description?: string
): Promise<FileUploadResult> {
  try {
    // Validate file
    const validationError = validateFile(file, 50) // 50MB max
    if (validationError) {
      return { success: false, error: validationError }
    }

    // Read file as base64
    const fileData = await readFileAsBase64(file)
    
    // Store in storage_blobs table
    const { data, error } = await api
      .from('storage_blobs')
      .insert({
        name: file.name,
        mime_type: file.type,
        content: fileData,
        size: file.size,
        uploaded_by: userId,
        folder,
        description: description || null,
        is_public: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Database upload error:', error)
      return { success: false, error: error.message || 'Failed to upload file' }
    }

    // Generate a retrieval URL (using blob ID)
    const fileUrl = `/api/files/${data.id}`

    return {
      success: true,
      fileUrl,
      fileId: data.id,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }
  } catch (error: any) {
    console.error('File upload exception:', error)
    return { success: false, error: error.message || 'Upload failed' }
  }
}

/**
 * Reads file content as base64 string
 * @param file - File to read
 * @returns Promise that resolves to base64 string
 */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(',')[1]
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ============================================
// FILE RETRIEVAL
// ============================================

/**
 * Retrieves file metadata from database
 * @param fileId - File ID to retrieve
 * @returns File metadata or null
 */
export async function getFileMetadata(fileId: string): Promise<FileMetadata | null> {
  try {
    const { data, error } = await api
      .from('storage_blobs')
      .select('id, name, mime_type, size, uploaded_by, folder, created_at')
      .eq('id', fileId)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      name: data.name,
      mimeType: data.mime_type,
      size: data.size,
      url: `/api/files/${data.id}`,
      uploadedBy: data.uploaded_by,
      folder: data.folder,
      createdAt: data.created_at,
    }
  } catch (error) {
    console.error('Error fetching file metadata:', error)
    return null
  }
}

/**
 * Downloads file content from database
 * @param fileId - File ID to download
 * @returns Blob object or null
 */
export async function downloadFileFromDatabase(fileId: string): Promise<Blob | null> {
  try {
    const { data, error } = await api
      .from('storage_blobs')
      .select('content, mime_type')
      .eq('id', fileId)
      .single()

    if (error || !data) {
      return null
    }

    // Convert base64 to blob
    const byteCharacters = atob(data.content)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: data.mime_type })
  } catch (error) {
    console.error('Error downloading file:', error)
    return null
  }
}

// ============================================
// FILE UTILITIES
// ============================================

/**
 * Formats file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Gets file icon based on MIME type
 * @param mimeType - File MIME type
 * @returns Emoji icon
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('word')) return '📝'
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊'
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦'
  if (mimeType.includes('text')) return '📃'
  return '📎'
}

/**
 * Gets file extension from filename
 * @param filename - File name
 * @returns File extension (e.g., "pdf", "docx")
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}

/**
 * Checks if file is an image
 * @param mimeType - File MIME type
 * @returns True if image
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Checks if file is a video
 * @param mimeType - File MIME type
 * @returns True if video
 */
export function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/')
}

/**
 * Extracts YouTube video ID from URL
 * @param url - YouTube URL
 * @returns Video ID or null
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Creates YouTube embed URL from video ID
 * @param videoId - YouTube video ID
 * @returns Embed URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

// ============================================
// DRAG AND DROP UTILITIES
// ============================================

/**
 * Handles drag over event
 * @param event - Drag event
 */
export function handleDragOver(event: React.DragEvent<HTMLElement>): void {
  event.preventDefault()
  event.stopPropagation()
}

/**
 * Handles file drop event
 * @param event - Drop event
 * @param callback - Callback function to handle dropped files
 */
export function handleFileDrop(
  event: React.DragEvent<HTMLElement>,
  callback: (files: FileList) => void
): void {
  event.preventDefault()
  event.stopPropagation()

  if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
    callback(event.dataTransfer.files)
  }
}
