import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useKeyboardShortcut, useDebounce } from '../../hooks/customHooks'

// ============================================
// TYPES
// ============================================
export interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon?: string
  shortcut?: string
  category?: string
  action?: () => void
  href?: string
  keywords?: string[]
}

export interface CommandPaletteProps {
  isOpen?: boolean
  onClose?: () => void
  commands?: CommandItem[]
  placeholder?: string
  className?: string
}

// ============================================
// DEFAULT NAVIGATION COMMANDS
// ============================================
const defaultCommands: CommandItem[] = [
  // Navigation
  { id: 'nav-dashboard', title: 'Go to Dashboard', icon: '🏠', href: '/dashboard', category: 'Navigation', keywords: ['home', 'main'] },
  { id: 'nav-students', title: 'Go to Students', icon: '👥', href: '/students', category: 'Navigation', keywords: ['pupils', 'learners'] },
  { id: 'nav-teachers', title: 'Go to Teachers', icon: '👩‍🏫', href: '/teachers', category: 'Navigation', keywords: ['faculty', 'staff'] },
  { id: 'nav-classes', title: 'Go to Classes', icon: '📚', href: '/classes', category: 'Navigation', keywords: ['sections', 'subjects'] },
  { id: 'nav-finance', title: 'Go to Finance', icon: '💰', href: '/finance', category: 'Navigation', keywords: ['payments', 'fees', 'money'] },
  { id: 'nav-calendar', title: 'Go to Calendar', icon: '📅', href: '/calendar', category: 'Navigation', keywords: ['events', 'schedule'] },
  { id: 'nav-reports', title: 'Go to Reports', icon: '📊', href: '/reports', category: 'Navigation', keywords: ['analytics', 'data'] },
  { id: 'nav-settings', title: 'Go to Settings', icon: '⚙️', href: '/settings', category: 'Navigation', keywords: ['preferences', 'config'] },
  // Admin pages
  { id: 'nav-admins', title: 'Go to Admins', icon: '👤', href: '/admins', category: 'Administration', keywords: ['administrators', 'users'] },
  { id: 'nav-principals', title: 'Go to Principals', icon: '🎓', href: '/principals', category: 'Administration' },
  { id: 'nav-registrars', title: 'Go to Registrars', icon: '📋', href: '/registrars', category: 'Administration' },
  { id: 'nav-accounting', title: 'Go to Accounting', icon: '💵', href: '/accounting', category: 'Administration' },
  // Quick actions
  { id: 'action-add-student', title: 'Add New Student', icon: '➕', href: '/students?action=add', category: 'Quick Actions', keywords: ['create', 'new'] },
  { id: 'action-add-class', title: 'Add New Class', icon: '➕', href: '/classes?action=add', category: 'Quick Actions', keywords: ['create', 'new'] },
]

