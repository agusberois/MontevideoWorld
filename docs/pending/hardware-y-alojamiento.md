# Hardware y alojamiento (jugadores de Uruguay)

**Fecha:** 2026-10-02

**Resumen:** el server de juego es liviano: con 80 bots caminando usó ~3 % de un núcleo y con 50
jugadores ocupa ~104 MB de RAM. Para arrancar alcanza una VPS de **1–2 vCPU y 2 GB** de RAM; para
~200 jugadores simultáneos, **2 vCPU y 4 GB**; para ~1.000, **4 vCPU dedicadas y 8 GB** (y para
entonces hay que sacar el JSON de jugadores a una base de datos). Lo que más importa para jugadores
uruguayos **no es el hardware sino dónde está**: Buenos Aires, Santiago y São Paulo quedan a 15–45 ms
de Montevideo; EE.UU. a 160–200 ms y Europa a 250 ms. **Recomendación:** arrancar en **São Paulo**
(Akamai/Linode o Vultr, ~US$ 17–34/mes) y medir contra **Santiago** (Vultr) antes de decidir; el
cliente sigue en Vercel, con las funciones en `gru1` (São Paulo). Hosting dentro de Uruguay (datacenter
de Antel en Pando) da el ping más bajo a clientes de ANTEL, pero hay pocos proveedores y es menos
flexible: queda como opción si las mediciones lo justifican.

> Precios a octubre 2026, aprox., en dólares, sin impuestos. Cambian seguido: confirmarlos en la
> página de cada proveedor antes de contratar. Lo marcado _(estimación)_ no tiene fuente directa.

## De qué está hecho el sistema (lo que hay que alojar)

| Pieza | Dónde corre | Qué necesita |
| --- | --- | --- |
| Cliente Next.js 16 (landing + juego, `proxy.ts` por subdominio) | **Vercel** (CDN + funciones) | Nada propio: el plan gratis alcanza para empezar |
| Server Colyseus 0.16 (`apps/server`, Node ≥ 22) | **VPS** con PM2 (`deploy/ecosystem.config.cjs`) | CPU de un solo hilo rápida, poca RAM, disco chico |
| TLS / WSS | **Caddy** en la misma VPS (`deploy/Caddyfile`) | Puertos 80/443 abiertos, un registro A |
| Progreso (`players.json`, escritura atómica) | Disco de la VPS | SSD/NVMe y backup fuera de la VPS |

Ritmo del server: movimiento cada 250 ms (`STEP_MS`), picudos cada 100 ms, patches de Colyseus cada
50 ms (sólo se mandan si hubo cambios). Hasta 80 jugadores por sala (`MAX_PLAYERS_PER_ROOM`); si se
llena se abre otra copia del barrio. **Una sola instancia**: el estado vive en memoria.

### Node usa (casi) un solo núcleo

Toda la lógica de las salas corre en el hilo principal de Node. Más núcleos ayudan poco: el segundo
sirve para Caddy (TLS), el sistema, el recolector de basura (que trabaja en hilos aparte) y las
escrituras a disco, pero el tercero y el cuarto quedan casi ociosos **hasta** que se corran varios
procesos del server con `@colyseus/redis-presence` + `@colyseus/redis-driver` (ver
`escalabilidad-servidor.md`). Por eso conviene **un núcleo rápido** antes que muchos lentos, y vCPU
**dedicada** (no compartida) cuando haya mucha gente, para que otro cliente de la VPS no "robe" CPU
justo en un tick.

## Números medidos (de `escalabilidad-servidor.md` y medición propia)

| Qué | Resultado |
| --- | --- |
| 80–85 bots caminando a la vez (MacBook, Node 22) | CPU del server 3,3 % promedio, 9 % máx.; patches cada ~250 ms (p99 514 ms) |
| 50 bots + 24 picudos | CPU 2,4–5 % (máx. 12 %), **RSS 104 MB**, tick de jugadores 0,2–0,7 ms, tick de picudos 0,14–0,27 ms |
| Guardar `players.json` con 50.000 jugadores | ~59 MB, **115–140 ms bloqueado** |
| Estado completo de la sala al entrar (medido con `Encoder` de `@colyseus/schema` 3) | **~145 bytes por jugador** (11,6 KB con 80) |
| Patch de movimiento | **~5,4 bytes por jugador que da un paso** (6 en diagonal) |
| Patch con 24 picudos moviéndose | ~190 bytes por tick (10 por segundo) |

