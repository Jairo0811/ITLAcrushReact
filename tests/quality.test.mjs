import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { ITLA_PROGRAMS, ITLA_PROGRAM_VALUES, getProgram } from '../src/data/itlaPrograms.js'
import { COMMUNITY_TOPICS, buildCommunityTopics, getCommunityTopic } from '../src/data/communityTopics.js'

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

test('temas de la comunidad se derivan de confesiones reales', () => {
  const topics = buildCommunityTopics([
    { tags: ['#AmorITLA', '#VidaITLA'] },
    { tags: ['#amoritla'] },
    { tags: ['#Biblioteca', '#AmorITLA', '#Biblioteca'] },
  ])

  assert.equal(topics[0].tag, '#AmorITLA')
  assert.equal(topics[0].count, 3)
  assert.equal(topics.find((topic) => topic.tag === '#Biblioteca')?.count, 1)
  assert.equal(topics.find((topic) => topic.tag === '#VidaITLA')?.count, 1)
  assert.equal(getCommunityTopic('#amoritla')?.tag, '#AmorITLA')
})

test('catálogo sugerido de temas no contiene duplicados', () => {
  const keys = COMMUNITY_TOPICS.map((topic) => topic.tag.toLocaleLowerCase('es'))
  assert.equal(new Set(keys).size, keys.length)
  assert.ok(COMMUNITY_TOPICS.every((topic) => topic.tag.startsWith('#')))
})

test('Microsoft se restringe a cuentas institucionales @itla.edu.do', () => {
  const authService = read('src/services/authService.js')
  const rules = read('firestore.rules')
  const identity = read('src/IdentityShell.jsx')
  const envExample = read('.env.example')

  assert.ok(authService.includes("export const ITLA_EMAIL_DOMAIN = 'itla.edu.do'"))
  assert.ok(authService.includes("tenant: MICROSOFT_TENANT"))
  assert.ok(authService.includes("'auth/non-itla-microsoft-account'"))
  assert.ok(authService.includes('assertAllowedMicrosoftUser(credential.user)'))
  assert.ok(authService.includes("provider.providerId === 'microsoft.com'"))
  assert.ok(rules.includes("email.matches('.*@itla[.]edu[.]do')"))
  assert.ok(rules.includes("request.auth.token.firebase.sign_in_provider == 'microsoft.com'"))
  assert.ok(identity.includes('solo cuentas <strong>@itla.edu.do</strong>'))
  assert.ok(envExample.includes('VITE_MICROSOFT_TENANT=itla.edu.do'))
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
  assert.ok(rules.includes('match /adminAuditLogs/{auditId}'))
  assert.ok(rules.includes('match /socialActivity/{activityId}'))
  assert.ok(rules.includes('match /savedConfessions/{savedId}'))
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

test('dashboard y demo no dependen de controles decorativos', () => {
  const app = read('src/App.jsx')

  assert.equal(app.includes('aria-label="Tema"'), false)
  assert.ok(app.includes('className="topbar-live"'))
  assert.ok(app.includes('empty-state empty-state--actionable'))
  assert.ok(app.includes('demo-banner__facts'))
  assert.ok(app.includes('Firebase sin escrituras'))
})

test('la interfaz no anuncia funcionalidades sociales ficticias', () => {
  const app = read('src/App.jsx')
  assert.equal(app.includes("'Mensajes'"), false)
  assert.equal(app.includes("label === 'Mensajes'"), false)
  assert.equal(app.includes('const trends = ['), false)
  assert.ok(app.includes('buildCommunityTopics(publicConfessions)'))
  assert.ok(app.includes('Aún no hay temas activos.'))
})

test('el proyecto conserva el disclaimer académico no oficial', () => {
  const readme = read('README.md')
  const index = read('index.html')

  assert.match(readme, /No es una aplicación oficial del ITLA/i)
  assert.match(index, /proyecto académico no oficial/i)
})
