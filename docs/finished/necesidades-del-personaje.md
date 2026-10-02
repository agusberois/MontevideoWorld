# Necesidades del personaje: energía, hambre y salud

**Fecha:** 2026-10-02

## Resultado

**Cerrado:** 2026-10-02

Las cuatro fases están hechas. El personaje tiene **energía** (la stamina de antes), **hambre** y
**salud**, las tres guardadas con el progreso y las dos últimas privadas.

| Barra | Baja con | Sube con | En el límite |
| --- | --- | --- | --- |
| ⚡ Energía | caminar, pescar, vender, picudos | quieto / sentado (× hambre), comida, vitaminas | agotado; con salud < 30 no pasa de 50 |
| 🍖 Hambre | 1 cada 30 s + esfuerzo (no en el COMCAR) | comida y pescado | en 0, −1 de salud cada 10 s |
| ❤ Salud | picudos, hambre en 0, pescado crudo (−2, piso 10) | panza llena descansando, chivito / pescado a la plancha, remedios, guardia | en 0, desmayo y ambulancia (10 %, tope $200) |

- **Comida** en el Kiosco de la Plaza, el Kiosco del Parque y el Mercado del Puerto; **remedios**
  en la Farmacia Sarandí (agregada después del plan, a pedido: Perifar, curitas, vitaminas y
  botiquín); **guardia** en el Sanatorio Americano ($1 por punto, mínimo $10).
- **Balance**: la comida de una hora de trabajo (~$100 con tortas fritas) es entre el 1 % y el 6 %
  de lo que deja cada herramienta por hora, lejos del 15 % que fijamos. La estimación nueva de
  ganancia ($1.800–10.000/h, `needsBalance.ts`) es más alta que la del plan ($1.000–2.000/h):
  cuenta los segundos reales de cada intento. Si se quiere que comer pese más, hay que subir
  precios o el hambre, no bajar la regla.
- Admin: `/curar [jugador]` y el botón **Curarme**.
- Cada fase se probó contra un server aparte con jugadores precargados; ver "Hecho" en cada fase.
  No se vieron en el navegador la pantalla del desmayo, la ambulancia ni el panel de la guardia.

**Quedó afuera:** cocinar, vender comida entre jugadores, clima y sed (ver "Más adelante").

**Resumen:** hoy el personaje tiene una sola barra, la **stamina** (0–100). La propuesta es
renombrarla a **energía**, mantener cómo funciona y sumar dos barras nuevas: **hambre** y **salud**.
Cada una mide algo distinto:

- **Energía:** el cansancio del momento. Se gasta haciendo cosas y vuelve en segundos.
- **Hambre:** lo que pide el cuerpo en la media hora. Baja con el tiempo y sube comiendo.
- **Salud:** el estado de fondo. Baja con picaduras o pasando hambre y vuelve de a poco, comiendo
  bien o en el sanatorio.

La idea es que el juego tenga un ciclo: trabajar (pescar, vender) → gastar energía y hambre → comer
(con plata o con lo que pescaste) → seguir trabajando. Nunca debe sentirse como un castigo.

## Cómo funciona hoy (stamina)

| Qué | Valor | Dónde |
| --- | --- | --- |
| Máximo | 100 | `MAX_STAMINA` (`packages/shared/src/stamina.ts`) |
| Caminar | −0,6 por tile (~165 pasos con el tanque lleno) | `WALK_STAMINA_COST` |
| Tirar la línea | −10 | `FISH_STAMINA_COST` |
| Ofrecer en el Centenario | −6 | `VEND_STAMINA_COST` |
| Picadura de picudo | −2 | `WEEVIL_BITE_STAMINA` |
| Quieto | +2 por segundo | `IDLE_STAMINA_REGEN` |
| Sentado en un banco | +10 por segundo | `SIT_STAMINA_REGEN` |
| Comer un pescado | +10 a +30 (según dificultad) | `fishStamina` |
| Agotado | no camina ni pesca hasta llegar a 20 | `EXHAUSTED_RECOVERY` |

