import { describe, expect, it } from 'vitest'
import { countUnread, groupNotificationsByDay } from '../../src/utils/groupNotifications.js'

const NOW = new Date('2026-10-20T15:00:00').getTime()
const at = (iso) => ({ id: iso, createdAt: new Date(iso) })

describe('groupNotificationsByDay', () => {
  it('separa Hoy, Ayer, Esta semana y Anteriores', () => {
    const groups = groupNotificationsByDay([
      at('2026-10-20T14:00:00'),
      at('2026-10-20T01:00:00'),
      at('2026-10-19T23:30:00'),
      at('2026-10-16T10:00:00'),
      at('2026-10-01T10:00:00'),
    ], NOW)

    expect(groups.map((group) => [group.label, group.items.length])).toEqual([
      ['Hoy', 2], ['Ayer', 1], ['Esta semana', 1], ['Anteriores', 1],
    ])
  })

  it('omite los grupos vacíos y conserva el orden recibido', () => {
    const groups = groupNotificationsByDay([at('2026-10-20T14:00:00'), at('2026-10-20T09:00:00')], NOW)
    expect(groups).toHaveLength(1)
    expect(groups[0].items.map((item) => item.id)).toEqual(['2026-10-20T14:00:00', '2026-10-20T09:00:00'])
  })

  it('una lista vacía no produce grupos', () => {
    expect(groupNotificationsByDay([], NOW)).toEqual([])
  })
})

describe('countUnread', () => {
  it('cuenta solo lo posterior al último instante visto', () => {
    const items = [at('2026-10-20T14:00:00'), at('2026-10-20T10:00:00'), at('2026-10-19T10:00:00')]
    expect(countUnread(items, new Date('2026-10-20T11:00:00').getTime())).toBe(1)
    expect(countUnread(items, 0)).toBe(3)
    expect(countUnread([], 0)).toBe(0)
  })
})
