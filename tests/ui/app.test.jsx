import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => {
  const noop = () => {}
  return {
    auth: {},
    confession: {
      id: 'c1',
      recipientText: 'Biblioteca',
      text: 'Una confesión de prueba',
      visibility: 'public',
      status: 'active',
      isAnonymous: true,
      authorDisplayName: '',
      authorProgram: '',
      tags: ['#Demo'],
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date(),
    },
    noop,
  }
})

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => mocks.auth,
  AuthProvider: ({ children }) => children,
}))

vi.mock('../../src/services/firebase.js', () => ({ isFirebaseConfigured: true }))

vi.mock('../../src/services/confessionService.js', () => ({
  FEED_PAGE_SIZE: 30,
  FEED_MAX_ITEMS: 120,
  createConfession: vi.fn(),
  deleteOwnConfession: vi.fn(),
  subscribePublicConfessions: vi.fn((callback, _onError, pageSize = 30) => {
    callback(Array.from({ length: pageSize }, (_, index) => ({ ...mocks.confession, id: `c${index + 1}` })))
    return mocks.noop
  }),
  subscribeMyConfessions: vi.fn((_uid, callback) => {
    callback([])
    return mocks.noop
  }),
}))

vi.mock('../../src/services/socialService.js', () => ({
  addComment: vi.fn(),
  getConfessionSocialCounts: vi.fn(() => Promise.resolve({ likeCount: 3, commentCount: 2 })),
  loadSocialNotifications: vi.fn(() => Promise.resolve([])),
  subscribeConfessionComments: vi.fn((_id, callback) => {
    callback([])
    return mocks.noop
  }),
  subscribeFavoriteConfessions: vi.fn((_uid, callback) => { callback([]); return mocks.noop }),
  subscribeSavedConfessions: vi.fn((_uid, callback) => { callback([]); return mocks.noop }),
  subscribeMyReactionIds: vi.fn((_uid, callback) => { callback(new Set()); return mocks.noop }),
  subscribeSavedConfessionIds: vi.fn((_uid, callback) => { callback(new Set()); return mocks.noop }),
  toggleReaction: vi.fn(() => Promise.resolve(true)),
  toggleSaved: vi.fn(() => Promise.resolve(true)),
}))

vi.mock('../../src/services/trustSafetyService.js', () => ({
  REPORT_REASONS: [{ value: 'harassment', label: 'Acoso o intimidación' }],
  REPORT_STATUS_LABELS: { open: 'Abierto', reviewing: 'En revisión', resolved: 'Resuelto', dismissed: 'Descartado' },
  hideConfession: vi.fn(),
  reportConfession: vi.fn(),
  moderateConfession: vi.fn(() => Promise.resolve()),
  updateReportStatus: vi.fn(() => Promise.resolve()),
  subscribeHiddenConfessionIds: vi.fn((_uid, callback) => { callback(new Set()); return mocks.noop }),
  subscribeModerationReports: vi.fn((callback) => {
    callback([{
      id: 'r1',
      confessionId: 'c1',
      reason: 'harassment',
      status: 'open',
      details: '',
      createdAt: new Date(),
      confession: { id: 'c1', text: 'Texto reportado' },
    }])
    return mocks.noop
  }),
}))

vi.mock('../../src/services/authService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  updateOwnProfile: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../src/services/adminService.js', () => ({
  ACCOUNT_STATUSES: ['active', 'suspended', 'blocked'],
  ADMIN_ROLES: ['student', 'moderator', 'admin'],
  loadAdminMetrics: vi.fn(() => Promise.resolve({
    users: { total: 1, active: 1, restricted: 0, admins: 1, moderators: 0 },
    confessions: { total: 0, public: 0, private: 0, anonymous: 0, active: 0, underReview: 0, removed: 0 },
    reports: { total: 0, open: 0, reviewing: 0, resolved: 0, dismissed: 0 },
    moderationCases: 0,
  })),
  subscribeAdminAuditLogs: vi.fn((callback) => { callback([]); return mocks.noop }),
  subscribeAdminUsers: vi.fn((callback) => { callback([]); return mocks.noop }),
  subscribeRecentConfessions: vi.fn((callback) => { callback([]); return mocks.noop }),
  subscribeRecentReports: vi.fn((callback) => { callback([]); return mocks.noop }),
  updateUserAccess: vi.fn(),
}))

const { default: App } = await import('../../src/App.jsx')
const confessionService = await import('../../src/services/confessionService.js')
const socialService = await import('../../src/services/socialService.js')
const trustSafety = await import('../../src/services/trustSafetyService.js')
const authService = await import('../../src/services/authService.js')

