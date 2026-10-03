# Supabase: base de datos y login con Google

**Fecha:** 2026-10-03

**Resumen:** hoy todo el progreso vive en un JSON (`players.json`) indexado por una clave secreta que
genera el navegador, y el admin se decide por nombre (`ADMIN_NAME`). Este plan lo pasa a **Postgres
de Supabase** y suma **login con Google vía Supabase Auth**, sin cambiar el modelo del juego: el
server sigue siendo autoritativo **en memoria** y la base guarda *snapshots* transaccionales (cada
15 s, al salir, al viajar, al cerrar un intercambio y al apagar). El cliente se loguea con Supabase,
le pasa el JWT a Colyseus y el server lo verifica en `onAuth` con el JWKS del proyecto. **Se juega
sólo con cuenta** (sin invitados); cada cuenta tiene **hasta 3 personajes**, con **nombre único que no
se cambia**, y el progreso es de la cuenta, no del navegador. El progreso viejo de una clave del
navegador se puede **importar** una vez como personaje de la cuenta. El navegador **nunca** lee la
base: todo pasa por el server. El admin pasa a ser un **rol de la cuenta**. Se hace en fases, detrás
de una interfaz `PlayerRepository` con dos implementaciones (JSON y Supabase), así se puede volver
atrás cambiando una variable.

> Plan, no implementación: nada de esto está hecho. Los nombres de archivos, funciones y campos del
> "Estado actual" están verificados contra el código del 2026-10-03.

## Decisiones tomadas (2026-10-03)

Respuestas a las preguntas abiertas de la primera versión. Mandan sobre cualquier parte del plan que
diga otra cosa (el resto del doc ya está ajustado a esto).

| # | Pregunta | Decisión | Qué cambia en el plan |
| --- | --- | --- | --- |
| 1 | ¿Invitados? | **No.** Se juega sólo con cuenta de Google. | Sin "Jugar sin cuenta", sin `ALLOW_GUESTS`, sin job de invitados. La clave del navegador sólo sirve para importar progreso viejo (§2). Jugar por IP en la red local deja de andar con Supabase (OAuth no redirige a una IP). |
| 2 | ¿Nombres únicos? | **Sí, únicos y no se pueden cambiar.** | El nombre se elige al crear el personaje y queda fijo; índice único en `players.name_key`; `/ban`, `/mensaje`, `/trace` por nombre apuntan a uno solo. `JoinScreen` deja de pedir nombre en cada ingreso. |
| 3 | ¿Personajes por cuenta? | **Hasta 3.** | Tabla `accounts` (rol, alta, baja) + `players` con `slot` 1–3. Pantalla nueva para elegir o crear personaje. |
| 4 | Progreso y navegadores | **El progreso es del usuario**, no del navegador. | Todo cuelga de la cuenta: desde cualquier navegador o dispositivo se ve lo mismo. La clave sólo se usa para importar el progreso de `players.json` (cada clave, una vez, como uno de los 3 personajes). |
| 5 | Retención del libro de economía | **A decidir.** | Sigue abierta (180 días como propuesta). |
| 6 | ¿El cliente lee la base? | **No.** Siempre a través del server, para que no se pueda hackear. | RLS sin ninguna política ni `grant` para `anon` / `authenticated`: el navegador sólo usa Supabase Auth. La lista de personajes la da el server (§2). |
| 7 | Borrar cuenta | **A futuro**, una opción de eliminar la cuenta. | Queda fuera de las fases; el esquema lo deja preparado (`accounts.deleted_at`, `on delete cascade`). |
| 8 | Conexión del server | **`@supabase/supabase-js` con la API key secreta** (service role) en el server. | Se descarta la conexión directa a Postgres. |
| 9 | ¿JSON para desarrollo local? | **A decidir.** | Sigue abierta: `JsonPlayerRepository` se mantiene al menos hasta el corte. |

## 1. Estado actual

### Qué se guarda y dónde

`apps/server/src/playerStore.ts` → `PlayerStore` (singleton `playerStore`): un `Map<string,
PlayerRecord>` en memoria que se vuelca entero a `PLAYER_DATA_FILE` (por defecto
`apps/server/data/players.json`). La clave del `Map` es la **clave secreta del navegador**
(`JoinOptions.playerKey`, validada con `isPlayerKey`: 32–64 caracteres `[A-Za-z0-9_-]`), que el
cliente genera y guarda en `localStorage` (`mw:playerKey`, `apps/client/src/lib/playerKey.ts`).

`PlayerRecord`:

| Campo | Qué es | De dónde sale al guardar (`CityRoom.savePlayer`) |
| --- | --- | --- |
| `name` | Nombre del jugador | `player.name` (Schema) |
| `money` | Saldo en pesos enteros | `session.wallet.balance` (`Wallet`) |
| `inventory` | `InventoryStack[]` (`itemId`, `quantity`, `uses?`, `slot?`) | `session.inventory.snapshot()` |
| `outfit` | `OutfitIds` (`hat/top/bottom/shoes`, `""` = nada) | `player.hat/top/bottom/shoes` |
| `donor?` | Donador (`/donador`) | `player.donor` |
| `jailedUntil?` | Preso hasta (ms) | `bans.savedUntil(key)` |
| `needs?` | `SavedNeeds` (`energy`, `hunger`, `health`) | `session.needs.snapshot()` |
| `pet?` | `{ id, name }` | `player.pet` / `player.petName` |
| `updatedAt` | ISO, lo pone `set` | — |

**No** se guarda hoy: el aspecto (`gender/skin/hairColor/hairStyle/color` viaja en cada
`JoinOptions.appearance` y se recuerda en `localStorage` `mw:appearance`), la barra rápida
(`features/inventory/hotbarStorage.ts`, `localStorage`) ni la posición.

Al cargar (`CityRoom.onJoin`) todo se revalida: `Inventory.restore` (ítems existentes, cantidades,
usos, casilleros; separa cañas viejas apiladas), `getClothing` por lugar del cuerpo, `getPet` +
`sanitizePetName`, plata entre 0 y `MAX_MONEY`, `Needs.restore` (→ `sanitizeNeeds`). Sin guardado:
`STARTER_KIT` puesto (al azar entre opciones), `STARTER_INVENTORY` (`cana-basica`) y `STARTING_MONEY`
($100). Esa validación **se mantiene** igual con la base: la base no es fuente de confianza sobre
qué ítems existen (el catálogo vive en código, `ITEMS`).

### Cuándo se escribe

- **Cada 15 s** (`SAVE_INTERVAL_MS` en `CityRoom.ts`) → `saveAllPlayers` → `savePlayer` de cada
  sesión. `PlayerStore.set` compara una **huella** (`JSON.stringify` sin `updatedAt`): si no cambió,
  no hace nada.
- **Inmediato** (igual pasa por `set`, que sólo marca y agenda): al salir (`onLeave`), al cerrar por
  sesión duplicada (`evictDuplicate`), al viajar (`TravelRequest` en `systems/travel.ts`), en
  `/trace` y desmayo con ambulancia (`systems/social.ts`, `systems/life.ts`), al ir preso
  (`jail` en `systems/travel.ts`), al adoptar / renombrar / despedir mascota (`systems/shops.ts`) y
  al marcar donador (`setDonor` en `createCommandHost`).
