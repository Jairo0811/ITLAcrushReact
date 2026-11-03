/**
 * Pruebas de las reglas de seguridad de Firestore.
 *
 * Se ejecutan contra el emulador (`npm run test:rules`) y usan DOS estrategias:
 *  1. Los servicios REALES del cliente (src/services/*) apuntando al emulador, para detectar
 *     desfases entre lo que escribe la app y lo que permiten las reglas.
 *  2. Escrituras directas (batch/setDoc) para los casos NEGATIVOS, de modo que una denegación
 *     se deba a la regla probada y no a una lectura previa del servicio.
 *
 * Convención: cada caso negativo tiene un "control positivo" equivalente que debe pasar; así,
 * si el control fallara, sabríamos que la prueba está mal armada y no que la regla funciona.
 */
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

// Los servicios obtienen `db` mediante requireFirebase(); aquí se redirige al emulador.
const state = vi.hoisted(() => ({ db: null }))
vi.mock('../../src/services/firebase.js', () => ({
  isFirebaseConfigured: true,
  auth: null,
  db: null,
  requireFirebase: () => ({ db: state.db, auth: null }),
}))

const { createConfession, deleteOwnConfession, subscribePublicConfessions } = await import('../../src/services/confessionService.js')
const {
  addComment,
  deleteOwnComment,
  getConfessionSocialCounts,
  loadSocialNotifications,
  subscribeConfessionComments,
  subscribeSavedConfessionIds,
  toggleReaction,
  toggleSaved,
} = await import('../../src/services/socialService.js')
const {
  hideConfession,
  moderateConfession,
  reportConfession,
  updateReportStatus,
} = await import('../../src/services/trustSafetyService.js')
const { updateUserAccess } = await import('../../src/services/adminService.js')
const { updateOwnProfile } = await import('../../src/services/authService.js')

const PROJECT_ID = 'demo-itla-crush'
let testEnv

// ---------------------------------------------------------------------------------------------
// Datos base
// ---------------------------------------------------------------------------------------------
const ts = () => Timestamp.fromDate(new Date('2026-10-01T12:00:00Z'))

const baseUser = (uid, overrides = {}) => ({
  uid,
  displayName: `Usuario ${uid}`,
  email: `${uid}@itla.edu.do`,
  program: 'desarrollo-software',
  role: 'student',
  status: 'active',
  authProvider: 'password',
  termsVersion: '2026-09-23',
  termsAcceptedAt: ts(),
  createdAt: ts(),
  updatedAt: ts(),
  ...overrides,
})

const USERS = {
  alice: baseUser('alice'),
  bob: baseUser('bob'),
  carol: baseUser('carol'),
  mod: baseUser('mod', { role: 'moderator' }),
  admin: baseUser('admin', { role: 'admin' }),
  banned: baseUser('banned', { status: 'suspended' }),
  // Cuenta Microsoft cuyo correo NO es institucional: no debe operar como usuario activo.
  outsider: baseUser('outsider', { authProvider: 'microsoft.com', email: 'outsider@gmail.com' }),
}

const CONFESSION = {
  recipientText: 'Biblioteca',
  text: 'Una confesión de prueba',
  visibility: 'public',
  isAnonymous: true,
  authorDisplayName: '',
  authorProgram: '',
  tags: [],
  status: 'active',
  likeCount: 0,
  commentCount: 0,
}

// ---------------------------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------------------------
const seed = (callback) => testEnv.withSecurityRulesDisabled((context) => callback(context.firestore()))

async function seedUsers() {
  await seed(async (db) => {
    for (const [uid, data] of Object.entries(USERS)) await setDoc(doc(db, 'users', uid), data)
  })
}

async function seedConfession(id, authorUid, overrides = {}) {
  await seed(async (db) => {
    await setDoc(doc(db, 'confessions', id), { ...CONFESSION, ...overrides, createdAt: ts(), updatedAt: ts() })
    await setDoc(doc(db, 'confessionAuthors', id), { authorUid, createdAt: ts() })
  })
}

async function seedReaction(confessionId, uid) {
  const id = `${confessionId}_${uid}`
  await seed(async (db) => {
    await setDoc(doc(db, 'socialActivity', id), {
      confessionId, kind: 'reaction', actorDisplayName: USERS[uid].displayName,
      actorProgram: USERS[uid].program, status: 'active', createdAt: ts(), updatedAt: ts(),
    })
    await setDoc(doc(db, 'reactionOwners', id), { ownerUid: uid, confessionId, activityId: id, createdAt: ts() })
  })
}

