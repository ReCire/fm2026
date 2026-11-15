import { Schedule } from '@/types'
import { useScheduleStore } from '@/lib/store'

interface Props {
  schedules: Schedule[]
  onSelect: (id: string) => void
}

export default function ScheduleList({ schedules, onSelect }: Props) {
  const { deleteSchedule, createSchedule } = useScheduleStore()

  const handleNewSchedule = () => {
    const weekStart = new Date().toISOString().split('T')[0]
    const weekEnd = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    createSchedule('Neue Woche', weekStart, weekEnd)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Meine Dienstpläne</h2>
        <button
          onClick={handleNewSchedule}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition"
        >
          + Neuer Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedules.map((schedule) => (
          <div
            key={schedule.id}
            onClick={() => onSelect(schedule.id)}
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-blue-500 transition cursor-pointer group"
          >
            <h3 className="font-bold text-white group-hover:text-blue-400 transition">
              {schedule.name}
            </h3>
            <div className="text-sm text-slate-300 mt-2 space-y-1">
              <p>📅 {schedule.weekStart} - {schedule.weekEnd}</p>
              <p>👥 {schedule.employees.length} Mitarbeiter</p>
              <p>📋 {schedule.shifts.length} Schichten</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect(schedule.id)
                }}
                className="flex-1 px-2 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition"
              >
                Öffnen
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Wirklich löschen?')) {
                    deleteSchedule(schedule.id)
                  }
                }}
                className="px-2 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
