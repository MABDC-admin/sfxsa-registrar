import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { api } from '../lib/apiClient'
import type { MenuPermission } from '../types'
import { useIsMobile, useKeyboardShortcut, useRealtimeSubscription } from '../hooks'
import { CommandPalette } from '../components/ui'

type UserRole = 'admin' | 'teacher' | 'student' | 'finance' | 'principal' | 'registrar' | 'accounting'

interface MenuItem {
  icon: string
  label: string
  path: string
  key: string
  roles?: UserRole[]
}

const defaultMenuItems: MenuItem[] = [
  { icon: '📊', label: 'Dashboard', path: '/dashboard', key: 'dashboard' },
  { icon: '📢', label: 'Announcements', path: '/announcements', key: 'announcements' },
  { icon: '📅', label: 'Academic Years', path: '/academic-years', key: 'academic-years', roles: ['admin', 'principal', 'registrar'] },
  { icon: '📚', label: 'Grade Levels', path: '/grade-levels', key: 'grade-levels', roles: ['admin', 'principal', 'registrar'] },
  { icon: '📖', label: 'Subjects', path: '/subjects', key: 'subjects', roles: ['admin', 'teacher', 'principal', 'registrar'] },
  { icon: '📝', label: 'Lessons', path: '/lessons', key: 'lessons', roles: ['admin', 'teacher', 'student', 'principal', 'registrar'] },
  { icon: '👤', label: 'Students', path: '/students', key: 'students', roles: ['admin', 'teacher', 'principal', 'registrar'] },
  { icon: '📋', label: 'Records', path: '/records', key: 'records', roles: ['admin', 'principal', 'registrar'] },
  { icon: '🅿️', label: 'Teachers', path: '/teachers', key: 'teachers', roles: ['admin', 'principal', 'registrar'] },
  { icon: '🛡️', label: 'Admins', path: '/admins', key: 'admins', roles: ['admin', 'principal'] },
  { icon: '🎓', label: 'Principals', path: '/principals', key: 'principals', roles: ['admin'] },
  { icon: '📝', label: 'Registrars', path: '/registrars', key: 'registrars', roles: ['admin'] },
  { icon: '💰', label: 'Accounting', path: '/accounting-users', key: 'accounting-users', roles: ['admin'] },
  { icon: '📖', label: 'Classes', path: '/classes', key: 'classes', roles: ['admin', 'teacher', 'student', 'principal', 'registrar'] },
  { icon: '✅', label: 'Attendance', path: '/attendance', key: 'attendance', roles: ['admin', 'teacher', 'principal', 'registrar'] },
  { icon: '📆', label: 'Calendar', path: '/calendar', key: 'calendar', roles: ['admin', 'teacher', 'student', 'principal', 'registrar', 'accounting'] },
  { icon: '💬', label: 'Chat', path: '/chat', key: 'chat', roles: ['admin', 'teacher', 'finance', 'principal', 'registrar', 'accounting'] },
  { icon: '💳', label: 'Finance', path: '/finance', key: 'finance', roles: ['admin', 'finance', 'principal', 'accounting'] },
  { icon: '📊', label: 'Reports', path: '/reports', key: 'reports', roles: ['admin', 'finance', 'principal', 'registrar', 'accounting'] },
  { icon: '💬⭐', label: 'Suggestions', path: '/inbox', key: 'inbox', roles: ['admin', 'principal'] },
  { icon: '⚙️', label: 'Settings', path: '/settings', key: 'settings', roles: ['admin', 'principal', 'registrar', 'accounting'] },
]

