import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

const indexHtml = read('index.html')
const app = read('src/App.jsx')
const identity = read('src/IdentityShell.jsx')
const appCss = read('src/App.css')
const identityCss = read('src/identity.css')
const legal = read('src/LegalPage.jsx')

const checks = [
  ['html lang="es"', /<html[^>]*lang=["']es["']/i.test(indexHtml)],
  ['meta viewport', /<meta[^>]*name=["']viewport["']/i.test(indexHtml)],
  ['descripción de página', /<meta[^>]*name=["']description["']/i.test(indexHtml)],
  ['skip link disponible', /function\s+SkipLink\s*\(/.test(app) || /function\s+SkipLink\s*\(/.test(identity)],
  ['destino main-content en App', /id=["']main-content["']/.test(app)],
  ['destino main-content en identidad/legal', /id=["']main-content["']/.test(identity) && /id=["']main-content["']/.test(legal)],
  ['foco visible', /:focus-visible/.test(appCss + identityCss)],
  ['reduced motion', /prefers-reduced-motion/.test(appCss + identityCss)],
  ['sin tabindex positivo', !/tabIndex=["'{]?\s*[1-9]/.test(app + identity + legal)],
  ['sin marquee', !/<marquee\b/i.test(app + identity + legal)],
  ['avisos de error accesibles', /role=["']alert["']/.test(app + identity)],
  ['estados dinámicos accesibles', /role=["']status["']/.test(app + identity)],
  ['navegación etiquetada', /aria-label=["'][^"']+["']/.test(app + identity)],
]

const jsx = [app, identity, legal].join('\n')
const imgTags = jsx.match(/<img\b[\s\S]*?>/g) ?? []
const imagesMissingAlt = imgTags.filter((tag) => !/\balt\s*=/.test(tag))
checks.push(['imágenes con atributo alt', imagesMissingAlt.length === 0])

const failed = checks.filter(([, ok]) => !ok)

console.log('Accesibilidad estática — ITLA Crush')
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`)
}

if (failed.length > 0) {
  console.error(`\nFallaron ${failed.length} comprobaciones de accesibilidad estática.`)
  process.exit(1)
}

console.log('\nTodas las comprobaciones estáticas de accesibilidad pasaron.')
