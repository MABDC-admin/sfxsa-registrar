import type { Submission } from '../types'

type SubmissionsQueueProps = {
  submissions: Submission[]
  loading?: boolean
  onGrade?: (submissionId: string) => void
}

export function SubmissionsQueue({ submissions, loading = false, onGrade }: SubmissionsQueueProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Latest Submissions</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Latest Submissions</h3>
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm">All caught up! No submissions to grade.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Latest Submissions</h3>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
          {submissions.length} pending
        </span>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-800 text-sm">
                  {submission.student_name || 'Unknown Student'}
                </h4>
                {submission.late && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                    Late
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-1">
                {submission.assignment_title || 'Untitled Assignment'}
              </p>
              <p className="text-xs text-gray-400">
                Submitted: {submission.submitted_at 
                  ? new Date(submission.submitted_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Not submitted'}
              </p>
            </div>
            
            <button
              onClick={() => onGrade?.(submission.id)}
              className="ml-4 px-4 py-2 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              Grade
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