function signedOut() {
  mocks.auth = {
    user: null, profile: null, loading: false, error: '', isConfigured: true,
    login: vi.fn(), register: vi.fn(), loginMicrosoft: vi.fn(), logout: vi.fn(), sendPasswordReset: vi.fn(),
  }
}

function signedIn(role = 'student') {
  mocks.auth = {
    ...mocks.auth,
    user: { uid: 'u1', email: 'yo@itla.edu.do', displayName: 'Yo' },
    profile: { uid: 'u1', displayName: 'Yo', role, status: 'active', program: 'desarrollo-software' },
    loading: false,
    isConfigured: true,
  }
}

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <App />
  </MemoryRouter>,
)

beforeEach(() => {
  window.localStorage.clear()
  socialService.loadSocialNotifications.mockImplementation(() => Promise.resolve([]))
  signedOut()
  vi.stubGlobal('scrollTo', () => {})
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('rutas y permisos', () => {
  it('"/" lleva a la portada cuando no hay sesión y al feed cuando sí la hay', async () => {
    renderAt('/')
    expect(await screen.findByRole('heading', { level: 1, name: /Las confesiones también crean/ })).toBeTruthy()
    cleanup()

    signedIn()
    renderAt('/')
    expect(await screen.findByRole('navigation', { name: 'Navegación principal móvil' })).toBeTruthy()
    expect(document.title).toBe('Feed | ITLA Crush')
  })

  it('una ruta protegida sin sesión redirige al login', async () => {
    renderAt('/app?confession=c1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Vuelve a conectar' })).toBeTruthy()
  })

  it('un estudiante recibe 403 en /admin y /moderacion', async () => {
    signedIn('student')
    renderAt('/admin')
    expect(await screen.findByText('403')).toBeTruthy()
    cleanup()
    renderAt('/moderacion')
    expect(await screen.findByText('403')).toBeTruthy()
  })

  it('un moderador entra a /moderacion pero no a /admin', async () => {
    signedIn('moderator')
    renderAt('/moderacion')
    expect(await screen.findByText('Texto reportado')).toBeTruthy()
    cleanup()
    renderAt('/admin')
    expect(await screen.findByText('403')).toBeTruthy()
  })

  it('un administrador carga el panel (código diferido)', async () => {
    signedIn('admin')
    renderAt('/admin')
    expect(await screen.findByRole('heading', { level: 1, name: /Monitoreo y control/ })).toBeTruthy()
  })

  it('una ruta desconocida muestra 404', async () => {
    renderAt('/no-existe')
    expect(await screen.findByText('404')).toBeTruthy()
  })
})

describe('navegación móvil compartida', () => {
  it.each(['/app', '/notificaciones', '/guardados', '/favoritos', '/mis-confesiones', '/perfil'])(
    'está presente en %s',
    async (path) => {
      signedIn()
      renderAt(path)
      const nav = await screen.findByRole('navigation', { name: 'Navegación principal móvil' })
      expect(within(nav).getAllByRole('link')).toHaveLength(5)
    },
  )

  it('el quinto destino depende del rol', async () => {
    signedIn('student')
    renderAt('/app')
    let nav = await screen.findByRole('navigation', { name: 'Navegación principal móvil' })
    expect(within(nav).getByText('Guardados')).toBeTruthy()
    cleanup()

    signedIn('moderator')
    renderAt('/app')
    nav = await screen.findByRole('navigation', { name: 'Navegación principal móvil' })
    expect(within(nav).getByText('Moderar')).toBeTruthy()
    cleanup()

    signedIn('admin')
    renderAt('/app')
    nav = await screen.findByRole('navigation', { name: 'Navegación principal móvil' })
    expect(within(nav).getByText('Admin')).toBeTruthy()
  })
})

