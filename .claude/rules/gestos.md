---
paths:
  - "packages/shared/src/gestures.ts"
  - "apps/server/src/rooms/systems/gestures.ts"
  - "apps/client/src/features/gestures/**"
  - "apps/client/src/features/players/PlayerMenu.tsx"
  - "apps/client/src/game/objects/Avatar.ts"
---

# Gestos

**Solos**: tomar mate, bailar candombe, festejar un gol, saludar con la mano, aplaudir y pedir
silencio (`GESTURES` en shared: nombre, `cry` que flota sobre la cabeza al empezar, `durationMs` y
`seated`, si se puede sentado). Se eligen en el panel **Gestos** (tecla **E**, botón del HUD;
`GesturesPanel`) → `gesture { gesture }` → `gestureRoutes`: pescando o vendiendo, aviso y nada;
sentado, sólo los `seated` (candombe y gol piden estar parado); caminando, queda como `pending`
(`kind: "gesture"`) y lo hace al llegar (caminar a otro lado lo cancela). **Saludar** a un jugador
(menú del jugador) además de su mensaje hace el gesto `wave`, si no está caminando.

**De a dos** (`PAIR_GESTURES`: chocar los cinco, dar un abrazo, pasar el mate), desde el menú del
jugador (`PlayerMenu`): `gesture:pair { targetId, gesture }` → el server chequea que estén a
`PAIR_GESTURE_RANGE` tile, quietos y libres (siempre parados), guarda la invitación en
`session.pairRequest` (una a la vez, vence en `PAIR_GESTURE_INVITE_MS`) y le manda al otro
`gesture:invite` → `PairGestureInvites` ("Dale" / "No, gracias"; las de un bloqueado no se muestran)
→ `gesture:respond { fromId, accept }` → vuelve a chequear y `startPairGesture` pone a los dos el
mismo `gesture`, `gesturePartner` (el otro) y `gestureLead` (el que invitó: en el mate, el que convida).

`startGesture` / `startPairGesture` ponen `Player.gesture` (Schema: lo ven todos) y
`session.gestureUntil`; `stepGestures` (cada tick, después de `stepPlayers`) lo vuelve a "" al
vencer, si camina, pesca, vende o se sentó con uno de parado, y en los de a dos también si el otro
dejó de hacerlo (así cortar uno corta a los dos).

Cliente: `CityScene` escucha `gesture`, `gesturePartner` y `gestureLead` → `Avatar.setGesture(id,
avatar del otro, lead)` y, al empezar, `floatText` con el `cry` por encima del nombre
(`GESTURE_CRY_Y`; en los de a dos, sólo sobre el que invitó). `Avatar.poseGesture` corre después de
la pose de base y pisa los brazos con rotación **y escala** (`scaleY` acorta el brazo como si se
doblara hacia la cámara; `reach` calcula las dos para poner la mano en un punto, `handOf` dice dónde
quedó). Accesorios: `prop` sigue a la mano cercana (mate, índice, bandera uruguaya, palo del
tambor; `holdProp` lo redibuja sólo al cambiar), `termo`, `drum` (tamboril colgado) y `fx`, que se
redibuja cada frame (vapor del mate, golpe en el parche, chispitas del aplauso y del choque,
rayitas del saludo, corazones del abrazo). En los de a dos (`posePair`) cada uno se da vuelta hacia
el otro, se acerca hasta un `gap` (corre `body_.x`) y hace su parte; los efectos del medio los
dibuja sólo el `lead`. Entra suave en `GESTURE_BLEND_MS` y al terminar `poseLimbs` devuelve todo
(escala, rotación, `body_.x`). Caminando no se dibuja nada (`hideGestureProps`).
