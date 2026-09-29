# Sistema visual — ITLA Crush

ITLA Crush conserva su identidad social propia en magenta, violeta y navy, pero evita parecer una plantilla genérica de “glassmorphism + neón”. La modernización se concentra en geometría, jerarquía, tipografía y composición técnica sin sustituir la paleta original que ya identificaba al proyecto.

> ITLA Crush es un proyecto académico independiente y no una aplicación oficial del Instituto Tecnológico de Las Américas.

## Principios

### 1. Identidad Crush primero

La estructura visual mantiene la paleta previa del proyecto: magenta, violeta, rosa y navy profundo. El carácter tecnológico se introduce mediante composición, tipografía técnica, rails, grids, bordes finos y densidad visual controlada, no reemplazando la personalidad cromática existente.

Variables principales:

- Crush Pink: `#FF2F92`
- Crush Pink 2: `#FF5BB4`
- Crush Magenta: `#B10F66`
- Violet Accent: `#8A63FF`
- Blue Accent: `#2D7CFF`
- Cyan Accent: `#72D8FF`
- Surface 0: `#100518`
- Surface 1: `#16071F`
- Surface 2: `#241032`

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

### 5. Identidad Crush como sistema

El rosa/magenta vuelve a ser parte estructural de la experiencia, acompañado de violeta y navy. Se utiliza en:

- superficies de marca;
- palabras de énfasis;
- estados activos;
- Social Core;
- hashtags;
- rails/accent lines;
- botones principales;
- elementos del logo.

El objetivo es conservar la personalidad visual que ya tenía ITLA Crush, pero con una ejecución más técnica, menos genérica y más consistente.

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

1. ¿Respeta la paleta magenta/violeta/navy de ITLA Crush?
2. ¿Necesita realmente un pill o un radio grande?
3. ¿El glow comunica algo o solo decora?
4. ¿El dato mostrado es real?
5. ¿El componente se entiende también sin animación?
6. ¿Mantiene el carácter académico no oficial del proyecto?

Si falla en varias de estas preguntas, probablemente rompe el sistema visual.
