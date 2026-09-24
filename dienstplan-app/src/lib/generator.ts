import { Schedule, Shift, Employee, ShiftType } from '@/types'
import { eachDayOfInterval, parseISO, addDays, isSunday, isSaturday } from 'date-fns'

interface GeneratorOptions {
  preferEvenDistribution?: boolean
  avoidWeekendClustering?: boolean
  minRestDaysBetweenShifts?: number
}

export class ScheduleGenerator {
  private schedule: Schedule
  private options: GeneratorOptions

  constructor(schedule: Schedule, options: GeneratorOptions = {}) {
    this.schedule = schedule
    this.options = {
      preferEvenDistribution: true,
      avoidWeekendClustering: false,
      minRestDaysBetweenShifts: 0,
      ...options,
    }
  }

  generate(): Shift[] {
    const dates = this.getDateRange()
    const shifts: Shift[] = []

    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0]

      for (const shiftType of this.schedule.shiftTypes) {
        const assignedEmployee = this.assignEmployeeToShift(
          dateStr,
          shiftType,
          shifts
        )

        if (assignedEmployee) {
          shifts.push({
            id: this.generateId(),
            date: dateStr,
            shiftType: shiftType.id,
            employee: assignedEmployee.id,
          })
        }
      }
    }

    return shifts
  }

  private getDateRange(): Date[] {
    return eachDayOfInterval({
      start: parseISO(this.schedule.startDate),
      end: parseISO(this.schedule.endDate),
    })
  }

  private assignEmployeeToShift(
    date: string,
    shiftType: ShiftType,
    existingShifts: Shift[]
  ): Employee | null {
    const availableEmployees = this.getAvailableEmployees(
      date,
      shiftType,
      existingShifts
    )

    if (availableEmployees.length === 0) return null

    if (this.options.preferEvenDistribution) {
      return this.selectByEvenDistribution(
        availableEmployees,
        date,
        existingShifts
      )
    }

    return availableEmployees[0]
  }

  private getAvailableEmployees(
    date: string,
    shiftType: ShiftType,
    existingShifts: Shift[]
  ): Employee[] {
    return this.schedule.employees.filter((employee) => {
      if (!employee.availableShifts.some((s) => s.id === shiftType.id)) {
        return false
      }

      if (employee.unavailableDates.includes(date)) {
        return false
      }

      if (!this.hasCapacityForShift(employee, shiftType, existingShifts)) {
        return false
      }

      if (!this.hasEnoughRestDays(employee, date, existingShifts)) {
        return false
      }

      return true
    })
  }

  private hasCapacityForShift(
    employee: Employee,
    shiftType: ShiftType,
    existingShifts: Shift[]
  ): boolean {
    const weekShifts = existingShifts.filter((shift) => {
      const shiftDate = parseISO(shift.date)
      const shiftEndDate = addDays(shiftDate, 7)
      const today = parseISO(new Date().toISOString().split('T')[0])

      return (
        shift.employee === employee.id &&
        shiftDate >= today &&
        shiftDate <= shiftEndDate
      )
    })

    const totalHours = weekShifts.reduce((sum, shift) => {
      const type = this.schedule.shiftTypes.find((st) => st.id === shift.shiftType)
      return sum + (type?.hoursPerShift || 0)
    }, 0)

    return totalHours + shiftType.hoursPerShift <= employee.maxHoursPerWeek
  }

  private hasEnoughRestDays(
    employee: Employee,
    date: string,
    existingShifts: Shift[]
  ): boolean {
    const minRestDays = this.options.minRestDaysBetweenShifts || 0
    if (minRestDays === 0) return true

    const currentDate = parseISO(date)
    const lastShift = existingShifts
      .filter((s) => s.employee === employee.id)
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0]

    if (!lastShift) return true

    const lastShiftDate = parseISO(lastShift.date)
    const daysBetween = Math.floor(
      (currentDate.getTime() - lastShiftDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    return daysBetween >= minRestDays
  }

  private selectByEvenDistribution(
    employees: Employee[],
    date: string,
    existingShifts: Shift[]
  ): Employee {
    const shiftsPerEmployee = new Map<string, number>()

    employees.forEach((emp) => {
      const shifts = existingShifts.filter((s) => s.employee === emp.id).length
      shiftsPerEmployee.set(emp.id, shifts)
    })

    const minShifts = Math.min(...shiftsPerEmployee.values())
    const candidatesWithMinShifts = employees.filter(
      (emp) => shiftsPerEmployee.get(emp.id) === minShifts
    )

    if (this.options.avoidWeekendClustering) {
      const dateObj = parseISO(date)
      const isWeekend = isSaturday(dateObj) || isSunday(dateObj)

      if (isWeekend) {
        const weekdayCandidate = candidatesWithMinShifts.find((emp) => {
          const weekendShifts = existingShifts.filter(
            (s) => {
              const d = parseISO(s.date)
              return (isSaturday(d) || isSunday(d)) && s.employee === emp.id
            }
          ).length
          return weekendShifts === 0
        })

        if (weekdayCandidate) return weekdayCandidate
      }
    }

    return candidatesWithMinShifts[0]
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9)
  }
}

export function generateSchedule(
  schedule: Schedule,
  options?: GeneratorOptions
): Shift[] {
  const generator = new ScheduleGenerator(schedule, options)
  return generator.generate()
}
