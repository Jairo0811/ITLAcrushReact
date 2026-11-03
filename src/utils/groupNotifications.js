const DAY = 24 * 60 * 60 * 1000

function startOfDay(timestamp) {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Agrupa notificaciones (ya ordenadas de más reciente a más antigua) en
 * Hoy / Ayer / Esta semana / Anteriores, respecto al instante `now`.
 */
export function groupNotificationsByDay(items, now) {
  const today = startOfDay(now)
  const groups = [
    { key: 'today', label: 'Hoy', items: [] },
    { key: 'yesterday', label: 'Ayer', items: [] },
    { key: 'week', label: 'Esta semana', items: [] },
    { key: 'older', label: 'Anteriores', items: [] },
  ]

  for (const item of items) {
    const time = item.createdAt?.getTime?.() ?? 0
    const day = startOfDay(time || 0)
    if (day >= today) groups[0].items.push(item)
    else if (day >= today - DAY) groups[1].items.push(item)
    else if (day >= today - 6 * DAY) groups[2].items.push(item)
    else groups[3].items.push(item)
  }

  return groups.filter((group) => group.items.length > 0)
}

export function countUnread(items, lastSeenAt) {
  return items.filter((item) => (item.createdAt?.getTime?.() ?? 0) > lastSeenAt).length
}