async function seedComment(id, confessionId, uid, { status = 'active', text = 'Un comentario' } = {}) {
  await seed(async (db) => {
    await setDoc(doc(db, 'socialActivity', id), {
      confessionId, kind: 'comment', actorDisplayName: USERS[uid].displayName,
      actorProgram: USERS[uid].program, text, status, createdAt: ts(), updatedAt: ts(),
    })
    await setDoc(doc(db, 'commentAuthors', id), { authorUid: uid, confessionId, createdAt: ts() })
  })
}

/** Cambia el usuario que "usa la app" y devuelve su instancia de Firestore. */
function as(uid) {
  state.db = uid
    ? testEnv.authenticatedContext(uid, { email: `${uid}@itla.edu.do` }).firestore()
    : testEnv.unauthenticatedContext().firestore()
  return state.db
}

const actor = (uid) => ({ user: { uid, displayName: USERS[uid].displayName }, profile: USERS[uid] })

/** Convierte una suscripción onSnapshot en una promesa de su primer resultado (o error). */
function once(subscribe) {
  return new Promise((resolve, reject) => {
    let stop = null
    let finished = false
    stop = subscribe(
      (value) => {
        if (finished) return
        finished = true
        queueMicrotask(() => stop?.())
        resolve(value)
      },
      (error) => {
        if (finished) return
        finished = true
        reject(error)
      },
    )
  })
}

// --- Escrituras directas (replican exactamente las del cliente, sin lecturas previas) ---------
function rawConfession(uid, overrides = {}, { authorUid = uid, withAuthor = true } = {}) {
  const db = as(uid)
  const ref = doc(collection(db, 'confessions'))
  const batch = writeBatch(db)
  batch.set(ref, { ...CONFESSION, ...overrides, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  if (withAuthor) batch.set(doc(db, 'confessionAuthors', ref.id), { authorUid, createdAt: serverTimestamp() })
  return batch.commit()
}

function rawReaction(uid, confessionId, { activity = {}, owner = {}, skipOwner = false, idForUid = uid } = {}) {
  const db = as(uid)
  const id = `${confessionId}_${idForUid}`
  const batch = writeBatch(db)
  batch.set(doc(db, 'socialActivity', id), {
    confessionId,
    kind: 'reaction',
    actorDisplayName: USERS[uid].displayName,
    actorProgram: USERS[uid].program,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...activity,
  })
  if (!skipOwner) {
    batch.set(doc(db, 'reactionOwners', id), {
      ownerUid: uid, confessionId, activityId: id, createdAt: serverTimestamp(), ...owner,
    })
  }
  return batch.commit()
}

function rawComment(uid, confessionId, { activity = {}, author = {}, skipAuthor = false } = {}) {
  const db = as(uid)
  const ref = doc(collection(db, 'socialActivity'))
  const batch = writeBatch(db)
  batch.set(ref, {
    confessionId,
    kind: 'comment',
    actorDisplayName: USERS[uid].displayName,
    actorProgram: USERS[uid].program,
    text: 'Buen mensaje',
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...activity,
  })
  if (!skipAuthor) {
    batch.set(doc(db, 'commentAuthors', ref.id), {
      authorUid: uid, confessionId, createdAt: serverTimestamp(), ...author,
    })
  }
  return batch.commit()
}

// ---------------------------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------------------------
beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Falta el emulador de Firestore. Ejecuta las pruebas con: npm run test:rules')
  }
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync(path.resolve('firestore.rules'), 'utf8') },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

beforeEach(async () => {
  await seedUsers()
})

afterEach(async () => {
  await testEnv.clearFirestore()
  state.db = null
})

