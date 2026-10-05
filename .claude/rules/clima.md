---
paths:
  - "packages/shared/src/weather.ts"
  - "apps/server/src/weather.ts"
  - "apps/client/src/game/city/WeatherFx.ts"
  - "apps/client/src/ui/Hud.tsx"
  - "apps/server/src/rooms/systems/life.ts"
  - "apps/server/src/rooms/systems/activities.ts"
---

# Clima

Global para todo el server como la hora: todos los barrios tienen el mismo. Cuatro climas
(`WEATHERS` en `packages/shared/src/weather.ts`): **despejado**, **lluvia**, **viento pampero** y
**calor de enero**. Cada uno define su peso al sortear, cuántas horas del juego dura (`hours`), sus
textos (`announce` para el chat; `fishingHint` / `vendingHint` / `buskingHint` para los paneles) y sus efectos:

| Clima | Pesca | Venta | Tocar en la calle | Hambre |
| --- | --- | --- | --- | --- |
| Despejado | — | — | "nadie deja" ×0,85, propina ×1,15 | — |
| Lluvia | espera ×0,8, "no picó nada" ×0,6 | espera ×1,3, "nadie compra" ×1,6 (hay menos gente) | espera ×1,3, "nadie deja" ×1,6, propina ×0,8 | — |
| Pampero | espera ×1,25, "no picó nada" ×1,6 | — | espera ×1,15, "nadie deja" ×1,4, propina ×0,9 | — |
| Calor | — | la **conservadora** (`HEAT_COLD_CARTS`): "nadie compra" ×0,5 y paga ×1,5 | espera ×0,9, "nadie deja" ×0,9, propina ×1,25 (turistas) | ×1,3 (sólo lo que baja con el tiempo) |

- **Server** (`apps/server/src/weather.ts`, `WeatherClock`, singleton `weather`): no tiene timer;
  `current()` avanza sorteando el próximo cuando vence el de ahora (nunca el mismo dos veces
  seguidas). Arranca despejado y vive en memoria (no se guarda). Simulado: ~55 % del tiempo
  despejado y un cambio cada ~5 minutos reales con el día de 24 minutos.
- **Efectos**: `rodInWeather` / `cartInWeather` / `instrumentInWeather` devuelven una copia de la herramienta ajustada; el
  server sortea con esa copia (`rollCatch` / `rollSale` en `systems/activities.ts`) y le cobra el uso
  a la de verdad. El hambre pasa por `NeedsTick.hungerFactor` (`tickNeeds` en `systems/life.ts`).
  Ninguna probabilidad de fallar pasa de 0,9.
- **Balance**: al arrancar, `index.ts` avisa `[Balance] …` si con algún clima una herramienta deja de
  pagarse sola, o si la comida pasa de `MAX_FOOD_SHARE` con el clima que más hambre da
  (`foodTooExpensiveFor(hungerFactor)`). Al tocar los factores, revisar ese aviso.
- **Sala**: `syncClock` (una vez por segundo) copia `state.weather` y `state.weatherMode` y, si
  cambió, anuncia `announce` en el chat. Al abrir la sala no anuncia (`state.weather` arranca en `""`).
- **Admin** (panel P): `admin:weather { mode }` (`WeatherMode`: un `WeatherId` lo deja fijo; `auto`
  vuelve a sortear desde el que está).
- **Cliente**: la escena escucha `weather` → `WeatherFx` (`game/city/WeatherFx.ts`) y emite
  `city:weather` → `gameStore.weather`. `WeatherFx` es sólo dibujo: un tinte de 3 pantallas fijo a
  la cámara justo debajo del velo de la noche (`NIGHT_DEPTH - 1`) y, arriba de ese velo, un
  `Graphics` que cada frame dibuja la lluvia (gotas que salpican al tocar el piso) o las ráfagas del
  pampero. Se simula en píxeles de pantalla y se deshace el zoom al dibujar (Phaser escala lo fijo
  a la cámara desde el centro). La cantidad de gotas depende del tamaño de pantalla (menos en
  celular). El HUD cambia el ícono del reloj (`rain`, `wind`, `heat`; despejado, sol o luna) y los
  paneles de pesca y venta muestran el `hint` del clima.
