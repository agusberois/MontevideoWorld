# Capacidad de una VPS de 2 vCPU / 4 GB / 25 GB

**Fecha:** 2026-10-05

**Resumen:** con el juego de hoy más lo planeado para la primera versión pública
([`funcionalidades-primera-version.md`](./funcionalidades-primera-version.md)), una VPS de **2 vCPU a
3,35 GHz, 4 GB de RAM y 25 GB de disco** aguanta con comodidad **~300–500 jugadores simultáneos**.
El **techo práctico es ~800–1.000** con un solo proceso de Node. La RAM, el disco y la red sobran:
1.000 jugadores ocupan ~250 MB de RAM y ~25 Mbit/s de salida. Lo que limita es, en este orden:

1. **El tope por barrio**: Ciudad Vieja (donde entra todo el mundo) admite como mucho
   **10 copias × 80 = 800** jugadores a la vez. El jugador 801 que entra recibe "Ciudad Vieja está
   lleno" (código 503), aunque Tres Cruces esté vacío. Se vio en la prueba de carga.
2. **El hilo único de Node**: 800 bots caminando usaron ~25–35 % de un núcleo de una MacBook. En una
   vCPU compartida, con jugadores reales que hacen más cosas que caminar, eso puede ser el 50–100 %
   del núcleo. Los primeros síntomas son los tirones al entrar mucha gente junta y los ticks lentos.
3. **El `players.json`** (hasta que llegue Supabase): no depende de cuántos haya conectados sino de
   cuántos hay **guardados**. Con 50.000 guardados, cada escritura frena el server ~130 ms, una vez
   cada ~15 s.

El segundo vCPU no suma jugadores mientras haya un solo proceso. Sirve para Caddy (TLS), el sistema,
el recolector de basura de Node y PM2. Todas las cifras de CPU tienen bastante incertidumbre: hay que
confirmarlas con bots corriendo **en la VPS** (ver "Cómo confirmarlo").

## Supuestos

| Supuesto | Valor | De dónde sale |
| --- | --- | --- |
| Un proceso de Node (PM2 `fork`, `instances: 1`) | Toda la lógica en 1 hilo | `deploy/ecosystem.config.cjs`, sin Redis |
| Ritmo del server | Jugadores cada 250 ms (`STEP_MS`), picudos cada 100 ms, reloj cada 1 s, guardado cada 15 s | `CityRoom.onCreate` |
| Patches de Colyseus | Cada 50 ms, sólo si hubo cambios (en la práctica ~4 por segundo, al ritmo del tick) | `escalabilidad-servidor.md` §7 |
| Tope por sala / copias | 80 jugadores (`MAX_PLAYERS_PER_ROOM`), 10 copias por barrio (`MAX_COPIES_PER_CITY`) | `constants.ts`, `CityRoom.ts` |
| Barrios | 5: Ciudad Vieja (entrada), Tres Cruces, Barrio de los Judíos, COMCAR y las Termas (sólo donadores) | `packages/shared/src/cities` |
| vCPU de la VPS vs. núcleo de la Mac de la prueba | Rinde entre igual y la mitad (vCPU compartida, con *steal* de otros clientes) | _Estimación_ |
| Mezcla de actividad real vs. bots | ×1,5 de CPU (tiendas, pesca, venta, picudos, gestos, intercambios) | _Estimación_ |
| Funcionalidades planeadas | ×1,1–1,2 de CPU (barras, changas, amigos) | _Estimación_ (ver abajo) |

## Prueba de carga (2026-10-05)

La prueba se corrió con un server aparte (puerto 2611, `players.json` en una carpeta temporal, sin
tocar el del juego) y bots de `colyseus.js` desde Node. Cada bot entraba a Ciudad Vieja con su propia
clave y su propia IP (`X-Real-IP`, para no chocar con los límites por IP). Cada 2–3 s pedía caminar a
un tile al azar a menos de 12 tiles, y mandaba un chat cada ~30 s. Los bots y el server corrían **en
la misma máquina**: una MacBook Pro con un i5-1038NG7 (2,0 GHz, turbo de 3,8 GHz), Node 22 y `tsx`
sin compilar. Esa máquina además tenía abiertos el server y el Next del usuario, así que los picos
salen inflados por la competencia por la CPU.

