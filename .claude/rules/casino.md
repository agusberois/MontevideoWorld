---
paths:
  - "packages/shared/src/casino.ts"
  - "packages/shared/src/cities/casino/**"
  - "apps/server/src/rooms/systems/casino.ts"
  - "apps/client/src/features/casino/**"
  - "apps/client/src/game/city/landmarks/casino/**"
  - "apps/client/src/game/city/landmarks/ciudadVieja/casino.ts"
---

# Casino Victoria Plaza

Casino **Victoria Plaza**: edificio en Ciudad Vieja (landmark `casino`, 109,20, 3×3, sobre Cerrito: rojo y dorado con
marquesina de lamparitas y cartel de neón). Su puerta (`Door` sobre el edificio, sin `access`) lleva
al barrio `casino` (`CityInfo.access: "door"`: entra cualquiera, sólo por la puerta; no sale en la
lista ni en la landing; al volver a entrar al juego se vuelve sin boleto, `canResumeTo`). Adentro
(20×16): seis tragamonedas contra la pared norte, la mesa de ruleta y la de blackjack.

Cada máquina o mesa es un landmark (el dibujo: `slotMachine`, `rouletteTable`, `blackjackTable` en
`landmarks/casino/juegos.ts`) y una "tienda" con `Shop.casino` sobre la misma área (`building:
"none"`, sin cartel de "Tienda"): clic o F ("Jugar: …") camina hasta ahí y abre `CasinoPanel` en
lugar del `ShopView`. Todo lo sortea y paga el server (`systems/casino.ts`); las reglas y tablas están
en shared (`casino.ts`), iguales para el panel. Apuesta entre `CASINO_MIN_BET` y `CASINO_MAX_BET`
($1–$500), se cobra antes de jugar; el resultado llega con `casino:result` (sólo al que juega).

- **Tragamonedas** (`casino:slots { shopId, bet }`): tres rodillos con `SLOT_SYMBOLS` (peso y pago
  del trío); dos cerezas devuelven la apuesta. `slotsReturnRate()` ≈ 92,5 %.
- **Ruleta europea** (`casino:roulette { shopId, bet, choice }`): rojo / negro / par / impar pagan
  ×2, un número ×36; el 0 pierde todo menos el número 0 (≈ 97,3 %).
- **Blackjack** (`casino:blackjack { shopId, action: deal | hit | stand, bet }`): la mano vive en
  `session.blackjack` (si se va, la apuesta queda perdida). El crupier se planta en 17, blackjack de
  entrada paga 3 a 2, empate devuelve; sin dividir ni doblar. Con la mano abierta la segunda carta
  del crupier va tapada.

Todos dejan ventaja a la casa: el casino saca plata de la economía. Al tocar pagos o pesos, revisar
`slotsReturnRate()` (tiene que quedar por debajo de 1).
