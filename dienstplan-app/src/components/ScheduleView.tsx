import { Schedule } from '@/types'
import { eachDayOfInterval, parseISO, format, isSaturday, isSunday } from 'date-fns'
import { de } from 'date-fns/locale'

interface Props {
  schedule: Schedule
}

export default function ScheduleView({ schedule }: Props) {
  const dates = eachDayOfInterval({
    start: parseISO(schedule.weekStart),
    end: parseISO(schedule.weekEnd),
  })

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  const getShiftsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return schedule.shifts.filter((s) => s.date === dateStr)
  }

  const getEmployeeName = (empId?: string | null) => {
    if (!empId) return 'Unbesetzt'
    return schedule.employees.find((e) => e.id === empId)?.name || 'Unbekannt'
  }

  const getShiftInfo = (shiftId: string) => {
    return schedule.shiftTypes.find((st) => st.id === shiftId)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">
          Schichtplan: {schedule.name}
        </h2>
        <p className="text-slate-400">
          {schedule.weekStart} - {schedule.weekEnd}
        </p>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto bg-slate-800/50 rounded-lg border border-slate-700 p-4">
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))' }}>
          {/* Header */}
          {weekDays.map((day, idx) => {
            const date = dates[idx]
            return (
              <div key={day} className="text-center">
                <p className="font-bold text-white">{day}</p>
                <p className="text-sm text-slate-400">
                  {date ? format(date, 'd.M.', { locale: de }) : ''}
                </p>
              </div>
            )
          })}

          {/* Days */}
          {dates.map((date) => {
            const dayShifts = getShiftsForDay(date)
            const isWeekend = isSaturday(date) || isSunday(date)

            return (
              <div
                key={date.toISOString()}
                className={`min-h-32 p-2 rounded border ${
                  isWeekend
                    ? 'bg-slate-900/50 border-slate-600'
                    : 'bg-slate-700/30 border-slate-600'
                }`}
              >
                <div className="space-y-1">
                  {dayShifts.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Keine Schichten</p>
                  ) : (
                    dayShifts.map((shift) => {
                      const shiftInfo = getShiftInfo(shift.shiftType)
                      return (
                        <div
                          key={shift.id}
                          className="text-xs p-1 rounded"
                          style={{
                            backgroundColor: shiftInfo?.color + '20',
                            borderLeft: `3px solid ${shiftInfo?.color}`,
                          }}
                        >
                          <p className="font-semibold text-white">
                            {shiftInfo?.name}
                          </p>
                          <p className="text-slate-300">
                            {getEmployeeName(shift.employee)}
                          </p>
                          <p className="text-slate-400 text-xs">
                            {shiftInfo?.startTime} - {shiftInfo?.endTime}
                          </p>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h3 className="font-bold text-white mb-3">📊 Übersicht</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <p>Mitarbeiter: {schedule.employees.length}</p>
            <p>Schichten insgesamt: {schedule.shifts.length}</p>
            <p>Schichttypen: {schedule.shiftTypes.length}</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h3 className="font-bold text-white mb-3">👥 Mitarbeiter</h3>
          <div className="space-y-2 text-sm text-slate-300">
            {schedule.employees.map((emp) => {
              const shiftsCount = schedule.shifts.filter((s) => s.employee === emp.id).length
              return (
                <p key={emp.id}>
                  {emp.name}: {shiftsCount} Schichten ({emp.hoursPerWeek}h)
                </p>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
