import { useState } from 'react'
import { Schedule, Employee } from '@/types'
import { useScheduleStore } from '@/lib/store'

interface Props {
  schedule: Schedule
}

export default function EmployeeManager({ schedule }: Props) {
  const { updateSchedule } = useScheduleStore()
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleUpdateEmployee = (employee: Employee) => {
    const updated = schedule.employees.map((emp) =>
      emp.id === employee.id ? employee : emp
    )
    updateSchedule(schedule.id, { employees: updated })
    setEditingId(null)
  }

  const handleDeleteEmployee = (id: string) => {
    const updated = schedule.employees.filter((emp) => emp.id !== id)
    updateSchedule(schedule.id, { employees: updated })
  }

  const handleAddEmployee = () => {
    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      name: 'Neuer Mitarbeiter',
      maxHoursPerWeek: 40,
      availableShifts: schedule.shiftTypes,
      unavailableDates: [],
      color: '#' + Math.floor(Math.random() * 16777215).toString(16),
    }
    updateSchedule(schedule.id, {
      employees: [...schedule.employees, newEmployee],
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleAddEmployee}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          + Mitarbeiter hinzufügen
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedule.employees.map((emp) => (
          <div key={emp.id} className="border rounded-lg p-4">
            {editingId === emp.id ? (
              <EmployeeForm
                employee={emp}
                onSave={handleUpdateEmployee}
                onCancel={() => setEditingId(null)}
                shiftTypes={schedule.shiftTypes}
              />
            ) : (
              <>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-lg">{emp.name}</h3>
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: emp.color }}
                  />
                </div>
                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <p>Max. Stunden/Woche: {emp.maxHoursPerWeek}</p>
                  <p>Verfügbare Schichten: {emp.availableShifts.length}</p>
                  <p>Nicht verfügbare Tage: {emp.unavailableDates.length}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(emp.id)}
                    className="flex-1 px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDeleteEmployee(emp.id)}
                    className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EmployeeForm({
  employee,
  onSave,
  onCancel,
  shiftTypes,
}: {
  employee: Employee
  onSave: (emp: Employee) => void
  onCancel: () => void
  shiftTypes: typeof employee.availableShifts
}) {
  const [form, setForm] = useState(employee)
  const [showDetails, setShowDetails] = useState(false)

  const weekDays = [
    'Montag',
    'Dienstag',
    'Mittwoch',
    'Donnerstag',
    'Freitag',
    'Samstag',
    'Sonntag',
  ]

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(form)
      }}
      className="space-y-3"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max. Stunden/Woche
        </label>
        <input
          type="number"
          value={form.maxHoursPerWeek}
          onChange={(e) =>
            setForm({ ...form, maxHoursPerWeek: parseInt(e.target.value) })
          }
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notizen (z.B. "nur Frühschicht")
        </label>
        <input
          type="text"
          value={form.notes || ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="z.B. nur Spätschicht, nur Mittwoch/Donnerstag ab 18:00"
          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-2 py-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
      >
        {showDetails ? '▼ Tägliche Verfügbarkeiten' : '▶ Tägliche Verfügbarkeiten'}
      </button>

      {showDetails && (
        <div className="border-t pt-3 space-y-2 bg-gray-50 p-2 rounded">
          {weekDays.map((day, idx) => {
            const dayAvail = form.dayAvailability?.find(
              (d) => d.dayOfWeek === idx
            )
            return (
              <div key={idx} className="text-xs">
                <label className="font-medium text-gray-700">{day}</label>
                <div className="flex gap-1 mt-1">
                  <select
                    multiple
                    size={2}
                    className="flex-1 border rounded"
                    value={
                      dayAvail?.availableShifts || [
                        ...form.availableShifts.map((s) => s.id),
                      ]
                    }
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map(
                        (opt) => opt.value
                      )
                      const updated = form.dayAvailability?.filter(
                        (d) => d.dayOfWeek !== idx
                      ) || []
                      if (selected.length > 0) {
                        updated.push({
                          dayOfWeek: idx,
                          availableShifts: selected,
                        })
                      }
                      setForm({ ...form, dayAvailability: updated })
                    }}
                  >
                    {shiftTypes.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-2 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
