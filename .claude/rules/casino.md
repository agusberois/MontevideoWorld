---
paths:
  - "packages/shared/src/casino.ts"
  - "packages/shared/src/cities/casino/**"
  - "apps/server/src/rooms/systems/casino.ts"
  - "apps/client/src/features/casino/**"
  - "apps/client/src/game/city/landmarks/casino/**"
  - "apps/client/src/game/city/landmarks/ciudadVieja/casino.ts"
  - "apps/client/src/game/city/SlotLights.ts"
  - "apps/client/src/game/objects/Npcs.ts"
---

# Casino Victoria Plaza

Casino **Victoria Plaza**: edificio en Ciudad Vieja (landmark `casino`, 109,20, 3×3, sobre Cerrito: rojo y dorado con
marquesina de lamparitas y cartel de neón). Su puerta (`Door` sobre el edificio, sin `access`) lleva
al barrio `casino` (`CityInfo.access: "door"`: entra cualquiera, sólo por la puerta; no sale en la
lista ni en la landing; al volver a entrar al juego se vuelve sin boleto, `canResumeTo`). Adentro
(28×20): ocho tragamonedas contra la pared norte, dos mesas de ruleta y dos de blackjack, sillones
(bancos) y palmeras en maceta. Se sale por una **puerta doble** (`Door` de 1 × 2 en la pared oeste:
`innerWallSpec("start" | "end")`, una hoja por tile con vidrio, marco dorado y cartel verde de
salida; la misma que en el Hotel del Donador).

**Ambiente de boliche** (`CityDefinition.interior`, `InteriorStyle`): alfombra roja con rombos
dorados (`drawGround` pinta el `Floor` con `floor` y el dibujo `carpet`), paredes negras con zócalo
bordó, moldura dorada y tubo de neón rosa (`innerWallSpec(door, style)`, textura por barrio).
Con `nightclub` es **siempre de noche** (`DayNight.fix`: velo violeta fijo, no sigue la hora) y
`CityRenderer.nightclubLights` suma luz de color a cada tragamonedas, luz cálida sobre las mesas,
neón en la barra y las paredes y verde en la salida. `city/SlotLights.ts` (por encima del velo):
las lamparitas de arriba de cada tragamonedas titilando. Sin luces que se muevan ni bola de espejos
(se sacaron a pedido). Otro interior sin `interior` sigue con baldosas claras y azulejos (el Hotel del Donador).

**Barra** (esquina noreste): el estante con botellas, espejo y neón (`barShelf`) contra la pared y el
mostrador con canillas, copas y banquetas (`barCounter`; su fila de atrás es el pasillo del barman,
no se camina), en piezas 1 × 1 (`landmarks/casino/barra.ts`). Es una tienda común (`barra-casino`,
`building: "none"`) sobre la fila del mostrador: los tragos (`DRINKS` en `items.ts`: café, cerveza,
grappamiel, medio y medio, whisky; categoría `food`, casi no llenan y dan energía, no rinden más
que el mate; no entran en `FOODS`) y alfajor, pancho y chivito. Detrás atiende el **barman**, un
NPC (`CityDefinition.npcs`: aspecto, ropa y `roam`): el cliente lo dibuja con un `Avatar` y lo
pasea de a ratos por su `roam` (`objects/Npcs.ts`); no es jugador ni se puede clickear.

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

**El show es sólo del cliente** (`CasinoPanel`): el resultado llega enseguida y el panel lo dosifica.
Los rodillos giran (tiras borrosas) y frenan uno por uno (`REEL_STOPS_MS`; si los dos primeros
coinciden, el tercero tarda `SUSPENSE_MS` más, con el gabinete en dorado), con palanca y botón
**Auto ×10** (para solo con premio mayor o sin plata). La ruleta es la rueda europea en su orden real
(`EUROPEAN_WHEEL`): gira con transición CSS y frena con el número bajo la flecha mientras la bola da
vueltas al revés, con marcador de los últimos números. Las cartas se reparten de a una
(`DEAL_STEP_MS`). Mientras gira, la plata del panel queda en la de antes menos la apuesta y después
sube o baja con contador. Festejo fuera del panel (no ataja clics): cartel, monto y monedas; premio
mayor (≥ ×20) con lluvia de monedas, temblor y destellos; "¡por un pelo!" con dos símbolos grandes.
Sonidos sintetizados con WebAudio (`casinoSound.ts`, sin archivos; se apagan con 🔊, `mw:casino-sound`).
Marquesina de lamparitas y fichas de colores. Jugadas y neto de la visita en memoria (se pierden al
recargar). Si el server no contesta en 6 s, el panel se destraba. Con `prefers-reduced-motion`, casi
sin animaciones.

Todos dejan ventaja a la casa: el casino saca plata de la economía. Al tocar pagos o pesos, revisar
`slotsReturnRate()` (tiene que quedar por debajo de 1).