// ---------------------------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------------------------
describe('users', () => {
  it('solo el dueño y los administradores leen perfiles', async () => {
    await assertFails(getDoc(doc(as(null), 'users', 'alice')))
    await assertSucceeds(getDoc(doc(as('alice'), 'users', 'alice')))
    await assertFails(getDoc(doc(as('alice'), 'users', 'bob')))
    await assertFails(getDoc(doc(as('mod'), 'users', 'bob')))
    await assertSucceeds(getDoc(doc(as('admin'), 'users', 'bob')))
  })

  describe('creación de perfil', () => {
    const newProfile = (uid, overrides = {}) => ({
      uid,
      displayName: 'Nuevo',
      email: `${uid}@itla.edu.do`,
      program: 'multimedia',
      role: 'student',
      status: 'active',
      authProvider: 'password',
      termsVersion: '2026-09-23',
      termsAcceptedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...overrides,
    })

    it('control positivo: un perfil de estudiante válido se crea', async () => {
      await assertSucceeds(setDoc(doc(as('newbie'), 'users', 'newbie'), newProfile('newbie')))
    })

    it.each([
      ['rol de administrador', { role: 'admin' }],
      ['rol de moderador', { role: 'moderator' }],
      ['estado suspendido', { status: 'suspended' }],
      ['versión de términos distinta', { termsVersion: '2020-01-01' }],
      ['tecnólogo inexistente', { program: 'brujeria' }],
      ['correo distinto al del token', { email: 'otro@itla.edu.do' }],
      ['campo no permitido', { isAdmin: true }],
      ['proveedor Microsoft sin token de Microsoft', { authProvider: 'microsoft.com' }],
    ])('rechaza %s', async (_label, overrides) => {
      await assertFails(setDoc(doc(as('newbie'), 'users', 'newbie'), newProfile('newbie', overrides)))
    })

    it('no permite crear el perfil de otra persona', async () => {
      await assertFails(setDoc(doc(as('newbie'), 'users', 'victim'), newProfile('victim')))
    })
  })

  describe('actualización', () => {
    it('el usuario edita su nombre y su tecnólogo', async () => {
      const db = as('alice')
      await assertSucceeds(updateDoc(doc(db, 'users', 'alice'), { displayName: 'Alicia', updatedAt: serverTimestamp() }))
      await assertSucceeds(updateDoc(doc(db, 'users', 'alice'), { program: 'multimedia', updatedAt: serverTimestamp() }))
    })

    it.each([
      ['un tecnólogo inexistente', { program: 'brujeria' }],
      ['auto-ascenderse a administrador', { role: 'admin' }],
      ['auto-ascenderse a moderador', { role: 'moderator' }],
      ['cambiar su rol y su estado a la vez', { status: 'active', role: 'admin' }],
      ['cambiar el correo', { email: 'otro@itla.edu.do' }],
    ])('un estudiante no puede %s', async (_label, changes) => {
      await assertFails(updateDoc(doc(as('alice'), 'users', 'alice'), { ...changes, updatedAt: serverTimestamp() }))
    })

    it('editar el perfil con el servicio real normaliza el nombre y guarda el tecnólogo', async () => {
      as('alice')
      await assertSucceeds(updateOwnProfile('alice', { displayName: '  Alicia   P. ', program: 'multimedia' }))
      const saved = await seed((db) => getDoc(doc(db, 'users', 'alice')))
      expect(saved.data()).toMatchObject({ displayName: 'Alicia P.', program: 'multimedia', role: 'student', status: 'active' })
    })

    it('el servicio no permite editar el perfil de otra persona', async () => {
      as('bob')
      await assertFails(updateOwnProfile('alice', { displayName: 'Intruso', program: 'multimedia' }))
    })

    it('una cuenta suspendida no puede editar su perfil', async () => {
      await assertFails(updateDoc(doc(as('banned'), 'users', 'banned'), { displayName: 'X', updatedAt: serverTimestamp() }))
    })

    it('nadie puede borrar perfiles', async () => {
      await assertFails(deleteDoc(doc(as('admin'), 'users', 'bob')))
      await assertFails(deleteDoc(doc(as('bob'), 'users', 'bob')))
    })
  })

  describe('administración de acceso', () => {
    const target = { id: 'bob', email: 'bob@itla.edu.do', role: 'student', status: 'active' }

    it('un administrador cambia el rol de otra cuenta con el servicio real (y queda auditado)', async () => {
      as('admin')
      await assertSucceeds(updateUserAccess({ actorUid: 'admin', targetUser: target, nextRole: 'moderator', nextStatus: 'active' }))

      const bob = await seed((db) => getDoc(doc(db, 'users', 'bob')))
      expect(bob.data().role).toBe('moderator')
      const audits = await seed((db) => getDocs(collection(db, 'adminAuditLogs')))
      expect(audits.size).toBe(1)
      expect(audits.docs[0].data()).toMatchObject({ actorUid: 'admin', targetUid: 'bob', newRole: 'moderator' })
    })

    it('un administrador puede suspender una cuenta', async () => {
      as('admin')
      await assertSucceeds(updateUserAccess({ actorUid: 'admin', targetUser: target, nextRole: 'student', nextStatus: 'suspended' }))
    })

    it('un moderador o un estudiante no pueden cambiar accesos', async () => {
      as('mod')
      await assertFails(updateUserAccess({ actorUid: 'mod', targetUser: target, nextRole: 'admin', nextStatus: 'active' }))
      as('carol')
      await assertFails(updateUserAccess({ actorUid: 'carol', targetUser: target, nextRole: 'admin', nextStatus: 'active' }))
    })

    it('un cambio de rol sin registro de auditoría es rechazado', async () => {
      await assertFails(updateDoc(doc(as('admin'), 'users', 'bob'), {
        role: 'moderator', lastAdminActionId: 'inexistente', updatedAt: serverTimestamp(),
      }))
    })

    it('un administrador no puede modificar su propio rol', async () => {
      const db = as('admin')
      const audit = doc(collection(db, 'adminAuditLogs'))
      const batch = writeBatch(db)
      batch.update(doc(db, 'users', 'admin'), { role: 'student', lastAdminActionId: audit.id, updatedAt: serverTimestamp() })
      batch.set(audit, {
        actorUid: 'admin', targetUid: 'admin', targetEmail: 'admin@itla.edu.do', action: 'role_changed',
        previousRole: 'admin', newRole: 'student', previousStatus: 'active', newStatus: 'active', createdAt: serverTimestamp(),
      })
      await assertFails(batch.commit())
    })
  })
})

