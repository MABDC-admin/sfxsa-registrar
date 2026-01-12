/**
 * YouTube Embed Component
 * Displays embedded YouTube videos with proper aspect ratio
 */

import { useState } from 'react'
import { extractYouTubeId, getYouTubeEmbedUrl } from '../lib/fileUpload'

interface YouTubeEmbedProps {
  url?: string
  videoId?: string
  title?: string
  className?: string
  autoplay?: boolean
  controls?: boolean
}

export function YouTubeEmbed({
  url,
  videoId,
  title = 'YouTube Video',
  className = '',
  autoplay = false,
  controls = true,
}: YouTubeEmbedProps) {
  const [error, setError] = useState(false)

  // Extract video ID from URL if provided
  let embedId = videoId
  if (url && !embedId) {
    embedId = extractYouTubeId(url)
  }

  if (!embedId || error) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-2">📹</div>
          <p className="text-gray-600">Invalid YouTube URL</p>
        </div>
      </div>
    )
  }

  const embedUrl = getYouTubeEmbedUrl(embedId)
  const fullUrl = `${embedUrl}?autoplay=${autoplay ? '1' : '0'}&controls=${controls ? '1' : '0'}`

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`} style={{ paddingTop: '56.25%' }}>
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={fullUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onError={() => setError(true)}
      />
    </div>
  )
}

/**
 * YouTube URL Input Component
 * Allows users to paste YouTube URLs with live preview
 */

interface YouTubeInputProps {
  onVideoSelect: (videoId: string, url: string) => void
  initialUrl?: string
  className?: string
}

export function YouTubeInput({ onVideoSelect, initialUrl = '', className = '' }: YouTubeInputProps) {
  const [url, setUrl] = useState(initialUrl)
  const [videoId, setVideoId] = useState<string | null>(
    initialUrl ? extractYouTubeId(initialUrl) : null
  )

  const handleUrlChange = (value: string) => {
    setUrl(value)
    const id = extractYouTubeId(value)
    setVideoId(id)
    if (id) {
      onVideoSelect(id, value)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          YouTube URL
        </label>
        <input
          type="text"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Paste a YouTube link (e.g., youtube.com/watch?v=... or youtu.be/...)
        </p>
      </div>

      {videoId && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
          <YouTubeEmbed videoId={videoId} />
        </div>
      )}
    </div>
  )
}