| Carga | Salas | CPU del server (% de 1 núcleo) | RSS / heap | Tick de jugadores (prom. / máx.) | Bajada por bot (datos WS) |
| --- | --- | --- | --- | --- | --- |
| 0 (recién arrancado) | 0 | ~0 % | 85 MB / 22 MB | — | — |
| 50 bots + 24 picudos (medición del 2026-10-02) | 1 | 2,4–5 % (máx. 12 %) | 104 MB | 0,2–0,7 ms | ~1 KB/s |
| **400 bots** | 5 copias llenas | **15–20 %** (48 % mientras entraban) | **145 MB** / 27–47 MB | 1,2–1,9 ms / 47 ms | **1,64 KB/s**, 6,8 mensajes/s |
| **800 bots** (776 estables) | 10 copias = Ciudad Vieja llena | **22–37 %** (66 % mientras entraban) | **~200 MB** / 36–85 MB | 2,0–2,4 ms / 106 ms (29 ticks > 20 ms) | **1,63 KB/s**, 6,8 mensajes/s |

Lo que se vio:

- **Tope de Ciudad Vieja**: de 820 bots entraron 800 y 20 recibieron "Ciudad Vieja está lleno: probá
  en un rato". Durante la avalancha de entradas (~25 por segundo) otros ~24 se cayeron por tiempo de
  espera (`socket hang up`), y quedaron 776.
- **El costo crece con la cantidad de salas, no con el cuadrado de los jugadores**: la bajada por
  bot fue la misma con 5 y con 10 copias, porque cada cliente recibe sólo lo de su sala, que tiene
  como mucho 80 jugadores. La CPU creció de forma más o menos lineal: **~0,035–0,045 % de un núcleo
  de la Mac por jugador caminando**.
- **Los ticks lentos** (de 80 a 106 ms, con avisos `[Métricas]`) aparecieron mientras entraba mucha
  gente a la vez, junto con los *scavenges* del GC y la competencia con los bots. En régimen estable,
  el tick promedio fue de ~2 ms por sala.
- **`players.json`**: con 955 claves guardadas (465 bytes cada una, porque los bots tienen sólo el
  kit inicial), armar el archivo tardó de 1 a 28 ms, con un aviso de 90 ms en medio de la avalancha.
  En un server sin bots al lado, eso es ~2 ms. La escritura en sí es asíncrona (`totalMs` de hasta
  ~370 ms) y no frena el juego.

Dos hallazgos de la prueba (**corregidos el 2026-10-05**: `Encoder.BUFFER_SIZE` en `index.ts` y el chequeo en `CityRoom.onDispose`):

- **`@colyseus/schema buffer overflow`** (379 avisos de 3 líneas): el estado completo de una sala con
  más de ~55 jugadores pasa los 8 KB del buffer por defecto del `Encoder`. Cada vez que alguien entra
  a una sala así, se vuelve a codificar todo y se escriben 3 líneas en el log. Arreglo de una línea:
  `Encoder.BUFFER_SIZE = 32 * 1024` en `index.ts`. Ahorra CPU justo en las avalanchas de entrada y
  ruido en los logs de PM2.
- **`onDispose error: Cannot read properties of undefined (reading 'city')`** (18 veces,
  `CityRoom.ts:496`): cuando un barrio ya tiene sus 10 copias, `onCreate` tira el 503 antes de
  asignar `this.map`, y después `onDispose` usa `this.map.city.id`. Colyseus atrapa el error, así que
  no tumba el server, pero ensucia el log justo cuando el barrio está lleno. Arreglo:
  `if (!this.map) return;` al principio de `onDispose`.

## Estimación por recurso

### CPU (el hilo de Node)

Se pasa lo medido a la VPS con los supuestos de arriba:

| | Costo por jugador (% de 1 núcleo) | 500 jugadores | 800 jugadores | 1.000 jugadores |
| --- | --- | --- | --- | --- |
| Bots caminando, Mac (medido) | 0,035–0,045 % | ~20 % | ~30 % | ~40 % |
| Bots caminando, vCPU de VPS (×1–2) | 0,04–0,09 % | 20–45 % | 30–70 % | 40–90 % |
| Jugadores reales + funciones planeadas (×1,5 × 1,15) | **0,06–0,15 %** | **30–75 %** | **50–120 %** | **60–150 %** |

