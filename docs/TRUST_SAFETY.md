# Fase 4 — Trust & Safety

Esta fase incorpora controles de seguridad y moderación sobre el modelo de confesiones de ITLA Crush sin romper el principio de anonimato público.

## Reportes

Los usuarios autenticados pueden reportar una confesión por:

- acoso o intimidación;
- odio o discriminación;
- contenido sexual inapropiado;
- amenazas o violencia;
- privacidad o datos personales;
- spam o contenido engañoso;
- otro motivo.

Cada reporte se almacena en `reports/{confessionId}_{reporterUid}`. El identificador determinista evita múltiples reportes duplicados del mismo usuario sobre la misma confesión.

Un usuario no puede reportar su propia confesión. Los reportes solo pueden ser leídos por quien los creó y por cuentas con rol `moderator` o `admin`.

## Ocultar contenido

`hiddenConfessions` permite que una persona retire de su propio feed una publicación que no desea volver a ver. Esta acción no afecta a otros usuarios ni modifica la confesión original.

## Moderación

Los roles `moderator` y `admin` disponen de una cola de reportes y pueden cambiar el estado de una confesión entre:

- `active`
- `under_review`
- `removed`

Las confesiones `under_review` o `removed` dejan de estar disponibles para el feed público.

Los moderadores también pueden cambiar el estado del reporte:

- `open`
- `reviewing`
- `resolved`
- `dismissed`

Cada acción de moderación puede incluir una nota interna. El documento público de la confesión solo cambia `status` y `updatedAt`; los metadatos internos (`note`, `moderatedBy`, `moderatedAt`, `lastAction`) se guardan por separado en `moderationCases/{confessionId}` para que nunca formen parte del contenido público.

## Privacidad

Los reportes no revelan al denunciante el `authorUid` de una confesión anónima. La trazabilidad de autor sigue almacenada exclusivamente en `confessionAuthors`.

## Roles administrativos

Los roles de moderación no se pueden autoasignar desde el cliente. Deben aprovisionarse mediante una operación administrativa confiable (por ejemplo, consola/SDK administrativo o backend protegido).

## Fuera de alcance

La suspensión administrativa de cuentas, apelaciones, auditoría inmutable y automatización de moderación quedan para una etapa de hardening/backend confiable.

## Protección contra publicaciones automatizadas (30 segundos)

La colección privada `postRateLimits/{uid}` registra la última publicación aceptada. El servicio `createConfession` escribe la confesión, su autoría privada y el límite de frecuencia dentro del mismo `writeBatch`. Las reglas exigen que el registro de frecuencia pertenezca al autor y esté asociado a **la confesión creada en esa misma transacción**, con hora de servidor. No permiten su eliminación, su modificación arbitraria ni la lectura por otros estudiantes.

Por defecto se permite una nueva confesión cada **30 segundos por cuenta**. El cliente muestra el tiempo restante cuando conoce la última publicación, pero la decisión definitiva se aplica en Firestore: manipular el navegador no permite saltarla. Esta defensa ayuda contra automatización básica y no sustituye protección por IP, App Check, filtro de contenido ni la revisión manual de reportes. **No elimina las publicaciones anónimas ni revela su identidad.**

La limitación de comentarios, protección por IP y detección de texto abusivo requieren una política de moderación validada y, para controles robustos, un backend de confianza. No se debe confiar en filtros exclusivamente del navegador como protección de producción.
