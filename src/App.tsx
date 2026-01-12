import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { SchoolYearProvider } from './contexts/SchoolYearContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { MainLayout } from './layouts/MainLayout'
import { ToastProvider } from './components/ui/Toast'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { GradeLevelsPage } from './pages/GradeLevelsPage'
import { GradeDetailPage } from './pages/GradeDetailPage'
import { ClassroomPage } from './pages/ClassroomPage'
import { StudentRecordsPage } from './pages/StudentRecordsPage'
import { StudentsListPage } from './pages/students/StudentsListPage'
import { TeachersListPage } from './pages/teachers/TeachersListPage'
import { AdminsListPage } from './pages/admins/AdminsListPage'
import { PrincipalsListPage } from './pages/principals/PrincipalsListPage'
import { RegistrarsListPage } from './pages/registrars/RegistrarsListPage'
import { AccountingListPage } from './pages/accounting/AccountingListPage'
import { ClassesListPage } from './pages/classes/ClassesListPage'
import { SubjectsListPage } from './pages/subjects/SubjectsListPage'
import { CalendarPage } from './pages/CalendarPage'
import { ChatPage } from './pages/ChatPage'
import { SettingsPage } from './pages/SettingsPage'
import { ReportsPage } from './pages/ReportsPage'
import { FinanceListPage } from './pages/FinanceListPage'
import { SuggestionsFormPage } from './pages/SuggestionsFormPage'
import { SuggestionsInboxPage } from './pages/SuggestionsInboxPage'
import { AnnouncementsPage } from './pages/AnnouncementsPage'
import { AcademicYearsPage } from './pages/AcademicYearsPage'
import LessonMaterialsPage from './pages/LessonMaterialsPage'

// Placeholder for Attendance (to be implemented)
function AttendancePage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>✅ Attendance</h1>
      <p style={{ color: '#6b7280' }}>Coming soon...</p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <SchoolYearProvider>
              <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/suggestions" element={<SuggestionsFormPage />} />

            {/* Protected Routes with MainLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard - Role-based */}
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Announcements */}
              <Route path="/announcements" element={<AnnouncementsPage />} />

              {/* Grade Levels */}
              <Route path="/grade-levels" element={<GradeLevelsPage />} />
              <Route path="/grade-levels/:gradeId" element={<GradeDetailPage />} />
              <Route path="/classroom/:classId" element={<ClassroomPage />} />

              {/* Student Records - Consolidated student management */}
              <Route path="/records" element={<StudentRecordsPage />} />

              {/* Students - Alternative view (reads from student_records) */}
              <Route path="/students" element={<StudentsListPage />} />

              {/* Teachers */}
              <Route path="/teachers" element={<TeachersListPage />} />

              {/* Admins */}
              <Route path="/admins" element={<AdminsListPage />} />

              {/* Principals */}
              <Route path="/principals" element={<PrincipalsListPage />} />

              {/* Registrars */}
              <Route path="/registrars" element={<RegistrarsListPage />} />

              {/* Accounting Users */}
              <Route path="/accounting-users" element={<AccountingListPage />} />

              {/* Classes */}
              <Route path="/classes" element={<ClassesListPage />} />
              <Route path="/classes/new" element={<ClassesListPage />} />
              <Route path="/classes/:id/edit" element={<ClassesListPage />} />

              {/* Subjects */}
              <Route path="/subjects" element={<SubjectsListPage />} />

              {/* Academic Years */}
              <Route path="/academic-years" element={<AcademicYearsPage />} />

              {/* Lesson Materials */}
              <Route path="/lessons" element={<LessonMaterialsPage />} />

              {/* Other Pages */}
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/finance" element={<FinanceListPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/inbox" element={<SuggestionsInboxPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
            </SchoolYearProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
