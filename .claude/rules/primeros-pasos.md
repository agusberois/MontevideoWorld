---
paths:
  - "packages/shared/src/tutorial.ts"
  - "apps/server/src/rooms/systems/tutorial.ts"
  - "apps/client/src/features/tutorial/**"
  - "apps/client/src/game/objects/TutorialPointer.ts"
  - "apps/server/src/commands/guia.ts"
---

# Guía de bienvenida ("Bienvenido a Montevideo")

Cinco pasos (`TUTORIAL_STEPS` en `packages/shared/src/tutorial.ts`), cada uno con un **objetivo**
genérico (`TutorialGoal`: `reach` un área de un barrio, `eat` un ítem, `catch`, `sell` a una tienda
una categoría, `travel`) pensado para reusar en las changas del día:

1. Llegar al Monumento a Artigas ($15) · 2. Comer una torta frita del Kiosco de la Plaza ($15) ·
3. Sacar un pescado en la Escollera Sarandí ($20) · 4. Venderlo en la Pescadería del Mercado ($20) ·
5. Comprar un boleto STM y viajar a otro barrio ($30 + **Gorra celeste**, `TUTORIAL_GIFT_ID`, que
   ninguna tienda vende). Total $100 (`TUTORIAL_TOTAL_REWARD`).

- **Estado** (`TutorialState`: `status` active/done/skipped, `step`, `replay`): en
  `PlayerSession.tutorial` y guardado con el progreso (`PlayerRecord.tutorial`, `sanitizeTutorial`).
  Sin el campo (jugadores nuevos **y** guardados de antes de la guía) se ve desde el principio: la
  ven todos una vez.
- **El server decide** (`rooms/systems/tutorial.ts`): cada sistema avisa lo que el jugador hizo de
  verdad con `tutorialEvent` (comer en `activities.ts`, pescar en `resolveCatch`, vender y regatear
  con éxito en `shops.ts`, viajar en `travel.ts` antes del `savePlayer`) y llegar se mira en cada
  paso (`checkTutorialReach` en `stepPlayers`, distancia de Chebyshev al área ≤ `within`). Si es lo que
  pide el paso de ahora (`tutorialWants`), `completeStep` paga (`wallet.credit`), pasa al siguiente,
  **guarda en el acto** y manda `tutorial { …estado, completed: { step, reward, gift? } }`. Al
  terminar: la gorra a la mochila (llena: aviso y no se da) y anuncio en el chat del barrio.
- La torta frita del paso 2 se puede comer **aunque esté lleno** (`tutorialWants` en `FoodEat`): un
  jugador nuevo arranca con todo al 100 y si no, el paso quedaba trabado.
- `tutorial:get` lo pide el cliente al entrar (en `bindRoomMessages`, como la mochila);
  `tutorial:skip` la saltea; `/guia` (`restartTutorial`) la abre de nuevo desde el principio con
  `replay: true` (sin premios ni regalo), salvo que no la hubiera empezado.
- **Cliente**: `features/tutorial/TutorialCard.tsx` (en el `.dock` de `App`: arriba a la izquierda
  debajo del HUD en escritorio; en celulares, arriba de `Vitals`). Muestra el paso, la barra de
  progreso, adónde ir y el premio, se pliega (`mw:tutorial-collapsed`) y se saltea con confirmación.
  Festeja cada paso ("✅ ¡Bien! +$15") y al terminar muestra una tarjeta final (sólo si terminó en
  esta sesión). Se esconde preso en el COMCAR. `tutorialView` elige texto y destino según la mochila
  (paso 5: la Agencia STM hasta tener boleto; después, la parada de la Plaza Independencia).
- **Flecha**: la tarjeta emite `tutorial:target` (`{ cityId, area }` o null) y la escena lo dibuja
  con `TutorialPointer` (dorada, para no confundirla con la celeste del avatar): una flecha que
  rebota sobre el lugar y, si está fuera de pantalla, otra en el borde (mismo margen que la del
  avatar, `arrowInset`). Una escena nueva (al viajar) la pide con `tutorial:target:request`.
