# Sistema visual — ITLA Crush

ITLA Crush conserva su identidad social propia, pero evita parecer una plantilla genérica de “glassmorphism + neón”. La interfaz utiliza un lenguaje visual técnico inspirado en la identidad institucional del ITLA y en el carácter académico del proyecto.

> ITLA Crush es un proyecto académico independiente y no una aplicación oficial del Instituto Tecnológico de Las Américas.

## Principios

### 1. Institución primero, producto después

La estructura visual usa azul institucional y tonos técnicos como base. El magenta de ITLA Crush funciona como señal social y no como color dominante de todas las superficies.

Variables principales:

- ITLA Blue: `#023877`
- ITLA Red: `#E52229`
- Tech Blue: `#2593BF`
- Signal Cyan: `#1BBDD7`
- Crush Pink: `#FF3B94`
- Crush Magenta: `#C21872`
- Surface 0: `#050A12`
- Surface 1: `#07111F`
- Surface 2: `#0B1828`

Los colores por tecnólogo siguen siendo semánticos y se aplican en badges/perfiles sin reemplazar la jerarquía principal del producto.

### 2. Geometría técnica

Se redujeron los radios excesivos y las tarjetas tipo “burbuja”.

- Controles principales: 7–11 px.
- Tarjetas de contenido: 9–14 px.
- Pills solamente cuando la semántica realmente representa un estado/badge.
- Líneas verticales, rails y bordes finos sustituyen buena parte del glow decorativo.

### 3. Superficies de producto, no de plantilla

Las tarjetas usan superficies navy casi opacas, líneas azules de baja intensidad y sombras contenidas. El blur queda limitado para evitar el aspecto genérico de dashboard generado automáticamente.

### 4. Tipografía

- UI/títulos: `Bahnschrift`, con fallback a Segoe UI/system.
- Metadatos técnicos: `Cascadia Code`, Consolas o monospace equivalente.
- No se depende de fuentes web externas para mantener el proyecto autocontenido.

### 5. Identidad Crush como señal

El rosa/magenta se reserva para:

- palabras de énfasis;
- estado activo;
- Social Core;
- hashtags;
- pequeños rails/accent lines;
- elementos de marca del logo.

Esto permite que el producto se sienta ITLA + tecnológico sin perder la personalidad de “Crush”.

### 6. Elementos técnicos reales

La UI puede mostrar identificadores reales del proyecto como:

- `SOF-011`
- `React + Firebase`
- `Community // Firebase`
- Proyecto académico

Se evita inventar métricas, estados de sistema o datos institucionales.

### 7. Fondo

El fondo usa:

- navy casi negro;
- grid técnico de baja opacidad;
- puntos/circuitos discretos;
- iluminación azul y magenta localizada.

No se usan grandes gradientes multicolor sin función visual.

### 8. Accesibilidad

El refresh mantiene:

- foco visible;
- contraste reforzado en texto secundario;
- reduced motion existente;
- breakpoints responsive;
- jerarquía por landmarks;
- botones y estados interactivos distinguibles sin depender únicamente del color.

## Componentes actualizados

- Landing y hero.
- Navbar.
- Phone mockup.
- Feed.
- Sidebar.
- Topbar.
- Temas de la comunidad.
- Tarjetas de confesión.
- Composer.
- Formularios.
- Login/registro/perfil.
- Demo.
- Moderación.
- Administración.
- Páginas legales.
- Footer.
- Navegación móvil.

## Criterio visual

Cuando se agregue un componente nuevo, debe responder a estas preguntas:

1. ¿Usa el azul como estructura y el magenta como señal?
2. ¿Necesita realmente un pill o un radio grande?
3. ¿El glow comunica algo o solo decora?
4. ¿El dato mostrado es real?
5. ¿El componente se entiende también sin animación?
6. ¿Mantiene el carácter académico no oficial del proyecto?

Si falla en varias de estas preguntas, probablemente rompe el sistema visual.
