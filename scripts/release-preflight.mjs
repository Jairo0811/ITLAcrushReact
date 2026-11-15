import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PRODUCTION_PROJECT = 'itla-crush-cb9bd'
const REQUIRED = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_MICROSOFT_TENANT',
]

export function parseDotEnv(contents) {
  const result = {}
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    result[match[1]] = value
  }
  return result
}

export function verifyReleaseConfig(target, env, packageVersion, lockVersion) {
  const issues = []
  if (!['staging', 'production'].includes(target)) {
    return ['El entorno debe ser staging o production.']
  }

  for (const name of REQUIRED) {
    const value = env[name] || ''
    if (!value.trim() || /^(reemplazar|change_me|your_|tu_|<)/i.test(value.trim())) {
      issues.push(`Falta un valor real para ${name}.`)
    }
  }

  const projectId = env.VITE_FIREBASE_PROJECT_ID || ''
  if (target === 'staging' && projectId === PRODUCTION_PROJECT) {
    issues.push('Staging no puede usar el proyecto Firebase de producción.')
  }
  if (target === 'production' && projectId !== PRODUCTION_PROJECT) {
    issues.push('El ID de Firebase de producción no coincide con el autorizado.')
  }
  if (projectId && env.VITE_FIREBASE_AUTH_DOMAIN !== `${projectId}.firebaseapp.com`) {
    issues.push('VITE_FIREBASE_AUTH_DOMAIN no coincide con el proyecto seleccionado.')
  }
  if (!/^\d+$/.test(env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')) {
    issues.push('VITE_FIREBASE_MESSAGING_SENDER_ID debe ser numérico.')
  }
  if (!/^\d+:[^:]+:web:[^:]+$/.test(env.VITE_FIREBASE_APP_ID || '')) {
    issues.push('VITE_FIREBASE_APP_ID debe tener el formato de una app web Firebase.')
  }
  if (env.VITE_MICROSOFT_TENANT !== 'itla.edu.do') {
    issues.push('VITE_MICROSOFT_TENANT debe ser itla.edu.do.')
  }
  if (env.VITE_FIREBASE_STORAGE_BUCKET &&
      !env.VITE_FIREBASE_STORAGE_BUCKET.startsWith(`${projectId}.`)) {
    issues.push('VITE_FIREBASE_STORAGE_BUCKET no coincide con el proyecto seleccionado.')
  }
  if (packageVersion !== lockVersion || packageVersion !== '1.0.0-rc.1') {
    issues.push('La versión del paquete y lockfile debe ser 1.0.0-rc.1.')
  }
  return issues
}

export function main(args = process.argv.slice(2)) {
  const [target, filename] = args
  if (!['staging', 'production'].includes(target)) {
    console.error('Uso: node scripts/release-preflight.mjs staging|production archivo.env')
    return 1
  }
  const configPath = path.resolve(filename || (target === 'staging' ? '.env.staging' : '.env.production'))
  if (!fs.existsSync(configPath)) {
    console.error(`Falta el archivo ${path.basename(configPath)}. Copia y completa el template del entorno.`)
    return 1
  }

  try {
    const env = parseDotEnv(fs.readFileSync(configPath, 'utf8'))
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'))
    const lock = JSON.parse(fs.readFileSync(path.resolve('package-lock.json'), 'utf8'))
    const issues = verifyReleaseConfig(target, env, pkg.version, lock.version)
    if (issues.length) {
      for (const issue of issues) console.error(`- ${issue}`)
      return 1
    }
    // Jamás mostrar API keys ni credenciales del archivo env.
    console.log(`Preflight ${target} OK: Firebase ${env.VITE_FIREBASE_PROJECT_ID}, versión ${pkg.version}. No se realizó ningún despliegue.`)
    return 0
  } catch (error) {
    console.error(`No fue posible validar preflight: ${error.message}`)
    return 1
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main()
}
