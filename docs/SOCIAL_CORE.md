# Fase 5B — Social Core

La Fase 5B completa las interacciones sociales principales de ITLA Crush sin convertir la restauración académica en una plataforma de mensajería completa.

## Alcance implementado

### Reacciones

- Una reacción tipo corazón por usuario y confesión pública.
- Persistencia en Cloud Firestore.
- La relación privada de propiedad se almacena separada de la actividad visible.
- El autor de una confesión no puede reaccionar a su propia publicación.
- La eliminación de una reacción se realiza de forma atómica con su referencia privada.

### Comentarios

- Comentarios persistentes de hasta 280 caracteres.
- Nombre visible y tecnólogo del comentarista.
- Autoría interna separada mediante `commentAuthors`.
- Los autores no pueden comentar sus propias confesiones.
- Los comentarios solo se permiten sobre confesiones públicas y activas.

### Favoritos

La ruta `/favoritos` se deriva de las reacciones del usuario. No duplica el contenido de la confesión: conserva referencias y resuelve el documento original al cargar la colección.

### Guardados

La ruta `/guardados` es privada para cada usuario y utiliza `savedConfessions`.

### Compartir

Cada tarjeta puede compartir una URL como:

```
/app?confession={confessionId}
```

Se usa Web Share API cuando el navegador la soporta y, en caso contrario, se copia el enlace al portapapeles.

### Notificaciones

La ruta `/notificaciones` deriva actividad real de reacciones y comentarios recibidos en las confesiones propias.

La implementación no requiere exponer el UID del autor de la confesión pública. Las notificaciones se construyen a partir de las confesiones que ya pertenecen a la cuenta autenticada.

## Colecciones

- `socialActivity/{activityId}`: actividad social pública asociada a una confesión.
- `reactionOwners/{confessionId_uid}`: relación privada que garantiza una sola reacción por usuario.
- `commentAuthors/{commentId}`: trazabilidad privada del autor de un comentario.
- `savedConfessions/{uid_confessionId}`: relación privada de guardados.

## Seguridad

Las reglas de Firestore validan que:

- solo cuentas activas puedan crear interacciones;
- la confesión objetivo exista, sea pública y esté activa;
- una cuenta no interactúe socialmente con su propia confesión;
- una reacción tenga una relación privada correspondiente;
- un comentario tenga una relación privada de autoría correspondiente;
- los guardados solo puedan ser leídos y modificados por su propietario.

## Fuera de alcance

La mensajería directa entre usuarios no forma parte del cierre obligatorio de la Fase 5B. Se eliminan accesos visuales que pudieran sugerir que existe una bandeja de mensajes funcional.

Las pestañas de recomendación `Para ti` y `Tendencias` permanecen como trabajo futuro porque requieren una estrategia de ranking/recomendación independiente del Social Core.

## Despliegue

Después de actualizar la rama local se deben desplegar las reglas nuevas:

```bash
npx firebase-tools deploy --only firestore
```