// ============================================
// COMMAND PALETTE COMPONENT
// ============================================
export function CommandPalette({
  isOpen: controlledOpen,
  onClose,
  commands = defaultCommands,
  placeholder = 'Search commands...',
  className = '',
}: CommandPaletteProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [internalOpen, setInternalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const isOpen = controlledOpen ?? internalOpen
  const setIsOpen = (open: boolean) => {
    setInternalOpen(open)
    if (!open && onClose) onClose()
  }

  const debouncedSearch = useDebounce(search, 150)

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!debouncedSearch.trim()) return commands

    const lower = debouncedSearch.toLowerCase()
    return commands.filter(cmd => {
      const matchTitle = cmd.title.toLowerCase().includes(lower)
      const matchSubtitle = cmd.subtitle?.toLowerCase().includes(lower)
      const matchKeywords = cmd.keywords?.some(k => k.toLowerCase().includes(lower))
      return matchTitle || matchSubtitle || matchKeywords
    })
  }, [commands, debouncedSearch])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    filteredCommands.forEach(cmd => {
      const category = cmd.category || 'Commands'
      if (!groups[category]) groups[category] = []
      groups[category].push(cmd)
    })
    return groups
  }, [filteredCommands])

  const flatCommands = useMemo(() => {
    return Object.values(groupedCommands).flat()
  }, [groupedCommands])

  // Keyboard shortcut to open (Ctrl+K or Cmd+K)
  useKeyboardShortcut({ key: 'k', ctrl: true }, () => {
    setIsOpen(true)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSearch('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [debouncedSearch])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && flatCommands.length > 0) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      selectedEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex, flatCommands.length])

  // Execute command
  const executeCommand = (cmd: CommandItem) => {
    setIsOpen(false)
    if (cmd.action) {
      cmd.action()
    } else if (cmd.href) {
      navigate(cmd.href)
    }
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, flatCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (flatCommands[selectedIndex]) {
          executeCommand(flatCommands[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className={`fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl z-50 ${className}`}>
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
          {/* Search input */}
          <div className="border-b border-gray-200 p-4 flex items-center gap-3">
            <span className="text-gray-400 text-xl">🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 text-lg outline-none placeholder-gray-400"
              autoComplete="off"
            />
            <kbd className="hidden sm:inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded">
              ESC
            </kbd>
          </div>

          {/* Command list */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
            {flatCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <div className="text-4xl mb-2">🔍</div>
                <p>No commands found</p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, cmds]) => (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {category}
                  </div>
                  {cmds.map((cmd) => {
                    const index = flatCommands.findIndex(c => c.id === cmd.id)
                    const isSelected = index === selectedIndex
                    const isCurrentPage = cmd.href && location.pathname === cmd.href.split('?')[0]

                    return (
                      <button
                        key={cmd.id}
                        data-index={index}
                        onClick={() => executeCommand(cmd)}
                        className={`
                          w-full px-4 py-3 flex items-center gap-3 text-left transition-colors
                          ${isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'}
                          ${isCurrentPage ? 'opacity-50' : ''}
                        `}
                        style={isSelected ? { backgroundColor: 'rgba(91, 140, 81, 0.1)' } : undefined}
                      >
                        <span className="text-xl">{cmd.icon || '📄'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{cmd.title}</div>
                          {cmd.subtitle && (
                            <div className="text-sm text-gray-500 truncate">{cmd.subtitle}</div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        {isCurrentPage && (
                          <span className="text-xs text-gray-400">Current</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hints */}
          <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
            </div>
            <span>⌘K to open</span>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.15s ease-out; }
        .animate-slide-up { animation: slide-up 0.2s ease-out; }
      `}</style>
    </>
  )
}

// ============================================
// COMMAND PALETTE TRIGGER BUTTON
// ============================================
export interface CommandPaletteTriggerProps {
  className?: string
}

export function CommandPaletteTrigger({ className = '' }: CommandPaletteTriggerProps) {
  const [open, setOpen] = useState(false)

  // Listen for Ctrl+K
  useKeyboardShortcut({ key: 'k', ctrl: true }, () => {
    setOpen(true)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm text-gray-500 
          bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors
          ${className}
        `}
      >
        <span>🔍</span>
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-xs bg-white rounded shadow-sm">
          ⌘K
        </kbd>
      </button>
      <CommandPalette isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}

// ============================================
// HOOK FOR CUSTOM COMMANDS
// ============================================
export function useCommandPalette(customCommands?: CommandItem[]) {
  const [isOpen, setIsOpen] = useState(false)

  useKeyboardShortcut({ key: 'k', ctrl: true }, () => {
    setIsOpen(true)
  }, [])

  const commands = useMemo(() => {
    return customCommands ? [...defaultCommands, ...customCommands] : defaultCommands
  }, [customCommands])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
    commands,
    CommandPalette: () => (
      <CommandPalette
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        commands={commands}
      />
    ),
  }
}

export default CommandPalette
