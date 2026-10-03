## Cámara (estilo League of Legends)

`game/CameraControl.ts` (la usa `CityScene`; nada de la cámara vive en otro lado):

- **Fija** (por defecto): sigue al avatar propio con suavizado. **Libre**: se queda donde la dejes
  para mirar cualquier parte del mapa y hacer clic ahí (el avatar camina, la cámara no lo sigue).
- **Arrastrar el mapa** (un dedo, el clic o la rueda apretados) mueve la cámara: el punto agarrado
  queda bajo el dedo. Así se lleva la cámara a la otra punta del mapa y ahí un toque / clic corto
  manda al avatar (un arrastre de más de `DRAG_SLOP` px no cuenta como clic). También se mueve con
  **dos dedos** (que además hacen zoom pellizcando) y con las **flechas**.
- **Mouse en el borde de la pantalla** (escritorio, como en LoL): la cámara se desplaza hacia ese
  lado, más rápido cuanto más cerca del borde (`edgePan`). Cuenta la franja de `EDGE_PX` sobre el
  mapa y sólo los últimos `EDGE_HARD_PX` sobre el HUD, el chat o la barra (el mouse se sigue en toda
  la ventana con `pointermove`, sólo `pointerType: "mouse"`). Arranca tras `EDGE_DWELL_MS` y no
  corre con un panel abierto, arrastrando o con la ventana sin foco.
- Mover la cámara a mano con la fija la suelta sola. El clic derecho camina (como en LoL).
- **Al mandarlo a caminar con la cámara libre** (piso, parada, tienda, palmera, banco), la cámara
  viaja suave hasta el avatar (`returnToTarget`: `camera.pan`, más largo cuanto más lejos, entre
  `RETURN_MIN_MS` y `RETURN_MAX_MS`) y queda fija siguiéndolo, así se ve cómo va hasta ahí. Agarrar
  la cámara en el medio corta el viaje. "Centrar" en pantalla hace el mismo viaje.
- **Y** alterna fija / libre, **Espacio** centra en el avatar (y lo sigue mientras se mantiene). Las
  teclas no cuentan mientras se escribe.
- **Encontrar al personaje**: botón **Centrar personaje** (`CameraButton`, arriba a la derecha; en
  celulares redondo, debajo del HUD; resaltado mientras la cámara está libre) → la cámara viaja
  hasta el avatar y lo marca con anillos que laten (`showLocator`, también con Espacio). Con la
  cámara libre y el avatar fuera de pantalla, una **flecha** en el borde apunta hacia él
  (`updateOffscreenArrow`, por dentro del HUD y del dock); tocarla hace lo mismo que el botón.
- Escena → React `camera:free`; React → escena `camera:command` ("center"). El modo se recuerda en
  `mw:camera` y el zoom (rueda o pellizco, 0,5× a 2×) en `mw:zoom`.
- Los gestos de cámara (arrastre, dos dedos, rueda apretada) no cuentan como clic ni como caminar
  (`pointerDown` / `pointerMove` / `pointerUp` devuelven si los usó).
