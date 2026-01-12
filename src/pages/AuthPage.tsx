import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  role: z.enum(['admin', 'teacher', 'student', 'finance']),
})

type FieldErrors = {
  email?: string
  password?: string
  fullName?: string
  role?: string
}

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'teacher' | 'student' | 'finance'>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { signIn, signUp, user } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const getFriendlyError = (message: string): string => {
    if (message.includes('Email not confirmed')) {
      return 'Please check your inbox for a confirmation link before signing in.'
    }
    if (message.includes('Invalid login credentials')) {
      return 'Incorrect email or password. Please try again.'
    }
    if (message.includes('User already registered')) {
      return 'An account with this email already exists. Try signing in instead.'
    }
    if (message.includes('Password should be')) {
      return 'Password must be at least 6 characters long.'
    }
    return message
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    // Validate with zod
    const data = isLogin
      ? { email, password }
      : { email, password, fullName, role }

    const schema = isLogin ? loginSchema : signupSchema
    const result = schema.safeParse(data)

    if (!result.success) {
      const errors: FieldErrors = {}
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FieldErrors
        errors[field] = issue.message
      })
      setFieldErrors(errors)
      return
    }

    setLoading(true)

    if (isLogin) {
      const { error } = await signIn(email, password)
      if (error) {
        setError(getFriendlyError(error.message))
      } else {
        navigate('/dashboard')
      }
    } else {
      const { error } = await signUp(email, password, fullName, role)
      if (error) {
        setError(getFriendlyError(error.message))
      } else {
        setError('')
        setEmail('')
        setPassword('')
        setFullName('')
        setIsLogin(true)
        alert('Account created! Please check your email for a confirmation link.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ backgroundColor: '#F8FAF7' }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: '#5B8C51' }}
          >
            🎓
          </div>
          <span className="text-2xl font-bold text-gray-800">School Admin</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          {isLogin ? 'Welcome Back!' : 'Create Account'}
        </h1>
        <p className="text-center text-gray-500 mb-6">
          {isLogin ? 'Sign in to access your dashboard' : 'Register for a new account'}
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-colors ${
                  fieldErrors.fullName 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-200 focus:border-green-500'
                }`}
                placeholder="Enter your full name"
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-sm text-red-500">{fieldErrors.fullName}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border outline-none transition-colors ${
                fieldErrors.email 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-green-500'
              }`}
              placeholder="Enter your email"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border outline-none transition-colors ${
                fieldErrors.password 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-gray-200 focus:border-green-500'
              }`}
              placeholder="Enter your password"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as typeof role)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:border-green-500 bg-white transition-colors"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
                <option value="finance">Finance</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-medium transition-opacity disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            style={{ backgroundColor: '#5B8C51' }}
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-gray-600 mt-6">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
              setFieldErrors({})
            }}
            className="font-medium underline hover:no-underline"
            style={{ color: '#5B8C51' }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  )
}