---
paths:
  - "apps/client/src/proxy.ts"
  - "apps/client/src/app/**"
  - "apps/client/src/features/landing/**"
  - "apps/client/src/features/join/LoginScreen.tsx"
  - "apps/client/src/features/join/JoinScreen.tsx"
  - "apps/client/src/features/join/AvatarPreview.tsx"
  - "apps/client/src/shell/App.tsx"
  - "apps/client/src/lib/appUrl.ts"
  - "apps/client/src/lib/playerKey.ts"
  - "apps/client/src/lib/network.ts"
  - "packages/shared/src/appearance.ts"
  - "apps/server/src/playerStore.ts"
  - "apps/server/src/rooms/CityRoom.ts"
  - "apps/server/src/index.ts"
---

# Landing, ingreso y progreso guardado

**Landing y juego**: la landing está en el dominio (`localhost:3000`) y el juego en el subdominio
`app.` (`app.localhost:3000`): `src/proxy.ts` reescribe `/` a `/jugar` cuando el host empieza con
`app.`. `/jugar` también anda directo en cualquier host (sirve entrando por IP desde otra compu,
donde no hay subdominio). El botón "Jugar" de la landing arma el link con `lib/appUrl.ts`
(`NEXT_PUBLIC_APP_URL` o `app.` + el host actual; por IP, `/jugar`). En el juego se pasa primero
por `LoginScreen` (botón de Google sin efecto por ahora) y después por `JoinScreen`; al salir del
juego se vuelve a `JoinScreen`. Si agregás `proxy.ts` con `next dev` corriendo, reinicialo.

`JoinScreen` → `joinCity(name, appearance)` → `client.joinOrCreate("city", { name, cityId: SPAWN_CITY_ID, appearance })`.
El aspecto (sexo, piel, 9 peinados y color de pelo, color de ojos, barba, lentes y color) se arma en
la pantalla de ingreso (🎲 = `randomAppearance`) y se recuerda en `localStorage` (`mw:appearance`).
El server lo valida con `sanitizeAppearance` (si no es válido sortea uno; ojos, barba y lentes, si
faltan —aspectos guardados antes de que existieran, clientes viejos—, van por defecto) y lo copia al
Schema (`gender`, `skin`, `hairColor`, `hairStyle`, `eyeColor`, `facialHair`, `glasses`, `color`):
todos ven igual a cada jugador. **Cómo se dibuja la cabeza**: `lib/avatar/head.ts` la arma como listas
de formas (`lib/avatar/shapes.ts`, sin Phaser) que pintan igual `Avatar.ts` (`paintShapes`) y la
vista previa en SVG (`AvatarPreview`, `SvgShapes`); lo mismo el cuerpo y la ropa (`lib/avatar/
clothing.ts`: `leg`, `arm`, `torso`, `hat`, `wornOutfit`). Un peinado, barba, lentes o prenda
nuevos se dibujan una sola vez ahí (el `switch` / `Record` no compila si falta uno). Capas: `headFront` → `faceFeatures` → `eyes`
(parpadean) → `glasses` → `frontHair` → gorro; de espaldas `headBack`. El avatar pone **cara de
contento** al patear un picudo y **de dolor** cuando le pica uno (`Avatar.flinch`, desde los `bites`
del picudo en `CityScene`), y **respira** parado sin hacer nada. El nombre sobre la cabeza va en `Player.color`.
Siempre se entra a **Ciudad Vieja**. Las salas se separan por `cityId` (`filterBy`); un `cityId`
desconocido hace fallar `onCreate`.

`CityRoom.onJoin` crea un `Player` en un tile caminable al azar de `spawnArea` (casi toda la Plaza Independencia, ~400 tiles)
y avisa a los demás por chat de sistema.
**Nombres** (`sanitize.ts`): `sanitizeName` pasa a NFKC, saca control e invisibles (`\p{Cf}`: bidi,
ancho cero, guion blando, y los "rellenos" que se ven en blanco) y deja a lo sumo una marca
combinante seguida (lo mismo los nombres de mascota; el chat igual pero conserva U+200D para los
emojis compuestos). Para comparar nombres se usa `nameKey` (esqueleto: sin mayúsculas, tildes,
espacios ni signos, letras cirílicas/griegas parecidas → latinas, 0→o, 1/I→l, rn→m): lo usan los
nombres únicos y reservados, `/mensaje`, `/plata`, `/ban`, `/trace`, los bans por nombre y
`keysByName`. En `onJoin`: un nombre reservado (`isReservedName`: Admin, Sistema, Moderador
—también adentro de otro—, Mod, Staff… y el de `ADMIN_NAME`, salvo para el admin) pasa a
`Invitado####`, y si ya hay alguien conectado con el mismo esqueleto se le suma un número
(`juan2`; la sesión que esa clave reemplaza no cuenta). Se le avisa con un `notice` a los 1,5 s (antes
el cliente todavía no registró sus handlers). Ojo: al viajar se vuelve a pedir el nombre original,
así que el número puede cambiar o irse.
**Progreso guardado.** El navegador genera una clave secreta (`lib/playerKey.ts`, `mw:playerKey`
en localStorage) y la manda en `JoinOptions.playerKey`. Con ella el server guarda en
`playerStore` (archivo JSON, `PLAYER_DATA_FILE`) la mochila, la plata y la ropa puesta: al
salir, cada `SAVE_INTERVAL_MS` (15 s) y al apagar (`gameServer.onShutdown` → `flush`). Una clave nueva que
sigue intacta (`isUntouched`: sin plata de más, sólo el kit, sin mascota…) queda sólo en memoria
(para viajar, `/trace` u otra pestaña) y no se escribe: se guarda recién cuando tiene algo que perder,
y desde ahí siempre; las sólo-en-memoria se olvidan a la hora sin uso. El archivo
no tiene las claves: va indexado por `playerId(clave)` (SHA-256 hex) en formato
`{ version: 2, players }`; el viejo (por clave en texto plano) se migra solo al arrancar, dejando una
copia `players.json.v1.bak` (0600, tiene las claves: borrarla cuando no haga falta volver atrás). Los
bans por clave también van por id. Sólo se escribe
si algún jugador cambió (huella por clave), de forma asíncrona y sin indentar (el archivo no es para leer a mano). Al entrar
con una clave conocida se restaura todo (validando ítems, cantidades y montos); sin clave, kit
inicial. En localStorage vive **sólo la clave**, nunca el progreso, así no se puede editar desde
la consola. Una clave = una sesión: si entra de nuevo (otra pestaña), `activeSessions` cierra la
vieja con código 4001 después de guardarla. El nombre y el aspecto se recuerdan en el navegador
(`mw:name`, `mw:appearance`) y vienen prellenados en `JoinScreen`.
