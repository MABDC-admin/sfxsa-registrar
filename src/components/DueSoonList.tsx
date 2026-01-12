import type { Assignment } from '../types'

type DueSoonListProps = {
  assignments: Assignment[]
  loading?: boolean
  onSubmit?: (assignmentId: string) => void
}

export function DueSoonList({ assignments, loading = false, onSubmit }: DueSoonListProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Due Soon</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-gray-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Due Soon</h3>
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">✨</p>
          <p className="text-sm">No upcoming assignments</p>
        </div>
      </div>
    )
  }

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null
    const now = new Date()
    const due = new Date(dueDate)
    const diffTime = due.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getDueLabel = (daysUntil: number | null) => {
    if (daysUntil === null) return { text: 'No due date', color: 'text-gray-500' }
    if (daysUntil < 0) return { text: 'Overdue', color: 'text-red-600' }
    if (daysUntil === 0) return { text: 'Due today', color: 'text-red-600' }
    if (daysUntil === 1) return { text: 'Due tomorrow', color: 'text-orange-600' }
    if (daysUntil <= 7) return { text: `Due in ${daysUntil} days`, color: 'text-yellow-600' }
    return { text: `Due in ${daysUntil} days`, color: 'text-gray-600' }
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Due Soon</h3>
        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
          {assignments.length} tasks
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {assignments.map((assignment) => {
          const daysUntil = getDaysUntilDue(assignment.due_at)
          const dueLabel = getDueLabel(daysUntil)

          return (
            <div
              key={assignment.id}
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-l-4"
              style={{ borderLeftColor: assignment.class_color || '#22c55e' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800 text-sm mb-1">
                    {assignment.title}
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">
                    {assignment.class_name || 'Unknown Class'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${dueLabel.color}`}>
                      {dueLabel.text}
                    </span>
                    {assignment.due_at && (
                      <span className="text-xs text-gray-400">
                        • {new Date(assignment.due_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onSubmit?.(assignment.id)}
                  className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded hover:bg-green-600 transition-colors whitespace-nowrap"
                >
                  Submit
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
