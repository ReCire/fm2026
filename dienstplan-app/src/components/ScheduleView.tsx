import { Schedule } from '@/types'
import { useScheduleStore } from '@/lib/store'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  parseISO,
  parseISO as parse,
} from 'date-fns'
import { de } from 'date-fns/locale'

interface Props {
  schedule: Schedule
}

export default function ScheduleView({ schedule }: Props) {
  const { updateShift, deleteShift } = useScheduleStore()

  const startDate = parseISO(schedule.startDate)
  const endDate = parseISO(schedule.endDate)
  const month = startDate

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  })

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  const getShiftsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return schedule.shifts.filter((s) => s.date === dateStr)
  }

  const getEmployeeName = (empId: string | null) => {
    if (!empId) return 'Unbesetzt'
    return schedule.employees.find((e) => e.id === empId)?.name || 'Unbekannt'
  }

  const getShiftTypeName = (shiftId: string) => {
    return schedule.shiftTypes.find((st) => st.id === shiftId)?.name || '?'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">
          {format(month, 'MMMM yyyy', { locale: de })}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {weekDays.map((day) => (
            <div
              key={day}
              className="font-bold text-center py-2 text-gray-700 bg-gray-100"
            >
              {day}
            </div>
          ))}

          {daysInMonth.map((date) => {
            const dayShifts = getShiftsForDay(date)
            const isOutOfRange =
              date < startDate || date > endDate

            return (
              <div
                key={date.toISOString()}
                className={`min-h-24 p-2 border rounded ${
                  isOutOfRange
                    ? 'bg-gray-50 text-gray-400'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="font-bold text-sm mb-1">
                  {format(date, 'd')}
                </div>
                <div className="space-y-1">
                  {dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="text-xs bg-indigo-100 text-indigo-900 p-1 rounded cursor-pointer hover:bg-indigo-200 transition"
                      onClick={() => {
                        const newEmp = prompt(
                          `${getShiftTypeName(shift.shiftType)} - Mitarbeiter-ID:`,
                          shift.employee || ''
                        )
                        if (newEmp !== null) {
                          updateShift(schedule.id, shift.id, {
                            employee: newEmp || null,
                          })
                        }
                      }}
                    >
                      <div className="font-medium">
                        {getShiftTypeName(shift.shiftType)}
                      </div>
                      <div className="text-xs opacity-80">
                        {getEmployeeName(shift.employee)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-bold text-blue-900 mb-2">Statistiken</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>Insgesamt geplante Schichten: {schedule.shifts.length}</p>
            <p>Mitarbeiter: {schedule.employees.length}</p>
            <p>Schichttypen: {schedule.shiftTypes.length}</p>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-bold text-purple-900 mb-2">
            Mitarbeiter-Auslastung
          </h4>
          <div className="text-sm text-purple-800 space-y-1">
            {schedule.employees.map((emp) => {
              const empShifts = schedule.shifts.filter(
                (s) => s.employee === emp.id
              ).length
              return (
                <p key={emp.id}>
                  {emp.name}: {empShifts} Schichten
                </p>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
