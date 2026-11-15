import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8')

test('la instalación PWA está declarada con una entrada pública y una imagen vectorial', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'))
  assert.equal(manifest.lang, 'es-DO')
  assert.equal(manifest.start_url, '/home')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.icons[0].src, '/pwa-icon.svg')
  assert.match(read('index.html'), /rel="manifest"/)
  assert.match(read('src/main.jsx'), /import\.meta\.env\.PROD/)
})

test('el servicio offline sólo intercepta navegaciones GET de su mismo origen', () => {
  const serviceWorker = read('public/sw.js')
  assert.match(serviceWorker, /request\.method !== 'GET'/)
  assert.match(serviceWorker, /request\.mode !== 'navigate'/)
  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/)
  assert.match(serviceWorker, /caches\.match\(OFFLINE_URL\)/)
  assert.doesNotMatch(serviceWorker, /cache\.put\(/)
  assert.doesNotMatch(serviceWorker, /firestore|firebaseio|identitytoolkit/i)
})

test('la página sin conexión no muestra información personal ni simula una sesión', () => {
  const page = read('public/offline.html')
  assert.match(page, /<html lang="es">/)
  assert.match(page, /sin conexión/i)
  assert.match(page, /no oficial/i)
  assert.doesNotMatch(page, /localStorage|indexedDB|firebase/i)
})
