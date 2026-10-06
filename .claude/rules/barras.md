---
paths:
  - "packages/shared/src/barras.ts"
  - "apps/server/src/barraStore.ts"
  - "apps/server/src/rooms/systems/barras.ts"
  - "apps/server/src/commands/barra.ts"
  - "apps/client/src/features/barras/**"
  - "apps/client/src/game/city/landmarks/ciudadVieja/registroBarras.ts"
---

# Barras (clanes) — etapa 1

Diseño completo y etapas siguientes en `docs/pending/funcionalidades-primera-version.md` (§2.2).

- **Reglas** (`packages/shared/src/barras.ts`, las usan server y cliente): fundar cuesta
  `BARRA_FOUND_COST` ($1.000), tope `BARRA_MAX_MEMBERS` (30), nombre de 3 a 24 letras
  (`normalizeBarraName` + `barraNameProblem`, misma limpieza que los nombres de jugador), sigla de 2 a
  4 letras o números en mayúsculas (`normalizeBarraTag` + `barraTagProblem`, sin siglas del staff como
  `[ADM]` o `[MOD]`), dos colores de `BARRA_COLORS` (por id). Nombre (`nameKey`) y sigla, únicos.
- **Dónde se funda:** el **Registro de Barras**, casona sobre la peatonal Sarandí en Ciudad Vieja
  (landmark `barraRegistry`, 77,45, 3 × 3, `registroBarras.ts`: banderines de colores y bandera) con
  una tienda `building: "none"` y `registry: true` en la misma área: clic o F → `ShopPanel` abre
  `BarraRegistry` (formulario con vista previa de la sigla). El server exige estar al lado
  (`isNearShop`), tener clave, no ser de otra barra y la plata.
- **Guardado** (`apps/server/src/barraStore.ts`): la interfaz `BarraRepository` (lo único que usa el
  resto del server) y hoy `JsonBarraStore`, un archivo `apps/server/data/barras.json`
  (`BARRA_DATA_FILE`), todo en memoria con índice por integrante, escritura asíncrona a un temporal que
  se renombra; se escribe también al apagar (`index.ts`). Los integrantes van por **`playerId`** (hash
  de la clave, como `playerStore`): al migrar a Supabase se reimplementa la interfaz y, con cuentas, se
  pasa de `playerId` a `user_id`.
- **Mensajes** (`systems/barras.ts`): `barra:create { name, tag, colors }`, `barra:invite { targetId }`
  (sólo el fundador, a alguien de la sala sin barra) → al invitado `barra:invited` (vence en
  `BARRA_INVITE_MS`; las pendientes viven en memoria) → `barra:respond { barraId, accept }`,
  `barra:leave` (el fundador, si se va, **la disuelve**: pasar el mando llega con los roles),
  `barra:get` → `barra { barra: BarraView | null }` (integrantes con conectado y barrio, por
  `playerDirectory.byPlayerId`), y `barra:result { ok, text }`.
- **Schema:** `Player.barraTag`, `barraColor`, `barraName` (`applyBarra`, al entrar y cada vez que
  cambia; para los integrantes conectados en otras salas, `PrivateMailbox.refreshBarra`). El avatar
  muestra la sigla en una pastillita de su color a la izquierda del nombre (`Avatar.setBarra`, texto
  blanco o negro según el fondo); `PlayerSummary.barra` la lleva a la lista, el menú y los detalles.
- **Chat:** `/barra <texto>` (`commands/barra.ts` → `host.chatBarra`) llega a todos los conectados de
  la barra en cualquier barrio, como `ChatKind` `"barra"` (con `barraTag` y `barraColor`; sin globo). Los
  avisos de la barra (entró, se fue, la disolvieron) usan el mismo tipo sin nombre. Silenciado y
  repetido, como `/mensaje`.
- **Cliente:** panel **Mi barra** (tecla **B**, `BarraPanel`: bandera con los dos colores, integrantes,
  irse / disolver con confirmación), `BarraInvites` (Entrar / No; las de bloqueados no se muestran),
  "🚩 Invitar a mi barra" en `PlayerMenu` (si sos fundador y el otro no tiene barra), `App` pide la
  barra al entrar a cada sala (`requestBarra`) y `gameStore.barra` la guarda.
- **Pendiente (etapa 2):** roles (segundos que invitan y echan), pasar el mando, mensaje del día, el
  mando al segundo más antiguo si el fundador no entra en X días, herramientas del admin (renombrar o
  disolver). Etapa 3: bonus de comparsa de barra, rankings.
