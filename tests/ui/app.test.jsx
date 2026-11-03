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
      text: 'Una confesión de prueba #Demo',
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
    await screen.findAllByText('Una confesión de prueba #Demo')
    expect(observed.length).toBeGreaterThan(0)
    expect(socialService.getConfessionSocialCounts).not.toHaveBeenCalled()

    observed[0].callback([{ isIntersecting: true }])
    await waitFor(() => expect(socialService.getConfessionSocialCounts).toHaveBeenCalledTimes(1))
    expect(socialService.getConfessionSocialCounts).toHaveBeenCalledWith('c1')
  })

  it('los comentarios solo se escuchan al abrir el panel', async () => {
    signedIn()
    const { container } = renderAt('/app')
    await screen.findAllByText('Una confesión de prueba #Demo')
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
