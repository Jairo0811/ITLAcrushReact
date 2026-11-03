import { describe, expect, it } from 'vitest'
import { stripTrailingTags } from '../../src/utils/stripTrailingTags.js'

describe('stripTrailingTags', () => {
  it('quita los hashtags finales que ya son etiquetas', () => {
    expect(stripTrailingTags('Hola mundo #AmorITLA', ['#AmorITLA'])).toBe('Hola mundo')
    expect(stripTrailingTags('Hola #Biblioteca #VidaITLA', ['#Biblioteca', '#VidaITLA'])).toBe('Hola')
  })

  it('no distingue mayúsculas ni acentos de capitalización', () => {
    expect(stripTrailingTags('Código #ingenieríadelamor', ['#IngenieríaDelAmor'])).toBe('Código')
  })

  it('conserva los hashtags que están dentro de la frase', () => {
    expect(stripTrailingTags('Me gusta el #AmorITLA de siempre', ['#AmorITLA'])).toBe('Me gusta el #AmorITLA de siempre')
  })

  it('se detiene en el primer hashtag final que no es etiqueta', () => {
    expect(stripTrailingTags('Hola #Otro #VidaITLA', ['#VidaITLA'])).toBe('Hola #Otro')
  })

  it('devuelve el texto original si solo había etiquetas o no hay etiquetas', () => {
    expect(stripTrailingTags('x #A', ['#A'])).toBe('x')
    expect(stripTrailingTags('#A', ['#A'])).toBe('#A')
    expect(stripTrailingTags('Sin etiquetas', [])).toBe('Sin etiquetas')
    expect(stripTrailingTags('', ['#A'])).toBe('')
  })
})