describe('feed', () => {
  it('pide la primera página y "Cargar más" amplía el límite', async () => {
    signedIn()
    renderAt('/app')
    const loadMore = await screen.findByRole('button', { name: 'Cargar más confesiones' })
    expect(confessionService.subscribePublicConfessions).toHaveBeenLastCalledWith(expect.any(Function), expect.any(Function), 30)

    fireEvent.click(loadMore)
    await waitFor(() => expect(confessionService.subscribePublicConfessions)
      .toHaveBeenLastCalledWith(expect.any(Function), expect.any(Function), 60))
  })

  it('la portada solo pide 3 confesiones', async () => {
    renderAt('/home')
    await screen.findByRole('heading', { level: 1, name: /Las confesiones también crean/ })
    expect(confessionService.subscribePublicConfessions)
      .toHaveBeenLastCalledWith(expect.any(Function), expect.any(Function), 3)
  })

  it('los contadores se consultan solo cuando la tarjeta se acerca a la pantalla', async () => {
    const observed = []
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback) { this.callback = callback }
      observe(node) { observed.push({ node, callback: this.callback }) }
      disconnect() {}
    })

    signedIn()
    renderAt('/app')
    await screen.findAllByText('Una confesión de prueba')
    expect(observed.length).toBeGreaterThan(0)
    expect(socialService.getConfessionSocialCounts).not.toHaveBeenCalled()

    observed[0].callback([{ isIntersecting: true }])
    await waitFor(() => expect(socialService.getConfessionSocialCounts).toHaveBeenCalledTimes(1))
    expect(socialService.getConfessionSocialCounts).toHaveBeenCalledWith('c1')
  })

  it('los comentarios solo se escuchan al abrir el panel', async () => {
    signedIn()
    const { container } = renderAt('/app')
    await screen.findAllByText('Una confesión de prueba')
    expect(socialService.subscribeConfessionComments).not.toHaveBeenCalled()

    fireEvent.click(container.querySelector('button[aria-controls="comments-c1"]'))
    await waitFor(() => expect(socialService.subscribeConfessionComments).toHaveBeenCalledTimes(1))
    expect(socialService.subscribeConfessionComments.mock.calls[0][0]).toBe('c1')
  })
})

describe('notificaciones', () => {
  it('carga una vez y "Actualizar" vuelve a consultar', async () => {
    signedIn()
    renderAt('/notificaciones')
    await screen.findByText('Todavía no tienes actividad social nueva.')
    expect(socialService.loadSocialNotifications).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /Actualizar/ }))
    await waitFor(() => expect(socialService.loadSocialNotifications).toHaveBeenCalledTimes(2))
  })
})

describe('moderación', () => {
  it('retirar contenido actualiza confesión y reporte en una sola operación', async () => {
    signedIn('moderator')
    renderAt('/moderacion')
    fireEvent.click(await screen.findByRole('button', { name: 'Retirar contenido' }))

    await waitFor(() => expect(trustSafety.moderateConfession).toHaveBeenCalledTimes(1))
    expect(trustSafety.moderateConfession).toHaveBeenCalledWith(expect.objectContaining({
      confessionId: 'c1',
      moderatorUid: 'u1',
      action: 'removed',
      report: { id: 'r1', status: 'resolved' },
    }))
    expect(trustSafety.updateReportStatus).not.toHaveBeenCalled()
  })

  it('deshabilita las acciones mientras una está en curso y muestra el estado en español', async () => {
    let finish
    trustSafety.moderateConfession.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))

    signedIn('moderator')
    renderAt('/moderacion')
    expect(await screen.findByText('Abierto')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Mantener' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Marcar en revisión' }).disabled).toBe(true))
    fireEvent.click(screen.getByRole('button', { name: 'Marcar en revisión' }))
    expect(trustSafety.updateReportStatus).not.toHaveBeenCalled()

    finish()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Marcar en revisión' }).disabled).toBe(false))
  })

  it('un error al marcar en revisión se muestra y no queda sin manejar', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    trustSafety.updateReportStatus.mockRejectedValueOnce(new Error('Sin permisos'))
    signedIn('moderator')
    renderAt('/moderacion')
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar en revisión' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Sin permisos')
    consoleError.mockRestore()
  })
})

describe('acciones destructivas y formulario de crear', () => {
  it('eliminar una confesión pide confirmación antes de actuar', async () => {
    confessionService.subscribeMyConfessions.mockImplementationOnce((_uid, callback) => {
      callback([{ ...mocks.confession, id: 'mine1' }])
      return mocks.noop
    })
    signedIn()
    renderAt('/mis-confesiones')

    fireEvent.click(await screen.findByRole('button', { name: /Eliminar/ }))
    expect(confessionService.deleteOwnConfession).not.toHaveBeenCalled()
    expect(screen.getByRole('group', { name: 'Confirmar acción' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('group', { name: 'Confirmar acción' })).toBeNull()
    expect(confessionService.deleteOwnConfession).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(confessionService.deleteOwnConfession).toHaveBeenCalledWith('mine1'))
  })

  it('el formulario usa grupos de opciones y envía la selección elegida', async () => {
    signedIn()
    renderAt('/crear')

    // Valores por defecto: público y anónimo.
    expect(screen.getByRole('radio', { name: /Público/ }).checked).toBe(true)
    expect(screen.getByRole('radio', { name: /Anónimo/ }).checked).toBe(true)

    fireEvent.change(screen.getByPlaceholderText('Escribe aquí tu mensaje…'), { target: { value: 'Hola ITLA' } })
    fireEvent.click(screen.getByRole('radio', { name: /Privado/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Identificado/ }))
    expect(screen.getByRole('radio', { name: /Público/ }).checked).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: /Publicar Confesión/ }))
    await waitFor(() => expect(confessionService.createConfession).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Hola ITLA', visibility: 'private', isAnonymous: false }),
    ))
    expect(await screen.findByText('Confesión publicada')).toBeTruthy()
  })
})