export function MainLayout() {
  const { profile, signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const currentUser = profile
  const [menuPermissions, setMenuPermissions] = useState<MenuPermission[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>(defaultMenuItems)
  const [editMode, setEditMode] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const isAdmin = currentUser?.role === 'admin'

  // Load menu order from database
  const loadMenuOrder = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data } = await api.from('user_menu_order').select('*').eq('user_id', user.id).maybeSingle()
      if (data) {
        setSidebarCollapsed(data.sidebar_collapsed || false)
        if (data.menu_order && Array.isArray(data.menu_order) && data.menu_order.length > 0) {
          // Reorder menu items based on saved order
          const orderedKeys = data.menu_order as string[]
          const reordered = orderedKeys
            .map((key: string) => defaultMenuItems.find(item => item.key === key))
            .filter((item): item is MenuItem => item !== undefined)
          // Add any new items not in saved order
          const missingItems = defaultMenuItems.filter(item => !orderedKeys.includes(item.key))
          setMenuItems([...reordered, ...missingItems])
        }
      }
    } catch (err) {
      console.error('Error loading menu order:', err)
    }
  }, [user?.id])

  // Save menu order to database
  const saveMenuOrder = useCallback(async (items: MenuItem[], collapsed: boolean) => {
    if (!user?.id || !isAdmin) return
    try {
      const order = items.map(item => item.key)
      await api.from('user_menu_order').upsert({
        user_id: user.id,
        menu_order: order,
        sidebar_collapsed: collapsed,
        updated_at: new Date().toISOString()
      })
    } catch (err) {
      console.error('Error saving menu order:', err)
    }
  }, [user?.id, isAdmin])

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  // Keyboard shortcut to toggle sidebar
  useKeyboardShortcut({ key: 'b', ctrl: true }, () => {
    if (!isMobile) {
      setSidebarCollapsed(prev => {
        const newVal = !prev
        if (isAdmin) saveMenuOrder(menuItems, newVal)
        return newVal
      })
    } else {
      setSidebarOpen(prev => !prev)
    }
  }, [isMobile, isAdmin, menuItems])

  // Keyboard shortcut for command palette
  useKeyboardShortcut({ key: 'k', ctrl: true }, () => setCommandPaletteOpen(true), [])

  useEffect(() => {
    if (user?.id) {
      loadMenuPermissions()
      loadMenuOrder()
    }
  }, [user?.id, loadMenuOrder])

  async function loadMenuPermissions() {
    if (!currentUser?.role) return
    try {
      const { data } = await api.from('role_module_permissions').select('*').eq('role', currentUser.role)
      if (data) {
        setMenuPermissions(data.map((p: any) => ({
          menu_key: p.module_key,
          is_enabled: p.is_enabled
        })))
      }
    } catch (err) {
      console.error('Error loading menu permissions:', err)
    }
  }

  // Real-time updates for permissions
  useRealtimeSubscription(
    [{ table: 'role_module_permissions' }],
    () => loadMenuPermissions(),
    [currentUser?.role]
  )

  // Drag and drop handlers
  const handleDragStart = (key: string) => {
    setDraggedItem(key)
  }

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === key) return

    const draggedIndex = menuItems.findIndex(item => item.key === draggedItem)
    const targetIndex = menuItems.findIndex(item => item.key === key)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newItems = [...menuItems]
      const [removed] = newItems.splice(draggedIndex, 1)
      newItems.splice(targetIndex, 0, removed)
      setMenuItems(newItems)
    }
  }

  const handleDragEnd = () => {
    if (draggedItem && isAdmin) {
      saveMenuOrder(menuItems, sidebarCollapsed)
    }
    setDraggedItem(null)
  }

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const newVal = !prev
      if (isAdmin) saveMenuOrder(menuItems, newVal)
      return newVal
    })
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const getDashboardTitle = () => {
    switch (currentUser?.role) {
      case 'admin': return 'School Admin'
      case 'teacher': return 'Teacher'
      case 'student': return 'Student'
      case 'finance': return 'Finance'
      case 'principal': return 'Principal'
      case 'registrar': return 'Registrar'
      case 'accounting': return 'Accounting'
      default: return 'School Admin'
    }
  }

  const isMenuEnabled = (menuKey: string): boolean => {
    const permission = menuPermissions.find(p => p.menu_key === menuKey)
    return permission ? permission.is_enabled : true
  }

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      // First check role requirement in defaultMenuItems
      if (item.roles && currentUser?.role) {
        if (!item.roles.includes(currentUser.role as UserRole)) return false
      } else if (item.roles && !currentUser?.role) return false
      
      // Then check dynamic module permissions
      // Even admins can have modules disabled in the new system
      return isMenuEnabled(item.key)
    })
  }, [menuItems, menuPermissions, currentUser?.role])

  const isCurrentModuleEnabled = useMemo(() => {
    // If we're on a path that matches a menu item, check its permission
    const currentItem = menuItems.find(item => {
      if (location.pathname === item.path) return true
      if (location.pathname.startsWith(item.path + '/')) return true
      return false
    })

    if (!currentItem) return true // Allow access to non-menu paths (like /auth)
    
    // Safety check for admins - never lock out of dashboard or settings
    if (currentUser?.role === 'admin' && (currentItem.key === 'dashboard' || currentItem.key === 'settings')) {
      return true
    }
    
    return isMenuEnabled(currentItem.key)
  }, [location.pathname, menuItems, menuPermissions, currentUser?.role])

  const handleNavClick = () => {
    if (isMobile) setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Global Countryside Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <svg viewBox="0 0 1200 700" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="globalSky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E8F5E9" />
              <stop offset="100%" stopColor="#C8E6C9" />
            </linearGradient>
          </defs>
          <rect fill="url(#globalSky)" width="1200" height="700" />
          <ellipse cx="200" cy="650" rx="400" ry="200" fill="#81C784" />
          <ellipse cx="600" cy="680" rx="500" ry="180" fill="#66BB6A" />
          <ellipse cx="1000" cy="650" rx="400" ry="200" fill="#81C784" />
          <ellipse cx="100" cy="720" rx="350" ry="150" fill="#4CAF50" />
          <ellipse cx="500" cy="750" rx="400" ry="130" fill="#43A047" />
          <ellipse cx="900" cy="720" rx="450" ry="160" fill="#4CAF50" />
        </svg>
      </div>

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile Header */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-sm shadow-sm z-30 flex items-center justify-between px-4">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2 ml-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#5B8C51' }}>
                😊
              </div>
              <span className="font-semibold text-gray-800">{getDashboardTitle()}</span>
            </div>
          </div>
          {/* Mobile Search Button */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Search"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </header>
      )}

      {/* Left Sidebar */}
      <aside
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
          ${sidebarCollapsed && !isMobile ? 'w-16' : 'w-56 lg:w-48'}
          bg-white/95 backdrop-blur-sm flex flex-col shadow-lg
          transform transition-all duration-300 ease-in-out
          ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : ''}
        `}
        style={{ minHeight: isMobile ? '100vh' : undefined }}
      >
        {/* Close button on mobile */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Logo Header */}
        <div className={`p-4 ${sidebarCollapsed && !isMobile ? 'px-2' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0" style={{ backgroundColor: '#5B8C51' }}>
              😊
            </div>
            {(!sidebarCollapsed || isMobile) && (
              <span className="font-bold text-gray-800 text-sm">{getDashboardTitle()}</span>
            )}
          </div>
          {/* Desktop Search Button */}
          {(!sidebarCollapsed || isMobile) && (
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="mt-3 w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <span>🔍</span>
              <span className="flex-1 text-left">Search...</span>
              <kbd className="px-1.5 py-0.5 text-xs bg-white rounded shadow-sm">⌘K</kbd>
            </button>
          )}
          {sidebarCollapsed && !isMobile && (
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="mt-3 w-full flex items-center justify-center p-2 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <span>🔍</span>
            </button>
          )}
        </div>

        {/* Sidebar Toggle & Edit Mode (Admin only) */}
        {!isMobile && (
          <div className={`px-2 pb-2 flex ${sidebarCollapsed ? 'flex-col gap-1' : 'gap-1'}`}>
            <button
              onClick={toggleSidebarCollapse}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? '➡️' : '⬅️'}
              {!sidebarCollapsed && <span>Collapse</span>}
            </button>
            {isAdmin && !sidebarCollapsed && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                  editMode ? 'bg-green-100 text-green-700' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                }`}
                title="Reorder menu items"
              >
                ✏️ {editMode ? 'Done' : 'Reorder'}
              </button>
            )}
            {isAdmin && sidebarCollapsed && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center justify-center p-1.5 text-xs rounded-lg transition-colors ${
                  editMode ? 'bg-green-100 text-green-700' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                }`}
                title="Reorder menu items"
              >
                ✏️
              </button>
            )}
          </div>
        )}

        {/* Navigation Menu */}
        <nav className={`flex-1 px-2 py-2 overflow-y-auto ${editMode ? 'bg-green-50/50' : ''}`}>
          {editMode && isAdmin && !sidebarCollapsed && (
            <div className="text-xs text-green-600 px-3 py-2 mb-2 bg-green-100 rounded-lg">
              👆 Drag items to reorder
            </div>
          )}
          {filteredMenuItems.map((item) => (
            <div
              key={item.key}
              draggable={editMode && isAdmin}
              onDragStart={() => handleDragStart(item.key)}
              onDragOver={(e) => handleDragOver(e, item.key)}
              onDragEnd={handleDragEnd}
              className={`${editMode && isAdmin ? 'cursor-grab active:cursor-grabbing' : ''} ${
                draggedItem === item.key ? 'opacity-50' : ''
              }`}
            >
              <NavLink
                to={item.path}
                onClick={editMode ? (e) => e.preventDefault() : handleNavClick}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-lg mb-0.5 ${
                    isActive && !editMode ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
                  } ${editMode ? 'border border-dashed border-green-300 hover:border-green-500' : ''}`
                }
                style={({ isActive }) => isActive && !editMode ? { backgroundColor: '#5B8C51' } : {}}
              >
                {editMode && isAdmin && (
                  <span className="text-gray-400 text-xs">☰</span>
                )}
                <span className="text-base">{item.icon}</span>
                {(!sidebarCollapsed || isMobile) && <span>{item.label}</span>}
              </NavLink>
            </div>
          ))}
        </nav>

        {/* User Profile & Logout */}
        <div className={`p-3 border-t border-gray-100 ${sidebarCollapsed && !isMobile ? 'px-2' : ''}`}>
          {(!sidebarCollapsed || isMobile) ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  <img
                    src={currentUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.full_name || 'user'}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{currentUser?.full_name || 'User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{currentUser?.role || 'Guest'}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 text-gray-500 text-xs px-2 py-1.5 rounded-lg hover:bg-gray-100 transition"
              >
                <span>🚪</span>
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                  <img
                    src={currentUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.full_name || 'user'}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center text-gray-500 text-xs p-1.5 rounded-lg hover:bg-gray-100 transition"
                title="Sign Out"
              >
                <span>🚪</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-auto relative z-10 ${isMobile ? 'pt-14' : ''}`}>
        {!isCurrentModuleEnabled ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl p-12 shadow-xl max-w-lg w-full text-center animate-scaleIn border-2 border-red-50">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center text-5xl mx-auto mb-6">
                🚫
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Access Restricted</h1>
              <p className="text-gray-600 mb-8 text-lg">
                This module has been disabled for your role. Please contact your system administrator if you believe this is an error.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </div>

      {/* Fox Character - Hidden on mobile */}
      {!isMobile && (
        <div className="fixed bottom-8 right-24 text-7xl z-50 animate-bounce pointer-events-none" style={{ animationDuration: '3s' }}>
          🦊
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  )
}
