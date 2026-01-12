import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/apiClient'
import { useSchoolYear } from '../contexts/SchoolYearContext'
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription'

interface Event {
  id: string
  title: string
  date: string
  type: 'holiday' | 'exam' | 'event' | 'meeting' | 'birthday'
  description?: string
  color: string
  icon: string
  person_name?: string
  person_role?: 'teacher' | 'student'
}

const eventTypeColors: { [key: string]: { bg: string, border: string, icon: string, hex: string } } = {
  'holiday': { bg: '#FFE4E1', border: '#FF69B4', icon: '🎉', hex: '#FF69B4' },
  'exam': { bg: '#E6F3FF', border: '#4169E1', icon: '📝', hex: '#4169E1' },
  'event': { bg: '#E0FFFF', border: '#20B2AA', icon: '📅', hex: '#20B2AA' },
  'meeting': { bg: '#FFFACD', border: '#FFD700', icon: '👥', hex: '#FFD700' },
  'birthday': { bg: '#FFE4B5', border: '#FF8C00', icon: '🎂', hex: '#FF8C00' },
}

export function CalendarPage() {
  const { selectedYear } = useSchoolYear()
  const [activeTab, setActiveTab] = useState<'calendar' | 'birthdays'>('calendar')
  const [events, setEvents] = useState<Event[]>([])
  const [birthdays, setBirthdays] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [selectedDateForEvent, setSelectedDateForEvent] = useState<string | null>(null)
  const [selectedEventDetail, setSelectedEventDetail] = useState<Event | null>(null)
  const [showEventDetail, setShowEventDetail] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    type: 'event' as const,
    description: ''
  })

  // Load events and birthdays function (memoized for real-time updates)
  const loadEventsAndBirthdays = useCallback(async () => {
    setLoading(true)
    try {
      // Load school events
      const { data: eventsData } = await api
        .from('school_events')
        .select('*')
        .order('event_date', { ascending: true })

      if (eventsData) {
        const formattedEvents = eventsData.map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.event_date,
          type: e.event_type || 'event',
          description: e.description,
          color: eventTypeColors[e.event_type || 'event'].bg,
          icon: eventTypeColors[e.event_type || 'event'].icon,
        }))
        setEvents(formattedEvents)
      }

      // Load birthdays
      const today = new Date()
      const { data: teachers } = await api
        .from('profiles')
        .select('id, full_name, birth_date')
        .eq('role', 'teacher')
        .not('birth_date', 'is', null)

      const { data: students } = await api
        .from('student_records')
        .select('id, student_name, birth_date')

      const birthdayList: Event[] = []

      if (teachers) {
        teachers.forEach((teacher: any) => {
          if (teacher.birth_date) {
            const birthDate = new Date(teacher.birth_date)
            const upcomingDate = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
            
            if (upcomingDate < today) {
              upcomingDate.setFullYear(today.getFullYear() + 1)
            }

            birthdayList.push({
              id: `teacher-${teacher.id}`,
              title: `${teacher.full_name}'s Birthday`,
              date: upcomingDate.toISOString().split('T')[0],
              type: 'birthday',
              person_name: teacher.full_name,
              person_role: 'teacher',
              color: eventTypeColors['birthday'].bg,
              icon: eventTypeColors['birthday'].icon,
            })
          }
        })
      }

      if (students) {
        students.forEach((student: any) => {
          if (student.birth_date) {
            const birthDate = new Date(student.birth_date)
            const upcomingDate = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
            
            if (upcomingDate < today) {
              upcomingDate.setFullYear(today.getFullYear() + 1)
            }

            birthdayList.push({
              id: `student-${student.id}`,
              title: `${student.student_name}'s Birthday`,
              date: upcomingDate.toISOString().split('T')[0],
              type: 'birthday',
              person_name: student.student_name,
              person_role: 'student',
              color: eventTypeColors['birthday'].bg,
              icon: eventTypeColors['birthday'].icon,
            })
          }
        })
      }

      birthdayList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setBirthdays(birthdayList)
    } catch (err) {
      console.error('Error loading events:', err)
    }
    setLoading(false)
  }, [selectedYear])

  // Initial load
  useEffect(() => {
    loadEventsAndBirthdays()
  }, [loadEventsAndBirthdays])

  // Real-time subscriptions for live updates
  useRealtimeSubscription(
    [
      { table: 'school_events' },
      { table: 'profiles' },
      { table: 'student_records' }
    ],
    loadEventsAndBirthdays,
    [selectedYear]
  )

  const handleAddEvent = async () => {
    if (!formData.title || !formData.date) return

    try {
      const { error } = await api
        .from('school_events')
        .insert({
          title: formData.title,
          event_date: formData.date,
          event_type: formData.type,
          description: formData.description,
        })

      if (!error) {
        setFormData({ title: '', date: new Date().toISOString().split('T')[0], type: 'event', description: '' })
        setShowModal(false)
        loadEventsAndBirthdays()
      }
    } catch (err) {
      console.error('Error adding event:', err)
    }
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const allEventsAndBirthdays = [...events, ...birthdays]

  const getEventsForDate = (dateStr: string) => {
    return allEventsAndBirthdays.filter(e => e.date === dateStr)
  }

  const getTodayBirthdays = () => {
    const today = new Date().toISOString().split('T')[0]
    return birthdays.filter(b => b.date === today)
  }

  const getUpcomingBirthdays = () => {
    const today = new Date().toISOString().split('T')[0]
    return birthdays
      .filter(b => b.date >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 20)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getDaysUntil = (dateStr: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const eventDate = new Date(dateStr + 'T00:00:00')
    const diff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const calendarDays = generateCalendarDays()
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  return (
    <div className="flex-1 p-6" style={{ backgroundColor: '#F8FAF7' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">📅 Calendar</h1>
          <p className="text-gray-500">School events, holidays, and birthdays</p>
        </div>
        <button
          onClick={() => {
            setSelectedDateForEvent(new Date().toISOString().split('T')[0])
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium"
          style={{ backgroundColor: '#5B8C51' }}
        >
          + Add Event
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'calendar'
              ? 'text-white'
              : 'text-gray-600 bg-white hover:bg-gray-50'
          }`}
          style={activeTab === 'calendar' ? { backgroundColor: '#5B8C51' } : {}}
        >
          📅 Calendar
        </button>
        <button
          onClick={() => setActiveTab('birthdays')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'birthdays'
              ? 'text-white'
              : 'text-gray-600 bg-white hover:bg-gray-50'
          }`}
          style={activeTab === 'birthdays' ? { backgroundColor: '#5B8C51' } : {}}
        >
          🎂 Birthdays
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : activeTab === 'calendar' ? (
        // Calendar View
        <div className="grid grid-cols-3 gap-6">
          {/* Full Month Calendar */}
          <div className="col-span-2 bg-white rounded-2xl p-6 shadow-sm">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              >
                ←
              </button>
              <h2 className="text-xl font-bold text-gray-800">{monthYear}</h2>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              >
                →
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {daysOfWeek.map(day => (
                <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                const dateStr = day
                  ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                      .toISOString()
                      .split('T')[0]
                  : null
                const dayEvents = dateStr ? getEventsForDate(dateStr) : []
                const isToday =
                  day &&
                  new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString() ===
                    new Date().toDateString()

                return (
                  <div
                    key={idx}
                    className={`min-h-24 p-2 rounded-lg border transition-all cursor-pointer ${
                      day
                        ? isToday
                          ? 'border-2 border-green-500 bg-green-50'
                          : 'border border-gray-200 bg-white hover:bg-gray-50'
                        : 'bg-gray-50 cursor-default'
                    }`}
                    onClick={() => day && dateStr && setSelectedDateForEvent(dateStr)}
                  >
                    {day && (
                      <>
                        <p className={`text-sm font-semibold mb-1 ${
                          isToday ? 'text-green-600' : 'text-gray-700'
                        }`}>
                          {day}
                        </p>
                        <div className="space-y-1 overflow-y-auto max-h-16">
                          {dayEvents.slice(0, 2).map(event => (
                            <div
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedEventDetail(event)
                                setShowEventDetail(true)
                              }}
                              className="text-xs px-2 py-1 rounded text-white truncate font-medium hover:shadow-md transition-shadow"
                              style={{
                                backgroundColor: eventTypeColors[event.type].hex,
                                cursor: 'pointer',
                              }}
                              title={event.title}
                            >
                              {event.icon} {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-gray-500 px-2">+{dayEvents.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sidebar - Today's Events */}
          <div className="bg-white rounded-2xl p-6 shadow-sm h-fit">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>🎯</span> Today's Events
            </h3>
            <div className="space-y-2">
              {selectedDateForEvent &&
              selectedDateForEvent === new Date().toISOString().split('T')[0] &&
              getEventsForDate(selectedDateForEvent).length > 0 ? (
                getEventsForDate(selectedDateForEvent).map(event => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedEventDetail(event)
                      setShowEventDetail(true)
                    }}
                    style={{
                      backgroundColor: event.color,
                      borderColor: eventTypeColors[event.type].border,
                    }}
                  >
                    <p className="font-medium text-gray-800">{event.title}</p>
                    <p className="text-xs text-gray-600">{event.icon} {event.type}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">No events today</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Birthdays Tab
        <div className="grid grid-cols-2 gap-6">
          {/* Today's Birthdays */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎉</span>
              <h2 className="text-lg font-bold text-gray-800">
                Today's Birthdays
              </h2>
              {getTodayBirthdays().length > 0 && (
                <span className="ml-auto px-2 py-1 rounded-full bg-red-500 text-white text-xs font-medium">
                  {getTodayBirthdays().length}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {getTodayBirthdays().length > 0 ? (
                getTodayBirthdays().map(birthday => (
                  <div
                    key={birthday.id}
                    className="p-4 rounded-xl border-l-4 border-orange-500 bg-orange-50 animate-pulse"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">🎂</span>
                      <div>
                        <p className="font-semibold text-gray-800">{birthday.person_name}</p>
                        <p className="text-xs text-gray-600 capitalize">{birthday.person_role}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">No birthdays today</p>
              )}
            </div>
          </div>

          {/* Upcoming Birthdays */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📅</span>
              <h2 className="text-lg font-bold text-gray-800">Upcoming Birthdays</h2>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {getUpcomingBirthdays().length > 0 ? (
                getUpcomingBirthdays().map(birthday => {
                  const daysUntil = getDaysUntil(birthday.date)
                  return (
                    <div
                      key={birthday.id}
                      className="p-4 rounded-xl border-l-4 border-orange-500 bg-orange-50 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-2xl">🎂</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{birthday.person_name}</p>
                            <p className="text-xs text-gray-600 capitalize">{birthday.person_role} • {formatDate(birthday.date)}</p>
                          </div>
                        </div>
                        <div className="px-3 py-1 rounded-full font-bold text-sm bg-orange-500 text-white whitespace-nowrap">
                          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil}d`}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-gray-400 text-center py-8">No upcoming birthdays</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {showEventDetail && selectedEventDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEventDetail(false)}>
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ borderTop: `4px solid ${eventTypeColors[selectedEventDetail.type].hex}` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedEventDetail.icon}</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedEventDetail.title}</h2>
                  <p className="text-sm text-gray-600 capitalize">{selectedEventDetail.type}</p>
                </div>
              </div>
              <button onClick={() => setShowEventDetail(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <p className="text-xs text-gray-500">DATE</p>
                <p className="text-lg font-semibold text-gray-800">{formatDate(selectedEventDetail.date)}</p>
              </div>
              {selectedEventDetail.description && (
                <div>
                  <p className="text-xs text-gray-500">DESCRIPTION</p>
                  <p className="text-gray-700">{selectedEventDetail.description}</p>
                </div>
              )}
              {selectedEventDetail.person_name && (
                <div>
                  <p className="text-xs text-gray-500">PERSON</p>
                  <p className="text-gray-700 capitalize">{selectedEventDetail.person_name} ({selectedEventDetail.person_role})</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowEventDetail(false)}
              className="w-full px-4 py-3 rounded-xl text-white font-medium"
              style={{ backgroundColor: '#5B8C51' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Event</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                  placeholder="e.g., School Assembly"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none"
                >
                  <option value="event">📅 Event</option>
                  <option value="exam">📝 Exam</option>
                  <option value="holiday">🎉 Holiday</option>
                  <option value="meeting">👥 Parent Meeting</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 outline-none resize-none"
                  rows={3}
                  placeholder="Optional details..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                className="flex-1 px-4 py-2 rounded-xl text-white font-medium"
                style={{ backgroundColor: '#5B8C51' }}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
