import { create } from 'zustand'
import { Schedule, Employee, ShiftType, Shift } from '@/types'
import { v4 as uuidv4 } from 'uuid'

interface ScheduleStore {
  schedules: Schedule[]
  currentScheduleId: string | null

  createSchedule: (name: string, employees: Employee[], shiftTypes: ShiftType[]) => void
  updateSchedule: (id: string, schedule: Partial<Schedule>) => void
  deleteSchedule: (id: string) => void
  setCurrentSchedule: (id: string | null) => void

  addShift: (scheduleId: string, shift: Shift) => void
  updateShift: (scheduleId: string, shiftId: string, updates: Partial<Shift>) => void
  deleteShift: (scheduleId: string, shiftId: string) => void

  getCurrentSchedule: () => Schedule | null
  exportSchedule: (scheduleId: string) => string
  importSchedule: (data: string) => void
}

const generateId = () => uuidv4().slice(0, 8)

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  currentScheduleId: null,

  createSchedule: (name, employees, shiftTypes) => {
    const id = generateId()
    const newSchedule: Schedule = {
      id,
      name,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      shifts: [],
      employees,
      shiftTypes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    set((state) => ({
      schedules: [...state.schedules, newSchedule],
      currentScheduleId: id,
    }))

    // Save to localStorage
    get().saveToLocalStorage()
  },

  updateSchedule: (id, updates) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      ),
    }))
    get().saveToLocalStorage()
  },

  deleteSchedule: (id) => {
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== id),
      currentScheduleId: state.currentScheduleId === id ? null : state.currentScheduleId,
    }))
    get().saveToLocalStorage()
  },

  setCurrentSchedule: (id) => {
    set({ currentScheduleId: id })
  },

  addShift: (scheduleId, shift) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId ? { ...s, shifts: [...s.shifts, shift] } : s
      ),
    }))
    get().saveToLocalStorage()
  },

  updateShift: (scheduleId, shiftId, updates) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId
          ? {
              ...s,
              shifts: s.shifts.map((sh) =>
                sh.id === shiftId ? { ...sh, ...updates } : sh
              ),
            }
          : s
      ),
    }))
    get().saveToLocalStorage()
  },

  deleteShift: (scheduleId, shiftId) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId
          ? { ...s, shifts: s.shifts.filter((sh) => sh.id !== shiftId) }
          : s
      ),
    }))
    get().saveToLocalStorage()
  },

  getCurrentSchedule: () => {
    const { schedules, currentScheduleId } = get()
    return schedules.find((s) => s.id === currentScheduleId) || null
  },

  exportSchedule: (scheduleId: string) => {
    const schedule = get().schedules.find((s) => s.id === scheduleId)
    if (!schedule) throw new Error('Schedule not found')
    return JSON.stringify(schedule, null, 2)
  },

  importSchedule: (data: string) => {
    const schedule: Schedule = JSON.parse(data)
    schedule.id = generateId()
    set((state) => ({
      schedules: [...state.schedules, schedule],
      currentScheduleId: schedule.id,
    }))
    get().saveToLocalStorage()
  },

  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return
    const state = get()
    localStorage.setItem('dienstplan_schedules', JSON.stringify(state.schedules))
    localStorage.setItem('dienstplan_currentId', state.currentScheduleId || '')
  },

  loadFromLocalStorage: () => {
    if (typeof window === 'undefined') return
    const schedules = localStorage.getItem('dienstplan_schedules')
    const currentId = localStorage.getItem('dienstplan_currentId')
    if (schedules) {
      set({
        schedules: JSON.parse(schedules),
        currentScheduleId: currentId || null,
      })
    }
  },
}))
