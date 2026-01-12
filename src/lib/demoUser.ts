export type DemoUserRole = 'admin' | 'teacher' | 'student' | 'finance'

export interface DemoUser {
  id: string
  full_name: string
  role: DemoUserRole
  avatar_url: string | null
}

export function getDemoUser(): DemoUser | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem('demo_user')
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<DemoUser>

    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.full_name !== 'string') return null
    if (typeof parsed.role !== 'string') return null

    return {
      id: typeof parsed.id === 'string' ? parsed.id : 'demo',
      full_name: parsed.full_name,
      role: parsed.role as DemoUserRole,
      avatar_url: typeof parsed.avatar_url === 'string' ? parsed.avatar_url : null,
    }
  } catch {
    return null
  }
}