La medición de patches se hizo con un script aparte (no toca el repo) que arma un `GameState` con
80 jugadores con ropa y nombre, mueve la mitad un tile por tick y mide `encoder.encode()`.

Una vCPU de VPS compartida rinde entre la mitad y un tercio de un núcleo de MacBook reciente
_(estimación)_: 80 jugadores caminando ≈ 10 % de una vCPU de VPS.

## Tráfico estimado

Por cada cliente conectado, el server le manda los cambios de **todos** los de su sala:

| Situación (por cliente, sala de 80) | Datos útiles | Con encabezados WS + TLS + TCP/IP (~80 B por mensaje) |
| --- | --- | --- |
| Mitad de la sala caminando, sin picudos | 216 B × 4/s ≈ 0,9 KB/s | **~1,2 KB/s** (~10 kbit/s) |
| Todos caminando en diagonal | 480 B × 4/s ≈ 1,9 KB/s | ~2,2 KB/s |
| Todos caminando + 24 picudos persiguiendo | ~3,8 KB/s | **~4,7 KB/s** (~40 kbit/s) |
| Al entrar / viajar | 11,6 KB de una vez | + mochila, plata, etc. (~1–2 KB) |

**Medido** (2026-10-02, server aparte, 50 bots en una sala, cada uno con un destino al azar cada
2–3 s, sin picudos): **~1 KB/s por bot** en datos WebSocket (~4 patches/s de ~250 bytes), igual con
patch rate de 50 o 100 ms. Coincide con la primera fila.

Sumando chat, mochila, avisos y los ACK de subida, para dimensionar se usa **3 KB/s por jugador
conectado** (bajada desde el server), con picos de 5 KB/s. Lo que manda el jugador al server es
mucho menos (cientos de bytes por segundo). Los archivos del juego (JS, Phaser ~1,1 MB sin
comprimir, logo, imágenes) **no salen de la VPS**: los sirve Vercel.

Transferencia mensual del server (salida), suponiendo que en promedio hay conectado el 30 % del pico
_(estimación de uso)_, y el peor caso con el pico las 24 h:

| Pico simultáneo | Salida en el pico | Mes típico (30 % del pico promedio) | Peor caso (pico 24/7) |
| --- | --- | --- | --- |
| ~50 | 150 KB/s (1,2 Mbit/s) | **~120 GB** | ~390 GB |
| ~200 | 600 KB/s (4,8 Mbit/s) | **~470 GB** | ~1,6 TB |
| ~1.000 | 3 MB/s (24 Mbit/s) | **~2,3 TB** | ~7,8 TB |

Esto importa para elegir proveedor: las VPS "de precio fijo" (Akamai, Vultr, Lightsail) incluyen
2–5 TB por mes; las nubes grandes (AWS EC2, GCP, Azure) cobran la salida aparte, ~US$ 0,09–0,15 por GB
_(estimación)_, que con 2 TB son US$ 180–300 al mes, más que la máquina.

## Hardware del servidor de juego por escalón