- La lleva el server (`Stamina` en `apps/server/src/stamina.ts`, con decimales) y la copia
  redondeada a `Player.stamina` (Schema) → `player:stamina` → barra del HUD.
- **No se guarda:** al entrar o al viajar arranca llena. Con hambre y salud eso no puede seguir así,
  porque salir y volver a entrar sería una forma gratis de llenarse.

## Las tres barras

| Barra | 0–100 significa | Baja con | Sube con | En 0 |
| --- | --- | --- | --- | --- |
| ⚡ **Energía** (la stamina de hoy) | descansado | caminar, pescar, vender, picaduras | estar quieto, sentarse, comer algunas cosas | **agotado**: no camina ni trabaja hasta recuperar 20 (como hoy) |
| 🍖 **Hambre** (saciedad: 100 = lleno) | lleno | el tiempo jugando, más rápido con esfuerzo | comer | la salud empieza a bajar |
| ❤ **Salud** | sano | picaduras, pasar hambre | comer bien estando lleno, descansar, el sanatorio | **desmayo** (ver abajo) |

La barra de hambre muestra **saciedad**: llena es bueno, como las otras dos. El HUD la llama
"Hambre" con el ícono, pero la barra vacía significa "muerto de hambre". Así las tres se leen igual:
llena = bien.

### ⚡ Energía

Funciona igual que la stamina de hoy (mismos costos, misma recuperación, mismo "agotado"). Cambian
dos cosas:

1. **La recuperación depende del hambre.** Con la panza llena descansás bien, con hambre no.

   | Saciedad | Recuperación de energía |
   | --- | --- |
   | 60–100 | normal (×1) |
   | 30–59 ("tenés hambre") | ×0,5 |
   | 1–29 ("muerto de hambre") | ×0,25 |
   | 0 | ×0,25, y además baja la salud |

2. **Comer da sobre todo saciedad, no energía.** El pescado hoy da +10…+30 de energía. Pasa a dar
   saciedad, y un poco de energía (la mitad de lo de hoy). La energía rápida queda para cosas
   pensadas para eso (mate, café: ver "Comida").

### 🍖 Hambre (saciedad)

- **Baja sola mientras jugás:** −1 cada 30 s (de lleno a vacío en 50 min sin hacer nada) y además
  un extra por esfuerzo:

  | Acción | Saciedad |
  | --- | --- |
  | Cada tile caminado | −0,05 |
  | Cada tirada de pesca | −0,5 |
  | Cada intento de venta | −0,5 |

  Trabajando se van unos **150 por hora**: 120 del tiempo y ~30 del esfuerzo (≈ 300 tiles caminados
  y 30 tiradas o ventas). Con un día del juego de 24 min reales, son **~60 de saciedad por día del
  juego**: un chivito, o dos panchos.
- **No baja con el jugador desconectado**, para no castigar a quien no juega. Se guarda lo que tenía
  al salir.
- **No baja en el COMCAR**: preso, la saciedad queda congelada en lo que tenía al entrar, y la salud
  no baja por hambre aunque esté en 0. La condena es aburrida, no mortal.
- **Avisos** (`notice`) al cruzar 59 ("Tenés hambre: comé algo") y 29 ("Estás muerto de hambre"). En
  0, cada tanto: "Te estás debilitando de hambre".
- Se llena **comiendo** desde la barra rápida o la mochila (como hoy el pescado: `fish:eat` pasa a
  ser `food:eat`). Comer con la saciedad en 100 no se puede (mismo aviso que hoy con la energía llena).

### ❤ Salud

- **Baja con:**

  | Causa | Salud |
  | --- | --- |
  | Picadura de picudo | −2 (sigue sacando 2 de energía, como hoy) |
  | Saciedad en 0 (fuera del COMCAR) | −1 cada 10 s |
  | Comer pescado crudo (cualquiera) | −2, pero nunca deja la salud por debajo de 10 (comiendo no te desmayás) |

