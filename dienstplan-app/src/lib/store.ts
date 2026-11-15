import { create } from 'zustand'
import { Schedule, Employee, ShiftType, Shift } from '@/types'
import { v4 as uuidv4 } from 'uuid'

interface ScheduleStore {
  schedules: Schedule[]
  currentScheduleId: string | null

  // Schedule Management
  createSchedule: (name: string, weekStart: string, weekEnd: string) => void
  updateSchedule: (id: string, updates: Partial<Schedule>) => void
  deleteSchedule: (id: string) => void
  setCurrentSchedule: (id: string | null) => void

  // Employee Management
  addEmployee: (scheduleId: string, employee: Employee) => void
  updateEmployee: (scheduleId: string, employeeId: string, updates: Partial<Employee>) => void
  deleteEmployee: (scheduleId: string, employeeId: string) => void

  // Shift Management
  addShift: (scheduleId: string, shift: Shift) => void
  updateShift: (scheduleId: string, shiftId: string, updates: Partial<Shift>) => void
  deleteShift: (scheduleId: string, shiftId: string) => void

  // Queries
  getCurrentSchedule: () => Schedule | null
  getSchedule: (id: string) => Schedule | null

  // Persistence
  saveToLocalStorage: () => void
  loadFromLocalStorage: () => void
  exportSchedule: (scheduleId: string) => string
  importSchedule: (data: string) => Schedule
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  currentScheduleId: null,

  createSchedule: (name, weekStart, weekEnd) => {
    const id = uuidv4().slice(0, 8)
    const newSchedule: Schedule = {
      id,
      name,
      weekStart,
      weekEnd,
      employees: [],
      shiftTypes: [
        {
          id: 'früh',
          name: '🌅 Frühschicht',
          startTime: '06:00',
          endTime: '14:00',
          color: '#f59e0b'
        },
        {
          id: 'mittel',
          name: '☀️ Mittelschicht',
          startTime: '11:00',
          endTime: '19:00',
          color: '#3b82f6'
        },
        {
          id: 'spät',
          name: '🌙 Spätschicht',
          startTime: '18:00',
          endTime: '22:00',
          color: '#8b5cf6'
        }
      ],
      shifts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    set((state) => ({
      schedules: [...state.schedules, newSchedule],
      currentScheduleId: id,
    }))

    get().saveToLocalStorage()
  },

  updateSchedule: (id, updates) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id
          ? { ...s, ...updates, updatedAt: new Date().toISOString() }
          : s
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

  addEmployee: (scheduleId, employee) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId
          ? { ...s, employees: [...s.employees, employee] }
          : s
      ),
    }))
    get().saveToLocalStorage()
  },

  updateEmployee: (scheduleId, employeeId, updates) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId
          ? {
              ...s,
              employees: s.employees.map((e) =>
                e.id === employeeId ? { ...e, ...updates } : e
              ),
            }
          : s
      ),
    }))
    get().saveToLocalStorage()
  },

  deleteEmployee: (scheduleId, employeeId) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId
          ? { ...s, employees: s.employees.filter((e) => e.id !== employeeId) }
          : s
      ),
    }))
    get().saveToLocalStorage()
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

  getSchedule: (id) => {
    const { schedules } = get()
    return schedules.find((s) => s.id === id) || null
  },

  exportSchedule: (scheduleId) => {
    const schedule = get().getSchedule(scheduleId)
    if (!schedule) throw new Error('Schedule not found')
    return JSON.stringify(schedule, null, 2)
  },

  importSchedule: (data) => {
    const schedule: Schedule = JSON.parse(data)
    schedule.id = uuidv4().slice(0, 8)
    set((state) => ({
      schedules: [...state.schedules, schedule],
      currentScheduleId: schedule.id,
    }))
    get().saveToLocalStorage()
    return schedule
  },

  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return
    const state = get()
    localStorage.setItem('dienstplan_v2_schedules', JSON.stringify(state.schedules))
    localStorage.setItem('dienstplan_v2_currentId', state.currentScheduleId || '')
  },

  loadFromLocalStorage: () => {
    if (typeof window === 'undefined') return
    const schedules = localStorage.getItem('dienstplan_v2_schedules')
    const currentId = localStorage.getItem('dienstplan_v2_currentId')
    if (schedules) {
      set({
        schedules: JSON.parse(schedules),
        currentScheduleId: currentId || null,
      })
    }
  },
}))