Conviene dejar el hilo por debajo del ~60–70 % en régimen estable. Los picos (avalanchas de entrada
después de un anuncio o de un reinicio, el guardado, el GC, un día de clásico con todos vendiendo)
se comen el resto. Con ese criterio:

- **Cómodo: 300–500** (aunque la vCPU sea de las lentas).
- **Probable con una vCPU buena y poco *steal*: 600–800.**
- **Techo práctico: ~800–1.000.** De ahí en adelante, aunque la CPU diera, Ciudad Vieja ya está
  llena. Habría que repartir la gente en los otros barrios, y para entrar a ellos hay que comprar el
  boleto en Ciudad Vieja.

Qué pesa en cada tick, por sala: `stepPlayers` (caminos, `pending`, bancos), `stepGestures`,
`tickNeeds` (hambre y energía de cada uno, 4 veces por segundo), los picudos (hasta 24 por sala,
10 veces por segundo, ~0,15–0,3 ms) y armar y mandar el patch a los 80 de la sala. Entrar cuesta
bastante más que caminar: se codifica el estado completo (~12 KB con 80 jugadores), se lee el
guardado y se manda la mochila, la plata, las necesidades y la guía. Por eso los picos de CPU de la
prueba fueron al entrar (48–66 %) y no al caminar.

### RAM (4 GB)

| Qué | Estimación |
| --- | --- |
| Sistema (Ubuntu/Debian mínimo) + PM2 + Caddy | ~400–600 MB |
| Node en vacío | ~70–85 MB (85 MB con `tsx`; compilado algo menos) |
| Por jugador conectado | **~0,14 MB** (de 85 a 200 MB con 800 bots) |
| `players.json` en memoria (registros + huellas JSON de `playerStore`) | ~3–4 KB por clave guardada: 10.000 → ~40 MB, 50.000 → ~200 MB _(estimación)_ |
| Compilar en la VPS (`npm ci` + `build:server`) | Pico de ~0,5–1 GB, una vez por deploy |
| **1.000 conectados + 50.000 guardados** | **~0,5 GB para Node; ~1–1,2 GB en total** |

Sobran ~3 GB. La RAM sólo se acercaría al límite con decenas de miles de conectados, cosa que la
CPU no deja pasar. No hace falta `--max-old-space-size`: en una máquina de 4 GB, el heap por defecto
de Node 22 es de ~2 GB.

### Red

Medido: **1,63 KB/s por jugador** de datos WebSocket con su sala llena y todos caminando. Son ~6,8
mensajes por segundo; sumando ~80 B por mensaje de encabezados WS, TLS y TCP/IP, dan ~2,2 KB/s.
Para dimensionar, con chat, mochila, picudos y avisos, se mantiene la cifra de
`hardware-y-alojamiento.md`: **3 KB/s por jugador** (picos de 5).

| Simultáneos | Salida sostenida | Mes típico (promedio = 30 % del pico) | Peor caso (pico 24/7) |
| --- | --- | --- | --- |
| 300 | ~0,9 MB/s (7 Mbit/s) | ~0,7 TB | ~2,3 TB |
| 500 | ~1,5 MB/s (12 Mbit/s) | ~1,2 TB | ~3,9 TB |
| 800 | ~2,4 MB/s (19 Mbit/s) | ~1,9 TB | ~6,2 TB |
| 1.000 | ~3 MB/s (24 Mbit/s) | ~2,3 TB | ~7,8 TB |

El ancho de banda de la VPS (normalmente un puerto de 1 Gbit/s o más) no es problema. Lo que hay
que mirar es la **transferencia incluida por mes** del plan (en Linode 4 GB son 4 TB): alcanza para
el uso típico hasta ~1.000 jugadores de pico. Cada cliente recibe sólo lo de su sala, así que el
tope de 80 por sala también pone un techo a la bajada de cada uno. Subir ese tope la haría crecer:
el tráfico total de una sala crece con el cuadrado de los que tiene.

### Disco (25 GB)

| Qué | Espacio |
| --- | --- |
| Sistema | 3–5 GB |
| Repo + `node_modules` de todo el monorepo (Next y Phaser incluidos, aunque el cliente va en Vercel) | ~0,6–1 GB |
| Swap (recomendada aunque sobre RAM) | 1–2 GB |
| `players.json` | ~1,2 KB por jugador real guardado: 100.000 → ~120 MB (el doble durante la escritura atómica) |
| Logs de PM2 (`[Join]`, `leave`, `disposed`, avisos) | ~0,3–0,5 KB por entrada: 20.000 entradas por día → ~10 MB/día. Con `pm2-logrotate` no crece |
| **Total** | **< 10 GB**: los 25 GB alcanzan |

