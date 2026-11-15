// Basis-Typen für Dienstplan-App

export interface ShiftType {
  id: string
  name: string
  startTime: string
  endTime: string
  color: string
  description?: string
}

export interface Employee {
  id: string
  name: string
  hoursPerWeek: number
  availableShifts: ShiftType[]
  unavailableDates: string[]
  notes?: string
  color: string
}

export interface Shift {
  id: string
  date: string
  shiftType: string
  employee?: string | null
  notes?: string
}

export interface Schedule {
  id: string
  name: string
  weekStart: string
  weekEnd: string
  employees: Employee[]
  shiftTypes: ShiftType[]
  shifts: Shift[]
  createdAt: string
  updatedAt: string
}

export interface ScheduleGeneratorOptions {
  preferEvenDistribution: boolean
  avoidWeekendClustering: boolean
  minRestDaysBetweenShifts: number
  maxConsecutiveShifts: number
}

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  action?: {
    type: string
    payload: any
  }
}
