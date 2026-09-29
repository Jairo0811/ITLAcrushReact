export const COMMUNITY_TOPICS = [
  {
    tag: '#AmorITLA',
    label: 'Amor ITLA',
    description: 'Crushes, flechazos y conexiones dentro de la comunidad.',
  },
  {
    tag: '#VidaITLA',
    label: 'Vida ITLA',
    description: 'Historias del día a día, clases y vida estudiantil.',
  },
  {
    tag: '#Biblioteca',
    label: 'Biblioteca',
    description: 'Encuentros, estudio y momentos entre libros.',
  },
  {
    tag: '#CrushSecreto',
    label: 'Crush secreto',
    description: 'Confesiones para ese crush que todavía no sabe.',
  },
  {
    tag: '#IngenieríaDelAmor',
    label: 'Ingeniería del amor',
    description: 'Cuando la tecnología, el código y el amor se cruzan.',
  },
]

function topicKey(tag) {
  return String(tag || '').trim().toLocaleLowerCase('es')
}

export function normalizeTopicTag(tag) {
  const trimmed = String(tag || '').trim()
  if (!trimmed) return ''
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

export function getCommunityTopic(tag) {
  const key = topicKey(tag)
  return COMMUNITY_TOPICS.find((topic) => topicKey(topic.tag) === key) ?? null
}

export function buildCommunityTopics(confessions, limit = 5) {
  const counts = new Map()

  for (const confession of confessions ?? []) {
    const seenInConfession = new Set()

    for (const rawTag of confession.tags ?? []) {
      const tag = normalizeTopicTag(rawTag)
      const key = topicKey(tag)
      if (!tag || seenInConfession.has(key)) continue

      seenInConfession.add(key)
      const current = counts.get(key)
      counts.set(key, {
        tag: current?.tag || getCommunityTopic(tag)?.tag || tag,
        count: (current?.count || 0) + 1,
      })
    }
  }

  return [...counts.values()]
    .map((item) => {
      const configured = getCommunityTopic(item.tag)
      return {
        ...item,
        label: configured?.label || item.tag.replace(/^#/, ''),
        description: configured?.description || 'Tema creado por la comunidad.',
      }
    })
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      return left.tag.localeCompare(right.tag, 'es', { sensitivity: 'base' })
    })
    .slice(0, limit)
}
