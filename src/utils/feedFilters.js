import { getProgram } from '../data/itlaPrograms.js'
import { buildCommunityTopics } from '../data/communityTopics.js'

const DAY_MS = 24 * 60 * 60 * 1000
export const TRENDING_WINDOW_DAYS = 7

function toMillis(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

const lower = (text) => String(text ?? '').toLocaleLowerCase('es')

/** Aplica ocultas, tema, tecnólogo y texto de búsqueda sobre las confesiones ya cargadas. */
export function filterConfessions(items, { hiddenIds, searchText = '', topic = '', program = '' } = {}) {
  const query = lower(searchText.trim())
  const topicKey = lower(topic)

  return (items ?? []).filter((item) => {
    if (hiddenIds?.has(item.id)) return false
    if (program && item.authorProgram !== program) return false
    if (topicKey && !(item.tags ?? []).some((tag) => lower(tag) === topicKey)) return false
    if (!query) return true
    return lower(`${item.text} ${item.recipientText || ''} ${(item.tags ?? []).join(' ')}`).includes(query)
  })
}

/**
 * Tecnólogos que aparecen en publicaciones identificadas, ordenados por cantidad.
 * Las confesiones anónimas no revelan tecnólogo, así que nunca cuentan aquí.
 */
export function buildProgramFilters(items, limit = 8) {
  const counts = new Map()
  for (const item of items ?? []) {
    if (item.isAnonymous || !item.authorProgram) continue
    counts.set(item.authorProgram, (counts.get(item.authorProgram) || 0) + 1)
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count, info: getProgram(value) }))
    .filter((entry) => entry.info)
    .sort((a, b) => b.count - a.count || a.info.label.localeCompare(b.info.label, 'es'))
    .slice(0, limit)
    .map(({ value, count, info }) => ({ value, count, label: info.label, color: info.color }))
}

/**
 * Temas del momento: hashtags de los últimos días. Si la ventana queda vacía
 * (comunidad pequeña o poco activa) se usan todas las publicaciones cargadas.
 */
export function buildTrendingTopics(items, now = Date.now(), { days = TRENDING_WINDOW_DAYS, limit = 8 } = {}) {
  const since = now - days * DAY_MS
  const recent = (items ?? []).filter((item) => toMillis(item.createdAt) >= since)
  const source = recent.some((item) => (item.tags ?? []).length > 0) ? recent : (items ?? [])
  return { topics: buildCommunityTopics(source, limit), usedWindow: source === recent }
}
