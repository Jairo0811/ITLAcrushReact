import { describe, expect, it } from 'vitest'
import { buildProgramFilters, buildTrendingTopics, filterConfessions } from '../../src/utils/feedFilters.js'

const NOW = new Date('2026-11-05T12:00:00Z').getTime()
const daysAgo = (days) => new Date(NOW - days * 24 * 60 * 60 * 1000)

const items = [
  { id: 'a', text: 'Hola biblioteca', tags: ['#Biblioteca'], isAnonymous: false, authorProgram: 'ciberseguridad', createdAt: daysAgo(1) },
  { id: 'b', text: 'Crush en clase', tags: ['#CrushSecreto', '#VidaITLA'], isAnonymous: false, authorProgram: 'ciberseguridad', createdAt: daysAgo(2) },
  { id: 'c', text: 'Anónima', tags: ['#Biblioteca'], isAnonymous: true, authorProgram: '', createdAt: daysAgo(3) },
  { id: 'd', text: 'Vieja', tags: ['#Antigua'], isAnonymous: false, authorProgram: 'sonido', createdAt: daysAgo(30) },
]

describe('filterConfessions', () => {
  it('sin filtros devuelve todo menos las ocultas', () => {
    expect(filterConfessions(items, { hiddenIds: new Set(['a']) }).map((i) => i.id)).toEqual(['b', 'c', 'd'])
  })

  it('filtra por tecnólogo, tema y texto combinados', () => {
    expect(filterConfessions(items, { program: 'ciberseguridad' }).map((i) => i.id)).toEqual(['a', 'b'])
    expect(filterConfessions(items, { program: 'ciberseguridad', topic: '#vidaitla' }).map((i) => i.id)).toEqual(['b'])
    expect(filterConfessions(items, { searchText: ' CRUSH ' }).map((i) => i.id)).toEqual(['b'])
  })
})

describe('buildProgramFilters', () => {
  it('cuenta solo publicaciones identificadas y ordena por cantidad', () => {
    const result = buildProgramFilters(items)
    expect(result.map((r) => [r.value, r.count])).toEqual([['ciberseguridad', 2], ['sonido', 1]])
    expect(result[0].label).toBe('Ciberseguridad')
  })

  it('ignora tecnólogos desconocidos', () => {
    expect(buildProgramFilters([{ id: 'x', isAnonymous: false, authorProgram: 'inventado' }])).toEqual([])
  })
})

describe('buildTrendingTopics', () => {
  it('usa solo los últimos 7 días cuando hay etiquetas recientes', () => {
    const { topics, usedWindow } = buildTrendingTopics(items, NOW)
    expect(usedWindow).toBe(true)
    expect(topics[0]).toMatchObject({ tag: '#Biblioteca', count: 2 })
    expect(topics.some((t) => t.tag === '#Antigua')).toBe(false)
  })

  it('si no hay nada reciente recurre a todas las publicaciones', () => {
    const { topics, usedWindow } = buildTrendingTopics([items[3]], NOW)
    expect(usedWindow).toBe(false)
    expect(topics[0].tag).toBe('#Antigua')
  })
})
