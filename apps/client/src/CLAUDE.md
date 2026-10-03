## Celulares (diseño responsivo)

El juego se juega igual en celular. Lo general (variables, modo compacto del `.dock`, paneles como
hoja) está en `app/globals.css`; los ajustes de cada componente, en su CSS Module bajo los mismos
`@media` (ver "Estilos" en el `CLAUDE.md` raíz). Además, en pocos puntos de los componentes:

- **Viewport** (`app/layout.tsx`): sin zoom de página (el pellizco es zoom del mapa), `viewportFit:
  "cover"` (bordes con `--safe-top/right/bottom/left` = `env(safe-area-inset-*)`) e
  `interactiveWidget: "overlays-content"`: el teclado tapa la página sin achicarla (el canvas no se
  redimensiona). `lib/viewport.ts` mide cuánto tapa con `visualViewport` → `--keyboard-inset`.
  Alturas con `dvh` (descuentan la barra del navegador).
- **Modo compacto** = `(max-width: 760px), (max-height: 500px)` (mismo corte que `isSmallScreen()`):
  HUD de punta a punta en dos filas (datos arriba; acciones sólo con ícono, el texto queda para
  lectores de pantalla en `.hud-label`); todo lo de abajo va en `.dock` (en App: pesca / venta, barra
  rápida, chat), que en escritorio es `display: contents` y en compacto una columna fija que sube con
  el teclado. El chat arranca compacto (dos mensajes) y se expande al escribir o tocar el historial
  (`expanded` en `ChatBox`); expandido, esconde lo demás del dock. Avisos y anuncios se ubican con
  `--hud-height`. Celular parado: los paneles salen desde abajo como hoja. Acostado: HUD en una fila
  y el dock en fila (chat a la derecha).
- **Táctil** = `(hover: none) and (pointer: coarse)` (`isTouchDevice()`): se ocultan `kbd` y
  `.key-hint` (textos tipo "Apretá H o Esc"), los inputs van a 16px (si no, iOS hace zoom) y se
  desactiva el arrastre nativo (no anda con el dedo).
- **Mapa** (`CityScene`): un toque corto camina al **soltar** (`TAP_SLOP`), no al apoyar; arrastrar
  con un dedo mueve la cámara y dos dedos hacen zoom (ver "Cámara"). En pantallas chicas el zoom
  inicial es `SMALL_SCREEN_ZOOM`. Sin hover con el dedo.
- **Sin arrastrar ni tooltips**: la barra rápida se arma tocando un casillero vacío o manteniendo
  apretado uno lleno (`HotbarPicker`, también con clic derecho); en la mochila, tocar una caña,
  carrito o pescado muestra su info (`.backpack-detail`).
- Al agregar UI: botones de al menos ~40px en compacto, nada que dependa sólo de hover, tecla o
  arrastre, y posiciones con las variables (`--edge`, `--safe-*`, `--hud-height`), no con px fijos.
