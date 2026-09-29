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
- `/notificaciones`
- `/guardados`
- `/favoritos`
- `/moderacion`
- `/admin`
- `/demo`
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

## Verificación automatizada incorporada en Fase 5C

El pipeline de CI ejecuta dos capas complementarias:

1. `npm run check:a11y`: comprueba de forma estática idioma, viewport, descripción, skip links, destino `main-content`, foco visible, reducción de movimiento, ausencia de `tabindex` positivo, atributos `alt` y regiones de alerta/estado.
2. Lighthouse CI: audita `/home`, `/demo` y `/login` con un umbral mínimo automatizado de **0.90 en accesibilidad**.

Estas verificaciones son regresiones técnicas reproducibles y forman parte de cada pull request hacia `main`.

## Verificaciones manuales complementarias

La automatización no equivale por sí sola a conformidad NORTIC B2. Para una declaración interna más fuerte todavía deben conservarse evidencias manuales de:

1. Contraste mínimo en estados normales, hover, focus, error y disabled.
2. Zoom al 200 % y reflow sin pérdida de contenido.
3. Recorrido completo solo con teclado.
4. Lector de pantalla (NVDA o equivalente) en procesos críticos.
5. Orden de encabezados y landmarks en todas las rutas.
6. Mensajes de validación y sugerencias ante errores.
7. Multimedia futura: subtítulos, transcripción o audiodescripción cuando aplique.
8. Componentes de terceros.
9. Registro de hallazgos y correcciones antes de cada release.

La documentación de QA de la Fase 5C define el procedimiento y los quality gates reproducibles.

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