El disco no limita por espacio. Lo que limita del JSON es **el tiempo de armarlo**: ~2 ms con 1.000
guardados, ~25 ms con 10.000, ~130 ms con 50.000. La hambre y la energía cambian todo el tiempo, así
que con gente conectada se reescribe cada ~15 s. Ese frenazo depende de los guardados, no de los
conectados, y frena **todas** las salas a la vez.

## Qué agregan las funcionalidades planeadas

| Funcionalidad (de `funcionalidades-primera-version.md`) | Server | Efecto en la capacidad |
| --- | --- | --- |
| Cuentas con Supabase (2.1) | Validar el JWT al entrar (~0,1–0,5 ms) y guardar por lotes asíncronos | **Mejora**: saca el `JSON.stringify` del hilo. El guardado deja de crecer con los jugadores guardados |
| Barras (2.2) | `barraTag` y `barraColor` en `Player` (sólo al entrar o al cambiar); `/barra` usa `playerDirectory` | Despreciable: pocos bytes al entrar y nada por tick |
| Changas y racha (2.4) | Contadores en eventos que ya existen (pesca, venta, patada, compra) | Despreciable por tick; un poco más para guardar |
| Amigos (2.5) | Avisos al conectarse y mensajes guardados (en la base) | Despreciable; consultas a Supabase fuera del tick |
| Reportes (2.6), rankings (2.7) | Escrituras en la base; el ranking "se calcula en la base, no en la sala" | Nada en el hilo de juego |
| Actividades en grupo (2.8) | Buscar compañeros cerca al terminar una pesca o una venta (recorrer ≤ 80) | Despreciable |
| Gestos (2.9, hecho) | `gesture`, `gesturePartner`, `gestureLead` en `Player` y `stepGestures` por tick | Ya estaba en la prueba de carga (los bots no hacían gestos) |
| Sonido (2.10) | **Sólo cliente** | Nada |
| Feria de Tristán Narvaja, barrios nuevos (P1) | Cada barrio nuevo suma 800 lugares de tope y sus salas | Sube el **techo estructural**, no la CPU por jugador |
| Clima, calendario (hechos) | Global, una vez por segundo | Nada |

Ninguna de las funcionalidades P0 cambia el orden de magnitud. Lo único que mueve la aguja es
**Supabase**, y para bien. El riesgo está en algo nuevo que corra **por tick y por jugador** (p. ej.
buscar compañeros de barra en cada paso en vez de al terminar la acción): eso hay que evitarlo.

## Cuello de botella, en orden

| # | Límite | Cuándo se toca | Síntoma | Qué hacer |
| --- | --- | --- | --- | --- |
| 1 | **Ciudad Vieja: 10 × 80 = 800** | ~800 a la vez en Ciudad Vieja | "Ciudad Vieja está lleno" al entrar | Subir `MAX_COPIES_PER_CITY` (es un número), entrar donde había quedado (ya existe `resume`) y vender boletos en más barrios |
| 2 | **Hilo de Node** | ~500–1.000, según la vCPU | `ticks.players.avgMs` > 5 ms, avisos `[Métricas]`, CPU del proceso > 70 % | Ver "Cómo escalar" |
| 3 | **`players.json`** | > ~10.000 guardados (no conectados) | `store.lastFlush.serializeMs` > 25–50 ms, aviso `[PlayerStore] … frenó el server` | Supabase (ya planeado) |
| 4 | Límites por IP | Colegios, cibers y **CGNAT de los celulares** (muchos jugadores detrás de la misma IP) | "Hay demasiadas conexiones desde tu red" | Medir con jugadores reales; subir `MAX_CONNECTIONS_PER_IP` o, con cuentas, limitar por cuenta |
| 5 | Transferencia del mes | > ~1.000 de pico sostenido con un plan de 4 TB | Contador del proveedor | Plan más grande |
| — | RAM, disco, ancho de banda | Lejos | — | — |

## Cómo confirmarlo

