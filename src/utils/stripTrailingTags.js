/**
 * Quita del final del texto los hashtags que ya se muestran como etiquetas,
 * para no repetirlos. Los hashtags dentro de la frase se conservan.
 */
export function stripTrailingTags(text, tags = []) {
  if (!text || tags.length === 0) return text

  const known = new Set(tags.map((tag) => tag.toLocaleLowerCase('es')))
  const trailingTag = /\s+(#[\p{L}\p{N}_]+)\s*$/u
  let result = text

  for (;;) {
    const match = result.match(trailingTag)
    if (!match || !known.has(match[1].toLocaleLowerCase('es'))) break
    result = result.slice(0, match.index)
  }

  // Si todo el mensaje eran etiquetas, se deja el original.
  return result.trim() ? result.trimEnd() : text
}
