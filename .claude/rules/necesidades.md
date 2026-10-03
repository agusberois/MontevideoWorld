---
paths:
  - "packages/shared/src/needs.ts"
  - "packages/shared/src/needsBalance.ts"
  - "apps/server/src/needs.ts"
  - "apps/server/src/rooms/systems/life.ts"
  - "apps/server/src/rooms/systems/activities.ts"
  - "apps/client/src/ui/Hud.tsx"
  - "apps/client/src/features/health/HospitalPanel.tsx"
  - "apps/client/src/features/health/FaintOverlay.tsx"
  - "apps/client/src/ui/Notices.tsx"
---

# Necesidades: energía, hambre y salud

Necesidades (diseño completo en `docs/finished/necesidades-del-personaje.md`): **energía** (antes
"stamina"), **hambre** (saciedad, 100 = lleno) y **salud**, 0–100. Las lleva el server (`Needs` en la Room,
con decimales). La energía va redondeada a `player.energy` (Schema) → la escena emite
`player:energy` → `state.energy`. Hambre y salud son **privadas**: no van en el Schema; el server
se las manda sólo al dueño con `needs { hunger, health }` (lo pide el cliente con `needs:get` al
entrar, y se reenvía cuando cambia algún valor redondeado) → `needs:update` → `state.hunger` /
`state.health`. Las tres son barras del HUD (`NeedMeter`) y **se guardan** con el progreso (`PlayerRecord.needs`, `Needs.snapshot` /
`Needs.restore`, validado con `sanitizeNeeds`; sin guardado, llenas): salir, volver a entrar o
viajar no las llena. Todo pasa en `Needs.tick`, desde el tick de `stepPlayers` (`tickNeeds`): el
hambre baja `HUNGER_PER_SECOND` (de lleno a vacío en 50 min), más `WALK_HUNGER_COST` por paso y
`FISH_HUNGER_COST` / `VEND_HUNGER_COST` por tirada o venta; **no baja preso en el COMCAR**. Al
bajar de `HUNGRY` (60) o de `STARVING` (30) llega un aviso. Comer (`food:eat`: comida de la
categoría `food`, o un pescado crudo) suma lo de `edibleValue`; con todo lo que da ya lleno no se
puede. La comida se compra en el **Kiosco de la Plaza** (Plaza Independencia), el Kiosco del
Parque (pancho, mate) y la Pescadería del Mercado (chivito, pescado a la plancha). Energía: cada
paso gasta `WALK_ENERGY_COST`, tirar la línea
`FISH_ENERGY_COST`, ofrecer en el Centenario `VEND_ENERGY_COST`; quieto (sin camino, sin pescar ni vender) recupera `IDLE_ENERGY_REGEN`/s y sentado en un
banco `SIT_ENERGY_REGEN`/s, por `energyRegenFactor(hambre)` (lleno ×1, con hambre ×0,5, muerto de
hambre ×0,25).
**Salud**: la bajan las picaduras (`WEEVIL_BITE_HEALTH`), la saciedad en 0 fuera del COMCAR
(`STARVE_HEALTH_PER_SECOND`) y el pescado crudo (`edibleValue`: −`RAW_FISH_HEALTH`, sin bajarla de
`RAW_FISH_HEALTH_FLOOR`); vuelve quieto con la saciedad ≥ `HUNGRY` (`IDLE_HEALTH_REGEN`, sentado
`SIT_HEALTH_REGEN`), con comida que cura (chivito, pescado a la plancha) o en la **Guardia del
Sanatorio** (Tres Cruces, tienda con `hospital: true` sobre el Sanatorio Americano → `HospitalPanel`;
`hospital:heal` la deja en 100 por `hospitalPrice`). Por debajo de `LOW_HEALTH` la energía no
pasa de `WEAK_ENERGY_CAP` (`energyCap`). **Desmayo** (salud 0, `faint` en `systems/life.ts`): corta todo,
cobra `faintFee` (10 %, tope $200, nada con menos de $20; nunca ítems), `Needs.revive` (salud 30,
energía 50, saciedad ≥ 30) y manda `faint { text }` → `FaintOverlay` (pantalla negra). Preso, se
despierta en el patio; en Tres Cruces, en la puerta de la guardia (`hospitalDoor`); en otro barrio
con clave, pase de viaje con `at` (la puerta) y `travel:ok { ambulance: true }` → `TravelOverlay`
con la ambulancia; sin clave, en la plaza. Avisos al pasar a débil y al empezar a perder salud
por hambre.
**Remedios** (categoría `medicine`, `MEDICINES`: curitas, Perifar, vitaminas, botiquín): se
compran en la **Farmacia Sarandí** (Ciudad Vieja, 48,22, `building: "pharmacy"`) y se toman como
la comida (`food:eat`, "Te tomaste…"): curan salud al momento (y las vitaminas dan energía).
**Balance de la comida** (`needsBalance.ts`): al arrancar el server avisa `[Balance] …` si con
alguna herramienta la comida de una hora de trabajo (`foodCostPerHour`, con la más barata) pasa
de `MAX_FOOD_SHARE` (15 %) de lo que deja por hora (`hourlyIncome`). Hoy da entre 1 % y 6 %. Si una acción no alcanza queda **agotado**: se frena y no puede caminar
ni pescar hasta recuperar `EXHAUSTED_RECOVERY` (si no, cada tick de descanso daría para un paso
más). El aviso llega con `notice` (mensaje privado) → `Notices`.
