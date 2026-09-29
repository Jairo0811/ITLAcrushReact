import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ITLA_PROGRAMS, ITLA_PROGRAM_VALUES, getProgram } from '../src/data/itlaPrograms.js'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('catálogo de tecnólogos mantiene valores únicos y colores hex válidos', () => {
  assert.ok(ITLA_PROGRAMS.length >= 10)
  assert.equal(new Set(ITLA_PROGRAM_VALUES).size, ITLA_PROGRAM_VALUES.length)

  for (const program of ITLA_PROGRAMS) {
    assert.match(program.value, /^[a-z0-9-]+$/)
    assert.ok(program.label.length > 2)
    assert.match(program.color, /^#[0-9A-F]{6}$/i)
    assert.deepEqual(getProgram(program.value), program)
  }

  assert.equal(getProgram('programa-inexistente'), null)
})

test('rutas sensibles permanecen protegidas por rol o autenticación', () => {
  const shell = read('src/IdentityShell.jsx')

  assert.match(shell, /allowedRoles=\{\['admin'\]\}/)
  assert.match(shell, /allowedRoles=\{\['admin', 'moderator'\]\}/)

  for (const route of ['/app', '/crear', '/mis-confesiones', '/notificaciones', '/guardados', '/favoritos']) {
    assert.ok(shell.includes(`location.pathname === '${route}'`), `Falta protección explícita para ${route}`)
  }
})

test('Firestore conserva deny-by-default y controles administrativos/sociales', () => {
  const rules = read('firestore.rules')

  assert.match(rules, /match \/\{document=\*\*\}/)
  assert.match(rules, /allow read, write: if false;/)
  assert.match(rules, /function isActiveUser\(\)/)
  assert.match(rules, /function isAdmin\(\)/)
  assert.match(rules, /match \/adminAuditLogs\/)
  assert.match(rules, /match \/socialActivity\/)
  assert.match(rules, /match \/savedConfessions\/)
})

test('Firebase Hosting mantiene fallback SPA y cabeceras mínimas', () => {
  const firebase = JSON.parse(read('firebase.json'))

  assert.equal(firebase.hosting.public, 'dist')
  assert.ok(firebase.hosting.rewrites.some((item) => item.source === '**' && item.destination === '/index.html'))

  const headers = firebase.hosting.headers.flatMap((item) => item.headers ?? [])
  const keys = new Set(headers.map((item) => item.key.toLowerCase()))
  assert.ok(keys.has('x-content-type-options'))
  assert.ok(keys.has('referrer-policy'))
  assert.ok(keys.has('permissions-policy'))
  assert.ok(keys.has('x-frame-options'))
})

test('la interfaz no anuncia mensajería privada ficticia', () => {
  const app = read('src/App.jsx')
  assert.equal(app.includes("'Mensajes'"), false)
  assert.equal(app.includes("label === 'Mensajes'"), false)
})

test('el proyecto conserva el disclaimer académico no oficial', () => {
  const readme = read('README.md')
  const index = read('index.html')

  assert.match(readme, /No es una aplicación oficial del ITLA/i)
  assert.match(index, /proyecto académico no oficial/i)
})
