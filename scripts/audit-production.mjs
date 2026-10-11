import { spawnSync } from 'node:child_process'

const severityRank = { low: 1, moderate: 2, high: 3, critical: 4 }
const minimumSeverity = severityRank.high

// Firestore currently pins @grpc/grpc-js to ~1.9.0. Firebase tracks that
// upstream in firebase/firebase-js-sdk#10400. ITLA Crush is a browser-only
// Vite application, where Firestore uses WebChannel rather than the Node gRPC
// transport, so these two advisories are not reachable at runtime here.
// Keep the exception intentionally narrow: any new high/critical advisory,
// including a new advisory for @grpc/grpc-js, must fail CI.
const allowedRootPackage = '@grpc/grpc-js'
const allowedAdvisories = new Set([
  'GHSA-m9gg-hp2v-232j',
  'GHSA-f596-whhp-79r4',
])

const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
})

if (!result.stdout?.trim()) {
  console.error(result.stderr || 'npm audit no devolvió un reporte JSON.')
  process.exit(result.status ?? 1)
}

let report
try {
  report = JSON.parse(result.stdout)
} catch (error) {
  console.error('No se pudo interpretar la salida JSON de npm audit.')
  console.error(error)
  process.exit(1)
}

const vulnerabilities = report.vulnerabilities ?? {}
const relevant = new Map(
  Object.entries(vulnerabilities).filter(([, vulnerability]) =>
    (severityRank[vulnerability.severity] ?? 0) >= minimumSeverity,
  ),
)

if (relevant.size === 0) {
  console.log('Auditoría de producción: sin vulnerabilidades high/critical.')
  process.exit(0)
}

const advisoryId = (entry) => {
  const match = String(entry.url ?? '').match(/GHSA-[a-z0-9-]+/i)
  return match?.[0] ?? ''
}

const allowedPackages = new Set()
const root = relevant.get(allowedRootPackage)
if (root) {
  const directAdvisories = (root.via ?? []).filter((entry) => typeof entry === 'object')
  const indirectDependencies = (root.via ?? []).filter((entry) => typeof entry === 'string')
  const onlyKnownAdvisories = directAdvisories.length > 0
    && directAdvisories.every((entry) => allowedAdvisories.has(advisoryId(entry)))
    && indirectDependencies.length === 0

  if (onlyKnownAdvisories) allowedPackages.add(allowedRootPackage)
}

// npm propagates a transitive advisory to parent packages. Allow those parents
// only when every path reported by npm resolves exclusively to an already
// allowlisted package; iterate because firebase -> firestore-compat -> firestore
// is a multi-level chain.
let changed = true
while (changed) {
  changed = false
  for (const [name, vulnerability] of relevant) {
    if (allowedPackages.has(name)) continue
    const via = vulnerability.via ?? []
    const inheritedOnly = via.length > 0
      && via.every((entry) => typeof entry === 'string' && allowedPackages.has(entry))
    if (inheritedOnly) {
      allowedPackages.add(name)
      changed = true
    }
  }
}

const blocked = [...relevant.entries()].filter(([name]) => !allowedPackages.has(name))

if (blocked.length > 0) {
  console.error('Auditoría de producción fallida. Vulnerabilidades high/critical no exceptuadas:')
  for (const [name, vulnerability] of blocked) {
    console.error(`- ${name}: ${vulnerability.severity}`)
    for (const entry of vulnerability.via ?? []) {
      if (typeof entry === 'object') console.error(`  ${entry.url ?? entry.title ?? 'advisory desconocido'}`)
      else console.error(`  vía ${entry}`)
    }
  }
  process.exit(1)
}

console.warn('Auditoría de producción: se detectó únicamente la excepción temporal conocida de Firestore/@grpc/grpc-js.')
console.warn(`Advisories permitidos: ${[...allowedAdvisories].join(', ')}`)
console.warn('La excepción aplica porque ITLA Crush ejecuta Firestore exclusivamente en navegador; cualquier advisory adicional seguirá bloqueando CI.')
