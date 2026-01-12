import type { Announcement } from '../types'

type AnnouncementsFeedProps = {
  announcements: Announcement[]
  loading?: boolean
}

export function AnnouncementsFeed({ announcements, loading = false }: AnnouncementsFeedProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Announcements</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (announcements.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Announcements</h3>
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">📢</p>
          <p className="text-sm">No announcements yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Announcements</h3>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="p-4 bg-gradient-to-r from-green-50 to-white rounded-lg border-l-4 border-green-500"
          >
            {announcement.title && (
              <h4 className="font-semibold text-gray-800 text-sm mb-2">
                {announcement.title}
              </h4>
            )}
            <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
              {announcement.content}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {announcement.class_name 
                  ? `📚 ${announcement.class_name}` 
                  : '📢 General'}
              </span>
              <span>
                {new Date(announcement.published_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