| Escalón | vCPU | RAM | Disco | Transferencia/mes | Comentario |
| --- | --- | --- | --- | --- | --- |
| **Mínimo / prueba** (≤ 50 simultáneos) | 1 compartida | 1 GB (+ 1–2 GB de swap) | 25 GB SSD | 0,5–1 TB | El server usa ~100 MB, pero `npm ci` + `npm run build:server` en la misma VPS se pasa de 1 GB: con 1 GB, swap obligatoria (o compilar afuera) |
| **Recomendado para arrancar** (≤ 200, ~3 salas llenas) | 2 compartidas | 2–4 GB | 50–80 GB NVMe | 2–4 TB | Un núcleo para Node, otro para Caddy, GC y el sistema. Margen para picos y para compilar |
| **Crecimiento** (~1.000, ~13 salas) | 4 **dedicadas** | 8 GB | 80–160 GB NVMe | 4–8 TB | Un proceso Node aguanta, pero con poco margen: ~1 GB de heap para los jugadores + el `players.json` en memoria. Antes de llegar acá: base de datos en vez del JSON (con 50.000 guardados el guardado frena ~130 ms) y medir con bots |
| **Más de ~1.000–2.000** | Varias VPS o una más grande | 8–16 GB | NVMe | 8 TB+ | Ya no es "una VPS más grande": varios procesos + Redis (presence y driver) + base de datos. Ver `escalabilidad-servidor.md` |

Notas:

- **Disco**: el juego casi no lo usa (el JSON pesa ~1,2 KB por jugador guardado: 10.000 = 12 MB),
  pero SSD/NVMe hace que la escritura atómica (temporal + `rename`) sea rápida. Lo importante es el
  **backup diario fuera de la VPS** (snapshot del proveedor o copiar `PLAYER_DATA_FILE` a otro lado).
- **Memoria**: base de Node ~60 MB + ~1 MB por jugador conectado _(estimación a partir de los
  104 MB con 50 bots)_ + el guardado en memoria. Si se sube de 1.000 conectados, ajustar
  `--max-old-space-size` en PM2.
- **Sistema**: Ubuntu 24.04 LTS o Debian 12, Node 22 LTS, PM2 y Caddy, como en `CLAUDE.md`.
- **Arquitectura**: x86 o ARM (Ampere) da igual: el server es JavaScript puro, sin dependencias
  nativas.

## Requisitos del lado del jugador

| | Mínimo razonable | Recomendado |
| --- | --- | --- |
| Navegador | Chrome / Edge 100+, Firefox 100+, Safari 15+ (iOS 15+), con WebGL activado | Última versión de Chrome, Edge, Firefox o Safari |
| PC | Doble núcleo de ~2015 en adelante, 4 GB de RAM, gráfica integrada con WebGL 1 | 8 GB de RAM, gráfica integrada moderna |
| Celular | Android 9+ con 3 GB de RAM, iPhone 8 / XR o posterior | Android de gama media de 2021+, iPhone 11+ |
| Conexión | Cualquier fibra o ADSL, 4G estable; ~40 kbit/s sostenidos por jugador y ~2–3 MB la primera carga | Fibra ANTEL o 4G/5G con buena señal |
| Latencia al server | < 150 ms se juega; > 200 ms se nota en cada acción | < 60 ms |

Por qué estos números: Phaser 3.90 dibuja con WebGL (cae a Canvas si no hay); el piso se hornea en
trozos de 2048 px para no pasar el máximo de texturas de 4096 px de muchas GPU de celular
(`GROUND_CHUNK`). La predicción del movimiento propio esconde la latencia al caminar, pero sentarse,
entrar a una tienda, pescar o vender esperan la respuesta del server: con 40 ms se siente inmediato,
con 170 ms (EE.UU.) se nota.

## Dónde alojarlo para jugadores de Uruguay

### Latencias desde Montevideo

Medidas de WonderNetwork (ping entre servidores de datacenter, no desde una casa). Desde una casa con
fibra hay que sumar ~2–10 ms; por 4G, ~20–50 ms y más variación _(estimación)_.

| Destino | Ping promedio desde Montevideo | Fuente |
| --- | --- | --- |
| Uruguay (Antel, Pando) | ~2–15 ms _(estimación)_ | — |
| Buenos Aires | 16 ms | WonderNetwork |
| Santiago de Chile | 28 ms | WonderNetwork |
| São Paulo | 42 ms | WonderNetwork |
| Asunción | 48 ms | WonderNetwork |
| Lima | 66 ms | WonderNetwork |
| Miami | 161 ms | WonderNetwork |
| Washington (≈ Virginia, us-east-1) | 166 ms | WonderNetwork |
| Dallas | 173 ms | WonderNetwork |
| Nueva York | 201 ms | WonderNetwork |
| Madrid / Frankfurt | 250 ms | WonderNetwork |