- **Sube con:**

  | Causa | Salud |
  | --- | --- |
  | Saciedad ≥ 60 y quieto | +1 cada 30 s |
  | Saciedad ≥ 60 y sentado en un banco | +1 cada 10 s |
  | Comidas que curan (ver tabla) | según la comida |
  | **Sanatorio Americano** (Tres Cruces): consulta paga | hasta 100 |

  La salud vuelve lento a propósito: es la barra "de fondo". Si te la dejaste caer, comer y descansar
  la recupera, y si apurás, pagás el sanatorio.
- **Efectos de tener poca salud** (por debajo de 30): el HUD la muestra en rojo, aviso "Estás
  débil", y la energía tiene un máximo de 50 (te cansás antes). No hay efectos que cambien el
  movimiento, porque el server avanza un tile por tick para todos y meterle velocidad variable
  complica la predicción (`LocalMover`).
- **Desmayo (salud 0):**
  1. Se cortan pesca y venta y se cancela el intercambio, como al salir.
  2. Fundido a negro con "Te desmayaste… te llevó la ambulancia", unos 3 s.
  3. Aparecés en la puerta del **Sanatorio Americano** (Tres Cruces) con salud 30, energía 50 y
     saciedad 30, sin necesitar boleto: el viaje lo paga la ambulancia, con un pase como `/trace`.
  4. Costo: la ambulancia cobra **10 % de la plata, como mucho $200**. **Nunca se pierden ítems.**
     Con menos de $20 no cobra, para no hundir a los nuevos.
  5. **En el COMCAR** no se sale: te despertás en la enfermería del penal (el patio), con los mismos
     valores.

## Comida (categoría nueva de ítem)

Categoría `food` (`FoodItem`), con lo que da al comerla: `{ hunger, energy, health }`. Se apila, se
intercambia y se come desde la barra rápida (1–9) o tocándola en la mochila. Siguiendo la receta de
`CLAUDE.md` ("Cómo agregar una categoría de ítem"), al sumarla TypeScript pide ícono, casillero,
acción de la barra y su entrada en `itemCategoryUi.ts`.

| Comida | Precio | Saciedad | Energía | Salud | Dónde |
| --- | --- | --- | --- | --- | --- |
| Pejerrey … corvina negra (pescados crudos, ya existen) | (venta: $6–60) | +10 … +30 | +5 … +15 | **−2** | se pescan |
| Torta frita | $10 | +15 | +5 | — | Kiosco (Ciudad Vieja, nuevo) |
| Alfajor | $15 | +10 | +15 | — | Kiosco |
| Mate | $20 | +5 | +30 | — | Kiosco |
| Pancho | $25 | +30 | +5 | — | Kiosco del Parque (Tres Cruces) |
| Chivito | $90 | +70 | +10 | +10 | Bar del Mercado del Puerto (nuevo) |
| Pescado a la plancha | $45 | +45 | +10 | +10 | Mercado del Puerto (o cocinar un pescado: ver "Más adelante") |

- **El pescado sigue siendo un trade-off:** el que te comés no lo vendés, y crudo te saca un poco
  de salud. El pescado a la plancha del Mercado llena más y cura en vez de hacer mal.
- La mochila y la barra rápida avisan antes de comer un pescado crudo ("🍖 +20 · ❤ −2, crudo").
- Los carritos del Centenario (panchos, choripán) ya existen como herramientas para venderle a los
  hinchas. **Más adelante**, un jugador con carrito podría venderle comida a otros jugadores. Queda
  fuera de esta primera versión.

### Balance

Regla nueva, en el mismo espíritu que "toda herramienta tiene que ser rentable": **comer tiene que
costar una parte chica de lo que se gana trabajando**.

- Con los números de arriba, trabajando se gastan unos **150 de saciedad por hora**: 5 panchos,
  **~$125/h** (o pescado propio que no se vende).
