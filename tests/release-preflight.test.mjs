import test from 'node:test'
import assert from 'node:assert/strict'
import { parseDotEnv, verifyReleaseConfig } from '../scripts/release-preflight.mjs'

const productionId = 'itla-crush-cb9bd'
const valid = (id) => ({
  VITE_FIREBASE_API_KEY: 'example-client-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: `${id}.firebaseapp.com`,
  VITE_FIREBASE_PROJECT_ID: id,
  VITE_FIREBASE_STORAGE_BUCKET: `${id}.firebasestorage.app`,
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef123',
  VITE_MICROSOFT_TENANT: 'itla.edu.do',
})

test('parsea un archivo env sin necesitar credenciales reales', () => {
  assert.deepEqual(parseDotEnv('# ejemplo\nexport VITE_FIREBASE_PROJECT_ID="staging-test"\nIGNORED='), {
    VITE_FIREBASE_PROJECT_ID: 'staging-test', IGNORED: '',
  })
})

test('staging exige proyecto aislado de producción', () => {
  assert.deepEqual(verifyReleaseConfig('staging', valid('itla-crush-staging'), '1.0.0-rc.1', '1.0.0-rc.1'), [])
  assert.match(verifyReleaseConfig('staging', valid(productionId), '1.0.0-rc.1', '1.0.0-rc.1').join(' '), /Staging no puede/)
})

test('producción exige el ID original y un authDomain consistente', () => {
  assert.deepEqual(verifyReleaseConfig('production', valid(productionId), '1.0.0-rc.1', '1.0.0-rc.1'), [])
  assert.match(verifyReleaseConfig('production', valid('itla-crush-staging'), '1.0.0-rc.1', '1.0.0-rc.1').join(' '), /ID de Firebase/)
  const mismatch = valid(productionId)
  mismatch.VITE_FIREBASE_AUTH_DOMAIN = 'otro.firebaseapp.com'
  assert.match(verifyReleaseConfig('production', mismatch, '1.0.0-rc.1', '1.0.0-rc.1').join(' '), /AUTH_DOMAIN/)
})

test('rechaza claves vacías, tenant inválido, sender inválido y versiones diferentes', () => {
  const broken = valid(productionId)
  broken.VITE_FIREBASE_API_KEY = ''
  broken.VITE_MICROSOFT_TENANT = 'consumers'
  broken.VITE_FIREBASE_MESSAGING_SENDER_ID = 'texto'
  const issues = verifyReleaseConfig('production', broken, '0.0.0', '1.0.0-rc.1').join(' ')
  for (const fragment of ['API_KEY', 'MICROSOFT_TENANT', 'MESSAGING_SENDER_ID', 'versión']) {
    assert.ok(issues.includes(fragment))
  }
})