- La escritura real es **diferida y agrupada**: `WRITE_DELAY_MS` = 2 s, una a la vez, todo el
  archivo, a un `.tmp` + `rename` (atómico). Si falla, queda `dirty` y reintenta en la próxima.
- **Al apagar**: `gameServer.onShutdown(() => playerStore.flush())` en `apps/server/src/index.ts`.
- **Limpieza**: `prune` (al arrancar y cada 24 h) borra claves sin cambios hace 90 días
  (`INACTIVE_KEY_MS`) que cumplen `isUntouched` (plata ≤ inicial, sólo ítems del kit, sin mascota,
  no donador, no preso) y que no estén en `activeSessions`.
- `/health/full` muestra `store: { players, lastFlush, travelTickets }`.

Ojo: compras, ventas, intercambios, pesca, venta en el Centenario, picudos, cajas y comandos de
admin (`/plata`, `admin:give`, `/box`) **no** guardan en el acto: tocan `Wallet` / `Inventory` en
memoria y quedan para el guardado de 15 s (o el de salida). Si el proceso se corta, se pierde hasta
15 s de progreso; es una decisión aceptada y el plan la mantiene (con una excepción: intercambios).

### Estado global en memoria que hoy depende del JSON

- `activeSessions` (`playerStore.ts`): clave → sala + `sessionId`. Una clave = una sesión; la vieja
  se guarda y se cierra con código 4001 (`DUPLICATE_SESSION_CODE`), y `session.key = null` para
  que su `onLeave` no pise lo de la nueva.
- `travelTickets` (`playerStore.ts`, `issueTravelTicket`): pase por clave para entrar a otro barrio
  (vence en `TRAVEL_TICKET_MS` = 30 s; `near` para `/trace`, `at` para la ambulancia).
- `bans` (`bans.ts`): `byKey` y `byName` en memoria; `until` y `savedUntil` leen además
  `playerStore.get(key)?.jailedUntil` **de forma sincrónica**. `/ban` a alguien desconectado usa
  `playerStore.keysByName` + `setJailedUntil` (`createCommandHost.jail` en `systems/social.ts`).
- Admin: `isAdminName(player.name)` (`env.ts`, `ADMIN_NAME`) en `onJoin` → `player.admin`. Los
  comandos chequean el rol contra `player.admin` (`commands/index.ts`).

### Qué es efímero y no va a la base

| Estado | Dónde vive | Por qué no |
| --- | --- | --- |
| Posición, camino, `pending`, sentado, pescando/vendiendo | Schema + `PlayerSession` | Se rearma al entrar (spawn al azar). Guardarla 4 veces por segundo no aporta nada. |
| Timers de pesca/venta (`fishingTimer`, `vendingTimer`, `customerTimer`) | `PlayerSession` | Cortar una actividad no cobra nada: perderla es neutro. |
| Picudos (`state.weevils`, `WeevilManager`) | Schema | Viven segundos. |
| Intercambios e invitaciones (`TradeManager`) | Sala | Sólo importa el **resultado**, que va al snapshot (y al libro de economía). |
| Chat, globos, anuncios (`/post`), mensajes privados (`/mensaje`) | Mensajes Colyseus | Sin historial por diseño. Si algún día hace falta moderación, sería otra tabla aparte. |
| Reloj del juego, partido (`gameClock`) | Memoria | Sale de la hora real; el forzado del admin es efímero a propósito. |
| `activeSessions`, `playerDirectory`, `openCopies`, rate limits | Memoria del proceso | Con una instancia alcanza; con varias, Redis (ver `docs/finished/escalabilidad-servidor.md`), no Postgres. |
| `travelTickets` | Memoria | Vencen en 30 s y se consumen en el mismo proceso. Se queda en memoria (ver §4.6). |

## 2. Auth con Google vía Supabase

### Flujo

```
LoginScreen ──"Iniciar sesión con Google"──► supabase.auth.signInWithOAuth({ provider: "google" })
      │                                                 │ (PKCE, redirect a Google y vuelta)
      ▼                                                 ▼
https://app.tudominio.com/?code=…  ──► supabase-js canjea el code ─► session { access_token (JWT), refresh_token }
      │
      ▼
Personajes (pantalla nueva) ── GET /api/characters (Authorization: Bearer JWT) ─► server (Express)
      │   lista de hasta 3: nombre, aspecto, barrio/condena; "Crear personaje" (nombre único + aspecto)
      │   → POST /api/characters; "Importar progreso de este navegador" si la clave tiene progreso viejo
      │   → POST /api/characters/import { playerKey }
      ▼
client.auth.token = session.access_token   (colyseus.js lo manda como options._authToken)
joinOrCreate("city", { cityId, characterId })
      │
      ▼  server
CityRoom.onAuth(client, options, context)   ← context.token = el JWT
   1. verifica el JWT (firma con JWKS, iss, aud = "authenticated", exp)
   2. abre la sesión del personaje (repo.openSession): que exista y sea de esa cuenta
   3. chequea cárcel y boleto
   4. devuelve { playerId, userId, role, record, epoch }  → client.auth
CityRoom.onJoin(client, options, auth)  ← arma Player + PlayerSession desde auth.record (sincrónico, como hoy)
```

Verificado en el código instalado: `@colyseus/core` 0.16 tiene `onAuth(client, options, context:
AuthContext)` con `context.token`, `headers` e `ip`, y puede ser `async`; `colyseus.js` 0.16 tiene
`client.auth.token` y lo agrega como `_authToken` en la petición de matchmaking. El tiempo que
tarde `onAuth` cuenta contra la reserva del asiento (15 s por defecto): sobra.

**Cliente** (`apps/client`, archivos nuevos; `lib/` lo está tocando otra sesión, coordinar):

- `lib/supabase.ts`: `createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true } })`. Sólo en el
  navegador (el juego es todo cliente; no hace falta `@supabase/ssr` porque Next no renderiza nada
  autenticado en el server). La sesión de Supabase queda en `localStorage` del origen `app.`: son
  tokens, no progreso, así que no rompe la regla de "en el navegador sólo la clave".
- `LoginScreen`: el botón llama a `signInWithOAuth({ provider: "google", options: { redirectTo:
  window.location.origin + window.location.pathname } })`. Si ya hay sesión al cargar
  (`getSession`), salta directo a la pantalla de personajes. Sin sesión no se puede jugar.
- Pantalla de **personajes** (reemplaza a `JoinScreen`): lista los de la cuenta (hasta 3), crea uno
  (nombre + creador de aspecto actual) e importa el progreso viejo del navegador si hay. Todo por la
  API del server, nunca leyendo la base desde el navegador.
- `network.ts` → `joinCity` / `travelTo`: antes de **cada** join (`joinOrCreate` y `joinById`),
  `const { data } = await supabase.auth.getSession()` (refresca si venció) y `getClient().auth.token
  = data.session?.access_token ?? ""`. Manda `characterId`; el nombre y el aspecto ya no viajan en
  el join (son del personaje, en la base).
