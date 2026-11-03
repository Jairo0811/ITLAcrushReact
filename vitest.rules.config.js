import { defineConfig } from 'vitest/config'

// Pruebas de reglas de Firestore: requieren el emulador (ver `npm run test:rules`).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.js'],
    testTimeout: 20000,
    hookTimeout: 30000,
    // Todas las pruebas comparten un único emulador y limpian su estado entre casos.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
})