Conclusión: **cualquier lugar del Cono Sur sirve; EE.UU. y Europa no**. Proveedores populares sin
región en Sudamérica (**Hetzner, DigitalOcean, Contabo**) quedan descartados para el server de juego
(sí sirven para guardar backups).

### Las rutas de red desde Uruguay

- **ANTEL** (la mayoría de la fibra del país) tiene salida propia por cables submarinos: **Tannat**
  (con Google, Maldonado ↔ Santos, Brasil, con extensión a Las Toninas, Argentina, desde 2021) y
  **Bicentenario** (Maldonado ↔ Argentina), más conexión a **EllaLink** hacia Europa vía Brasil. Por
  eso São Paulo y Buenos Aires quedan cerca para clientes de ANTEL.
- **Claro y Movistar** (sobre todo móvil) suelen salir por Argentina o Brasil con rutas propias:
  la latencia hacia cada región puede ser distinta que la de ANTEL. No hay datos públicos confiables:
  **hay que medirlo** (ver "Cómo medir").
- **São Paulo** es el punto de intercambio más grande de la región (IX.br) y donde están casi todos
  los proveedores: es la opción con más alternativas y mejor conectada con todo el continente.
- **Santiago** creció mucho (Vultr, Oracle, GCP, Azure desde 2025, y AWS anunció región para fines
  de 2026). Desde Montevideo la ruta suele pasar por Buenos Aires y cruzar los Andes: en el dato de
  WonderNetwork da **menos** que São Paulo, pero puede variar según el operador.
- **Buenos Aires** es lo más cerca después de Uruguay, pero casi no hay VPS de los proveedores
  grandes: sólo una **Local Zone de AWS** (instancias T3, C5, M5, R5; cara y sin Lightsail), y
  hosting local argentino.
- **Uruguay** (datacenter de **Antel en Pando**, Tier III, 12.500 m²) da el ping más bajo a clientes
  de ANTEL. Hay VPS de terceros alojadas ahí (p. ej. OWN.TN: 1 vCPU, 3 GB, 20 GB SSD, 500 GB de
  transferencia por ~US$ 24/mes) y servicios de Antel Empresas, pero menos opciones, menos
  autoservicio y transferencia más chica. Google construye un datacenter en Canelones (operativo hacia
  2030), que no es región de nube pública por ahora.

### Comparativa de proveedores