describe('fase 1: interfaz de red social', () => {
  it('la bienvenida se puede cerrar y no vuelve a aparecer', async () => {
    signedIn()
    renderAt('/app')
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar bienvenida' }))
    expect(screen.queryByRole('region', { name: 'Bienvenida' })).toBeNull()
    expect(window.localStorage.getItem('itla-crush:welcome-dismissed')).toBe('1')

    cleanup()
    renderAt('/app')
    await screen.findAllByText('Una confesión de prueba')
    expect(screen.queryByRole('button', { name: 'Cerrar bienvenida' })).toBeNull()
  })

  it('el feed no muestra texto técnico ni la etiqueta "Estudiante" en anónimas', async () => {
    signedIn()
    renderAt('/app')
    await screen.findAllByText('Una confesión de prueba')
    for (const technical of [/SOF-011/, /Firestore/, /Feed real/, /Feed conectado/]) {
      expect(screen.queryByText(technical)).toBeNull()
    }
    expect(screen.queryByText('Estudiante')).toBeNull()
  })

  it('el hashtag final no se repite en el texto y queda como etiqueta', async () => {
    signedIn()
    renderAt('/app')
    const [text] = await screen.findAllByText('Una confesión de prueba')
    expect(text.textContent).not.toContain('#Demo')
    expect(screen.getAllByRole('button', { name: '#Demo' }).length).toBeGreaterThan(0)
  })

  it('los contadores muestran un guion hasta conocerse y las acciones tienen nombre accesible', async () => {
    const observed = []
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback) { this.callback = callback }
      observe(node) { observed.push({ node, callback: this.callback }) }
      disconnect() {}
    })

    signedIn()
    renderAt('/app')
    expect((await screen.findAllByRole('button', { name: 'Reaccionar, – reacciones' })).length).toBeGreaterThan(0)

    observed[0].callback([{ isIntersecting: true }])
    expect(await screen.findByRole('button', { name: 'Reaccionar, 3 reacciones' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Comentarios, 2' })).toBeTruthy()
  })

  it('el acceso sugiere el correo institucional y permite mostrar la contraseña', async () => {
    renderAt('/login')
    const password = await screen.findByPlaceholderText('••••••••')
    expect(password.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(password.type).toBe('text')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByPlaceholderText('tu.correo@itla.edu.do')).toBeTruthy()
  })
})

describe('fase 2: notificaciones nuevas', () => {
  const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000)
  const sample = () => [
    { id: 'n1', confessionId: 'c1', kind: 'comment', actorDisplayName: 'Valeria', text: 'Qué bonito', confessionLabel: 'Biblioteca', createdAt: minutesAgo(1) },
    { id: 'n2', confessionId: 'c1', kind: 'reaction', actorDisplayName: 'Luis', confessionLabel: 'Biblioteca', createdAt: minutesAgo(2) },
  ]

  it('la campana cuenta lo nuevo, la página lo resalta y luego se marca como visto', async () => {
    socialService.loadSocialNotifications.mockImplementation(() => Promise.resolve(sample()))
    signedIn()
    renderAt('/app')

    const bells = await screen.findAllByRole('link', { name: /Notificaciones, 2 nuevas/ })
    fireEvent.click(bells[0])

    expect(await screen.findByText('Hoy')).toBeTruthy()
    expect(await screen.findAllByText('Nueva')).toHaveLength(2)

    await waitFor(() => expect(screen.queryByText(/2 nuevas/)).toBeNull(), { timeout: 4000 })
    // Lo que era nuevo sigue resaltado durante esta visita, y queda registrado como visto.
    expect(screen.getAllByText('Nueva')).toHaveLength(2)
    expect(window.localStorage.getItem('itla-crush:notifications-seen:u1')).not.toBeNull()
  })

  it('sin novedades no se muestra ningún contador', async () => {
    signedIn()
    renderAt('/app')
    await screen.findAllByText('Una confesión de prueba')
    expect(screen.queryByText(/\d nuevas?/)).toBeNull()
  })

  it('lo ya visto no vuelve a contarse', async () => {
    window.localStorage.setItem('itla-crush:notifications-seen:u1', String(Date.now()))
    socialService.loadSocialNotifications.mockImplementation(() => Promise.resolve(sample()))
    signedIn()
    renderAt('/app')
    await waitFor(() => expect(socialService.loadSocialNotifications).toHaveBeenCalled())
    await screen.findAllByText('Una confesión de prueba')
    expect(screen.queryByText(/\d nuevas?/)).toBeNull()
  })
})

