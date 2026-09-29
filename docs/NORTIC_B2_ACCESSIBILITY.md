# Alineación voluntaria con NORTIC B2:2017

> **Importante:** ITLA Crush es un proyecto académico independiente y no oficial. Este documento describe una **alineación técnica voluntaria** con la NORTIC B2:2017; no constituye certificación, aval ni declaración oficial de cumplimiento por parte de ITLA, OGTIC, CONADIS o INDOCAL.

## Objetivo

Aplicar a ITLA Crush los principios y criterios de accesibilidad web definidos por la **NORTIC B2:2017 — Norma sobre Accesibilidad Web del Estado Dominicano**, tomando como meta técnica los criterios de los niveles **A y AA** que sean aplicables al proyecto.

La implementación se apoya en los cuatro principios de accesibilidad descritos por la norma:

- Perceptible.
- Operable.
- Comprensible.
- Robusto.

## Alcance

Esta política aplica a:

- `/home`
- `/login`
- `/registro`
- `/recuperar`
- `/app`
- `/crear`
- `/mis-confesiones`
- `/perfil`
- `/moderacion`
- páginas legales y de normas de la comunidad.

También cubre los procesos completos de autenticación, publicación de confesiones, navegación del feed, perfil y moderación.

## Nivel objetivo

La meta del proyecto es mantener una base compatible con los criterios **A + AA** aplicables. La conformidad no debe declararse únicamente por implementar una parte de la interfaz: debe verificarse el sitio completo y cada proceso de extremo a extremo.

## Controles implementados

- Documento en español mediante `lang="es"`.
- Títulos de página descriptivos según la ruta.
- Enlaces para saltar directamente al contenido principal.
- Estructura semántica con `main`, `nav`, `aside`, `header` y `footer`.
- Alternativas textuales para imágenes informativas.
- Iconos decorativos ocultos a tecnologías de asistencia.
- Etiquetas explícitas para formularios.
- Mensajes de error con `role="alert"` y estados dinámicos con `role="status"`.
- Navegación y activación por teclado de componentes interactivos.
- Indicador de foco visible.
- Estados de botones con `aria-pressed` cuando corresponde.
- Soporte para `prefers-reduced-motion`.
- Diseño responsive y uso predominante de unidades relativas para texto y espacios.
- Controles de autenticación, privacidad y moderación con nombres accesibles.

## Verificaciones pendientes antes de declarar conformidad interna

1. Auditoría de contraste mínimo en todos los estados visuales.
2. Prueba de zoom al 200 % y reflow sin pérdida de contenido.
3. Recorrido completo solo con teclado.
4. Pruebas con lector de pantalla (NVDA o equivalente).
5. Validación automática con axe/Lighthouse como apoyo, nunca como única evidencia.
6. Revisión de orden de encabezados y landmarks en todas las rutas.
7. Verificación de mensajes de validación y sugerencias ante errores.
8. Revisión de cualquier contenido multimedia futuro para subtítulos, transcripción o audiodescripción cuando aplique.
9. Revisión de accesibilidad de componentes de terceros.
10. Registro de hallazgos y correcciones antes de cada release.

## Seguimiento

- Revisión funcional de accesibilidad antes de cada release.
- Revisión técnica general trimestral mientras el proyecto permanezca activo.
- Todo cambio de interfaz debe conservar navegación por teclado, foco visible, etiquetas y nombres accesibles.
- Los hallazgos de accesibilidad deben tratarse como defectos funcionales, no solo visuales.

## Referencias internas de la norma

- Sección 1.04 — Política Interna para la Accesibilidad Web.
- Sección 2.01 — Niveles de conformidad.
- Subsecciones 2.01.1 y 2.01.2 — Niveles A y AA.
- Sección 2.02 — Páginas completas.
- Sección 2.03 — Procesos completos.
- Capítulo III — Principios Perceptible, Operable, Comprensible y Robusto.