- "Salir" del juego vuelve a la pantalla de personajes; ahí, "Cerrar sesión" hace
  `supabase.auth.signOut()`.
- **La landing y el juego son orígenes distintos** (`tudominio.com` vs `app.tudominio.com`): el
  login tiene que pasar en `app.`; la landing sólo linkea.

**Server**:

- `apps/server/src/auth.ts` (nuevo): `verifyAccessToken(token): Promise<{ userId, email? } | null>`
  con `jose`: `createRemoteJWKSet(new URL(SUPABASE_URL + "/auth/v1/.well-known/jwks.json"))` (se
  cachea solo) y `jwtVerify(token, jwks, { issuer: SUPABASE_URL + "/auth/v1", audience:
  "authenticated" })`. `sub` = `auth.users.id`. Si el proyecto todavía firma con el secreto HS256
  viejo, fallback con `SUPABASE_JWT_SECRET` (los proyectos nuevos usan claves asimétricas: preferir
  JWKS y no tener el secreto en el VPS). No hace falta llamar a la API de Supabase en cada join.
- El JWT se valida **sólo al entrar**: una sesión de juego puede durar más que el token (1 h por
  defecto) y está bien; al viajar se vuelve a entrar con un token fresco.
- Token inválido o vencido → `throw new ServerError(AUTH_FAILED_CODE, "Tu sesión venció: volvé a
  iniciar sesión.")` (código nuevo en `shared`, como `JAILED_JOIN_CODE`) → el cliente vuelve a
  `LoginScreen`. Sin token → mismo rechazo (no hay invitados).
