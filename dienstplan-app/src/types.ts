export interface DayAvailability {
  dayOfWeek: number // 0 = Montag, 6 = Sonntag
  availableShifts: string[] // ShiftType IDs
  timeRangeStart?: string // z.B. "18:00" für ab 18 Uhr
  timeRangeEnd?: string
}

export interface Employee {
  id: string
  name: string
  maxHoursPerWeek: number
  availableShifts: ShiftType[] // Default, kann per Tag überschrieben werden
  dayAvailability?: DayAvailability[] // Spezifische Verfügbarkeiten pro Tag
  unavailableDates: string[]
  color: string
  notes?: string
}

export interface ShiftType {
  id: string
  name: string
  startTime: string
  endTime: string
  hoursPerShift: number
  color: string
}

export interface Shift {
  id: string
  date: string
  shiftType: string
  employee: string | null
}

export interface Schedule {
  id: string
  name: string
  startDate: string
  endDate: string
  shifts: Shift[]
  employees: Employee[]
  shiftTypes: ShiftType[]
  createdAt: string
  updatedAt: string
}

export interface GeneratorSettings {
  startDate: string
  endDate: string
  shiftsPerDay: number
  minRestDaysBetweenShifts: number
  preferEvenDistribution: boolean
  avoidWeekendClustering: boolean
}