// ---------------------------------------------------------------------------------------------
// confessions
// ---------------------------------------------------------------------------------------------
describe('confessions: creación', () => {
  it('publica una confesión anónima con el servicio real', async () => {
    as('alice')
    const id = await assertSucceeds(createConfession({ ...actor('alice'), recipientText: 'Biblioteca', message: 'Hola #ITLA' }))
    const saved = await seed((db) => getDoc(doc(db, 'confessions', id)))
    expect(saved.data()).toMatchObject({ visibility: 'public', isAnonymous: true, likeCount: 0, authorDisplayName: '' })
    const owner = await seed((db) => getDoc(doc(db, 'confessionAuthors', id)))
    expect(owner.data().authorUid).toBe('alice')
  })

  it('publica una confesión identificada y una privada', async () => {
    as('alice')
    const identified = await assertSucceeds(createConfession({
      ...actor('alice'), recipientText: '', message: 'Con nombre', isAnonymous: false,
    }))
    const saved = await seed((db) => getDoc(doc(db, 'confessions', identified)))
    expect(saved.data()).toMatchObject({ isAnonymous: false, authorDisplayName: 'Usuario alice', authorProgram: 'desarrollo-software' })

    await assertSucceeds(createConfession({ ...actor('alice'), recipientText: '', message: 'Solo yo', visibility: 'private' }))
  })

  it('una cuenta suspendida, una cuenta Microsoft no institucional o un anónimo no pueden publicar', async () => {
    as('banned')
    await assertFails(createConfession({ ...actor('banned'), recipientText: '', message: 'Hola' }))
    as('outsider')
    await assertFails(createConfession({ ...actor('outsider'), recipientText: '', message: 'Hola' }))
    as(null)
    await assertFails(createConfession({ user: { uid: 'x' }, profile: null, recipientText: '', message: 'Hola' }))
  })

  it('control positivo: una escritura directa válida se acepta', async () => {
    await assertSucceeds(rawConfession('alice'))
  })

  it.each([
    ['contador de likes inflado', { likeCount: 99 }],
    ['contador de comentarios inflado', { commentCount: 5 }],
    ['texto vacío', { text: '' }],
    ['texto de más de 500 caracteres', { text: 'a'.repeat(501) }],
    ['más de 6 etiquetas', { tags: Array.from({ length: 7 }, (_, index) => `#t${index}`) }],
    ['estado distinto de active', { status: 'removed' }],
    ['confesión anónima que incluye nombre de autor', { authorDisplayName: 'Alice' }],
    ['confesión identificada con un nombre falso', { isAnonymous: false, authorDisplayName: 'Otra persona', authorProgram: 'desarrollo-software' }],
    ['visibilidad inválida', { visibility: 'friends' }],
    ['campo no permitido', { isVerified: true }],
  ])('rechaza %s', async (_label, overrides) => {
    await assertFails(rawConfession('alice', overrides))
  })

  it('exige el registro privado de autoría y que corresponda a quien publica', async () => {
    await assertFails(rawConfession('alice', {}, { withAuthor: false }))
    await assertFails(rawConfession('alice', {}, { authorUid: 'bob' }))
  })
})

