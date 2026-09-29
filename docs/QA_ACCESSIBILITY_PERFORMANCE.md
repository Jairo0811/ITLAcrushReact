# Fase 5C — QA, accesibilidad verificable y rendimiento

La Fase 5C convierte el hardening técnico de ITLA Crush en controles reproducibles dentro del repositorio y GitHub Actions.

> ITLA Crush continúa siendo un proyecto académico independiente y no oficial. Las verificaciones de accesibilidad apoyan una alineación voluntaria con NORTIC B2:2017; no constituyen certificación oficial.

## 1. Quality gates

Cada pull request hacia `main` ejecuta:

1. `npm ci`
2. `npm run audit:prod`
3. `npm run lint`
4. `npm test`
5. `npm run check:a11y`
6. `npm run build`
7. `npm run check:bundle`
8. Lighthouse CI

El pipeline falla si cualquiera de los controles marcados como obligatorios no cumple el umbral configurado.

## 2. Pruebas automatizadas

`tests/quality.test.mjs` utiliza el test runner nativo de Node.js para validar contratos críticos sin introducir un framework adicional.

Cobertura actual:

- catálogo de tecnólogos con valores únicos y colores válidos;
- rutas autenticadas y rutas por rol;
- reglas Firestore con deny-by-default;
- presencia de controles de administración y Social Core;
- fallback SPA y cabeceras de Firebase Hosting;
- ausencia de mensajería ficticia;
- disclaimer académico no oficial.

Ejecutar localmente:

```bash
npm test
```

## 3. Accesibilidad verificable

### Comprobación estática

```bash
npm run check:a11y
```

Valida, entre otros:

- `lang="es"`;
- viewport y descripción;
- skip link;
- destino `main-content`;
- foco visible;
- `prefers-reduced-motion`;
- ausencia de `tabindex` positivo;
- alternativas `alt` en imágenes;
- alertas/estados accesibles;
- navegación etiquetada.

### Lighthouse CI

Lighthouse audita automáticamente:

- `/home`;
- `/demo`;
- `/login`.

Umbrales:

| Categoría | Umbral |
|---|---:|
| Accesibilidad | >= 0.90 — obligatorio |
| Buenas prácticas | >= 0.85 — advertencia |
| Rendimiento | >= 0.65 — advertencia |
| SEO | >= 0.85 — advertencia |

Lighthouse es una evidencia automatizada complementaria y no reemplaza pruebas manuales de lector de pantalla, zoom, contraste contextual y recorrido por teclado.

## 4. Rendimiento

Vite 8/Rolldown divide dependencias estables en grupos:

- `firebase-vendor`;
- `react-vendor`;
- `vendor`.

El objetivo es evitar que Firebase y React formen parte del chunk principal de la aplicación y mejorar cacheabilidad.

El presupuesto automático se verifica con:

```bash
npm run check:bundle
```

Presupuestos actuales:

| Recurso | Máximo |
|---|---:|
| Chunk JS individual | 450 kB |
| JS total | 1.2 MB |
| CSS total | 250 kB |

Los límites miden tamaño sin comprimir, alineados con el criterio que utiliza Vite para advertencias de chunk.

## 5. Seguridad de dependencias

```bash
npm run audit:prod
```

El CI bloquea vulnerabilidades `high` o `critical` en dependencias utilizadas en producción.

Las dependencias de herramientas de desarrollo se revisan por separado para evitar confundir riesgo de build con superficie de ejecución del cliente.

## 6. Comando integral local

```bash
npm run quality
```

Ejecuta lint, tests, a11y estático, build y presupuesto de bundle.

Lighthouse se mantiene como paso separado porque requiere un navegador Chromium disponible.

## 7. Pruebas manuales recomendadas antes de release

Además de CI:

- [ ] teclado completo en `/home`, autenticación, `/app`, creación, Social Core, moderación y admin;
- [ ] zoom 200 %;
- [ ] viewport móvil estrecho;
- [ ] NVDA o lector equivalente en los procesos críticos;
- [ ] contraste de texto, botones, focus, error y disabled;
- [ ] formularios con errores y recuperación;
- [ ] autenticación Microsoft;
- [ ] cuenta suspendida/bloqueada;
- [ ] moderador sin acceso a `/admin`;
- [ ] estudiante sin acceso a `/moderacion`;
- [ ] deep link `/app?confession=...`;
- [ ] refresh directo de rutas SPA.

## 8. Criterio de cierre de 5C

La Fase 5C se considera técnicamente cerrada cuando:

- CI ejecuta todos los quality gates definidos;
- tests y lint están en verde;
- accesibilidad automática alcanza el umbral configurado;
- el build cumple el presupuesto de bundle;
- el audit de producción no reporta vulnerabilidades high/critical;
- la documentación deja explícito qué verificaciones siguen siendo manuales.

Una certificación o declaración formal de cumplimiento NORTIC B2 queda fuera del alcance de este repositorio y requeriría el proceso de evaluación correspondiente.
