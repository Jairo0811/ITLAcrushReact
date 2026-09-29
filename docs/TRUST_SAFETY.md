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