describe('confessions: lectura', () => {
  beforeEach(async () => {
    await seedConfession('pub', 'alice')
    await seedConfession('priv', 'alice', { visibility: 'private' })
    await seedConfession('gone', 'alice', { status: 'deleted' })
    await seedConfession('removed', 'alice', { status: 'removed' })
  })

  it('cualquiera lee las públicas activas; las demás solo su autor y moderación', async () => {
    await assertSucceeds(getDoc(doc(as(null), 'confessions', 'pub')))
    for (const id of ['priv', 'gone', 'removed']) {
      await assertFails(getDoc(doc(as(null), 'confessions', id)))
      await assertFails(getDoc(doc(as('bob'), 'confessions', id)))
      await assertSucceeds(getDoc(doc(as('alice'), 'confessions', id)))
      await assertSucceeds(getDoc(doc(as('mod'), 'confessions', id)))
    }
  })

  it('el feed real (orderBy + limit) funciona sin sesión y solo devuelve públicas activas', async () => {
    for (const uid of [null, 'bob']) {
      as(uid)
      const items = await assertSucceeds(once((ok, fail) => subscribePublicConfessions(ok, fail, 30)))
      expect(items.map((item) => item.id)).toEqual(['pub'])
    }
  })

  it('no se puede listar toda la colección (incluiría privadas)', async () => {
    await assertFails(getDocs(collection(as(null), 'confessions')))
    await assertFails(getDocs(collection(as('bob'), 'confessions')))
  })
})

describe('confessions: actualización y borrado', () => {
  beforeEach(async () => {
    await seedConfession('pub', 'alice')
    await seedConfession('gone', 'alice', { status: 'deleted' })
    await seedConfession('removed', 'alice', { status: 'removed' })
    await seed((db) => setDoc(doc(db, 'reports', 'r1'), {
      confessionId: 'pub', reporterUid: 'bob', reason: 'spam', details: '', status: 'open', createdAt: ts(), updatedAt: ts(),
    }))
  })

  it('el autor retira su confesión con el servicio real; otro usuario no', async () => {
    as('bob')
    await assertFails(deleteOwnConfession('pub'))
    as('alice')
    await assertSucceeds(deleteOwnConfession('pub'))
    const after = await seed((db) => getDoc(doc(db, 'confessions', 'pub')))
    expect(after.data().status).toBe('deleted')
  })

  it('el autor no puede editar el texto ni revivir una confesión retirada o moderada', async () => {
    const db = as('alice')
    await assertFails(updateDoc(doc(db, 'confessions', 'pub'), { text: 'editado', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(db, 'confessions', 'gone'), { status: 'active', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(db, 'confessions', 'removed'), { status: 'active', updatedAt: serverTimestamp() }))
  })

  it('un moderador retira contenido y resuelve el reporte en un solo batch (servicio real)', async () => {
    as('mod')
    await assertSucceeds(moderateConfession({
      confessionId: 'pub', moderatorUid: 'mod', action: 'removed', note: 'Incumple las normas',
      report: { id: 'r1', status: 'resolved' },
    }))

    const confession = await seed((db) => getDoc(doc(db, 'confessions', 'pub')))
    const report = await seed((db) => getDoc(doc(db, 'reports', 'r1')))
    const moderationCase = await seed((db) => getDoc(doc(db, 'moderationCases', 'pub')))
    expect(confession.data().status).toBe('removed')
    expect(report.data().status).toBe('resolved')
    expect(moderationCase.data()).toMatchObject({ lastAction: 'removed', moderatedBy: 'mod' })
  })

  it('un estudiante no puede moderar', async () => {
    as('bob')
    await assertFails(moderateConfession({ confessionId: 'pub', moderatorUid: 'bob', action: 'removed' }))
  })

  it('moderar exige dejar un caso de moderación a nombre del moderador', async () => {
    await assertFails(updateDoc(doc(as('mod'), 'confessions', 'pub'), { status: 'removed', updatedAt: serverTimestamp() }))
  })

  it('un moderador no puede reescribir el contenido', async () => {
    await assertFails(updateDoc(doc(as('mod'), 'confessions', 'pub'), { text: 'censurado', updatedAt: serverTimestamp() }))
  })

  it('las confesiones no se pueden borrar físicamente', async () => {
    await assertFails(deleteDoc(doc(as('alice'), 'confessions', 'pub')))
    await assertFails(deleteDoc(doc(as('admin'), 'confessions', 'pub')))
  })
})

// ---------------------------------------------------------------------------------------------
// confessionAuthors (privacidad del anonimato)
// ---------------------------------------------------------------------------------------------
describe('confessionAuthors', () => {
  beforeEach(async () => {
    await seedConfession('pub', 'alice')
  })

  it('la autoría solo la ven el autor y la moderación', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'confessionAuthors', 'pub')))
    await assertSucceeds(getDoc(doc(as('mod'), 'confessionAuthors', 'pub')))
    await assertSucceeds(getDoc(doc(as('admin'), 'confessionAuthors', 'pub')))
    await assertFails(getDoc(doc(as('bob'), 'confessionAuthors', 'pub')))
    await assertFails(getDoc(doc(as(null), 'confessionAuthors', 'pub')))
  })

  it('nadie puede averiguar las confesiones de otra persona por consulta', async () => {
    await assertFails(getDocs(query(collection(as('bob'), 'confessionAuthors'), where('authorUid', '==', 'alice'))))
    await assertSucceeds(getDocs(query(collection(as('alice'), 'confessionAuthors'), where('authorUid', '==', 'alice'))))
  })

  it('la autoría es inmutable', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'confessionAuthors', 'pub'), { authorUid: 'bob' }))
    await assertFails(deleteDoc(doc(as('alice'), 'confessionAuthors', 'pub')))
  })
})

