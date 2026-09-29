# Fase 3 — Crush Core / Firestore

Esta fase sustituye el feed mock por confesiones persistidas en Cloud Firestore y mantiene el principio central de privacidad de ITLA Crush:

> Anónimo para la comunidad no significa anónimo para la plataforma.

## Modelo

### `confessions/{confessionId}`

Documento visible según su `visibility` y `status`. No contiene `authorUid`, evitando que el identificador interno del autor sea expuesto al cliente al leer una publicación anónima.

Campos:

- `recipientText`
- `text`
- `visibility`: `public` o `private`
- `isAnonymous`
- `authorDisplayName`: vacío cuando la publicación es anónima
- `authorProgram`: vacío cuando la publicación es anónima; contiene el Tecnólogo en publicaciones identificadas
- `tags`
- `status`: `active` o `deleted`
- `likeCount`
- `commentCount`
- `createdAt`
- `updatedAt`

### `confessionAuthors/{confessionId}`

Mapa interno de trazabilidad:

- `authorUid`
- `createdAt`

Solo el propietario y cuentas con rol `admin` o `moderator` pueden leer esta colección. El feed público nunca recibe el UID del autor.

## Escritura atómica

La creación utiliza un `writeBatch` para guardar simultáneamente la confesión pública/privada y su mapa interno de autoría. Las reglas usan `getAfter()` para exigir que ambos documentos se creen juntos y pertenezcan al usuario autenticado.

## Lectura

El feed escucha en tiempo real confesiones:

- `visibility == public`
- `status == active`
- ordenadas por `createdAt desc`
- máximo 50 documentos

Las publicaciones privadas quedan accesibles solo al propietario o a moderadores. En esta fase todavía no existe resolución segura de destinatarios por `uid`, por lo que el modo privado se trata como contenido visible únicamente para su autor.

## Pendiente para Trust & Safety

Reportes, bloqueos, sanciones, moderación avanzada, comentarios y reacciones persistentes se implementan en fases posteriores. Los contadores se inicializan en cero y no pueden ser manipulados directamente por el cliente.