- Con las herramientas básicas se ganan del orden de **$1.000–2.000 por hora** (estimado con
  `valuePerUse`: conservadora ~$3,4 por intento, caña básica ~$9,6 por tirada). Hay que medirlo
  jugando antes de cerrar números.
- Objetivo: la comida no debe pasar del **~15 % de lo que se gana con la herramienta básica**. Igual
  que con las herramientas, el server avisaría al arrancar (`[Balance] …`) si alguna combinación lo
  supera.

## Cómo se implementa

### Datos y red

- **Shared** — `stamina.ts` pasa a llamarse `needs.ts`:
  - Las tres barras como datos: `NEEDS = { energy, hunger, health }`, cada una con máximo, nombre,
    ícono, umbral "bajo" y color. El HUD las dibuja recorriendo esa tabla.
  - Constantes de gasto y recuperación (los nombres de hoy, renombrados: `WALK_ENERGY_COST`…).
  - Funciones puras: `energyRegenFactor(hunger)` y `hungerDrain(acción)`, así server y cliente
    calculan igual (el cliente sólo las usa para mostrar).
- **Server** — `Stamina` (`apps/server/src/stamina.ts`) pasa a ser `Needs`:
  - Las tres barras con decimales.
  - Mantiene `has`, `spend`, `drain` y `recover` por barra, y suma un `tick(seconds, { sitting,
    idle })` que hace la recuperación y el hambre de cada segundo.
  - El tick que hoy llama a `recoverStamina` (`stepPlayers`) llama a `needs.tick`.
  - Todo lo que hoy toca `staminas` pasa a `needs`: picudos, pesca, venta, comer, caminar.
- **Schema y mensajes privados:**
  - `Player.stamina` se renombra a `Player.energy` y sigue en el Schema como hoy (cambia con cada
    paso y el Schema manda sólo la diferencia).
  - **Hambre y salud son privadas** (decisión: los demás no las ven). No van en el Schema: el server
    se las manda sólo al dueño con un mensaje `needs { hunger, health }`, como la plata (`wallet`).
    Se reenvía cuando cambia el valor redondeado, como mucho una vez por segundo (cambian lento), y
    el cliente lo pide al entrar (`needs:get`, igual que `wallet:get`).
- **Guardado** — `PlayerRecord` suma `needs: { energy, hunger, health }`.
  - Se restaura al entrar (validando rangos) y se guarda al salir, cada 15 s y al viajar, como la
    mochila.
  - Los guardados viejos no lo tienen: arrancan con todo en 100.
  - Esto también cierra el "salir y volver para llenar la energía" de hoy.
- **Mensajes:**
  - `fish:eat` pasa a ser `food:eat { itemId }` y sirve para pescados y comida.
  - `needs` (server → dueño) y `needs:get` (cliente → server), para hambre y salud.
  - Desmayo: el server manda `faint` (para la pantalla negra) y después `travel:ok` con el pase al
    sanatorio.
  - Consulta en el sanatorio: `hospital:heal` (con F junto a la puerta, cobra y cura).

### Cliente

- **HUD:** tres barritas finas con ícono (⚡ 🍖 ❤) donde hoy está la de stamina. En compacto, una
  fila de tres. Cada una en rojo bajo su umbral y con `title` / texto para lectores de pantalla.
- **Store:** `state.energy` (hecho, fase 1), `state.hunger` y `state.health`: un campo por necesidad.
  La energía llega de la escena (`player:energy`); hambre y salud, del mensaje privado
  (`needs:update`).
- **Widgets de pesca y venta:** el chequeo "¿alcanza la energía?" queda igual, con el nombre nuevo.
- **Mochila y tienda:** cada comida muestra lo que da ("🍖 +30 · ⚡ +5").
- **Desmayo:** overlay negro con el texto, como el de viaje pero sin ómnibus.
- **Admin:** `/curar [jugador]` llena las tres barras, y en el panel de Admin un botón "Curarme".

## Fases