// ---------------------------------------------------------------------------------------------
// socialActivity (reacciones y comentarios)
// ---------------------------------------------------------------------------------------------
describe('reacciones', () => {
  beforeEach(async () => {
    await seedConfession('pub', 'alice')
    await seedConfession('priv', 'alice', { visibility: 'private' })
    await seedConfession('removed', 'alice', { status: 'removed' })
  })

  // NOTA: este caso ejecuta el servicio real, que primero lee reactionOwners/{id} aunque todavía
  // no exista. Si la regla de lectura de reactionOwners no contempla `resource == null`, esta
  // prueba fallará con permission-denied y habrá revelado que dar like por primera vez no funciona.
  it('dar y quitar like con el servicio real', async () => {
    as('bob')
    expect(await assertSucceeds(toggleReaction({ confessionId: 'pub', ...actor('bob') }))).toBe(true)
    expect(await assertSucceeds(toggleReaction({ confessionId: 'pub', ...actor('bob') }))).toBe(false)
  })

  it('control positivo: una reacción directa válida se acepta', async () => {
    await assertSucceeds(rawReaction('bob', 'pub'))
  })

  it('el autor no puede reaccionar a su propia confesión', async () => {
    await assertFails(rawReaction('alice', 'pub'))
  })

  it('no se reacciona a confesiones privadas ni retiradas', async () => {
    await assertFails(rawReaction('bob', 'priv'))
    await assertFails(rawReaction('bob', 'removed'))
  })

  it.each([
    ['sin el registro de dueño', { skipOwner: true }],
    ['con un nombre de actor falsificado', { activity: { actorDisplayName: 'Rectoría' } }],
    ['con un campo adicional', { activity: { boost: 100 } }],
    ['con un estado distinto de active', { activity: { status: 'removed' } }],
    ['con un dueño falsificado', { owner: { ownerUid: 'carol' } }],
  ])('rechaza una reacción %s', async (_label, options) => {
    await assertFails(rawReaction('bob', 'pub', options))
  })

  it('no se puede reaccionar en nombre de otra persona', async () => {
    await assertFails(rawReaction('bob', 'pub', { idForUid: 'carol' }))
  })

  it('cuentas suspendidas o no institucionales no pueden reaccionar', async () => {
    await assertFails(rawReaction('banned', 'pub'))
    await assertFails(rawReaction('outsider', 'pub'))
  })

  it('nadie puede quitar la reacción de otra persona', async () => {
    await seedReaction('pub', 'bob')
    await assertFails(deleteDoc(doc(as('carol'), 'socialActivity', 'pub_bob')))
  })
})

describe('comentarios', () => {
  beforeEach(async () => {
    await seedConfession('pub', 'alice')
    await seedConfession('priv', 'alice', { visibility: 'private' })
  })

  it('comentar con el servicio real', async () => {
    as('bob')
    const id = await assertSucceeds(addComment({ confessionId: 'pub', ...actor('bob'), text: 'Qué bonito' }))
    const saved = await seed((db) => getDoc(doc(db, 'socialActivity', id)))
    expect(saved.data()).toMatchObject({ kind: 'comment', text: 'Qué bonito', actorDisplayName: 'Usuario bob' })
  })

  it('control positivo: un comentario directo válido se acepta', async () => {
    await assertSucceeds(rawComment('bob', 'pub'))
  })

  it.each([
    ['vacío', { activity: { text: '' } }],
    ['de más de 280 caracteres', { activity: { text: 'a'.repeat(281) } }],
    ['con un nombre de actor falsificado', { activity: { actorDisplayName: 'Rectoría' } }],
    ['con un campo adicional', { activity: { pinned: true } }],
    ['sin registro de autor', { skipAuthor: true }],
    ['con un autor falsificado', { author: { authorUid: 'carol' } }],
  ])('rechaza un comentario %s', async (_label, options) => {
    await assertFails(rawComment('bob', 'pub', options))
  })

  it('el autor de la confesión no comenta en ella y no se comenta en privadas', async () => {
    await assertFails(rawComment('alice', 'pub'))
    await assertFails(rawComment('bob', 'priv'))
  })

  it('una cuenta suspendida no puede comentar (servicio real)', async () => {
    as('banned')
    await assertFails(addComment({ confessionId: 'pub', ...actor('banned'), text: 'Hola' }))
  })

  it('solo el autor borra su comentario; la moderación solo cambia su estado', async () => {
    await seedComment('cm1', 'pub', 'bob')

    as('carol')
    await assertFails(deleteOwnComment('cm1'))
    as('bob')
    await assertSucceeds(deleteOwnComment('cm1'))

    await seedComment('cm2', 'pub', 'bob')
    await assertSucceeds(updateDoc(doc(as('mod'), 'socialActivity', 'cm2'), { status: 'removed', updatedAt: serverTimestamp() }))
    await seedComment('cm3', 'pub', 'bob')
    await assertFails(updateDoc(doc(as('mod'), 'socialActivity', 'cm3'), { text: 'censurado', updatedAt: serverTimestamp() }))
  })
})

