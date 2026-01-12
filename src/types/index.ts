export type AcademicYear = {
  id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
}

export type AdminKpis = {
  total_enrolled_students: number
  total_teachers: number
  active_classes: number
  sections_with_rooms: number
}

export type GenderRatio = {
  male_count: number
  female_count: number
  other_count: number
}

export type AttendanceMonth = {
  month: string
  total_marks: number
  present_marks: number
  present_rate_pct: number
}

export type UserRole = 'admin' | 'teacher' | 'student' | 'finance' | 'principal' | 'registrar' | 'accounting'

export type Profile = {
  id: string
  user_id: string
  role: UserRole
  full_name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type MenuPermission = {
  id: string
  user_id: string
  menu_key: string
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export type TeacherKpis = {
  teacher_id: string
  my_classes: number
  submissions_to_check: number
}

export type Submission = {
  id: string
  assignment_id: string
  student_id: string
  status: 'draft' | 'submitted' | 'late' | 'returned' | 'missing'
  submitted_at: string | null
  late: boolean
  score: number | null
  teacher_feedback: string | null
  graded_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  assignment_title?: string
  student_name?: string
  class_name?: string
}

export type Class = {
  id: string
  academic_year_id: string
  section_id: string
  subject_name: string
  description: string | null
  class_code: string
  color: string | null
  is_active: boolean
  created_at: string
}

export type StudentKpis = {
  student_id: string
  enrolled_subjects: number
  pending_assignments: number
}

export type Assignment = {
  id: string
  class_id: string
  title: string
  instructions: string | null
  points: number
  due_at: string | null
  published_at: string | null
  created_at: string
  // Joined fields
  class_name?: string
  class_color?: string
}

export type Announcement = {
  id: string
  class_id: string | null
  title: string | null
  content: string
  author_id: string
  published_at: string
  created_at: string
  // Joined fields
  author_name?: string
  class_name?: string
}

export type FinanceKpis = {
  collected_this_month: number
  outstanding_total: number
  expenses_this_month: number
}

export type AgingBuckets = {
  bucket_0_30: number
  bucket_31_60: number
  bucket_60_plus: number
}

export type Transaction = {
  id: string
  type: 'payment' | 'expense'
  amount: number
  description: string
  date: string
  reference?: string
  student_name?: string
  category?: string
}

export type PayrollRun = {
  id: string
  period_month: number
  period_year: number
  status: 'draft' | 'processing' | 'paid' | 'void'
  currency: string
  total_amount: number
  created_at: string
}

export type Employee = {
  id: string
  employee_no: string | null
  full_name: string
  position: string | null
  basic_salary: number
  currency: string
  is_active: boolean
  created_at: string
}