1. **Bots en la VPS de verdad**, desde **otra** máquina (si no, los bots le roban CPU al server). Hay
   que entrar con escalones de 200, 400, 600 y 800, cada uno durante 5 minutos, y mirar:
   - `curl -s localhost:2567/health/full` en la VPS (o con `HEALTH_TOKEN` desde afuera):
     `ticks.players.avgMs` y `maxMs`, `slowTotal`, `memoryMb.rss`, `store.lastFlush.serializeMs` y
     `cities` (jugadores por copia).
   - `top` o `pidstat -p <pid> 5`: el **% de CPU del proceso** (sobre 100 % = 1 núcleo) y `st`
     (*steal*). Si el *steal* pasa del 5–10 %, la vCPU compartida está saturada por otros clientes.
   - Los avisos `[Métricas]` y `[PlayerStore]` en `pm2 logs`.
2. **Criterio para aprobar un escalón**: CPU del proceso < 60 % estable, `ticks.players.avgMs`
   < 5 ms y ningún aviso `[Métricas]` seguido fuera de las avalanchas de entrada. La capacidad
   cómoda es el último escalón que pasa; el techo, el doble de la CPU de ese escalón.
3. **Probar la avalancha**: 300 bots entrando en 10 s (lo que pasa después de un reinicio o de un
   anuncio). Ahí se ve si alcanza el margen.
4. **Con jugadores reales**: comparar la CPU por jugador de la beta con la de los bots, para
   reemplazar el ×1,5 supuesto por el real.

El script de bots de esta prueba no se agregó al repo. Si se quiere repetir seguido, conviene sumar
uno a `apps/server` (p. ej. `npm run load -w @montevideo-world/server -- 400`). Tiene que entrar con
clave e IP propias por bot, caminar cada 2–3 s y mandar un chat cada ~30 s.

## Cómo escalar (en orden de costo)

1. **Gratis, en el código**: `Encoder.BUFFER_SIZE = 32 * 1024`, el `if (!this.map)` en `onDispose`,
   compilar con `tsc` (el deploy ya corre `dist/index.js`, no `tsx`) y `pm2-logrotate`.
2. **Supabase**: saca el JSON del hilo (cuello #3) y es el requisito de la primera versión.
3. **vCPU dedicada o más rápida** del mismo tamaño: es lo que más sube el cuello #2 con un proceso.
   4 GB de RAM sobran; no hace falta pagar por más memoria.
4. **Usar el segundo núcleo con un segundo proceso**: dos procesos de Colyseus en la misma VPS, con
   `@colyseus/redis-presence` + `@colyseus/redis-driver` y Redis local (~50 MB de RAM). Hay que pasar
   a Redis lo que hoy vive en la memoria del proceso: `activeSessions`, `playerDirectory`,
   `openCopies`, `travelTickets`, `bans`, `mutes` y `connectionLimits`. Caddy reparte los WebSocket
   entre los dos. Con 2 vCPU, el techo sube a ~1.500 (Caddy y el sistema comparten núcleo con uno
   de los procesos). Es un cambio M/L (`escalabilidad-servidor.md` §6), recién cuando las métricas
   lo pidan.
5. **Más copias y más barrios**: subir `MAX_COPIES_PER_CITY` o sumar barrios (Pocitos, Cordón) sube
   el tope estructural. Ojo: más copias de Ciudad Vieja = más gente que no se ve entre sí. Lo que se
   viene con las barras y los amigos es entrar a la copia del amigo (`joinById`), no copias más
   grandes.
6. **VPS más grande (4 vCPU dedicadas / 8 GB) con 3–4 procesos**: para pasar de ~1.500–2.000. Ver
   `hardware-y-alojamiento.md`.

## Respuesta corta

En una VPS de 2 vCPU a 3,35 GHz, 4 GB y 25 GB, Montevideo World anda bien con **~300–500
jugadores a la vez**, probablemente con **hasta ~800**, y el techo es **~800–1.000** con un solo
proceso. El primer límite que se toca es el de **Ciudad Vieja (800 lugares en 10 copias)** y, casi
a la par, la **CPU del único hilo de Node**. La RAM (~1 GB usado de 4), el disco (< 10 GB de 25) y
la red (~25 Mbit/s con 1.000) sobran. El número fino de CPU depende de cuánto rinda esa vCPU: hay
que medirlo con bots en la VPS antes de anunciar el juego.