describe('contadores, comentarios y notificaciones (consultas del feed)', () => {
  beforeEach(async () => {
    await seedConfession('pub', 'alice')
    await seedConfession('priv', 'alice', { visibility: 'private' })
    await seedReaction('pub', 'bob')
    await seedReaction('pub', 'carol')
    await seedComment('cm1', 'pub', 'bob', { text: 'Activo' })
    await seedComment('cm2', 'pub', 'carol', { status: 'deleted', text: 'Borrado' })
    await seedComment('cm3', 'priv', 'bob')
  })

  it('las consultas count() son aceptadas por las reglas y cuentan solo lo activo', async () => {
    for (const uid of [null, 'bob']) {
      as(uid)
      const counts = await assertSucceeds(getConfessionSocialCounts('pub'))
      expect(counts).toEqual({ likeCount: 2, commentCount: 1 })
    }
  })

  it('la actividad de una confesión privada solo la consulta su autor', async () => {
    as(null)
    await assertFails(getConfessionSocialCounts('priv'))
    as('bob')
    await assertFails(getConfessionSocialCounts('priv'))
    as('alice')
    expect(await assertSucceeds(getConfessionSocialCounts('priv'))).toEqual({ likeCount: 0, commentCount: 1 })
  })

  it('el panel de comentarios solo recibe los activos', async () => {
    as(null)
    const comments = await assertSucceeds(once((ok, fail) => subscribeConfessionComments('pub', ok, fail)))
    expect(comments.map((item) => item.id)).toEqual(['cm1'])
  })

  it('las notificaciones reales funcionan para el autor y no filtran nada a terceros', async () => {
    as('alice')
    const notifications = await assertSucceeds(loadSocialNotifications('alice'))
    // 2 reacciones + comentarios activos de sus confesiones (pub y priv); el borrado no cuenta.
    expect(notifications).toHaveLength(4)
    expect(notifications.every((item) => item.confessionLabel === 'Biblioteca')).toBe(true)

    as('bob')
    expect(await assertSucceeds(loadSocialNotifications('bob'))).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// savedConfessions, reports, hiddenConfessions
// ---------------------------------------------------------------------------------------------
describe('guardados', () => {
  beforeEach(async () => {
    await seedConfession('pub', 'alice')
    await seedConfession('priv', 'alice', { visibility: 'private' })
  })

  const saveRaw = (uid, id, data) => setDoc(doc(as(uid), 'savedConfessions', id), {
    ownerUid: uid, confessionId: 'pub', createdAt: serverTimestamp(), ...data,
  })

  // NOTA: igual que en las reacciones, el servicio lee savedConfessions/{id} antes de existir.
  it('guardar y quitar con el servicio real', async () => {
    as('bob')
    expect(await assertSucceeds(toggleSaved({ uid: 'bob', confessionId: 'pub' }))).toBe(true)
    expect(await assertSucceeds(toggleSaved({ uid: 'bob', confessionId: 'pub' }))).toBe(false)
  })

  it('control positivo: guardado directo válido', async () => {
    await assertSucceeds(saveRaw('bob', 'bob_pub'))
  })

  it('no se guarda una confesión privada ajena, pero sí la propia', async () => {
    await assertFails(saveRaw('bob', 'bob_priv', { confessionId: 'priv' }))
    await assertSucceeds(saveRaw('alice', 'alice_priv', { confessionId: 'priv' }))
  })

  it('no se guarda a nombre de otra persona ni con un id manipulado', async () => {
    await assertFails(saveRaw('bob', 'bob_pub', { ownerUid: 'carol' }))
    await assertFails(saveRaw('bob', 'carol_pub'))
  })

  it('cada persona ve solo sus guardados', async () => {
    await seed((db) => setDoc(doc(db, 'savedConfessions', 'bob_pub'), { ownerUid: 'bob', confessionId: 'pub', createdAt: ts() }))
    as('bob')
    const ids = await assertSucceeds(once((ok, fail) => subscribeSavedConfessionIds('bob', ok, fail)))
    expect([...ids]).toEqual(['pub'])

    await assertFails(getDocs(query(collection(as('carol'), 'savedConfessions'), where('ownerUid', '==', 'bob'))))
  })
})

describe('reportes y ocultas', () => {
  beforeEach(async () => {
    await seedConfession('pub', 'alice')
  })

  it('un usuario reporta con el servicio real; el autor no puede reportarse', async () => {
    as('bob')
    await assertSucceeds(reportConfession({ confessionId: 'pub', reporterUid: 'bob', reason: 'harassment', details: 'Detalle' }))
    as('alice')
    await assertFails(reportConfession({ confessionId: 'pub', reporterUid: 'alice', reason: 'spam' }))
    as(null)
    await assertFails(reportConfession({ confessionId: 'pub', reporterUid: 'x', reason: 'spam' }))
  })

  it('solo se puede reportar una vez por publicación (el segundo intento es una actualización)', async () => {
    as('bob')
    await assertSucceeds(reportConfession({ confessionId: 'pub', reporterUid: 'bob', reason: 'spam' }))
    await assertFails(reportConfession({ confessionId: 'pub', reporterUid: 'bob', reason: 'hate' }))
  })

  it('rechaza motivos inválidos y detalles demasiado largos', async () => {
    const db = as('bob')
    const report = (overrides) => setDoc(doc(db, 'reports', `pub_bob`), {
      confessionId: 'pub', reporterUid: 'bob', reason: 'spam', details: '', status: 'open',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...overrides,
    })
    await assertFails(report({ reason: 'porque_si' }))
    await assertFails(report({ details: 'a'.repeat(501) }))
    await assertFails(report({ status: 'resolved' }))
    await assertFails(report({ reporterUid: 'carol' }))
    await assertSucceeds(report({}))
  })

  it('los reportes los leen quien los hizo y la moderación; la moderación los actualiza', async () => {
    await seed((db) => setDoc(doc(db, 'reports', 'pub_bob'), {
      confessionId: 'pub', reporterUid: 'bob', reason: 'spam', details: '', status: 'open', createdAt: ts(), updatedAt: ts(),
    }))
    await assertSucceeds(getDoc(doc(as('bob'), 'reports', 'pub_bob')))
    await assertFails(getDoc(doc(as('carol'), 'reports', 'pub_bob')))
    await assertSucceeds(getDocs(collection(as('mod'), 'reports')))
    await assertFails(getDocs(collection(as('carol'), 'reports')))
    await assertSucceeds(getDocs(query(collection(as('bob'), 'reports'), where('reporterUid', '==', 'bob'))))

    as('mod')
    await assertSucceeds(updateReportStatus('pub_bob', 'reviewing'))
    as('bob')
    await assertFails(updateReportStatus('pub_bob', 'dismissed'))
  })

  it('un usuario oculta publicaciones solo para sí mismo', async () => {
    as('bob')
    await assertSucceeds(hideConfession({ confessionId: 'pub', ownerUid: 'bob' }))
    await assertFails(setDoc(doc(as('bob'), 'hiddenConfessions', 'alice_pub'), {
      ownerUid: 'alice', confessionId: 'pub', createdAt: serverTimestamp(),
    }))
  })
})

// ---------------------------------------------------------------------------------------------
// Colecciones administrativas y deny-by-default
// ---------------------------------------------------------------------------------------------
describe('colecciones administrativas', () => {
  it('el registro de auditoría es solo para administradores', async () => {
    await assertSucceeds(getDocs(collection(as('admin'), 'adminAuditLogs')))
    await assertFails(getDocs(collection(as('mod'), 'adminAuditLogs')))
    await assertFails(getDocs(collection(as('bob'), 'adminAuditLogs')))
  })

  it('los casos de moderación son solo para moderación', async () => {
    await assertSucceeds(getDocs(collection(as('mod'), 'moderationCases')))
    await assertFails(getDocs(collection(as('bob'), 'moderationCases')))
  })

  it('cualquier colección no declarada está denegada, incluso para administradores', async () => {
    await assertFails(setDoc(doc(as('admin'), 'secretos', 'x'), { valor: 1 }))
    await assertFails(getDoc(doc(as('admin'), 'secretos', 'x')))
  })
})
