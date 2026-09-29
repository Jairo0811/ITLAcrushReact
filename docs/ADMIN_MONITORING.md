# Centro de Administración y Monitoreo

ITLA Crush incluye un panel administrativo separado de la experiencia normal de usuario.

## Rutas y responsabilidades

- `/app`: experiencia principal de la comunidad.
- `/moderacion`: cola operativa de Trust & Safety para roles `moderator` y `admin`.
- `/admin`: centro de monitoreo global, reservado exclusivamente para `admin`.

## Qué monitorea `/admin`

El dashboard administrativo consulta métricas agregadas directamente desde Cloud Firestore:

### Usuarios

- Total de perfiles registrados.
- Cuentas activas.
- Cuentas con estado distinto de `active`.
- Cantidad de administradores.
- Cantidad de moderadores.
- Usuarios registrados recientemente.

### Confesiones

- Total.
- Públicas.
- Privadas.
- Anónimas.
- Activas.
- En revisión.
- Retiradas.
- Actividad reciente.

### Trust & Safety

- Reportes totales.
- Abiertos.
- En revisión.
- Resueltos.
- Descartados.
- Casos de moderación registrados.
- Reportes recientes.

## Privacidad

El Centro de Administración no muestra automáticamente la identidad interna detrás de una confesión anónima. Las métricas y el monitoreo de contenido funcionan sin exponer `authorUid` en la interfaz.

La trazabilidad interna sigue almacenada por separado en `confessionAuthors` y solo debe consultarse cuando exista una necesidad legítima de seguridad o moderación.

## Control de acceso

La ruta `/admin` requiere:

1. Usuario autenticado.
2. Perfil con `status: "active"`.
3. Perfil con `role: "admin"`.

La ruta `/moderacion` acepta `role: "moderator"` o `role: "admin"`.

Firestore aplica además una función `isAdmin()` para permitir a un administrador leer perfiles globales. El resto de las colecciones conserva las restricciones de Trust & Safety existentes.

## Aprovisionamiento inicial de administradores

El frontend **no permite autoasignarse** el rol `admin`.

Para un entorno de desarrollo, el administrador inicial debe aprovisionarse desde una operación confiable, por ejemplo Firebase Console:

1. Autenticar/registrar primero la cuenta.
2. Abrir Cloud Firestore.
3. Entrar a `users/{uid}`.
4. Cambiar el campo `role` de `student` a `admin`.
5. Mantener `status: "active"`.
6. Cerrar sesión y volver a iniciar sesión para refrescar el perfil local.

En un entorno productivo, la asignación de roles debe hacerse mediante una herramienta administrativa confiable o Firebase Admin SDK, no desde el navegador del usuario.

## Despliegue de reglas

Los cambios administrativos requieren desplegar las reglas de Firestore:

```bash
npx firebase-tools deploy --only firestore
```

## Alcance actual

La primera versión del panel es principalmente de **monitoreo de solo lectura**. Las acciones de moderación continúan en `/moderacion`.

La gestión avanzada de cuentas (suspender, rehabilitar, cambiar roles, auditoría detallada y bitácora administrativa) debe incorporarse de manera controlada en iteraciones posteriores, con reglas específicas y trazabilidad de cada acción.