| Proveedor | Región | Ping est. desde Montevideo | Plan comparable | US$/mes (aprox., oct. 2026) | Pros | Contras |
| --- | --- | --- | --- | --- | --- | --- |
| **Akamai / Linode** | São Paulo | ~40 ms | Linode 2 GB (1 vCPU, 2 TB) / 4 GB (2 vCPU, 4 TB) / 8 GB (4 vCPU, 5 TB) | **16,80 / 33,60 / 67,20** | Precio fijo, transferencia generosa, excedente muy barato (US$ 0,007/GB), snapshots | São Paulo 40 % más caro que otras regiones |
| **Vultr** | São Paulo o **Santiago** | ~40 ms / ~30 ms | Cloud Compute 2 vCPU 4 GB | ~20–30 (en São Paulo se reporta ~30) | Dos regiones cercanas para comparar, por hora, NVMe | Precio por región: confirmar; transferencia incluida a verificar por plan |
| **AWS Lightsail** | São Paulo (desde junio 2026) | ~40 ms | 2 GB (2 vCPU, 3 TB) / 4 GB (2 vCPU, 4 TB) | ~12 / ~24 (AWS dice "mismos precios"; confirmar) | Barato, transferencia incluida, ecosistema AWS | vCPU con créditos de CPU (*burstable*): sostenida al 100 % se frena |
| **AWS EC2** | sa-east-1 São Paulo; Local Zone Buenos Aires | ~40 ms / ~16 ms | t4g.medium (2 vCPU, 4 GB) en São Paulo; t3.medium en BA | ~35–40 en SP; ~50+ en BA _(estimación)_ + salida ~0,15/GB | Buenos Aires es lo más cerca con nube grande | La salida se cobra aparte y es lo más caro; BA con pocas instancias |
| **Oracle Cloud** | São Paulo, Vinhedo, Santiago, Valparaíso | ~30–45 ms | Always Free Ampere A1: hasta 4 OCPU y 24 GB, **10 TB de salida** | **0** (pago: barato) _(estimación)_ | Gratis y sobrado para una prueba, ARM | Capacidad gratis muchas veces "agotada" en São Paulo; puede reclamar instancias inactivas; no apostar producción a la capa gratis |
| **Google Cloud** | southamerica-east1 (SP), southamerica-west1 (Santiago) | ~30–45 ms | e2-medium (2 vCPU, 4 GB) | ~35–45 + salida aparte _(estimación)_ | Red de Google, mismo dueño del cable Tannat | Salida cara, más complejo |
| **Azure** | Brazil South (SP), Chile Central (Santiago, desde 2025) | ~30–45 ms | B2s (2 vCPU, 4 GB) | ~45–55 + salida aparte _(estimación)_ | Dos regiones cercanas | Lo más caro de la lista para esto |
| **Magalu Cloud** | São Paulo | ~40 ms | VM chica x86 | Sin precio verificado; factura en reales | Barato según su anuncio | Factura en BRL, pensado para empresas brasileñas |
| **VPS en Antel Pando** (p. ej. OWN.TN) | Uruguay | ~2–15 ms _(estimación)_ | 1 vCPU, 3 GB, 20 GB SSD, 500 GB | ~24 | Ping mínimo para ANTEL; los datos quedan en Uruguay | 500 GB alcanza sólo para el escalón de prueba; pocos proveedores; ruta de Claro/Movistar sin verificar |
| Hetzner / DigitalOcean / Contabo | EE.UU. / Europa | 160–250 ms | — | Baratos | — | **Descartados** para el juego: demasiada latencia |

### El cliente en Vercel

- Los archivos estáticos (JS, imágenes) salen del **CDN** de Vercel desde el PoP más cercano: no
  hace falta nada.
- Lo que **sí** corre en una región es el `proxy.ts` y el renderizado de las páginas. Las funciones
  de Vercel corren por defecto en **`iad1` (Washington)**, a ~166 ms de Montevideo: cada carga de la
  página haría ese viaje. Conviene fijarlas en **`gru1` (São Paulo)** con `"regions": ["gru1"]` en
  `apps/client/vercel.json` (o en Project Settings → Functions). No afecta al juego ya cargado (el
  WebSocket va directo a la VPS), sólo a la primera carga.

### Legal y plata

- **Moneda**: todos los proveedores de la tabla (salvo Magalu, en reales) facturan en **dólares** con
  tarjeta internacional. Las tarjetas uruguayas pueden sumar impuestos a servicios digitales del
  exterior: consultarlo con un contador.
- **Ley 18.331 (protección de datos personales)**: hoy el server guarda una clave anónima, un nombre
  de jugador elegido y el progreso; con el login de Google van a aparecer **emails**, que sí son datos
  personales. Para la ley, **Argentina** y la Unión Europea son países "adecuados"; **Brasil y Chile
  no** están en la lista de la URCDP, y EE.UU. sólo para empresas adheridas al *Data Privacy
  Framework* (AWS, Google, Microsoft, Oracle y Akamai lo están). Guardar datos en São Paulo o Santiago
  es una **transferencia internacional**: se resuelve con las cláusulas contractuales tipo de la URCDP
  (Res. 41/2021, que los proveedores grandes suelen cubrir con su contrato de tratamiento de datos) o
  con el consentimiento del jugador en los términos. Además, las bases con datos personales se
  **inscriben** ante la URCDP. Alojar en Uruguay evita la transferencia. No es asesoramiento legal:
  revisarlo con alguien del tema antes de abrir el login.

## Recomendación concreta

