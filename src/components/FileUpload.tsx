/**
 * File Upload Component with Drag & Drop
 * Modern, reusable component for uploading files
 */

import { useState, useRef } from 'react'
import {
  uploadFileToDatabase,
  validateFile,
  formatFileSize,
  getFileIcon,
  handleDragOver,
  handleFileDrop,
  getAllowedFileTypes,
  type FileUploadResult,
} from '../lib/fileUpload'

interface FileUploadProps {
  userId: string
  folder?: string
  category?: 'document' | 'image' | 'video' | 'all'
  maxSizeMB?: number
  multiple?: boolean
  onUploadComplete?: (results: FileUploadResult[]) => void
  onUploadError?: (error: string) => void
  accept?: string
  className?: string
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploading: boolean
  progress: number
  error?: string
}

export function FileUpload({
  userId,
  folder = 'general',
  category = 'all',
  maxSizeMB = 50,
  multiple = false,
  onUploadComplete,
  onUploadError,
  accept,
  className = '',
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedTypes = getAllowedFileTypes(category)
  const acceptString = accept || allowedTypes.join(',')

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    const fileArray = Array.from(selectedFiles)
    const newFiles: UploadedFile[] = fileArray.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: '',
      uploading: true,
      progress: 0,
    }))

    setFiles((prev) => [...prev, ...newFiles])

    // Upload files
    const results: FileUploadResult[] = []

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      const fileId = newFiles[i].id

      // Validate
      const validationError = validateFile(file, maxSizeMB, allowedTypes.length > 0 ? allowedTypes : undefined)
      if (validationError) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, uploading: false, error: validationError } : f
          )
        )
        results.push({ success: false, error: validationError })
        continue
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        )
      }, 200)

      // Upload
      const result = await uploadFileToDatabase(file, userId, folder, file.name)

      clearInterval(progressInterval)

      if (result.success) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, uploading: false, progress: 100, url: result.fileUrl || '' }
              : f
          )
        )
        results.push(result)
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, uploading: false, progress: 0, error: result.error }
              : f
          )
        )
        results.push(result)
        if (onUploadError) onUploadError(result.error || 'Upload failed')
      }
    }

    if (onUploadComplete) onUploadComplete(results)
  }

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleFileDrop(e, (droppedFiles: FileList) => {
      handleFileSelect(droppedFiles)
      setIsDragging(false)
    })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          handleDragOver(e)
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-3xl">
            📤
          </div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragging ? 'Drop files here' : 'Click to upload or drag & drop'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {category === 'all'
                ? 'PDF, Word, Excel, PowerPoint, Images, Videos'
                : category === 'image'
                ? 'PNG, JPG, GIF, WebP'
                : category === 'video'
                ? 'MP4, MOV, AVI'
                : 'PDF, Word, Excel, PowerPoint'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Max size: {maxSizeMB}MB</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptString}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files</h4>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white"
              >
                <div className="text-2xl">{getFileIcon(file.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    {file.uploading && (
                      <div className="flex-1 max-w-xs">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {file.error && <p className="text-xs text-red-500">{file.error}</p>}
                    {!file.uploading && !file.error && (
                      <span className="text-xs text-green-600">✓ Uploaded</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