1. **Renombrar stamina → energía y guardarla.** Sin cambios de juego. Toca el Schema (`energy`),
   shared, server, HUD y el store. Se puede probar sola.

   **Hecho (2026-10-02):** `packages/shared/src/needs.ts` (antes `stamina.ts`: constantes
   `*_ENERGY_*`, `fishEnergy`, `SavedNeeds`, `FULL_NEEDS`, `sanitizeNeeds`) y `apps/server/src/needs.ts`
   (clase `Needs`: `hasEnergy` / `spendEnergy` / `drainEnergy` / `recoverEnergy`, `snapshot`,
   `restore`). `Player.energy` en el Schema, `PlayerRecord.needs` en el guardado y en el cliente
   `player:energy` → `state.energy` (un campo por necesidad, no un objeto: así los selectores de
   `useGame` devuelven primitivos; hambre y salud van a ser `state.hunger` / `state.health`). Probado
   contra el server: caminando bajó a 73, se guardó 73,2 y al volver a entrar arrancó en 73. Mismos
   costos y recuperación que antes; lo único que cambia en el juego es que viajar o reconectar ya no
   llena la energía.
2. **Hambre + comida.** Barra, baja con el tiempo y el esfuerzo, categoría `food`, el Kiosco de
   Ciudad Vieja, el pescado pasa a dar saciedad y la energía recupera según el hambre. Avisos.

   **Hecho (2026-10-02):** hambre en `Needs` (con `tick`, congelada en el COMCAR) y en el guardado;
   mensaje privado `needs` / `needs:get`; categoría `food` (`FOODS`: torta frita, alfajor, mate,
   pancho, pescado a la plancha, chivito) con `edibleValue` / `edibleLabel` para comida y pescado;
   `fish:eat` → `food:eat`. Tiendas: **Kiosco de la Plaza** nuevo (Plaza Independencia, 54,18:
   torta frita, alfajor, mate), pancho y mate en el Kiosco del Parque, y chivito y pescado a la
   plancha en la Pescadería del Mercado (no hizo falta un "Bar del Mercado" aparte: el Mercado del
   Puerto ya es una tienda). HUD con dos barras (`NeedMeter`; en celular sin el número, para que
   entren). La comida se come con un clic en la mochila; el pescado no (tocarlo muestra su info,
   para no comerse uno caro sin querer): se come desde la barra rápida.
   Probado contra un server aparte: el aviso de hambre al bajar de 60, la energía recuperando a la
   mitad con hambre (+4 en 4 s), comprar en el kiosco y comer (59 → 89), y el hambre quieta 35 s
   en el COMCAR.
3. **Salud + desmayo + sanatorio.** Daño por picudos, por hambre y por pescado crudo,
   recuperación, desmayo con ambulancia (cobra), consulta paga en el Sanatorio Americano y el
   hambre congelada en el COMCAR.

   **Hecho (2026-10-02):** salud en `Needs` (`hurt`, `heal`, `revive`, tope de energía con
   `energyCap`) y en el guardado (un guardado con salud 0 vuelve en 30); va con el hambre en el
   mensaje privado `needs`. Comida con `health` (chivito y pescado a la plancha +10; pescado crudo
   −2 sin bajar de 10). **Guardia del Sanatorio** (tienda `hospital` sobre el Sanatorio Americano):
   `hospital:heal` deja la salud en 100 por $1 cada punto que falta (mínimo $10). Desmayo
   (`CityRoom.faint`): cobra 10 % (tope $200, nada con menos de $20), despierta con salud 30,
   energía 50 y saciedad ≥ 30; preso en el patio, en Tres Cruces en la puerta de la guardia, en
   otro barrio viaja en **ambulancia** (pase con `at`, `TravelOverlay` con la ambulancia) y sin
   clave en la plaza. Pantalla negra `FaintOverlay`. HUD con tres barras (en celular, el nombre del
   barrio se corta con "…" para que entren). El hambre congelada en el COMCAR ya estaba de la fase 2.
   Probado contra un server aparte: con salud 1,5 y sin comida, energía con tope 50, desmayo, $50 de
   ambulancia (10 % de $500), viaje a Tres Cruces a la puerta de la guardia con 30/30/50, pejerrey
   crudo −2 y la guardia a 100 por $72. No se vieron en el navegador la pantalla del desmayo ni la
   ambulancia (hace falta desmayarse de verdad).
