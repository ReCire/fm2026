import { useState } from 'react'
import { Schedule } from '@/types'
import { useScheduleStore } from '@/lib/store'
import { generateSchedule } from '@/lib/generator'
import ScheduleView from './ScheduleView'
import EmployeeManager from './EmployeeManager'

interface Props {
  schedule: Schedule
}

export default function ScheduleEditor({ schedule }: Props) {
  const { updateSchedule, deleteSchedule, setCurrentSchedule } =
    useScheduleStore()
  const [activeTab, setActiveTab] = useState<
    'schedule' | 'employees' | 'settings'
  >('schedule')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    await new Promise((resolve) => setTimeout(resolve, 100))

    const newShifts = generateSchedule(schedule, {
      preferEvenDistribution: true,
      avoidWeekendClustering: true,
      minRestDaysBetweenShifts: 0,
    })

    updateSchedule(schedule.id, {
      shifts: newShifts,
    })

    setIsGenerating(false)
  }

  const handleExport = () => {
    const { exportSchedule } = useScheduleStore.getState()
    const data = exportSchedule(schedule.id)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${schedule.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDelete = () => {
    if (confirm(`Dienstplan "${schedule.name}" wirklich löschen?`)) {
      deleteSchedule(schedule.id)
      setCurrentSchedule(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b">
        {(['schedule', 'employees', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 transition ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'schedule' && '📋 Schichtplan'}
            {tab === 'employees' && '👥 Mitarbeiter'}
            {tab === 'settings' && '⚙️ Einstellungen'}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {activeTab === 'schedule' && (
          <>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
            >
              {isGenerating ? '⏳ Generiere...' : '🔄 Neu generieren'}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              💾 Exportieren
            </button>
          </>
        )}
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium ml-auto"
        >
          🗑️ Löschen
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'schedule' && <ScheduleView schedule={schedule} />}
        {activeTab === 'employees' && <EmployeeManager schedule={schedule} />}
        {activeTab === 'settings' && <ScheduleSettings schedule={schedule} />}
      </div>
    </div>
  )
}

function ScheduleSettings({ schedule }: Props) {
  const { updateSchedule } = useScheduleStore()

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dienstplan Name
        </label>
        <input
          type="text"
          value={schedule.name}
          onChange={(e) =>
            updateSchedule(schedule.id, { name: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Startdatum
          </label>
          <input
            type="date"
            value={schedule.startDate}
            onChange={(e) =>
              updateSchedule(schedule.id, { startDate: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enddatum
          </label>
          <input
            type="date"
            value={schedule.endDate}
            onChange={(e) =>
              updateSchedule(schedule.id, { endDate: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-900 mb-2">Schichttypen</h3>
        <div className="space-y-2">
          {schedule.shiftTypes.map((shift) => (
            <div key={shift.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: shift.color }}
              />
              <span className="flex-1">{shift.name}</span>
              <span className="text-sm text-gray-500">
                {shift.startTime} - {shift.endTime}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
