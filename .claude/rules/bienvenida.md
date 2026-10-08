---
paths:
  - "packages/shared/src/welcome.ts"
  - "apps/server/src/rooms/systems/welcome.ts"
  - "apps/client/src/features/welcome/**"
  - "apps/client/src/features/npcs/**"
  - "apps/client/src/game/objects/Npcs.ts"
---

# Bienvenida del jugador nuevo y NPCs con los que se habla

Sólo para quien entra **por primera vez** (sin guardado): `session.welcome` arranca en `NEW_WELCOME`.
Un guardado sin el campo (de antes) queda `done` (`sanitizeWelcome`). Se guarda con el progreso
(`PlayerRecord.welcome`) y en el acto con cada paso (`advance` → `savePlayer`).

Etapas (`WelcomeStage`): `mail` → `courier` → `deliver` → `profession` → `done`.

1. **`mail`**: en el HUD (`Hud.tsx`, primero de `.hud-actions`) aparece el botón ✉️ "Mensaje"
   resaltado (`attention`: dorado, brilla, el sobre se sacude, insignia "1" y el cartelito "¡Tenés un
   mensaje!"). Abre el panel `welcome` (`WelcomePanel`, vista **misión**: "¡Bienvenido/a, nombre!" por
   `gender`, barra de avance y los tres pasos con el actual resaltado). Abrirlo manda `welcome:read` → `courier`.
2. **`courier`**: hablarle al **Cartero** (Plaza Independencia, Ciudad Vieja, `WELCOME_COURIER_ID`)
   da el **Sobre de bienvenida** (`WELCOME_LETTER_ID`, categoría `letter`) → `deliver`. Si no le entra
   en la mochila, no avanza.
3. **`deliver`**: hablarle a la **Funcionaria de la Intendencia** (adentro de la Intendencia, sala
   `intendencia`: primer escritorio, `WELCOME_CLERK_ID`) con el sobre: primero pasa a `profession` y después saca el sobre (en
   ese orden, si no contaría como perdido). Su diálogo ofrece "Abrir el sobre" → panel `welcome`,
   vista **carta** (papel, "Bienvenido/a, nombre, a Montevideo World", algo del juego y las profesiones).
   - **Perder el sobre**: venderlo (lo compra el Kiosco de la Plaza, $5) o tirarlo (mochila → "Tirar",
     con confirmación, `inventory:drop`) en `deliver` termina la misión: `checkWelcomeLetter` (lo llama
     `CityRoom.markInventory` en cada cambio de mochila) pone `profession` = `LETTER_LOST_PROFESSION`
     (**cuidacoches**) y `done`, con aviso. El store abre el panel en la vista **resultado**.
     También le da su kit (abajo): el **Chaleco flúo**.
4. **`profession`**: `welcome:profession { profession }` (sólo las `choosable`: pescador, vendedor,
   músico; `isChoosableProfession`) → `done`. **Las profesiones todavía no hacen nada**: sólo se guarda
   la elegida (`welcome.profession`). Con `done` el botón del HUD desaparece.
   - **Kit de la profesión** (`PROFESSION_KIT` en `professionKit.ts`, `giveKit`): a la mochila, lo más
     barato de su trabajo: pescador → caña básica, vendedor → conservadora, músico → armónica (se
     calcula del catálogo); cuidacoches → **Chaleco flúo** (`SAFETY_VEST_ID`, `WORK_CLOTHING`, estilo
     `vest`; ninguna tienda lo vende; puesto, se cuidan coches frente a los edificios con nombre: ver `pesca-y-venta.md`). Si no entra en la mochila, aviso y no se da. La carta muestra en
     cada tarjeta qué te llevás y el resultado, qué te dieron.

**NPCs con los que se habla** (`Npc.talks`, `roam` de 1 × 1 para que el server sepa dónde están;
`role` es lo que sale debajo del nombre; con `counter`, el escritorio que tienen delante, también se
les habla desde pegado a él: `npcReach`; los que no tienen caso propio en `talkToNpc` dicen una de sus
`lines` al azar): clic en el NPC o F pegado a él (`Npcs.talkingAt` /
`talkingNear`, en `CityScene.handleTap` y `findInteraction`) → `npc:talk { npcId }`. El server
(`systems/welcome.ts`) le habla si está pegado (`CityMap.isNearNpc`) o camina hasta al lado
(`npcApproach`, `pending` `npc`, se resuelve en `stepPlayers`). Lo que dice va **sólo a quien le
habló** con `npc:say { npc, role, text, received?, action? }` → el store abre el panel `npcDialog`
(`features/npcs/NpcDialog.tsx`): retrato (`AvatarPreview`), nombre, el texto que se va escribiendo,
lo que te dio y un botón según `action` (`mission` = ver la misión, `letter` = abrir el sobre). Lo
que contesta cada NPC según la etapa está en `talkToNpc`; para un NPC nuevo con diálogo, sumar su caso ahí.
