import { Schedule, Shift, Employee, ScheduleGeneratorOptions } from '@/types'
import { eachDayOfInterval, parseISO, addDays, isSaturday, isSunday, differenceInDays } from 'date-fns'

export class ScheduleGenerator {
  private schedule: Schedule
  private options: ScheduleGeneratorOptions

  constructor(schedule: Schedule, options: Partial<ScheduleGeneratorOptions> = {}) {
    this.schedule = schedule
    this.options = {
      preferEvenDistribution: true,
      avoidWeekendClustering: false,
      minRestDaysBetweenShifts: 0,
      maxConsecutiveShifts: 6,
      ...options,
    }
  }

  generate(): Shift[] {
    const shifts: Shift[] = []
    const dates = this.getDateRange()
    const shiftIndex = new Map<string, number>()

    // Initialize shift index für jede Schicht
    this.schedule.shiftTypes.forEach((st) => {
      shiftIndex.set(st.id, 0)
    })

    // Für jeden Tag generieren wir Schichten
    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0]
      const isWeekend = isSaturday(date) || isSunday(date)

      // Definiere wie viele Schichten pro Tag nötig sind
      const shiftsPerDay = isWeekend ? 2 : 3

      for (let i = 0; i < shiftsPerDay; i++) {
        const shiftType = this.schedule.shiftTypes[i % this.schedule.shiftTypes.length]

        const employee = this.assignEmployeeToShift(dateStr, shiftType, shifts)
        if (employee) {
          shifts.push({
            id: `shift-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            date: dateStr,
            shiftType: shiftType.id,
            employee: employee.id,
          })
        }
      }
    }

    return shifts
  }

  private getDateRange(): Date[] {
    return eachDayOfInterval({
      start: parseISO(this.schedule.weekStart),
      end: parseISO(this.schedule.weekEnd),
    })
  }

  private assignEmployeeToShift(
    date: string,
    shiftType: any,
    existingShifts: Shift[]
  ): Employee | null {
    const availableEmployees = this.getAvailableEmployees(date, shiftType, existingShifts)

    if (availableEmployees.length === 0) return null

    if (this.options.preferEvenDistribution) {
      return this.selectByEvenDistribution(availableEmployees, date, existingShifts)
    }

    return availableEmployees[0]
  }

  private getAvailableEmployees(
    date: string,
    shiftType: any,
    existingShifts: Shift[]
  ): Employee[] {
    return this.schedule.employees.filter((employee) => {
      // 1. Kann dieser Mitarbeiter diese Schicht arbeiten?
      if (!employee.availableShifts.some((s) => s.id === shiftType.id)) {
        return false
      }

      // 2. Ist dieser Tag nicht verfügbar?
      if (employee.unavailableDates.includes(date)) {
        return false
      }

      // 3. Hat er noch Kapazität diese Woche?
      if (!this.hasCapacity(employee, existingShifts)) {
        return false
      }

      // 4. Genug Ruhetage?
      if (!this.hasEnoughRestDays(employee, date, existingShifts)) {
        return false
      }

      return true
    })
  }

  private hasCapacity(employee: Employee, existingShifts: Shift[]): boolean {
    const weekShifts = existingShifts.filter((s) => s.employee === employee.id)

    // Berechne Gesamtstunden dieser Woche
    let totalHours = 0
    weekShifts.forEach((shift) => {
      const shiftType = this.schedule.shiftTypes.find((st) => st.id === shift.shiftType)
      if (shiftType) {
        const [startHour, startMin] = shiftType.startTime.split(':').map(Number)
        const [endHour, endMin] = shiftType.endTime.split(':').map(Number)
        const duration = (endHour - startHour) + (endMin - startMin) / 60
        totalHours += duration
      }
    })

    return totalHours < employee.hoursPerWeek
  }

  private hasEnoughRestDays(
    employee: Employee,
    date: string,
    existingShifts: Shift[]
  ): boolean {
    const minRestDays = this.options.minRestDaysBetweenShifts
    if (minRestDays === 0) return true

    const lastShift = existingShifts
      .filter((s) => s.employee === employee.id)
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0]

    if (!lastShift) return true

    const daysBetween = differenceInDays(parseISO(date), parseISO(lastShift.date))
    return daysBetween >= minRestDays
  }

  private selectByEvenDistribution(
    employees: Employee[],
    date: string,
    existingShifts: Shift[]
  ): Employee {
    const shiftsPerEmployee = new Map<string, number>()

    employees.forEach((emp) => {
      const count = existingShifts.filter((s) => s.employee === emp.id).length
      shiftsPerEmployee.set(emp.id, count)
    })

    const minShifts = Math.min(...shiftsPerEmployee.values())
    return employees.find((emp) => shiftsPerEmployee.get(emp.id) === minShifts) || employees[0]
  }
}

export function generateSchedule(
  schedule: Schedule,
  options?: Partial<ScheduleGeneratorOptions>
): Shift[] {
  const generator = new ScheduleGenerator(schedule, options)
  return generator.generate()
}
