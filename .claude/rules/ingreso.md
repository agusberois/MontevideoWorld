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
El aspecto (sexo, piel, pelo, color) se arma en la pantalla de ingreso (🎲 = `randomAppearance`) y
se recuerda en `localStorage` (`mw:appearance`). El server lo valida con `sanitizeAppearance`
(si no es válido sortea uno) y lo copia al Schema (`gender`, `skin`, `hairColor`, `hairStyle`,
`color`): todos ven igual a cada jugador. El nombre sobre la cabeza va en `Player.color`.
Siempre se entra a **Ciudad Vieja**. Las salas se separan por `cityId` (`filterBy`); un `cityId`
desconocido hace fallar `onCreate`.

`CityRoom.onJoin` crea un `Player` en un tile caminable al azar de `spawnArea` (casi toda la Plaza Independencia, ~400 tiles)
y avisa a los demás por chat de sistema.
**Progreso guardado.** El navegador genera una clave secreta (`lib/playerKey.ts`, `mw:playerKey`
en localStorage) y la manda en `JoinOptions.playerKey`. Con ella el server guarda en
`playerStore` (archivo JSON, `PLAYER_DATA_FILE`) la mochila, la plata y la ropa puesta: al
salir, cada `SAVE_INTERVAL_MS` (15 s) y al apagar (`gameServer.onShutdown` → `flush`). Sólo se escribe
si algún jugador cambió (huella por clave), de forma asíncrona y sin indentar (el archivo no es para leer a mano). Al entrar
con una clave conocida se restaura todo (validando ítems, cantidades y montos); sin clave, kit
inicial. En localStorage vive **sólo la clave**, nunca el progreso, así no se puede editar desde
la consola. Una clave = una sesión: si entra de nuevo (otra pestaña), `activeSessions` cierra la
vieja con código 4001 después de guardarla. El nombre y el aspecto se recuerdan en el navegador
(`mw:name`, `mw:appearance`) y vienen prellenados en `JoinScreen`.