- **API de personajes** (Express, en el mismo server que Colyseus; `apps/server/src/api/characters.ts`):
  `GET /api/characters`, `POST /api/characters { name, appearance }` y `POST /api/characters/import
  { playerKey }`, todas con `Authorization: Bearer <JWT>` verificado con `verifyAccessToken`, con su
  propio límite de frecuencia por IP y por cuenta, y validando con lo mismo de hoy (`sanitizeName`,
  `sanitizeAppearance`). Llaman a las RPC `list_characters`, `create_character` y
  `import_legacy_character` (§3). El nombre ocupado se responde como error claro ("Ese nombre ya
  existe").

### Progreso viejo del navegador (importar)

Sin invitados, la clave del navegador (`lib/playerKey.ts`) deja de servir para jugar. Su único uso
es **importar** el progreso que hoy está en `players.json`:

- El script de migración (§5) sube cada clave como un personaje **sin dueño** (`user_id = null`),
  con la clave **hasheada** (`legacy_key_hash = sha256(playerKey)`, hex: es un secreto al portador y
  hoy está en texto plano en el JSON).
- En la pantalla de personajes, si el navegador tiene una clave con progreso sin reclamar, aparece
  "Importar el progreso de este navegador". `import_legacy_character` lo pasa a la cuenta como uno de
  sus personajes, si le queda lugar (máximo 3). Es un `update … where user_id is null`: si dos
  pestañas lo intentan a la vez, gana una sola.
- **Nombre**: si el nombre viejo ya es de un personaje de otra cuenta (antes no eran únicos), hay
  que elegir otro al importar, y queda fijo desde ahí.
- Varias claves (varios navegadores) se pueden importar, cada una como un personaje distinto,
  mientras haya lugar. **No se fusionan** (fusionar abriría la puerta a duplicar ítems y plata).
- Una clave ya importada no vuelve a aparecer; la clave sola nunca deja entrar al juego.

### Admin por rol

- `players.role` (`app_role`: `user` | `admin`) en la base. `onJoin` pone `player.admin = auth.role
  === "admin"` en vez de `isAdminName(player.name)`. Los comandos y `systems/admin.ts` no cambian:
  siguen mirando `player.admin`.
- El rol es de la **cuenta** (`accounts.role`): sus 3 personajes son admin o ninguno.
- Para nombrar admin: SQL en el panel de Supabase (`update accounts set role = 'admin' where user_id
  = …`). No hay comando para darse admin desde el juego.
- `ADMIN_NAME` queda **sólo para desarrollo local** con el store JSON (`PLAYER_STORE=json`); con
  `PLAYER_STORE=supabase` se ignora y el server avisa al arrancar si está definida. Así se cierra el
  agujero que marca `entorno.md` ("cualquiera que entre con ese nombre es admin").

### Nombre

Hoy el nombre se elige en cada ingreso. Con cuentas: se elige **una vez, al crear el personaje**, y
**no se cambia**. Es **único** entre todos los personajes con cuenta (sin distinguir mayúsculas ni
espacios de más: `name_key`, la misma normalización que `normalizeName` de `bans.ts`). Pasa por
`sanitizeName` como hoy. El snapshot ya no escribe `name` (no hay forma de cambiarlo desde el juego).

## 3. Esquema de base de datos

Postgres de Supabase, región **São Paulo (`sa-east-1`)**, la misma que recomienda
`hardware-y-alojamiento.md` para el VPS: la latencia server ↔ base queda en pocos ms. Migraciones en
`supabase/migrations/` (Supabase CLI, `supabase db push`), versionadas en el repo.

Principios:

- Una **cuenta** = una fila de `accounts` (1:1 con `auth.users`, con el rol). Un **personaje** = una
  fila de `players` (hasta 3 por cuenta). Todo lo del juego cuelga de `players.id` (uuid), nunca de
  la clave ni del email. `players.user_id` es null sólo en el progreso viejo importado de
  `players.json` que todavía nadie reclamó.
- El catálogo (ítems, mascotas, prendas) vive en código: **no** hay FK a una tabla de ítems; el
  server valida al cargar como hoy.
- Lo de tamaño fijo y 1:1 (plata, necesidades, ropa, mascota, donador, condena) son **columnas** de
  `players`: se leen y escriben juntas en cada snapshot. La mochila es su propia tabla (hasta 20
  filas por jugador).
- Escribe y lee **sólo el server** (service role, que saltea RLS) y sólo a través de funciones RPC.
  El navegador no tiene ningún acceso a las tablas (decisión 6).

### `0001_players.sql`

```sql
create type public.app_role as enum ('user', 'admin');

-- Una fila por cuenta de Supabase Auth: el rol y la baja (a futuro, "eliminar cuenta").
create table public.accounts (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        public.app_role not null default 'user',
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

-- Un personaje. Hasta 3 por cuenta (slot 1–3). user_id null = progreso viejo sin reclamar.
create table public.players (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.accounts (user_id) on delete cascade,
  slot             smallint check (slot between 1 and 3),
  -- sha256 hex de la clave del navegador, sólo en el progreso importado de players.json.
  legacy_key_hash  text unique check (legacy_key_hash ~ '^[0-9a-f]{64}$'),
  -- Único entre los personajes con cuenta y fijo: se elige al crear y no se cambia.
  name             text not null check (char_length(name) between 1 and 16),   -- NAME_MAX_LENGTH
  -- Igual que normalizeName (bans.ts) / keysByName: sin mayúsculas ni espacios de más.
  name_key         text generated always as (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) stored,
  appearance       jsonb,                                                       -- Appearance (validado con sanitizeAppearance)
  money            bigint not null default 100 check (money between 0 and 1000000000),  -- STARTING_MONEY / MAX_MONEY
  energy           real not null default 100 check (energy between 0 and 100),
  hunger           real not null default 100 check (hunger between 0 and 100),
  health           real not null default 100 check (health between 0 and 100),
  hat              text not null default '',
  top              text not null default '',
  bottom           text not null default '',
  shoes            text not null default '',
  pet_id           text,
  pet_name         text check (char_length(pet_name) <= 14),                   -- PET_NAME_MAX_LENGTH
  donor            boolean not null default false,
  jailed_until     timestamptz,
  -- Sube en cada open_player_session: un snapshot con otro epoch es de una sesión vieja y se descarta.
  session_epoch    bigint not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (user_id is not null or legacy_key_hash is not null),
  check ((user_id is null) = (slot is null)),
  check ((pet_id is null) = (pet_name is null)),
  unique (user_id, slot)                                   -- máximo 3 por cuenta
);

-- Nombres únicos entre personajes con cuenta (el progreso viejo sin reclamar puede repetirse:
-- al importarlo, si choca, se elige otro).
create unique index players_name_uniq on public.players (name_key) where user_id is not null;
create index players_name_key_idx on public.players (name_key);
create index players_unclaimed_idx on public.players (updated_at) where user_id is null;

create table public.inventory_slots (
  player_id  uuid not null references public.players (id) on delete cascade,
  slot       smallint not null check (slot >= 0),          -- < INVENTORY_CAPACITY (20): lo valida el server
  item_id    text not null,
  quantity   smallint not null check (quantity between 1 and 99),   -- MAX_STACK
  uses       smallint check (uses >= 0),                   -- sólo herramientas; null = nueva
  primary key (player_id, slot)
);
-- Auditoría: "¿cuántas cañas profesionales hay en el juego?"
create index inventory_slots_item_idx on public.inventory_slots (item_id);
```

La ropa puesta va en `hat/top/bottom/shoes` (mismo formato que `OutfitIds` y el Schema). La
billetera es `money`. Las necesidades, `energy/hunger/health` con decimales (como `Needs`).

### `0002_bans_y_auditoria.sql`

```sql
-- Historial de condenas (/ban). La condena vigente de un jugador conocido es players.jailed_until;
-- esta tabla guarda quién, cuándo y cuánto, y las condenas por nombre de alguien que todavía no existe
-- (hoy: bans.byName en memoria).
create table public.bans (
  id          bigint generated always as identity primary key,
  player_id   uuid references public.players (id) on delete cascade,
  name_key    text not null,
  until       timestamptz not null,
  created_by  uuid references public.players (id) on delete set null,
  created_at  timestamptz not null default now(),
  lifted_at   timestamptz,
  lifted_by   uuid references public.players (id) on delete set null
);
create index bans_active_name_idx on public.bans (name_key, until) where lifted_at is null;
create index bans_player_idx on public.bans (player_id, created_at desc);

-- Lo que hace un admin (/plata, admin:give, /box, /donador, /ban, /curar, /trace, admin:time…).
create table public.admin_actions (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  admin_id    uuid references public.players (id) on delete set null,
  action      text not null,
  target_id   uuid references public.players (id) on delete set null,
  target_name text,
  args        jsonb not null default '{}'
);
create index admin_actions_at_idx on public.admin_actions (at desc);
create index admin_actions_target_idx on public.admin_actions (target_id, at desc);

-- Libro de economía: lo que mueve plata o ítems entre jugadores, con tiendas o desde el admin.
create type public.economy_kind as enum (
  'shop_buy', 'shop_sell', 'shop_haggle', 'trade', 'pet_adopt', 'hospital',
  'faint_fee', 'travel_ticket', 'box_open', 'food_eat', 'admin_money', 'admin_give', 'admin_box'
);
create table public.economy_ledger (
  id              bigint generated always as identity primary key,
  at              timestamptz not null,               -- cuándo pasó (no cuándo se escribió)
  player_id       uuid not null references public.players (id) on delete cascade,
  kind            public.economy_kind not null,
  money_delta     bigint not null default 0,          -- con signo, desde el lado de player_id
  items           jsonb not null default '[]',        -- [{ "itemId", "quantity" (con signo), "uses"? }]
  counterparty_id uuid references public.players (id) on delete set null,
  ref             uuid,                               -- agrupa las dos patas de un intercambio
  city_id         text,
  meta            jsonb                               -- shopId, precio pedido al regatear, etc.
);
create index economy_ledger_player_idx on public.economy_ledger (player_id, at desc);
create index economy_ledger_kind_idx on public.economy_ledger (kind, at desc);
create index economy_ledger_ref_idx on public.economy_ledger (ref) where ref is not null;

-- Actividades de alta frecuencia (pesca, venta en el Centenario, picudos): agregadas por día, no fila
-- por acción. 100 jugadores pescando son ~30.000 tiradas por hora; una fila por tirada llenaría el
-- plan de Supabase en semanas sin aportar más que estos totales.
create table public.economy_daily (
  player_id    uuid not null references public.players (id) on delete cascade,
  day          date not null,
  source       text not null check (source in ('fish', 'vend', 'weevil')),
  attempts     integer not null default 0,
  money_earned bigint not null default 0,
  items_earned integer not null default 0,
  primary key (player_id, day, source)
);
```

**Boletos de viaje**: no tienen tabla. El boleto STM comprado es un ítem (`TICKET_ID`) y ya va en
`inventory_slots`; el **pase** (`travelTickets`) vence en 30 s y se consume en el mismo proceso
(§4.6). **Donadores**: columna `players.donor` + fila en `admin_actions`; si después hay donaciones
reales con montos, sería una tabla `donations` aparte (fuera de este plan).

### `0003_rls.sql`

```sql
alter table public.accounts         enable row level security;
alter table public.players          enable row level security;
alter table public.inventory_slots  enable row level security;
alter table public.bans             enable row level security;
alter table public.admin_actions    enable row level security;
alter table public.economy_ledger   enable row level security;
alter table public.economy_daily    enable row level security;

-- Nadie desde el navegador escribe nada. Supabase da permisos por defecto a anon/authenticated:
-- se sacan todos y se devuelve sólo lo necesario.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

-- Ninguna tabla tiene políticas ni grants para anon / authenticated: el navegador no lee ni
-- escribe nada (decisión 6). Sólo usa Supabase Auth para loguearse.
```

El server usa la **secret key / service role**, que saltea RLS. Prueba obligatoria de la fase 2: con
la publishable key y un JWT válido, cualquier `select` / `insert` / `rpc` sobre `public` falla.

### `0004_rpc.sql`

Las funciones las llama sólo el server (`grant execute … to service_role`). Corren cada una en
**una transacción**.

```sql
-- Personajes de una cuenta (para la pantalla de personajes; la llama la API del server).
create or replace function public.list_characters(p_user_id uuid)
returns jsonb
language sql
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', id, 'slot', slot, 'name', name, 'appearance', appearance,
           'jailedUntil', jailed_until, 'updatedAt', updated_at) order by slot), '[]'::jsonb)
  from players where user_id = p_user_id;
$$;

-- Crea un personaje en el primer slot libre. Errores: 'full' (ya tiene 3), 'name_taken'.
-- El kit inicial lo pone el server en el primer snapshot (record vacío = nuevo, como hoy).
create or replace function public.create_character(p_user_id uuid, p_name text, p_appearance jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_slot smallint;
  v_player players;
begin
  insert into accounts (user_id) values (p_user_id) on conflict do nothing;
  perform 1 from accounts where user_id = p_user_id and deleted_at is null for update;  -- serializa por cuenta
  if not found then return jsonb_build_object('error', 'deleted'); end if;
  select min(s) into v_slot from generate_series(1, 3) s
    where not exists (select 1 from players where user_id = p_user_id and slot = s);
  if v_slot is null then return jsonb_build_object('error', 'full'); end if;
  begin
    insert into players (user_id, slot, name, appearance) values (p_user_id, v_slot, p_name, p_appearance)
      returning * into v_player;
  exception when unique_violation then
    return jsonb_build_object('error', 'name_taken');
  end;
  return jsonb_build_object('id', v_player.id, 'slot', v_player.slot, 'name', v_player.name);
end $$;

-- Pasa el progreso viejo de una clave (players.json) a la cuenta, en el primer slot libre.
-- p_name: sólo si el nombre viejo ya está tomado. Errores: 'not_found', 'full', 'name_taken'.
create or replace function public.import_legacy_character(p_user_id uuid, p_key_hash text, p_name text default null)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_slot smallint;
  v_player players;
begin
  insert into accounts (user_id) values (p_user_id) on conflict do nothing;
  perform 1 from accounts where user_id = p_user_id and deleted_at is null for update;
  if not found then return jsonb_build_object('error', 'deleted'); end if;
  select min(s) into v_slot from generate_series(1, 3) s
    where not exists (select 1 from players where user_id = p_user_id and slot = s);
  if v_slot is null then return jsonb_build_object('error', 'full'); end if;
  begin
    update players set user_id = p_user_id, slot = v_slot, name = coalesce(p_name, name), updated_at = now()
      where legacy_key_hash = p_key_hash and user_id is null
      returning * into v_player;
  exception when unique_violation then
    return jsonb_build_object('error', 'name_taken');
  end;
  if v_player.id is null then return jsonb_build_object('error', 'not_found'); end if;
  return jsonb_build_object('id', v_player.id, 'slot', v_player.slot, 'name', v_player.name);
end $$;

-- Abre una sesión de juego de un personaje de la cuenta: sube el epoch y devuelve todo.
-- p_user_id: sub del JWT ya verificado por el server. Errores: 'not_found' (no existe o es de otra
-- cuenta), 'deleted' (cuenta dada de baja).
create or replace function public.open_player_session(p_user_id uuid, p_player_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_player players;
  v_role   app_role;
begin
  select role into v_role from accounts where user_id = p_user_id and deleted_at is null;
  if not found then return jsonb_build_object('error', 'deleted'); end if;
  update players set session_epoch = session_epoch + 1
    where id = p_player_id and user_id = p_user_id
    returning * into v_player;
  if not found then return jsonb_build_object('error', 'not_found'); end if;

  return jsonb_build_object(
    'player',   to_jsonb(v_player) - 'legacy_key_hash',
    'role',     v_role,
    'inventory', coalesce((select jsonb_agg(jsonb_build_object(
                    'slot', s.slot, 'itemId', s.item_id, 'quantity', s.quantity, 'uses', s.uses) order by s.slot)
                  from inventory_slots s where s.player_id = v_player.id), '[]'::jsonb),
    -- Personaje recién creado sin snapshot todavía: el server le pone el kit inicial y lo guarda.
    'created',  v_player.created_at = v_player.updated_at and not exists (select 1 from inventory_slots where player_id = v_player.id),
    'nameBan', (select max(until) from bans
                  where name_key = v_player.name_key and lifted_at is null and until > now())
  );
end $$;

-- Guarda un lote de snapshots y su libro de economía en UNA transacción. Los dos lados de un
-- intercambio van en el mismo lote: o se guardan los dos o ninguno.
-- Devuelve los ids descartados por epoch viejo (sesión reemplazada).
create or replace function public.save_players(p_players jsonb, p_ledger jsonb default '[]', p_daily jsonb default '[]')
returns uuid[]
language plpgsql
set search_path = public
as $$
declare
  rec   jsonb;
  pid   uuid;
  stale uuid[] := '{}';
begin
  for rec in select value from jsonb_array_elements(p_players) loop
    pid := (rec->>'id')::uuid;
    update players set
      appearance = rec->'appearance',                     -- el nombre no se cambia
      money = (rec->>'money')::bigint,
      energy = (rec->>'energy')::real, hunger = (rec->>'hunger')::real, health = (rec->>'health')::real,
      hat = rec->>'hat', top = rec->>'top', bottom = rec->>'bottom', shoes = rec->>'shoes',
      pet_id = rec->>'petId', pet_name = rec->>'petName',
      donor = (rec->>'donor')::boolean,
      jailed_until = (rec->>'jailedUntil')::timestamptz,
      updated_at = now()
    where id = pid and session_epoch = (rec->>'epoch')::bigint;
    if not found then
      stale := stale || pid;
      continue;
    end if;
    delete from inventory_slots where player_id = pid;
    insert into inventory_slots (player_id, slot, item_id, quantity, uses)
      select pid, s.slot, s."itemId", s.quantity, s.uses
      from jsonb_to_recordset(rec->'inventory') as s(slot smallint, "itemId" text, quantity smallint, uses smallint);
  end loop;

  insert into economy_ledger (at, player_id, kind, money_delta, items, counterparty_id, ref, city_id, meta)
    select l.at, l."playerId", l.kind, l."moneyDelta", coalesce(l.items, '[]'), l."counterpartyId", l.ref, l."cityId", l.meta
    from jsonb_to_recordset(p_ledger) as l(at timestamptz, "playerId" uuid, kind economy_kind, "moneyDelta" bigint,
                                           items jsonb, "counterpartyId" uuid, ref uuid, "cityId" text, meta jsonb)
    where l."playerId" <> all (stale);

  insert into economy_daily as d (player_id, day, source, attempts, money_earned, items_earned)
    select x."playerId", x.day, x.source, x.attempts, x."moneyEarned", x."itemsEarned"
    from jsonb_to_recordset(p_daily) as x("playerId" uuid, day date, source text, attempts int, "moneyEarned" bigint, "itemsEarned" int)
    where x."playerId" <> all (stale)
  on conflict (player_id, day, source) do update set
    attempts = d.attempts + excluded.attempts,
    money_earned = d.money_earned + excluded.money_earned,
    items_earned = d.items_earned + excluded.items_earned;

  return stale;
end $$;

-- /ban a alguien que no está conectado (hoy: playerStore.keysByName + setJailedUntil + bans.byName).
create or replace function public.ban_by_name(p_name text, p_until timestamptz, p_admin uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_key text := lower(regexp_replace(btrim(p_name), '\s+', ' ', 'g'));
  v_count integer;
begin
  update bans set lifted_at = now(), lifted_by = p_admin
    where name_key = v_key and lifted_at is null;
  if p_until > now() then
    insert into bans (player_id, name_key, until, created_by)
      select id, v_key, p_until, p_admin from players where name_key = v_key
      union all
      select null, v_key, p_until, p_admin where not exists (select 1 from players where name_key = v_key);
  end if;
  update players set jailed_until = case when p_until > now() then p_until end where name_key = v_key;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.open_player_session(uuid, text, text) to service_role;
grant execute on function public.save_players(jsonb, jsonb, jsonb)   to service_role;
grant execute on function public.ban_by_name(text, timestamptz, uuid) to service_role;
```

### `0005_mantenimiento.sql` (pg_cron)

```sql
create extension if not exists pg_cron;

-- Progreso viejo (players.json) que nadie reclamó: se borra pasado el plazo para importarlo
-- (a decidir, ver preguntas abiertas; 180 días como propuesta). Las cuentas no se borran solas.
select cron.schedule('prune-unclaimed', '15 4 * * *', $$
  delete from public.players p
  where p.user_id is null and p.updated_at < now() - interval '180 days'
$$);

-- Retención del libro de economía (a decidir, ver preguntas abiertas).
select cron.schedule('ledger-retention', '30 4 * * *', $$
  delete from public.economy_ledger where at < now() - interval '180 days'
$$);
```


## 4. Capa de persistencia en el server

### 4.1 Interfaz

`apps/server/src/persistence/` (nuevo):

```ts
/** A quién se guarda: siempre el id de la base; para el JSON, la clave hace de id. */
export type PlayerId = string;

export interface OpenedSession {
  playerId: PlayerId;
  userId: string | null;
  role: "user" | "admin";
  /** null = jugador nuevo (kit inicial). Mismo formato que hoy, para no tocar la carga de onJoin. */
  record: PlayerRecord | null;
  epoch: number;
  /** Condena por nombre que todavía no estaba en su fila (bans.byName de hoy). */
  nameBanUntil: number;
}

export interface PlayerRepository {
  /** Abre la sesión de un personaje de la cuenta (sube el epoch). Puede tirar `StoreUnavailable`. */
  openSession(input: { userId: string; playerId: string }): Promise<OpenedSession>;
  listCharacters(userId: string): Promise<CharacterSummary[]>;
  createCharacter(userId: string, name: string, appearance: Appearance): Promise<CharacterSummary>;
  importLegacyCharacter(userId: string, playerKey: string, name?: string): Promise<CharacterSummary>;
  /** Encola un snapshot. Sin cambios (huella), no hace nada. Nunca bloquea al tick. */
  save(id: PlayerId, epoch: number, record: PlayerRecord): void;
  /** Encola y escribe ya, esperando (viaje, intercambio, mascota, cárcel, salida). */
  saveNow(entries: Array<{ id: PlayerId; epoch: number; record: PlayerRecord }>): Promise<void>;
  /** Asientos del libro de economía y contadores diarios (van con el próximo lote). */
  record(entry: LedgerEntry | DailyEntry): void;
  /** Lo último que se guardó o encoló de ese jugador (ver 4.3). */
  cached(id: PlayerId): PlayerRecord | undefined;
  banByName(name: string, until: number, adminId: PlayerId | null): Promise<void>;
  logAdmin(action: AdminAction): void;
  /** Al apagar: escribe todo lo pendiente (con reintentos acotados). */
  flush(): Promise<void>;
  stats(): StoreStats;   // para /health/full (reemplaza store.players / lastFlush)
}
```

- **`JsonPlayerRepository`**: envuelve el `PlayerStore` actual sin cambiar el archivo. `openSession`
  resuelve al toque (Promise ya resuelta), `id` = la clave, `role` = `isAdminName(name)`, `epoch`
  siempre 0. `record` / `logAdmin` sólo loguean. Es el default (`PLAYER_STORE=json`) hasta el corte;
  si se mantiene después como modo de desarrollo local es una pregunta abierta (decisión 9).
- **`SupabasePlayerRepository`**: `@supabase/supabase-js` con la API key secreta (service role),
  sólo `rpc(...)` (`list_characters`, `create_character`, `import_legacy_character`,
  `open_player_session`, `save_players`, `ban_by_name`). Se elige con `PLAYER_STORE=supabase`.
  Decidido: nada de conexión directa a Postgres (decisión 8).

### 4.2 Cambios en las salas

- `CityRoom.onAuth(client, options, context)` (nuevo, `async`): verifica el JWT (obligatorio), llama a
  `repo.openSession` con `options.characterId`, aplica la cárcel (`bans.until` con `record.jailedUntil` y `nameBanUntil`) y el
  boleto (hoy en `onJoin`), y devuelve `OpenedSession`. Los `ServerError` que hoy tira `onJoin`
  (cárcel, boleto) se mueven acá.
- `onJoin(client, options, auth)` queda **sincrónico** y arma todo desde `auth.record` con la misma
  validación de hoy. `PlayerSession.key: string | null` pasa a `playerId: string | null` + `epoch`.
- `savePlayer(session)` → `repo.save(session.playerId, session.epoch, toRecord(session))`.
  `saveAllPlayers` cada 15 s sigue igual.
- `bans.ts` deja de leer `playerStore.get(key)` sincrónico: la condena guardada llega en
  `OpenedSession` y se anota en `bans.byKey` al entrar; `savedUntil` usa ese valor.
- `createCommandHost.jail` (desconectado) → `repo.banByName`. `setDonor`, `giveMoney`, `giveItem`,
  `healFully`, `traceTo` y `admin:give` → `repo.logAdmin`.
- Libro de economía: cada sistema que mueve plata o ítems llama a `repo.record(...)` en el mismo
  lugar donde hoy llama `markWallet` / `markInventory` (`systems/shops.ts`, `trading.ts`,
  `activities.ts`, `life.ts`, `travel.ts`, `social.ts`, `admin.ts`). Pesca, venta y picudos van a
  `economy_daily` (contadores en memoria por jugador, se vuelcan con el snapshot).

### 4.3 Cuándo se escribe

Se mantiene el modelo de hoy (memoria autoritativa + snapshots) porque cada acción del juego no puede
esperar a la base:

- `save` sólo encola si la huella cambió (se mueve la lógica de `fingerprints` de `PlayerStore` al
  repositorio). Un **escritor** junta lo encolado y llama a `save_players` cada `WRITE_DELAY_MS`
  (2 s), en lotes de hasta ~200 jugadores. Una escritura a la vez, como hoy.
- `saveNow` (esperado con `await`): **intercambio aceptado** (los dos jugadores en el mismo lote:
  atómico, con las dos patas del libro con el mismo `ref`), **viaje / `/trace` / ambulancia** (antes
  de mandar `TravelApproved`; los 5 s de `TravelOverlay` lo tapan), **salida** (`onLeave`),
  **sesión duplicada** (`evictDuplicate`), mascota, cárcel y donador.
- **Compras** no necesitan una RPC propia: compra = un jugador, y su snapshot (plata + mochila) es
  atómico por definición. Hacer cada compra una transacción en la base (`buy_item(...)`) metería
  latencia de red en cada clic sin ganar seguridad, porque la verdad sigue en memoria. Se descarta.
- **Caché de escritura** (`cached`): `openSession` primero mira si hay un snapshot encolado o en
  vuelo de ese jugador en este proceso y, si lo hay, lo espera antes de leer. Así viajar o abrir otra
  pestaña nunca lee un estado más viejo que el que acaba de dejar la sala anterior (hoy no pasa
  porque el `Map` es sincrónico; con la base pasaría).
- **Epoch**: cada `openSession` sube `session_epoch`. Un snapshot con epoch viejo (de la pestaña
  que se cerró por duplicada, o de un proceso viejo que sigue vivo) se descarta en `save_players` y
  se loguea `[Store] snapshot viejo descartado`. Reemplaza el truco de `session.key = null` y además
  protege contra dos instancias.
- **Al apagar**: `gameServer.onShutdown(() => repo.flush())`, con tope de tiempo (p. ej. 10 s) y,
  si la base no responde, volcado al archivo de emergencia (4.4).

### 4.4 Errores y reintentos

- **La base no responde al guardar**: el lote vuelve a la cola (lo más nuevo de cada jugador pisa lo
  viejo), reintento con backoff exponencial (1 s, 2 s, 4 s… tope 30 s). El juego sigue andando:
  todo está en memoria. `/health/full` muestra `store.pending`, `store.lastFlush.ok` y el error.
- **Un lote falla por un dato** (un `check` de la base): se parte en mitades hasta aislar al
  jugador culpable, se loguea con su record y se guardan los demás.
- **Archivo de emergencia**: si la cola pasa N minutos sin poder escribir, o al apagar sin base, se
  vuelca a `PLAYER_FALLBACK_FILE` (JSON, mismo formato que `save_players`). Al arrancar, si existe,
  se reintenta subirlo (respetando epoch) y se renombra.
- **La base no responde al entrar**: `onAuth` rechaza con `STORE_UNAVAILABLE_CODE` ("No pudimos
  cargar tu progreso, probá en un rato"). **Nunca** se trata un error como "jugador nuevo": eso le
  daría el kit inicial y el siguiente snapshot le pisaría el progreso real.
- Timeouts: 5 s para `openSession`, 10 s para cada `save_players`.

### 4.5 Una sesión por cuenta

`activeSessions` pasa a indexarse por **cuenta** (`userId`) en vez de la clave: una cuenta = una
sesión, con uno solo de sus personajes conectado a la vez (propuesta, ver preguntas abiertas; evita
que alguien se pase cosas entre sus propios personajes en vivo). Sigue en memoria (una instancia). El
epoch hace que, aunque la pestaña vieja llegue a guardar algo después, no pise a la nueva. Con varias
instancias habría que moverlo a Redis (`presence`) como dice `escalabilidad-servidor.md`; la base no
es buen lugar para eso.

### 4.6 Pases de viaje

`travelTickets` se queda en memoria, indexado por `playerId` (el personaje): duran 30 s y los emite y consume el
mismo proceso. Llevarlos a la base sólo tendría sentido con varias instancias (y aun así, mejor
Redis con TTL).

## 5. Migración de datos

Script único `apps/server/scripts/migrate-players-to-supabase.ts` (se corre con `tsx`, no se
importa desde el server):

1. Lee `PLAYER_DATA_FILE` (el mismo archivo y formato que `PlayerStore`).
2. Por cada `[key, record]`: valida con lo mismo que `onJoin` (`Inventory.restore`, `getClothing`,
   `getPet`/`sanitizePetName`, `sanitizeNeeds`, rango de plata). Lo que no valida se loguea y se
   corrige igual que lo corregiría el juego.
3. Inserta en `players` como progreso **sin reclamar** (`user_id` y `slot` null, para importarlo
   desde la pantalla de personajes, §2) con `legacy_key_hash = sha256(key)`, `updated_at =
   record.updatedAt`, `jailed_until` desde `jailedUntil`, y sus `inventory_slots`. Todo en lotes con
   `on conflict (legacy_key_hash) do nothing`: se puede correr varias veces.
4. `--dry-run` sólo cuenta y valida. Al final imprime un control: jugadores, suma de plata, cantidad
   de cada `item_id`, donadores, presos, mascotas, y los compara contra el JSON (tienen que dar igual,
   salvo lo corregido por validación, que se lista).

Las claves `isUntouched` con más de 90 días se pueden saltear (el `prune` las borraría igual).

### Plan de corte

1. Fase de **doble escritura** (fase 3): JSON primario, Supabase secundario. Ya se migró una vez y
   se compara. Si algo no cierra, se corrige sin afectar a nadie.
2. Día del corte: anuncio con `/post`, se apaga el server (`pm2 stop`; `onShutdown` hace el último
   `flush` del JSON), backup del JSON.
3. Script de migración otra vez (idempotente: `do update` si el `updated_at` del JSON es más nuevo).
   Control de totales.
4. `PLAYER_STORE=supabase` en el `.env` del VPS, `pm2 start`. Probar: login con Google, importar
   una clave vieja, crear un personaje nuevo, entrar con cada uno. Desde el corte sólo se juega con
   cuenta (anunciarlo antes con `/post`: "iniciá sesión con Google e importá tu progreso").
5. **Vuelta atrás**: `PLAYER_STORE=json` y arrancar con el JSON del backup. Lo jugado después del
   corte se pierde, salvo que se haga el script inverso (exportar `players` → JSON con la clave… que
   no se tiene: sólo el hash). Por eso conviene la doble escritura inversa (Supabase primario, JSON
   secundario) durante la primera semana después del corte.

## 6. Variables de entorno y despliegue

### Cliente (Vercel y `apps/client/.env.local`)

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública (`sb_publishable_…`, o la `anon` vieja). Es pública por diseño: lo que protege es RLS. |

Con `PLAYER_STORE=supabase` en el server son obligatorias: no hay invitados. Jugar entrando por IP
en la red local deja de andar (Google no redirige a `http://192.168…`): para probar en local, usar
`app.localhost:3000` (y, si se decide mantenerlo, el modo JSON, decisión 9).

### Servidor (`apps/server/.env`, `.env.example`, PM2)

| Variable | Default | Descripción |
| --- | --- | --- |
| `PLAYER_STORE` | `json` | `json` (archivo, como hoy) o `supabase`. |
| `SUPABASE_URL` | — | `https://<ref>.supabase.co`. De ahí salen el JWKS y el `iss`. |
| `SUPABASE_SECRET_KEY` | — | API key secreta / service role, la que usa `supabase-js` en el server (decisión 8). **Sólo en el VPS.** Nunca con prefijo `NEXT_PUBLIC_`, nunca en Vercel ni en el repo. |
| `SUPABASE_JWT_SECRET` | — | Sólo si el proyecto todavía firma con HS256 (legado). Preferir JWKS. |
| `PLAYER_FALLBACK_FILE` | `apps/server/data/players-fallback.json` | Volcado de emergencia si la base no responde (4.4). |
| `ADMIN_NAME` | — | Sólo con `PLAYER_STORE=json`. Con Supabase se ignora (aviso al arrancar). |

`env.ts` suma una función que valide la combinación al arrancar (p. ej. `PLAYER_STORE=supabase` sin
`SUPABASE_URL` → no arranca, con un mensaje claro).

### Supabase y Google

- Proyecto en **`sa-east-1`**. Para producción, plan **Pro** (el gratis pausa el proyecto tras una
  semana sin uso y tiene 500 MB; el Pro trae backups diarios).
- Google Cloud: cliente OAuth "Web", URI de redirección autorizada `https://<ref>.supabase.co/auth/v1/callback`.
  En Supabase → Authentication → Providers → Google: client id y secret.
- Supabase → Authentication → URL configuration: Site URL `https://app.tudominio.com`, Redirect
  URLs `https://app.tudominio.com/**`, `http://app.localhost:3000/**`, `http://localhost:3000/jugar`
  y las de Preview de Vercel si se quieren probar.

### Despliegue

- **Vercel**: las dos variables `NEXT_PUBLIC_SUPABASE_*` (Production y Preview) y redeploy.
- **VPS**: `.env` con `SUPABASE_*` y `PLAYER_STORE`; `.env.example` documentado. Caddy no cambia
  (el WSS sigue igual). El VPS necesita salida HTTPS a Supabase.
- La skill `despliegue` y `.claude/rules/entorno.md` / `ingreso.md` se actualizan en la fase que
  corresponda (y `CLAUDE.md`: "Limitaciones conocidas", "Sin cuentas").
- `/health/full`: `store` pasa a mostrar `{ kind, pending, lastFlush, errors, players? }`.

## 7. Fases

| # | Fase | Hecho cuando |
| --- | --- | --- |
| 0 | **Preparación**: proyecto Supabase (sa-east-1), Google OAuth, variables, Supabase CLI y `supabase/migrations/` en el repo. | Un `signInWithOAuth` de prueba devuelve sesión en `app.localhost:3000`. |
| 1 | **Refactor sin cambio de comportamiento**: `PlayerRepository` + `JsonPlayerRepository`; `onAuth` async que carga y `onJoin` sincrónico; `session.playerId` + `epoch`; `bans` sin lectura sincrónica del store; `activeSessions` por `playerId`. | `npm run typecheck`; mismo `players.json`; probado a mano: entrar, comprar, intercambiar, viajar, sesión duplicada, `/ban` desconectado, apagar y volver. Prueba con bots (80 + 5) sin cambios en los ticks. |
| 2 | **Esquema, RLS y RPC** (`0001`–`0005`). | Migraciones aplicadas en un proyecto de prueba; tests de `create_character` (4.º personaje → `full`, nombre repetido con otras mayúsculas → `name_taken`), `import_legacy_character` (dos pestañas a la vez: gana una), `open_player_session` (personaje de otra cuenta → `not_found`) y `save_players` (ida y vuelta, epoch viejo, lote con error); con la publishable key y un JWT válido no se puede leer ni escribir nada. |
| 3 | **`SupabasePlayerRepository` en doble escritura** (JSON primario) + script de migración. | Una semana con el control de totales igual entre JSON y base; `/health` sin errores de store; latencia de `save_players` medida. |
| 4 | **Login con Google** (cliente + verificación del JWT en `onAuth`), **pantalla y API de personajes** (crear, elegir, importar clave vieja). | Con Google: crear hasta 3 personajes (el 4.º no deja), nombre repetido rechazado, importar la clave vieja una vez; desde otro navegador la cuenta trae lo mismo; sin token no se entra; token vencido → vuelve al login. |
| 5 | **Corte**: Supabase primario (con JSON secundario una semana). Desde acá se juega sólo con cuenta. | Corte hecho según §5; una semana sin pérdidas reportadas; se apaga la escritura del JSON. |
| 6 | **Roles y moderación en base**: admin por `role`, fuera `ADMIN_NAME` en producción; `/ban` con historial (`bans`) y `ban_by_name`; `admin_actions`. | Entrar con el nombre del admin sin cuenta no da admin; cada comando de admin deja fila. |
| 7 | **Libro de economía y mantenimiento**: `economy_ledger`, `economy_daily`, jobs de pg_cron. | Un intercambio deja dos filas con el mismo `ref`; la suma de `money_delta` de un día cierra contra los saldos; el borrado del progreso viejo sin reclamar corre. |
| 8 | (Opcional) **Preferencias del personaje**: barra rápida a la base (hoy en `localStorage`), así el progreso es igual en cualquier navegador (decisión 4). | Al entrar desde otro dispositivo se ve igual. |
| — | (A futuro) **Eliminar cuenta** (decisión 7): botón en la pantalla de personajes, `accounts.deleted_at` y borrado definitivo pasado un plazo. | Fuera de este plan. |

## Riesgos

- **Leer un estado viejo al viajar** (la sala nueva lee antes de que la vieja guarde): se cubre con
  `saveNow` antes de `TravelApproved` + caché de escritura + epoch. Es el riesgo más fácil de pasar
  por alto en el refactor.
- **Tratar un error de la base como jugador nuevo**: pisaría progreso real. Regla explícita en 4.4.
- **Duplicar progreso con la clave**: una clave se importa una sola vez (`update … where user_id is
  null`) y la clave sola nunca deja entrar.
- **Fuga de la secret key**: sólo en el `.env` del VPS (fuera del repo, `.gitignore`); rotarla si se
  sospecha. Las funciones RPC no se exponen a `anon` / `authenticated`.
- **Permisos por defecto de Supabase** (grants a `anon` / `authenticated` en tablas y funciones
  nuevas): el `revoke` + `alter default privileges` de `0003` es obligatorio y hay que probarlo.
- **Supabase caído**: el juego sigue (memoria), no entra gente nueva; volcado de emergencia.
- **OAuth y subdominios**: el login sólo funciona en el origen `app.`; jugar entrando por IP en la
  red local deja de andar (sin invitados).
- **Nombres que chocan al migrar**: hoy los nombres se repiten; al importar, el segundo tiene que
  elegir otro. Avisarlo antes del corte.
- **Tamaño del libro de economía**: por eso pesca/venta/picudos van agregados por día.
- **Plan gratis de Supabase** pausa proyectos inactivos: producción en Pro.

## Preguntas abiertas

Las 9 de la primera versión están respondidas en "Decisiones tomadas" (arriba). Quedan:

1. **Retención del libro de economía** (decisión 5, a decidir): 180 días propuestos, y qué
   granularidad tienen pesca y venta.
2. **¿Se mantiene el JSON** como modo de desarrollo local (decisión 9, a decidir), o se usa
   `supabase start` (Docker) también en local?
3. **¿Un personaje conectado por cuenta a la vez?** Propuesta: sí (4.5).
4. **¿Se puede borrar un personaje** (sin borrar la cuenta) para liberar uno de los 3 lugares? ¿Su
   nombre queda libre o reservado?
5. **Nombres de cuentas eliminadas** (cuando exista eliminar cuenta): ¿se liberan o quedan
   reservados para siempre?
6. **Plazo para importar el progreso viejo** de `players.json` (180 días propuestos en `0005`).
7. **¿El rol de admin es de la cuenta** (propuesto: sí, sus 3 personajes) o de un personaje?
