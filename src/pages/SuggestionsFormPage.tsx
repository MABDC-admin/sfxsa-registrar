import { useState } from 'react'
import { z } from 'zod'
import { api } from '../lib/apiClient'

const suggestionSchema = z.object({
  type: z.enum(['suggestion', 'review', 'complaint', 'feedback']),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(150),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(2000),
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email('Invalid email').max(255).optional().or(z.literal('')),
  rating: z.number().min(1).max(5).optional(),
})

type SuggestionForm = z.infer<typeof suggestionSchema>

export function SuggestionsFormPage() {
  const [formData, setFormData] = useState<SuggestionForm>({
    type: 'suggestion',
    subject: '',
    message: '',
    name: '',
    email: '',
    rating: undefined,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const result = suggestionSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0] as string] = issue.message
        }
      })
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await api.from('suggestions_reviews').insert({
        type: formData.type,
        subject: formData.subject,
        message: formData.message,
        submitter_name: formData.name || null,
        submitter_email: formData.email || null,
        rating: formData.rating || null,
        status: 'pending',
      })

      if (error) throw error
      setSubmitted(true)
    } catch (err) {
      console.error('Submission error:', err)
      setErrors({ form: 'Failed to submit. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#E8F5E9' }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">
            Your {formData.type} has been submitted successfully. We appreciate your feedback!
          </p>
          <button
            onClick={() => {
              setSubmitted(false)
              setFormData({ type: 'suggestion', subject: '', message: '', name: '', email: '', rating: undefined })
            }}
            className="px-6 py-3 text-white font-medium rounded-lg transition-colors"
            style={{ backgroundColor: '#5B8C51' }}
          >
            Submit Another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: '#E8F5E9' }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#5B8C51' }}>
            <span className="text-3xl">💬</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Share Your Thoughts</h1>
          <p className="text-gray-600 mt-2">
            We value your feedback! Submit a suggestion, review, or feedback anonymously or with your details.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {errors.form}
            </div>
          )}

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {(['suggestion', 'review', 'complaint', 'feedback'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    formData.type === type
                      ? 'text-white border-transparent'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                  style={formData.type === type ? { backgroundColor: '#5B8C51' } : {}}
                >
                  {type === 'suggestion' && '💡 '}
                  {type === 'review' && '⭐ '}
                  {type === 'complaint' && '📢 '}
                  {type === 'feedback' && '📝 '}
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Rating (for reviews) */}
          {formData.type === 'review' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="text-3xl transition-transform hover:scale-110"
                  >
                    {(formData.rating || 0) >= star ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief summary of your feedback"
              className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
                errors.subject ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-green-200'
              }`}
              maxLength={150}
            />
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Tell us more details..."
              rows={5}
              className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 resize-none ${
                errors.message ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-green-200'
              }`}
              maxLength={2000}
            />
            <div className="flex justify-between mt-1">
              {errors.message && <p className="text-red-500 text-xs">{errors.message}</p>}
              <p className="text-gray-400 text-xs ml-auto">{formData.message.length}/2000</p>
            </div>
          </div>

          {/* Optional: Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-200"
              maxLength={100}
            />
          </div>

          {/* Optional: Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-gray-400">(optional - for follow-up)</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@example.com"
              className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
                errors.email ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-green-200'
              }`}
              maxLength={255}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
            style={{ backgroundColor: '#5B8C51' }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Your feedback helps us improve. All submissions are reviewed by school administration.
          </p>
        </form>
      </div>
    </div>
  )
}