4. **Pulido.** Chequeo de balance al arrancar, `/curar` y una página en la landing ("Comé, descansá
   y cuidate").

   **Hecho (2026-10-02):** `/curar [jugador]` (comando de admin) y botón **Curarme** en el panel de
   Admin; `needsBalance.ts` con el aviso `[Balance]` al arrancar (no salta: 1–6 %); tarjeta
   "Comé, descansá y cuidate" en la landing (junto con "Adoptá una mascota" y "Visitá el COMCAR",
   para que la grilla quede pareja). Se sumó la **Farmacia Sarandí** con remedios (categoría
   `medicine`), pedida durante esta fase.

Cada fase deja el juego jugable y se puede publicar por separado.

## Decisiones (2026-10-02)

- **El desmayo se cobra:** 10 % de la plata, como mucho $200, nada con menos de $20. Nunca ítems.
- **Hambre y salud son privadas:** los demás no las ven. Van en un mensaje privado (`needs`), no en
  el Schema. La energía sigue en el Schema como hoy.
- **El pescado crudo hace mal:** −2 de salud al comerlo (cualquier pescado), sin bajarla nunca de
  10. Entra en la fase 3, junto con la salud.
- **El hambre no baja en el COMCAR:** queda congelada y la salud no baja por hambre adentro. Por eso
  no hace falta el "rancho" gratis que proponía antes.
- **Velocidad al caminar con poca salud:** descartado (complica la predicción del movimiento). Se
  reemplaza por el tope de energía en 50.

## Más adelante (fuera de esta propuesta)

- **Cocinar:** parrilla en la rambla o en el Mercado, pescado crudo → pescado a la plancha (más
  saciedad y algo de salud).
- **Vender comida entre jugadores** con los carritos del Centenario.
- **Clima** (frío en invierno → más hambre) y **bebida / sed** como cuarta barra, si las tres
  funcionan bien.

## Archivos que se tocan

| Archivo | Cambio |
| --- | --- |
| `packages/shared/src/stamina.ts` → `needs.ts` | tabla de barras, constantes, `energyRegenFactor`, `hungerDrain` |
| `packages/shared/src/items.ts` | categoría `food` (`FoodItem`), comidas, pescado con `hunger` |
| `packages/shared/src/schema/Player.ts` | `stamina` → `energy` (hambre y salud no van al Schema) |
| `packages/shared/src/messages.ts` | `food:eat`, `needs` / `needs:get`, `faint`, `hospital:heal` |
| `packages/shared/src/cities/*.ts` | Kiosco de Ciudad Vieja, Bar del Mercado, puerta del sanatorio |
| `apps/server/src/stamina.ts` → `needs.ts` | clase `Needs` con `tick` |
| `apps/server/src/rooms/CityRoom.ts` | usar `needs`, hambre en el tick, desmayo, comer, sanatorio |
| `apps/server/src/playerStore.ts` | `PlayerRecord.needs` |
| `apps/server/src/commands/curar.ts` | comando nuevo |
| `apps/client/src/components/Hud.tsx` | tres barras |
| `apps/client/src/lib/gameStore.ts`, `eventBus.ts`, `network.ts` | `needs`, `player:energy`, `needs:update` |
| `apps/client/src/lib/itemActions.ts`, `ItemIcon.tsx`, `Backpack.tsx`, `itemCategoryUi.ts` | comida |
| `apps/client/src/components/FaintOverlay.tsx` | pantalla del desmayo |
| `CLAUDE.md` | sección "Necesidades" en lugar de "Stamina" (flujo de red, punto 11) |