1. **Para arrancar (prueba con amigos, ≤ 50):** **Akamai/Linode São Paulo, Linode 2 GB**
   (US$ 16,80/mes, 1 vCPU, 2 GB, 2 TB) o **Vultr Santiago/São Paulo** en el plan equivalente. Con 2
   GB se compila en la VPS sin problemas. Alternativa gratis para probar: Oracle Always Free en São
   Paulo o Santiago (si hay capacidad).
2. **Abierto al público (≤ 200):** **Linode 4 GB en São Paulo** (US$ 33,60/mes, 2 vCPU, 4 TB) o el
   plan 2 vCPU / 4 GB de Vultr en la región que haya dado mejor ping. Cubre el tráfico del escalón con
   margen y el excedente es casi gratis.
3. **Cliente:** Vercel, con las funciones en `gru1`.
4. **Backup:** snapshot diario del proveedor + copia de `players.json` a otro lado (puede ser un
   bucket barato en cualquier región: ahí la latencia no importa).

**Cuándo escalar** (mirando `/health/full`):

| Señal | Qué hacer |
| --- | --- |
| `ticks.players.avgMs` > 5 ms o avisos `[Métricas]` seguidos | Pasar a vCPU dedicada / más rápida (mismo proveedor, mismo tamaño o uno más) |
| `memoryMb.rss` > 60 % de la RAM | Subir al plan siguiente |
| `store.lastFlush` > 50 ms (≈ 5.000–10.000 jugadores guardados) | Sacar el progreso del JSON: SQLite en la misma VPS o Postgres gestionado en la misma región |
| Transferencia del mes > 70 % de lo incluido | Plan más grande o `setPatchRate(100)` (pendiente en `escalabilidad-servidor.md`) |
| > ~1.000 simultáneos sostenidos | 4 vCPU dedicadas y 8 GB; después, varios procesos + Redis, en la **misma región** |
| Muchos jugadores de ANTEL y ping a São Paulo > 50 ms en casa | Probar una VPS en Uruguay (Antel Pando) para ellos |

## Cómo medir antes de decidir

1. **Ping y ruta desde conexiones reales**, no desde un datacenter: fibra ANTEL, ADSL, y celular
   Antel, Claro y Movistar (4G). Contra la VPS de prueba de cada región (o contra las IP de prueba
   que publican los proveedores, p. ej. los "looking glass" de Vultr y Linode):

   ```bash
   # 100 pings: mirar promedio y, sobre todo, el máximo y la variación (mdev)
   ping -c 100 <ip>
   # ruta salto a salto con pérdidas (en macOS: brew install mtr)
   mtr --report --report-cycles 100 <ip>
   ```

   Anotar en una tabla: operador, tipo de conexión, región, promedio, p95, pérdida. Elegir la región
   con mejor **p95** para la mayoría (ANTEL fibra + los tres móviles), no el mejor promedio de uno.
2. **Probar el juego**: levantar el server en la VPS candidata, jugar desde el celular por 4G y
   fijarse si sentarse, abrir una tienda o pescar se sienten inmediatos.
3. **Prueba de carga con bots** (como las de `escalabilidad-servidor.md`): 80, 200 y 500 bots
   caminando desde **otra** máquina, mirando `/health/full` (`ticks`, `memoryMb`, `cities`) y el `top` de la
   VPS. Si con el doble del pico esperado los ticks siguen < 5 ms de promedio, el plan alcanza.
4. **Transferencia real**: después de una semana abierta, comparar el contador de tráfico del
   proveedor con la tabla de "Tráfico estimado" y ajustar el plan.

## Fuentes

- Mediciones del server: `docs/finished/escalabilidad-servidor.md` y medición de patches con
  `@colyseus/schema` 3.0.76 (script aparte, octubre 2026).
