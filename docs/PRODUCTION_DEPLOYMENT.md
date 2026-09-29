# Fase 5D — Despliegue y cierre

Esta guía prepara ITLA Crush para su publicación en Firebase Hosting sin confundir la demo académica con la aplicación real.

> ITLA Crush es un proyecto final académico independiente y no una aplicación oficial del Instituto Tecnológico de Las Américas (ITLA).

## 1. Entornos

| Ruta | Propósito |
|---|---|
| `/home` | Landing pública |
| `/demo` | Demostración con datos ficticios |
| `/app` | Aplicación real autenticada |
| `/moderacion` | Trust & Safety |
| `/admin` | Centro administrativo |

Firebase Hosting utiliza una reescritura SPA hacia `/index.html`, por lo que estas rutas funcionan también cuando se abren directamente o se recarga el navegador.

## 2. Configuración de producción

Copia el template:

```bash
cp .env.production.example .env.production
```

En PowerShell:

```powershell
Copy-Item .env.production.example .env.production
```

Completa los valores de la aplicación web de Firebase. El archivo real `.env.production` está ignorado por Git.

Configuración esperada:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=itla-crush-cb9bd.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=itla-crush-cb9bd
VITE_FIREBASE_STORAGE_BUCKET=itla-crush-cb9bd.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## 3. Firebase Authentication

Antes de publicar verifica en Firebase Console:

- Email/Password habilitado.
- Microsoft habilitado.
- Dominios autorizados para:
  - `itla-crush-cb9bd.web.app`
  - `itla-crush-cb9bd.firebaseapp.com`
  - cualquier dominio personalizado futuro.

La URL de redirección configurada en Microsoft Entra debe corresponder con la que Firebase muestra para el proveedor Microsoft. Para el proyecto actual:

```text
https://itla-crush-cb9bd.firebaseapp.com/__/auth/handler
```

El acceso de cuentas institucionales del ITLA puede seguir sujeto a consentimiento o aprobación del administrador del tenant. Eso es una dependencia administrativa externa al código de ITLA Crush.

## 4. Quality gate y compilación de producción

Antes del release ejecuta el hardening completo de la Fase 5C:

```bash
npm ci
npm run quality
npm run audit:prod
```

`npm run quality` incluye lint, tests, comprobación estática de accesibilidad, build y presupuesto de bundle. Lighthouse CI se ejecuta en GitHub Actions porque requiere Chromium.

Si solo necesitas compilar:

```bash
npm run build
```

Para revisar el bundle antes del despliegue:

```bash
npm run preview
```

## 5. Despliegue

Autentica Firebase CLI si es necesario:

```bash
npx firebase-tools login
```

Verifica el proyecto activo:

```bash
npx firebase-tools use
```

Debe mostrar:

```text
itla-crush-cb9bd
```

### Solo reglas e índices

```bash
npm run deploy:firestore
```

### Solo Hosting

```bash
npm run deploy:hosting
```

### Release completo

```bash
npm run deploy:prod
```

Este último comando ejecuta lint, build y despliega Firestore + Hosting.

## 6. URLs esperadas

Después del primer deploy de Hosting:

```text
https://itla-crush-cb9bd.web.app
https://itla-crush-cb9bd.firebaseapp.com
```

La raíz redirige internamente según el estado de sesión:

- visitante → `/home`
- usuario autenticado → `/app`

## 7. Smoke test posterior al deploy

Verifica en incógnito y con una sesión autenticada:

- [ ] `/home` abre correctamente.
- [ ] `/demo` muestra claramente MODO DEMO y no escribe en Firebase.
- [ ] Registro por email/contraseña funciona.
- [ ] Inicio de sesión por email/contraseña funciona.
- [ ] Microsoft abre el proveedor correcto.
- [ ] `/app` exige autenticación.
- [ ] Crear una confesión pública funciona.
- [ ] Crear una confesión privada funciona.
- [ ] Modo anónimo no expone UID en el documento público.
- [ ] Likes/reacciones funcionan.
- [ ] Comentarios funcionan.
- [ ] Favoritos y guardados funcionan.
- [ ] Compartir una URL `/app?confession=...` abre el feed.
- [ ] Notificaciones sociales cargan.
- [ ] Reportar y ocultar funcionan.
- [ ] `/moderacion` rechaza cuentas sin rol autorizado.
- [ ] `/admin` rechaza cuentas que no sean admin.
- [ ] Un admin puede gestionar una cuenta distinta a la propia.
- [ ] Recargar directamente rutas internas no produce 404.
- [ ] Layout responsive funciona en móvil.
- [ ] Footer identifica el proyecto como académico no oficial.

## 8. Cabeceras de Hosting

`firebase.json` añade:

- cache inmutable para archivos versionados de `/assets/**`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy` sin cámara, micrófono ni geolocalización;
- `X-Frame-Options: DENY`.

No se añade una CSP estricta en esta fase para evitar romper flujos externos de Firebase Authentication y Microsoft sin una auditoría específica de orígenes.

## 9. Rollback

Firebase Hosting conserva historial de releases desde Firebase Console. Ante un problema:

1. No modifiques datos manualmente.
2. Revisa el release anterior en Hosting.
3. Ejecuta rollback desde Firebase Console o vuelve a desplegar un commit estable.
4. Si el problema pertenece a reglas de Firestore, restaura el archivo versionado del commit estable y vuelve a desplegar `firestore`.

## 10. Criterio de cierre de Fase 5D

La fase se considera cerrada cuando:

- el PR de producción esté fusionado;
- `npm run lint` y `npm run build` estén en verde;
- reglas/índices y Hosting hayan sido desplegados;
- se complete el smoke test posterior al deploy;
- README refleje la URL pública y el carácter académico no oficial.

La Fase 5C (QA profundo, auditoría NORTIC B2 verificable y optimización de bundle) puede mantenerse como hardening posterior y no debe marcarse como completada sin sus pruebas específicas.
