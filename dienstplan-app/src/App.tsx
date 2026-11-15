import { useEffect, useState } from 'react'
import { useScheduleStore } from '@/lib/store'
import Chat from '@/components/Chat'
import ScheduleView from '@/components/ScheduleView'
import ScheduleList from '@/components/ScheduleList'

export default function App() {
  const { schedules, currentScheduleId, setCurrentSchedule, loadFromLocalStorage } =
    useScheduleStore()
  const [view, setView] = useState<'home' | 'chat' | 'schedule'>('home')

  useEffect(() => {
    loadFromLocalStorage?.()
  }, [loadFromLocalStorage])

  const currentSchedule = schedules.find((s) => s.id === currentScheduleId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-purple-400 bg-clip-text text-transparent">
              📅 Dienstplan Generator
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Intelligente Schichtplanung für Einzelhandel
            </p>
          </div>

          <div className="flex gap-2">
            {currentSchedule && (
              <>
                <button
                  onClick={() => setView('schedule')}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                  📋 Plan anzeigen
                </button>
                <button
                  onClick={() => setView('chat')}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition"
                >
                  💬 Chat
                </button>
                <button
                  onClick={() => setView('home')}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
                >
                  🏠 Home
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {view === 'home' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Willkommen! 👋
              </h2>
              <p className="text-slate-300 mb-6">
                Erstelle einen neuen Dienstplan oder öffne einen bestehenden
              </p>
            </div>

            {schedules.length > 0 ? (
              <ScheduleList
                schedules={schedules}
                onSelect={(id) => {
                  setCurrentSchedule(id)
                  setView('chat')
                }}
              />
            ) : (
              <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
                <p className="text-slate-400 mb-4">
                  Noch keine Dienstpläne vorhanden
                </p>
                <button
                  onClick={() => {
                    // Trigger schedule creation in Chat
                    setView('chat')
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition font-medium"
                >
                  Neuen Plan erstellen
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'chat' && currentSchedule && <Chat schedule={currentSchedule} />}

        {view === 'schedule' && currentSchedule && <ScheduleView schedule={currentSchedule} />}
      </main>
    </div>
  )
}
