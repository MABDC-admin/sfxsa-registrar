import { createContext, useContext, useState, type ReactNode } from 'react'

interface SchoolYearContextType {
  selectedYear: string
  setSelectedYear: (year: string) => void
  schoolYears: string[]
}

const SchoolYearContext = createContext<SchoolYearContextType | undefined>(undefined)

export function SchoolYearProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState('2025-2026')
  const schoolYears = ['2024-2025', '2025-2026', '2026-2027']

  return (
    <SchoolYearContext.Provider value={{ selectedYear, setSelectedYear, schoolYears }}>
      {children}
    </SchoolYearContext.Provider>
  )
}

export function useSchoolYear() {
  const context = useContext(SchoolYearContext)
  if (!context) {
    throw new Error('useSchoolYear must be used within a SchoolYearProvider')
  }
  return context
}