describe('fase 2: perfil', () => {
  it('muestra estadísticas y oculta datos administrativos a un estudiante', async () => {
    confessionService.subscribeMyConfessions.mockImplementationOnce((_uid, callback) => {
      callback([{ ...mocks.confession, id: 'a' }, { ...mocks.confession, id: 'b' }])
      return mocks.noop
    })
    signedIn()
    renderAt('/perfil')

    expect(await screen.findByRole('heading', { level: 1, name: 'Yo' })).toBeTruthy()
    expect(await screen.findByRole('link', { name: '2 Confesiones' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '0 Guardados' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '0 Favoritos' })).toBeTruthy()
    expect(screen.getByText('yo@itla.edu.do')).toBeTruthy()
    expect(screen.queryByText('Rol')).toBeNull()
    expect(screen.queryByRole('link', { name: /Cola de moderación/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Cerrar sesión/ })).toBeTruthy()
  })

  it('el personal ve su rol y sus herramientas', async () => {
    signedIn('admin')
    renderAt('/perfil')
    expect(await screen.findByText('Administrador')).toBeTruthy()
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('link', { name: /Cola de moderación/ })).toBeTruthy()
    expect(main.getByRole('link', { name: /Administración/ })).toBeTruthy()
  })

  it('edita el nombre y el tecnólogo y confirma el cambio', async () => {
    signedIn()
    renderAt('/perfil')
    fireEvent.click(await screen.findByRole('button', { name: /Editar perfil/ }))

    fireEvent.change(screen.getByLabelText('Nombre visible'), { target: { value: 'Jairo M.' } })
    fireEvent.change(screen.getByLabelText('Tecnólogo'), { target: { value: 'multimedia' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(authService.updateOwnProfile).toHaveBeenCalledWith('u1', { displayName: 'Jairo M.', program: 'multimedia' }))
    expect(await screen.findByText('Perfil actualizado.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull()
  })

  it('muestra el error si no se puede guardar y permite cancelar', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    authService.updateOwnProfile.mockRejectedValueOnce(new Error('El nombre debe tener al menos 2 caracteres.'))
    signedIn()
    renderAt('/perfil')
    fireEvent.click(await screen.findByRole('button', { name: /Editar perfil/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect((await screen.findByRole('alert')).textContent).toContain('al menos 2 caracteres')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull()
    consoleError.mockRestore()
  })
})

describe('fase 2: crear confesión', () => {
  it('el mensaje va primero, con foco, y el tema se elige con chips', async () => {
    signedIn()
    renderAt('/crear')

    const message = await screen.findByPlaceholderText('Escribe aquí tu mensaje…')
    const recipient = screen.getByPlaceholderText('@usuario, carrera, grupo o alguien en ITLA')
    expect(message.compareDocumentPosition(recipient) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.activeElement).toBe(message)

    fireEvent.change(message, { target: { value: 'Hola ITLA' } })
    const chip = screen.getByRole('button', { name: '#Biblioteca' })
    fireEvent.click(chip)
    expect(chip.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /Publicar Confesión/ }))

    await waitFor(() => expect(confessionService.createConfession)
      .toHaveBeenCalledWith(expect.objectContaining({ message: 'Hola ITLA', topicTag: '#Biblioteca' })))
  })

  it('avisa cuando el mensaje se acerca al límite', async () => {
    signedIn()
    renderAt('/crear')
    fireEvent.change(await screen.findByPlaceholderText('Escribe aquí tu mensaje…'), { target: { value: 'a'.repeat(460) } })
    expect(screen.getByText('460/500').className).toContain('char-counter--warn')
  })
})
