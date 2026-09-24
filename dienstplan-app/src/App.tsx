import { useEffect, useState } from 'react'
import { useScheduleStore } from '@/lib/store'
import ScheduleList from '@/components/ScheduleList'
import ScheduleEditor from '@/components/ScheduleEditor'

export default function App() {
  const { schedules, currentScheduleId, setCurrentSchedule } = useScheduleStore()
  const [showEditor, setShowEditor] = useState(false)

  useEffect(() => {
    useScheduleStore.getState().loadFromLocalStorage?.()
  }, [])

  const currentSchedule = schedules.find((s) => s.id === currentScheduleId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-indigo-600">
            📅 Dienstplan Generator
          </h1>
          <p className="text-gray-600 text-sm">
            Automatische Schichtplanung für den Einzelhandel
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!currentSchedule ? (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={() => setShowEditor(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                + Neuer Dienstplan
              </button>
            </div>

            {schedules.length > 0 ? (
              <ScheduleList
                schedules={schedules}
                onSelect={(id) => setCurrentSchedule(id)}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500 mb-4">
                  Noch keine Dienstpläne vorhanden
                </p>
                <button
                  onClick={() => setShowEditor(true)}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Ersten Dienstplan erstellen
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                {currentSchedule.name}
              </h2>
              <button
                onClick={() => setCurrentSchedule(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                ← Zurück
              </button>
            </div>

            <ScheduleEditor schedule={currentSchedule} />
          </div>
        )}
      </main>

      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Neuer Dienstplan</h2>
              <button
                onClick={() => setShowEditor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <ScheduleCreator onClose={() => setShowEditor(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ScheduleCreator({ onClose }: { onClose: () => void }) {
  const { createSchedule } = useScheduleStore()
  const [formData, setFormData] = useState({
    name: '',
    employees: [{ name: 'Mitarbeiter 1', maxHours: 40, color: '#3b82f6' }],
    shiftTypes: [{ name: 'Schicht A', start: '09:00', end: '17:00', hours: 8 }],
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()

    const employees = formData.employees.map((emp, i) => ({
      id: `emp-${i}`,
      name: emp.name,
      maxHoursPerWeek: emp.maxHours,
      availableShifts: [],
      unavailableDates: [],
      color: emp.color,
    }))

    const shiftTypes = formData.shiftTypes.map((shift, i) => ({
      id: `shift-${i}`,
      name: shift.name,
      startTime: shift.start,
      endTime: shift.end,
      hoursPerShift: shift.hours,
      color: '#6366f1',
    }))

    employees.forEach((emp) => {
      emp.availableShifts = shiftTypes
    })

    createSchedule(formData.name, employees, shiftTypes)
    onClose()
  }

  return (
    <form onSubmit={handleCreate} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dienstplan Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          placeholder="z.B. Dezember 2024"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
      >
        Dienstplan erstellen
      </button>
    </form>
  )
}
