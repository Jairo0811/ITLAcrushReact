import fs from 'node:fs'
import path from 'node:path'

const assetsDir = path.join(process.cwd(), 'dist', 'assets')

if (!fs.existsSync(assetsDir)) {
  console.error('No existe dist/assets. Ejecuta npm run build antes de comprobar el bundle.')
  process.exit(1)
}

const files = fs.readdirSync(assetsDir)
const jsFiles = files.filter((file) => file.endsWith('.js'))
const cssFiles = files.filter((file) => file.endsWith('.css'))

const JS_CHUNK_LIMIT = 450 * 1024
const JS_TOTAL_LIMIT = 1200 * 1024
const CSS_TOTAL_LIMIT = 250 * 1024

const sizes = (items) => items.map((file) => ({
  file,
  bytes: fs.statSync(path.join(assetsDir, file)).size,
}))

const jsSizes = sizes(jsFiles)
const cssSizes = sizes(cssFiles)
const jsTotal = jsSizes.reduce((sum, item) => sum + item.bytes, 0)
const cssTotal = cssSizes.reduce((sum, item) => sum + item.bytes, 0)
const oversized = jsSizes.filter((item) => item.bytes > JS_CHUNK_LIMIT)

function kb(bytes) {
  return (bytes / 1024).toFixed(1)
}

console.log('Presupuesto de bundle — ITLA Crush')
for (const item of jsSizes.sort((a, b) => b.bytes - a.bytes)) {
  console.log(`JS  ${kb(item.bytes)} kB  ${item.file}`)
}
for (const item of cssSizes.sort((a, b) => b.bytes - a.bytes)) {
  console.log(`CSS ${kb(item.bytes)} kB  ${item.file}`)
}
console.log(`Total JS: ${kb(jsTotal)} kB / ${kb(JS_TOTAL_LIMIT)} kB`)
console.log(`Total CSS: ${kb(cssTotal)} kB / ${kb(CSS_TOTAL_LIMIT)} kB`)

const failures = []
if (oversized.length > 0) {
  failures.push(`Hay ${oversized.length} chunk(s) JS por encima de ${kb(JS_CHUNK_LIMIT)} kB.`)
}
if (jsTotal > JS_TOTAL_LIMIT) {
  failures.push('El total de JavaScript supera el presupuesto.')
}
if (cssTotal > CSS_TOTAL_LIMIT) {
  failures.push('El total de CSS supera el presupuesto.')
}

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`✗ ${failure}`))
  process.exit(1)
}

console.log('✓ El bundle cumple el presupuesto definido.')
