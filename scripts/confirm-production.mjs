const expectedProject = 'itla-crush-cb9bd'
if (process.env.ITLA_CRUSH_PROD_APPROVAL !== expectedProject) {
  console.error('Despliegue bloqueado: falta autorización explícita para itla-crush-cb9bd.')
  console.error('Revisa issue #20 y define ITLA_CRUSH_PROD_APPROVAL=itla-crush-cb9bd solo después del GO.')
  process.exitCode = 1
} else {
  console.log('Aprobación local reconocida. Staging, backups y rollback deben estar validados antes de continuar.')
}
