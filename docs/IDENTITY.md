# Identity & Firebase — Fase 2

Esta fase convierte las pantallas de autenticación de ITLA Crush en flujos funcionales respaldados por Firebase Authentication y Cloud Firestore.

## Alcance

- Registro con correo y contraseña.
- Inicio y cierre de sesión.
- Persistencia local de sesión mediante Firebase Auth.
- Recuperación de contraseña por correo.
- Perfil básico del usuario en `users/{uid}`.
- Rutas protegidas para `/app`, `/crear` y `/perfil`.
- Reglas Firestore de denegación por defecto.
- Perfiles legibles únicamente por su propietario.
- Los documentos de confesiones permanecen bloqueados hasta la fase Core.

## Configuración local

Copia `.env.example` a `.env` y completa las variables entregadas por Firebase Console:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

La aplicación detecta si Firebase no está configurado y evita inicializar el SDK con valores vacíos.

## Firebase Console

Para utilizar los flujos reales:

1. Crea o selecciona el proyecto Firebase de ITLA Crush.
2. Registra una aplicación Web.
3. Habilita **Authentication → Sign-in method → Email/Password**.
4. Crea una base de datos **Cloud Firestore**.
5. Copia la configuración Web al archivo `.env` local.
6. Publica las reglas de seguridad incluidas en `firestore.rules`.

Con Firebase CLI instalado y autenticado:

```bash
firebase deploy --only firestore:rules
```

## Modelo de perfil

```json
{
  "uid": "firebase-uid",
  "displayName": "Nombre visible",
  "email": "usuario@correo.com",
  "role": "student",
  "status": "active",
  "createdAt": "server timestamp",
  "updatedAt": "server timestamp"
}
```

`role`, `status`, `uid` y `email` no pueden ser escalados o sustituidos desde el cliente mediante una actualización del perfil. En esta fase, únicamente `displayName` y `updatedAt` quedan previstos como campos mutables por el propietario.

## Seguridad

Las reglas actuales siguen un enfoque deny-by-default:

- Un usuario autenticado solo puede crear y leer su propio perfil.
- La creación fuerza `role = student` y `status = active`.
- El cliente no puede cambiar su rol, estado, UID o correo mediante Firestore.
- La eliminación de perfiles está deshabilitada.
- La colección `confessions` rechaza todas las lecturas y escrituras hasta que la Fase 3 defina su modelo de acceso.
- Cualquier otra colección no declarada queda bloqueada.

Ocultar una pantalla en React no constituye autorización; Firestore Security Rules siguen siendo la frontera de autorización para los datos.

## Rutas

| Ruta | Acceso | Función |
|---|---|---|
| `/login` | Público | Inicio de sesión |
| `/registro` | Público | Registro |
| `/recuperar` | Público | Recuperación de contraseña |
| `/app` | Autenticado | Feed |
| `/crear` | Autenticado | Crear confesión |
| `/perfil` | Autenticado | Perfil y cierre de sesión |

## Siguiente fase

La Fase 3 debe implementar el dominio real de confesiones: creación, feed Firestore, destinatarios, visibilidad pública/privada, anonimato, reglas de acceso específicas y consultas seguras.
