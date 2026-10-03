---
paths:
  - "apps/server/src/gameClock.ts"
  - "apps/server/src/rooms/systems/admin.ts"
  - "packages/shared/src/time.ts"
  - "apps/client/src/game/city/DayNight.ts"
  - "apps/client/src/game/AdminCoords.ts"
  - "apps/client/src/features/admin/AdminPanel.tsx"
  - "apps/client/src/features/admin/MakerPanel.tsx"
  - "apps/client/src/features/admin/Announcement.tsx"
---

# Hora del juego y herramientas de admin

Hora del juego y admin. `gameClock` (server, global para todos los barrios) avanza solo; cada sala
copia el minuto del día a `state.minuteOfDay` una vez por segundo. El cliente escucha ese campo:
`DayNight` calcula la oscuridad con `darknessAt` (oscurece 18:00–20:30 con tono cálido, aclara
06:00–07:30) y la anima suave; el HUD muestra la hora (`city:clock`). Al entrar, si el nombre
coincide con `ADMIN_NAME`, `player.admin = true` (nombre con ★ en naranja y botón **Admin (P)**).
`admin:time { minuteOfDay }` mueve el reloj (sólo admins; se anuncia en el chat) y desde ahí sigue.
**Partido** (panel de Admin): `admin:match { mode, name? }` (`MatchMode`: `on` juega ya el partido
`name` de `MATCHES` hasta cambiar de modo, `off` no deja que haya ninguno, `auto` vuelve al
horario). Es global como el reloj (`gameClock.forceMatch`); el modo va en `state.matchMode`.
**Coordenadas** (sólo admin, tecla **G** o botón en el panel de Admin → `game/AdminCoords.ts`): grilla
sobre el piso con "x,y" cada 5 tiles y, junto al mouse, la coordenada y qué hay en ese tile
(`describeTile`); **Shift + clic** la copia al portapapeles ("39,21") para pedir dónde edificar. Es
sólo visual y del cliente.
**Maker** (botón **Maker (I)**, sólo admin → `MakerPanel`): todo el catálogo (`ITEMS`) en pestañas
plegables por categoría (arrancan todas cerradas cada vez que se abre; se abren/cierran de a una
o todas juntas; al buscar se abren las que tienen resultados), con buscador y cantidad (1 a `MAKER_MAX_QUANTITY`). Destino: vos o un jugador a
`MAKER_RANGE` tiles o menos; la lista la pide el panel con `admin:nearby:get` → `admin:nearby`
(botón ↻ para refrescar). `admin:give { itemId, quantity, targetId? }` → el server valida admin,
ítem, cantidad y **vuelve a medir la distancia**, crea lo que entre en la mochila (herramientas
nuevas), avisa a los dos con `notice` y deja `[Maker] …` en el log.
Comando de chat **`/post <mensaje>`** (sólo admin): se publica en presence (`ANNOUNCEMENT_TOPIC`)
y **cada sala de todos los barrios** lo reenvía como `announcement` → `Announcement.tsx` lo
muestra en el medio de la pantalla ("AGOSHO: hola que tal").
