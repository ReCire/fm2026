import { Schedule } from '@/types'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

interface Props {
  schedules: Schedule[]
  onSelect: (id: string) => void
}

export default function ScheduleList({ schedules, onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {schedules.map((schedule) => (
        <div
          key={schedule.id}
          onClick={() => onSelect(schedule.id)}
          className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer p-4"
        >
          <h3 className="font-bold text-lg text-gray-900">{schedule.name}</h3>
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>
              📅{' '}
              {format(parseISO(schedule.startDate), 'dd.MM.yyyy', {
                locale: de,
              })}{' '}
              -{' '}
              {format(parseISO(schedule.endDate), 'dd.MM.yyyy', {
                locale: de,
              })}
            </p>
            <p>👥 {schedule.employees.length} Mitarbeiter</p>
            <p>🔄 {schedule.shiftTypes.length} Schichttypen</p>
            <p>📊 {schedule.shifts.length} Schichten geplant</p>
          </div>
          <div className="text-xs text-gray-500 mt-3 pt-3 border-t">
            Erstellt:{' '}
            {format(parseISO(schedule.createdAt), 'dd.MM.yyyy HH:mm', {
              locale: de,
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