- Latencias desde Montevideo: [WonderNetwork – Ping Times from Montevideo](https://wondernetwork.com/pings/Montevideo)
- Akamai/Linode São Paulo: [Akamai Cloud pricing – São Paulo](https://www.akamai.com/cloud/pricing/sao-paulo)
- Vultr: [Vultr – Santiago, Chile](https://blogs.vultr.com/Vultr-announces-new-cloud-data-center-location-in-Santiago-Chile),
  [Vultr Regular Performance](https://www.vultr.com/products/regular-performance-compute/),
  [precio reportado en São Paulo (whtop)](https://www.whtop.com/amp/plans/vultr.com/137611),
  [Cloud Mercato – VC2 2 vCPU 4 GB](https://pcr.cloud-mercato.com/providers/vultr/flavors/vc2-2c-4gb/pricing)
- AWS: [Lightsail llega a São Paulo (junio 2026)](https://aws.amazon.com/pt/about-aws/whats-new/2026/06/amazon-lightsail-aws-regions/),
  [Lightsail pricing](https://aws.amazon.com/ko/lightsail/pricing/),
  [Local Zones disponibles](https://docs.aws.amazon.com/local-zones/latest/ug/available-local-zones.html),
  [Local Zone Buenos Aires (aws-pricing.com)](https://aws-pricing.com/us-east-1-bue-1.html),
  [región de AWS en Chile](https://press.aboutamazon.com/aws/2025/5/amazon-to-invest-more-than-4-billion-to-launch-infrastructure-region-in-chile)
- Oracle: [Regiones de nube pública](https://www.oracle.com/es/cloud/cloud-regions/),
  [Oracle Cloud Free Tier](https://developer.oracle.com/free.html)
- Google Cloud: [southamerica-west1 (Santiago)](https://cloudprice.net/gcp/regions/southamerica-west1),
  [datacenter de Google en Uruguay](https://blog.google/intl/es-419/noticias-de-la-empresa/de-google/un-nuevo-centro-de-datos-en-america-latina/)
- Azure: [Microsoft lanza la región Chile Central](https://www.datacenterdynamics.com/en/news/microsoft-launches-chile-cloud-region/)
- Magalu Cloud: [Forbes Brasil – lanzamiento](https://forbes.com.br/forbes-tech/2023/12/magazine-luiza-lanca-servico-de-nuvem-com-promessa-de-precos-mais-acessiveis/)
- Hosting en Uruguay: [ANTEL Data Center Pando (datacentermap)](https://www.datacentermap.com/uruguay/montevideo/antel-pando/specs/),
  [Antel inaugura la Fase III de Pando](https://www.convergencialatina.com/News-Detail/318810-3-8-Antel_inaugurates_Phase_III_of_the_Pando_Data_Center_with_a_US_12_million_investment_?Lang=EN),
  [OWN.TN – VPS en Uruguay](https://builtbybit.com/threads/own-tn-offshore-servers-in-uruguay-and-kazakhstan-host-your-game-server.720008/)
- Cables: [Tannat llega a Argentina](https://www.montevideo.com.uy/Negocios-y-Tendencias/El-cable-submarino-Tannat-llega-a-Argentina-uc772126),
  [Tannat operativo (TeleSemana)](https://www.telesemana.com/blog/2021/04/22/tannat-cable-que-conecta-argentina-con-brasil-ya-esta-operativo/)
- Vercel: [Global network and regions](https://vercel.com/docs/regions),
  [Regional pricing – gru1](https://vercel.com/docs/pricing/regional-pricing/gru1)
- Datos personales: [URCDP – Res. 41/2021, cláusulas contractuales](https://www.gub.uy/unidad-reguladora-control-datos-personales/sites/unidad-reguladora-control-datos-personales/files/2021-09/Res%2041-2021%20Cl%C3%A1usulas%20contractuales%20-Transferencias%20Internacionales.pdf),
  [países adecuados y transferencias (abogados.com.ar)](https://abogados.com.ar/datos-personales-novedades-en-materia-de-transferencia-internacional-de-datos/34131),
  [Deloitte Uruguay – transferencia internacional](https://www2.deloitte.com/content/dam/Deloitte/uy/Documents/legal/Novedades%20vinculadas%20a%20la%20transferencia%20internacional%20de%20datos.pdf)
