import { useState, useRef, useEffect } from 'react'
import { Schedule, Employee } from '@/types'
import { useScheduleStore } from '@/lib/store'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  schedule: Schedule
}

export default function Chat({ schedule }: Props) {
  const { updateSchedule, addEmployee, updateEmployee, deleteEmployee } = useScheduleStore()
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([
    {
      id: uuidv4(),
      role: 'assistant',
      content: `Hallo! 👋 Ich bin dein Dienstplan-Assistant für "${schedule.name}".

Ich kann dir bei folgenden Aufgaben helfen:
• 👤 Mitarbeiter hinzufügen/bearbeiten
• ⏰ Verfügbarkeiten setzen
• 🔄 Schichtplan generieren
• 📊 Statistiken anzeigen

Du kannst mir einfach Dinge sagen wie:
"Füge Frau Krötzsch hinzu mit 25 Stunden Früh"
"Frau Jansen 35 Stunden Spätschicht"
"Generiere einen Plan"

Was möchtest du tun?`,
    },
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAddEmployee = (name: string, hoursStr: string, shiftsStr: string) => {
    const hours = parseInt(hoursStr) || 40
    const shifts = shiftsStr.toLowerCase()

    const availableShifts = schedule.shiftTypes.filter((st) => {
      const shiftName = st.name.toLowerCase()
      return (
        (shifts.includes('früh') && shiftName.includes('früh')) ||
        (shifts.includes('mittel') && shiftName.includes('mittel')) ||
        (shifts.includes('spät') && shiftName.includes('spät')) ||
        shifts === 'all'
      )
    })

    if (availableShifts.length === 0) {
      return {
        success: false,
        message: `Keine passenden Schichten für "${shiftsStr}" gefunden.`,
      }
    }

    const newEmployee: Employee = {
      id: `emp-${Date.now()}`,
      name,
      hoursPerWeek: hours,
      availableShifts,
      unavailableDates: [],
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    }

    addEmployee(schedule.id, newEmployee)

    return {
      success: true,
      message: `✅ ${name} hinzugefügt: ${hours}h/Woche, Schichten: ${availableShifts.map((s) => s.name).join(', ')}`,
    }
  }

  const processMessage = async (text: string) => {
    setIsProcessing(true)

    let response = ''

    // Pattern: "Mitarbeiter Name Stunden Schichten"
    const addPattern = /(?:füge|add)\s+(.+?)\s+(\d+)\s+(?:stunden?|h)\s+(.+)/i
    const addMatch = text.match(addPattern)

    if (addMatch) {
      const [, name, hours, shifts] = addMatch
      const result = handleAddEmployee(name.trim(), hours, shifts.trim())
      response = result.message
    } else if (text.toLowerCase().includes('liste') || text.toLowerCase().includes('mitarbeiter')) {
      if (schedule.employees.length === 0) {
        response = 'Noch keine Mitarbeiter hinzugefügt. Sag mir einfach: "Füge Max 40 Stunden Früh hinzu"'
      } else {
        response = '📋 Mitarbeiter im Plan:\n\n'
        schedule.employees.forEach((emp) => {
          response += `• ${emp.name}: ${emp.hoursPerWeek}h - ${emp.availableShifts.map((s) => s.name).join(', ')}\n`
        })
      }
    } else if (text.toLowerCase().includes('generiere')) {
      response = '🔄 Schichtplan wird generiert...\n(Diese Funktion wird in der nächsten Version implementiert)'
    } else if (text.toLowerCase().includes('hilf') || text.toLowerCase().includes('help')) {
      response = `📖 Hier sind einige Beispiele:

"Füge Frau Krötzsch hinzu mit 25 Stunden Früh"
"Frau Jansen 35 Stunden Spät und Mittel"
"Zeige mir alle Mitarbeiter"
"Generiere einen Plan für nächste Woche"`
    } else {
      response = `Ich habe das nicht ganz verstanden. Versuch es so:
"Füge [Name] [Stunden] [Schichten] hinzu"

Beispiel: "Füge Max 40 Früh hinzu"`
    }

    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
        role: 'assistant',
        content: response,
      },
    ])

    setIsProcessing(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setMessages((prev) => [
      ...prev,
      { id: uuidv4(), role: 'user', content: input },
    ])

    await processMessage(input)
    setInput('')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chat Area */}
      <div className="lg:col-span-2 flex flex-col h-[600px] bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-slate-700 text-slate-100 px-4 py-2 rounded-lg">
                <p>⏳ Verarbeite...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="border-t border-slate-700 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Füge Max 40 Früh hinzu..."
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
            >
              📤
            </button>
          </div>
        </form>
      </div>

      {/* Sidebar */}
      <div className="lg:col-span-1 bg-slate-800/50 rounded-lg border border-slate-700 p-4">
        <h3 className="font-bold text-white mb-4">📊 Plan-Info</h3>

        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <p className="text-slate-400">Woche:</p>
            <p className="font-mono">{schedule.weekStart} - {schedule.weekEnd}</p>
          </div>

          <div>
            <p className="text-slate-400">Mitarbeiter: {schedule.employees.length}</p>
          </div>

          <div>
            <p className="text-slate-400">Verfügbare Schichten:</p>
            <div className="space-y-1 mt-1">
              {schedule.shiftTypes.map((st) => (
                <div key={st.id} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: st.color }}
                  />
                  <span>{st.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <p className="text-slate-400 text-xs">💡 Tipps:</p>
            <ul className="text-xs text-slate-400 mt-2 space-y-1">
              <li>• Nutze volle Namen</li>
              <li>• Gib Stunden an</li>
              <li>• Schichten mit Komma trennen</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
