# Portafolio de Alexis Varela Muñoz

Mi portafolio como desarrollador backend y Full Stack. Acá comparto mi experiencia profesional, mis proyectos y cómo contactarme.

[Ver sitio publicado](https://alexsibdev.netlify.app/) · [Repositorio en GitHub](https://github.com/AlexisVarela2811/Portafolio-Alexsib)

> El sitio publicado puede no incluir los cambios locales que todavía no se han publicado.

## Diseño y tecnologías

- **Astro + TypeScript:** sitio estático organizado en componentes modulares.
- **Tailwind CSS:** estilos adaptables y colores conectados al tema centralizado.
- **Estética Matrix sutil:** fondo casi negro, acentos verdes y cuadrícula estática, sin lluvia de caracteres animada. Texto principal en Onest y títulos monoespaciados.
- **Navegación y experiencia:** menú móvil, enlaces a secciones, progreso de lectura junto a la barra de navegación y línea de progreso en la experiencia laboral. Se respeta la preferencia de movimiento reducido.
- **Playwright:** pruebas de navegador con Chromium sobre una compilación de producción aislada.

## Desarrollo local

Necesitas **Node.js 24 y npm**. Desde la raíz del repositorio:

```sh
npm ci --no-audit --no-fund
npm run dev
```

Abre **http://localhost:4321**. Astro actualiza la página mientras editas los archivos.

### Comandos disponibles

| Comando | Para qué sirve |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo. |
| `npm start` | Alternativa a `npm run dev`. |
| `npm run build` | Ejecuta `astro check` y después genera el sitio estático en `dist/`. |
| `npm run preview` | Sirve la compilación local; puerto predeterminado de Astro: `4321`. |
| `npm run test:e2e` | Comprueba, compila y ejecuta las pruebas de navegador aisladas. |
| `npm run astro -- --help` | Muestra la ayuda de la herramienta de Astro. |

## Comprobaciones de navegador

Después de instalar las dependencias, instala Chromium y ejecuta la suite:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" npx playwright install chromium
npm run test:e2e
```

Estos comandos usan una **terminal POSIX de Linux o macOS**, no la sintaxis de PowerShell. Además de Node.js 24, el equipo necesita las bibliotecas del sistema requeridas por Chromium. El comando local no instala paquetes del sistema ni utiliza `sudo`; CI instala sus propias dependencias de Ubuntu con `--with-deps`.

### Qué se ejecuta

`test:e2e` usa el mismo chequeo y compilación de Astro, pero escribe en `.playwright-build/`. Así no modifica `dist/`, que está versionado en este repositorio. Después inicia y detiene su propia vista previa de producción en **http://127.0.0.1:4173**: ese puerto debe estar libre y no se reutiliza ningún servidor de desarrollo ni otra vista previa. Los comandos habituales de desarrollo, compilación y vista previa no cambian.

La configuración usa `.playwright-browsers/` como caché de navegador predeterminada. Si defines otra ruta mediante `PLAYWRIGHT_BROWSERS_PATH`, utiliza la misma al instalar y ejecutar las pruebas.

Hay **4 escenarios × 2 tamaños de pantalla = 8 pruebas**: escritorio de **1280 × 800** y móvil de **390 × 844**.

1. Carga del contenido y recursos locales, ausencia de errores del navegador y desbordamiento horizontal, paleta, tipografías y contraste del texto.
2. Navegación repetida con teclado y menú móvil, enlaces directos a secciones y recargas.
3. Ambas líneas de progreso al avanzar y retroceder, recargar, redimensionar y activar movimiento reducido.
4. Todos los botones y enlaces actuales, incluidos los destinos de contacto.

Los destinos HTTP externos se **interceptan** para que las pruebas sean reproducibles: no demuestran que GitHub, LinkedIn u otros servicios estén disponibles. Los enlaces `mailto:` y `tel:` comprueban la URL y la intención del clic, no la existencia de aplicaciones de correo o teléfono instaladas.

La suite canónica está en `tests/e2e/portfolio.spec.ts` y se configura en `playwright.config.ts`. Ante fallos, se conservan capturas y trazas en `test-results/`; el informe HTML queda en `playwright-report/`. Esas carpetas, la caché del navegador y la compilación aislada están ignoradas por Git.

## Compilación de producción

```sh
npm run build
npm run preview
```

La primera orden valida el proyecto con Astro y genera `dist/`; la segunda permite revisar ese resultado antes de desplegarlo. No confundas esta vista previa habitual con la que las pruebas administran en el puerto `4173`.

## Dónde editar

| Ruta | Responsabilidad |
| --- | --- |
| `src/pages/index.astro` | Presentación y composición de las secciones de la página. |
| `src/layouts/` | Estructura compartida y metadatos del sitio. |
| `src/components/` | Navegación, experiencia, proyectos, contacto e indicadores de progreso. |
| `src/styles/theme.css` | Variables del tema: colores, tipografías, fondo, foco y movimiento reducido. |
| `public/` | Imágenes y otros archivos estáticos. |
| `tests/e2e/` | Escenarios de navegador. |
| `playwright.config.ts` | Pantallas, navegador y servidor aislado de pruebas. |
| `.github/workflows/ci.yml` | Validación automática en GitHub Actions. |
| `.github/dependabot.yml` | Calendario y agrupación de actualizaciones. |

Para cambiar contenido, empieza por la página y el componente correspondiente. Para ajustar la apariencia global, modifica las variables de `theme.css` y conserva su conexión con Tailwind; evita duplicar colores por componente. La experiencia y los indicadores de progreso tienen componentes propios para facilitar su mantenimiento.

## Automatización y mantenimiento

### GitHub Actions

El flujo se activa con solicitudes de cambio (**PR**) hacia `master`, envíos a `master` y ejecución manual. El trabajo mantiene el nombre **`Astro check and build`**.

- Usa Ubuntu, Node.js 24, caché de npm basada en `package-lock.json` y `npm ci --no-audit --no-fund`.
- Instala Chromium con `--with-deps` y ejecuta `npm run test:e2e`: chequeo, compilación aislada y navegador.
- Tiene permisos de solo lectura, acciones fijadas a SHA completos, cancelación de ejecuciones anteriores del mismo grupo y un límite de 10 minutos por trabajo.
- Si falla, guarda las evidencias disponibles como artefacto durante 7 días.

**La primera ejecución real en GitHub todavía no está demostrada:** requiere publicar los cambios. Los resultados locales no acreditan una ejecución remota. El propietario puede configurar por separado la protección de rama para exigir `Astro check and build`; el flujo no establece esa política.

### Dependabot

Revisa **npm y GitHub Actions cada lunes a las 09:00, zona `America/Santiago`**, con un máximo de 5 PR abiertos por ecosistema. Agrupa actualizaciones menores y parches de npm; las versiones mayores quedan separadas y las acciones se actualizan individualmente. No hay fusión automática configurada.

Las alertas de seguridad y las actualizaciones automáticas de seguridad se habilitan aparte en la configuración de GitHub; este archivo no las activa.

## Despliegue en Netlify

Si la integración con Git está configurada, **Netlify es la única vía de despliegue prevista**:

| Ajuste | Valor |
| --- | --- |
| Comando de compilación | `npm run build` |
| Carpeta publicada | `dist` |
| Versión de Node.js | `24`, configurada en la interfaz de Netlify |

No se incluye un token ni una acción de despliegue de Netlify. La vinculación y sus políticas no se han verificado localmente, y **CI no bloquea automáticamente los despliegues de Netlify**. El propietario debe configurar esa política por separado si la necesita. La preparación local no implica haber abierto un PR, fusionado ni publicado estos cambios.
