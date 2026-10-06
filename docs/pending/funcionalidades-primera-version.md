# Funcionalidades para la primera versión pública

**Fecha:** 2026-10-03 · **Actualizado:** 2026-10-05

> **Cambios desde la primera versión del doc (2026-10-05):** se sumó el **Centro** (18 de Julio, al
> que se llega caminando desde Ciudad Vieja por un arco, sin boleto) con la **música en la calle**
> como actividad (instrumentos, público que se arrima, comparsa, clima), el **casino** Victoria
> Plaza, el **clima**, los **gestos**, la **guía de bienvenida** y el **calendario**. **Tres Cruces y
> el Barrio de los Judíos están ocultos por ahora** (`CityInfo.hidden`): con ellos quedan cerrados la
> venta con carrito en el Centenario, los partidos y la guardia del sanatorio (no se movieron a otro
> barrio; vuelven cuando se reabran). La landing se rehízo con capturas del juego actual.

**Resumen:** el juego ya tiene una base jugable sólida (Ciudad Vieja y el Centro, pesca, música en la
calle, tiendas, casino, intercambio, mascotas, necesidades, clima, gestos, picudos, cárcel), pero le faltan las cosas que hacen que alguien
**vuelva al otro día**: identidad social (las **barras**, tu idea de familias/clanes), algo que
hacer todos los días (**changas**), una forma de compararse (**rankings**), una bienvenida que
explique el juego, y lo mínimo para convivir en público (**amigos, reportes**). Abajo está qué hay
hoy, qué propongo y en qué orden, con el criterio de siempre: **que todo sea bien de Montevideo**.
Las prioridades son una propuesta para discutir; los esfuerzos son estimaciones (S = días, M = una
o dos semanas, L = más).

> Varias cosas dependen de tener **cuentas** (Supabase + Google,
> [`supabase-base-de-datos-y-auth.md`](./supabase-base-de-datos-y-auth.md)): sin cuenta no hay
> "mis amigos", "mi barra" ni rankings confiables. Por eso las cuentas encabezan la lista aunque no
> sean una funcionalidad "de juego".

## 1. Lo que ya tiene el jugador

| Área | Qué hay |
| --- | --- |
| Barrios | **Ciudad Vieja** (entrada) y el **Centro**, unidos a pie por 18 de Julio (el arco, sin boleto); el COMCAR (de visita o preso) en ómnibus; el Hotel del Donador y el Casino, por la puerta de su edificio. Tres Cruces y el Barrio de los Judíos, ocultos por ahora |
| Moverse | Clic o WASD, cámara fija/libre, F para interactuar, bancos, paradas, el arco de 18 de Julio |
| Ganar plata | Pescar en la Escollera Sarandí (4 cañas), **tocar en la calle** en 18 de Julio y sus plazas (4 instrumentos; el público y la comparsa dejan más), patear picudos, vender en tiendas y regatear, el casino. (La venta con carrito en el Centenario queda cerrada con Tres Cruces) |
| Gastar | Ropa (ropería, zapatería, sombrerería, la línea de London París), comida, remedios, cañas, instrumentos, mascotas, boletos, el casino |
| Personaje | Aspecto al entrar, ropa, energía / hambre / salud, mascota con nombre, distintivo de donador, **gestos** (tecla E) |
| Social | Chat con globos, `/mensaje` privado, saludar, gestos de a dos, burlarse de presos, intercambio seguro, lista de jugadores del barrio, bloquear, la comparsa al tocar juntos |
| Ambiente | Día y noche, **clima** (lluvia, pampero, calor) que cambia la pesca y la música, **calendario** de Uruguay (tecla K), anuncios del admin, **guía de bienvenida** |

**Lo que no hay:** grupos o clanes, amigos, objetivos diarios, logros, rankings, sonido, eventos que
cambien el mapa por fecha, una forma de comerciar entre jugadores fuera del intercambio cara a cara.
Para hacer en grupo sólo está la comparsa de la música.

## 2. Imprescindibles para salir (P0)

### 2.1 Cuentas, nombre propio y progreso en la nube — L (ya planificado)

Sin esto, borrar los datos del navegador es perder todo, no hay forma de tener "mi barra" o "mis
amigos", y el admin sigue saliendo del nombre (C1 de seguridad). Plan completo en
[`supabase-base-de-datos-y-auth.md`](./supabase-base-de-datos-y-auth.md). Todo lo que sigue se apoya
en el `user_id` de la cuenta.

### 2.2 Barras (clanes) — M

> ✅ **Etapa 1 hecha (2026-10-06, ver `.claude/rules/barras.md`)**, sin esperar a las cuentas: se
> guardan en un JSON detrás de una interfaz (`BarraRepository`), por `playerId`, para migrar a
> Supabase después. Se fundan en el **Registro de Barras** (casona sobre la peatonal Sarandí) por
> **$1.000**: nombre, sigla, dos colores, la sigla sobre el avatar, invitar (el fundador), aceptar,
> irse o disolver, `/barra` y el panel **Mi barra** (tecla B). Falta la etapa 2 (roles, pasar el
> mando, mensaje del día, admin) y la 3 (bonus de comparsa de barra, rankings).

Tu idea de "equipos/familia". En Montevideo el grupo de amigos es **"la barra"** (la barra de la
esquina, la del liceo, la del club): el nombre ya es local y suena natural en el chat ("¿de qué barra
sos?").

**Cómo se juega:**

- **Fundarla:** en un lugar concreto, como un trámite: la **Intendencia** (o un "Registro de Barras"
  en Ciudad Vieja, sobre 18 de Julio o la Plaza Independencia). Cuesta plata (p. ej. $500: hace que
  sea un logro y saca plata de la economía) y pide un nombre y una **sigla** de 2 a 4 letras
  (`[LCDP]`), únicos.
- **Se ve:** debajo del nombre del jugador, en chiquito y con el color de la barra (`[LCDP] La Barra
  del Pancho`); también en la lista de jugadores (Tab) y en el menú al hacerle clic.
- **Colores:** el fundador elige dos colores (como una camiseta de club de barrio). Más adelante
  pueden salir **camisetas de la barra** en la ropería.
- **Roles:** **Fundador** (uno; puede pasarle el mando a otro), **Segundos** (invitan y echan) y
  **Integrantes**. Tope de integrantes (p. ej. 30) para que haya muchas barras y no una gigante.
- **Entrar:** por invitación desde el menú del jugador ("Invitar a mi barra") o pidiendo entrar; una
  barra por jugador. Salir cuando quieras; el fundador no puede irse sin pasar el mando o disolverla.
- **Chat de barra:** `/barra <texto>` (o una pestaña en el chat) que llega a todos los conectados de
  la barra, estén en el barrio que estén (como `/mensaje`, por `playerDirectory`).
- **Panel de la barra:** integrantes, quién está conectado y en qué barrio, roles, fecha de
  fundación, un "mensaje del día" que pone el fundador.
- **Después (P1/P2):** sede propia en un barrio, plata común ("la vaquita"), ranking de barras por
  lo que pescan y venden entre todos, desafíos entre barras (la que más picudos patea en una semana).

**Encaje técnico:**

- Tablas `barras` (id, nombre, sigla, colores, fundador, mensaje, fecha) e integrantes (`user_id`,
  `barra_id`, rol) en Supabase; nombre y sigla validados con `sanitizeName` + `nameKey` contra los ya
  usados y los reservados (como los nombres de jugador).
- En el Schema, `Player` suma `barraTag` y `barraColor` (lo ve todo el barrio, como `donor`); el
  resto (integrantes, roles) se pide por mensaje al abrir el panel.
- Mensajes nuevos: `barra:create`, `barra:invite`, `barra:respond`, `barra:leave`, `barra:kick`,
  `barra:promote`, `barra:chat` (receta `recetas`); todo validado en el server, con el límite de
  frecuencia.
- Moderación: el admin puede renombrar o disolver una barra; las siglas pasan por los nombres
  reservados (nada de `[ADM]` o `[MOD]`).

### 2.3 Primeros pasos: "Bienvenido a Montevideo" — S/M ✅ hecho (2026-10-04, ver `.claude/rules/primeros-pasos.md`)

Hoy el jugador cae en la Plaza Independencia con $100 y una caña, y tiene que descubrir todo solo.
Una guía corta, con cartelitos y una flecha en el mapa, que lo lleve por lo que hace único al juego:

1. Caminar hasta el Monumento a Artigas.
2. Comprarse una torta frita en el kiosco de la plaza y comerla.
3. Ir a la Escollera Sarandí y sacar un pescado.
4. Venderlo en el Mercado del Puerto.
5. Comprar un boleto STM y tomarse el ómnibus a otro barrio.

Cada paso da un poco de plata y al terminar, una prenda de regalo (p. ej. una gorra celeste). Se
puede saltear. Encaja como un caso particular de las changas (2.4).

### 2.4 Changas del día — M

Objetivos que cambian todos los días, para tener algo que hacer al entrar:

- "Sacá 5 pejerreyes en la escollera", "tocá 5 temas en 18 de Julio", "pateá 3 picudos", "comprá
  algo en London París", "tomate un chivito en el Café Facal", "sentate a tomar mate en la Plaza
  Cagancha".
- Tres por día (una fácil, una media y una difícil), con premio en plata y alguna caja sorpresa. Se
  renuevan a medianoche (hora de Uruguay).
- Una **racha** por días seguidos jugados ("vas 4 días seguidos") con un premio que sube.

**Encaje técnico:** la mayoría se cuentan con eventos que el server ya tiene (`finishAttempt` de la
pesca y de la música, `weevil:kick`, `shop:buy`); se guarda por cuenta (progreso y fecha). Cuidar el balance:
el aviso `[Balance]` tiene que seguir limpio (las changas son un extra, no una fuente principal).

### 2.5 Amigos — S/M

- "Agregar a amigos" desde el menú del jugador; el otro acepta.
- Lista de amigos con quién está conectado y **en qué barrio** (con un botón para ir, si tenés boleto).
- Aviso cuando un amigo se conecta. `/mensaje` a un amigo desconectado queda guardado y le llega al
  entrar (hoy sólo anda con conectados).

### 2.6 Reportar y moderación básica — S

Para abrir al público hace falta que un jugador pueda **reportar** a otro (insultos, estafas en el
intercambio) desde su menú, con el último tramo del chat adjunto, y que el admin tenga una lista de
reportes. Hoy existen bloquear (en el cliente), `/silenciar` y `/ban`; falta el reporte, que con
cuentas queda guardado (`0002_bans_y_auditoria.sql` del plan de Supabase).

### 2.7 Rankings — S

"Los más pescadores de la semana", "los que más vendieron en el Centenario", "los más ricos", "el
pez más raro del mes" (y quién lo sacó). Un panel con el top 10 y tu puesto, y los tres primeros con
un distintivo durante la semana. Más adelante, ranking de barras. Se calcula en la base, no en la sala.

### 2.8 Más cosas para hacer en grupo — M

> Primera parte hecha (2026-10-05): al **tocar en la calle**, los jugadores que escuchan cerca suman
> propina y los que tocan a la vez arman la **comparsa** (ver `.claude/rules/pesca-y-venta.md`).

Fuera de la música, todo se hace solo. Otras actividades que pidan juntarse, por ejemplo:

- **Pesca de a dos en la escollera:** si hay amigos o compañeros de barra pescando al lado, sube un
  poco la chance de pez raro.
- **Comparsa de la barra**: un bonus extra si los que tocan juntos en 18 de Julio son de la misma barra.

Así las barras (2.2) tienen sentido desde el primer día.

### 2.9 Gestos y expresiones — S ✅ hecho (2026-10-05, ver `.claude/rules/gestos.md`; tecla E)

Hoy el avatar sólo camina, se sienta, pesca y patea. Gestos que se activan con una tecla o desde un
menú, y que ven todos: **tomar mate** (con el termo bajo el brazo), **bailar candombe**, **festejar
un gol**, **saludar con la mano**, **aplaudir**, **hacer "la seña" de pedir silencio en el ómnibus**.
Barato de hacer (una animación del `Avatar` + un campo en el Schema) y le da mucha vida a la plaza.

### 2.10 Sonido — S/M

No hay ningún sonido. Con poco alcanza para que se sienta Montevideo: **gaviotas y olas** en la
rambla y la escollera, el **murmullo y los ómnibus** de 18 de Julio, **lo que toca cada músico**
(armónica, guitarra, bandoneón, tambor) con los aplausos y las monedas en el estuche, un
**tamboril** de fondo de vez en cuando, el "¡plaf!" del picudo, la caja registradora al comprar. Con un botón para
silenciar (recordado en el navegador) y apagado por defecto en celulares.

## 3. Muy recomendables (P1)

### 3.1 Feria de Tristán Narvaja (domingos) — M

La feria de los domingos en el Cordón como **mercado entre jugadores**: cada jugador arma su puesto
(una manta en la calle Tristán Narvaja) con cosas de su mochila y un precio, y los demás pasan y
compran aunque el dueño no esté mirando. Es lo que hoy falta para comerciar sin tener que coordinar
un intercambio cara a cara. Abre sólo los domingos (del juego o reales). Necesita un barrio o una
calle nueva (Cordón) y que el server guarde los puestos.

### 3.2 Calendario de eventos uruguayos — M (cada uno S)

> ✅ Primera parte hecha (2026-10-05, ver `.claude/rules/calendario.md`): panel **Calendario** (tecla K)
> con los feriados y fechas reales de Uruguay. Falta lo de abajo: que cada fecha cambie el mapa y dé
> premios.

Fechas que cambian el mapa por unos días y dan ropa o premios únicos:

- **Carnaval** (febrero): **Desfile de Llamadas** por Barrio Sur y Palermo (comparsas de candombe
  recorriendo la calle), **tablados** con murga. Ropa de carnaval y tamboriles.
- **Semana de Turismo** (Semana Criolla en el Prado): jineteadas para mirar, tortas fritas a mitad de
  precio.
- **Noche de la Nostalgia** (24 de agosto): música de los 70–80, ropa retro.
- **Día del Patrimonio** (octubre): los edificios emblemáticos se pueden "visitar" y dan un dato
  histórico + una insignia.
- **Fin de año**: fuegos artificiales sobre la rambla y los "papelitos" de las oficinas en Ciudad
  Vieja el 31 al mediodía.
- **Clásico** Nacional–Peñarol: existe en el Centenario (cerrado con Tres Cruces); al reabrirlo,
  sumarle una previa con banderazos.

### 3.3 Barrios nuevos — L (cada uno M)

> ✅ El **Centro** está hecho (2026-10-05, ver `.claude/rules/barrios.md`): se llega caminando desde
> Ciudad Vieja por 18 de Julio. Tres Cruces y el Barrio de los Judíos están hechos pero **ocultos**
> por ahora; reabrirlos es sacar `hidden: true` de su `info.ts`.

Por orden de lo que aportan al juego (los que limitan con el Centro o la Ciudad Vieja se pueden unir
a pie, como 18 de Julio):

1. **Barrio Sur y Palermo** (al sur del Centro y la Ciudad Vieja, a pie): cuna del candombe (las
   Llamadas, los conventillos como Mediomundo, las cuerdas de tambores los domingos). Le da sentido
   al tambor de la música en la calle y prepara el Carnaval (3.2).
2. **Cordón** (al este del Centro, siguiendo 18 de Julio, a pie): la Feria de Tristán Narvaja (3.1)
   y la Universidad.
3. **Pocitos y la rambla** (playa): bañarse en verano, pesca desde la rambla, venta de helados y
   bizcochos en la arena, los edificios frente al mar.
4. **El Prado**: la Rural del Prado y la Semana Criolla.
5. **El Cerro**: la Fortaleza, la vista de la bahía, pesca desde la escollera del Cerro.

### 3.4 Logros e insignias — S/M

"Sacaste una corvina negra", "visitaste todos los barrios", "10 clásicos vendiendo", "pateaste 100
picudos", "estuviste preso" (con humor). Se muestran en el perfil y algunos dan un título debajo del
nombre (que convive con la sigla de la barra).

### 3.5 Clima — S ✅ hecho (2026-10-03, ver `.claude/rules/clima.md`)

**Lluvia** (menos gente en la calle: menos ventas, pero pican más), **viento pampero** (más difícil
pescar), **calor de enero** (más hambre, más venta de refrescos). Se ve en el cielo y en el piso
mojado, y lo comparten todos los barrios como la hora.

### 3.6 Ropa con identidad uruguaya — S

Camiseta celeste (ya está), **camisetas tricolor y aurinegra** (sin escudos ni marcas, sólo
colores), **sombrero de gaucho**, **boina vasca**, **poncho**, **campera de cuero**, **gorro de
murga**, la **túnica blanca con moña azul** de escuela pública. Cada evento (3.2) puede traer la suya.

### 3.7 Perfil del jugador — S

Al hacerle clic a alguien, ver su perfil: barra, logros, mascota, cuántos días juega, su pez más
raro. Hoy el menú sólo deja saludar e intercambiar.

## 4. Para más adelante (P2)

- **Truco** en un boliche (mesas de a 2 o 4, con apuestas chicas de plata del juego): el juego de
  cartas uruguayo por excelencia. Necesita su propia lógica de partida, pero engancha mucho.
- **Casa propia** al estilo Habbo: un apartamento en un edificio del Centro o una casa colonial en
  Ciudad Vieja para decorar con muebles.
- **Fútbol 5** en una canchita de barrio: partidos cortos entre barras.
- **Murga** de la barra para el Carnaval (elegir letra y vestuario, competir en el tablado).
- **Más changas de oficio**: repartidor (cadete) entre las tiendas del Centro, lustrabotas en la
  Plaza Cagancha, cuidacoches, canillita en 18 de Julio.
- **Banco** (BROU) para guardar plata y préstamos chicos; cajeros en cada barrio.
- **Mascotas que hacen algo**: el perro avisa cuando pica, el gato espanta picudos.

## 5. Orden sugerido

Hecho: primeros pasos, gestos, clima, calendario (la parte del panel), el Centro y la música en la
calle (con la primera actividad en grupo).

| # | Qué | Prioridad | Esfuerzo | Depende de |
| --- | --- | --- | --- | --- |
| 1 | Cuentas y progreso en la nube | P0 | L | — (plan Supabase) |
| 2 | Sonido | P0 | S/M | — |
| 3 | Changas del día + racha | P0 | M | 1 (para guardarlas por cuenta) |
| 4 | Barras: etapa 2 (roles, mando, admin) y 3 (comparsa, rankings) — la 1 ya está | P0 | M | 1 (para migrarlas) |
| 5 | Amigos | P0 | S/M | 1 |
| 6 | Reportes | P0 | S | 1 |
| 7 | Rankings | P0 | S | 1 |
| 8 | Más actividades en grupo (comparsa de barra, pesca de a dos) | P0 | M | 4 o 5 |
| 9 | Perfil, logros, ropa uruguaya | P1 | S cada uno | 1 (logros) |
| 10 | Barrio Sur y Palermo (a pie) + Carnaval con las Llamadas | P1 | M + M | — |
| 11 | Cordón (a pie) + Feria de Tristán Narvaja | P1 | M | 1 (la feria) |
| 12 | Reabrir Tres Cruces y el Barrio de los Judíos (con la venta, los partidos y la guardia) | P1 | S | — |
| 13 | Pocitos y la rambla | P1 | L | — |
| 14 | Truco, casa propia, fútbol 5, murga, banco | P2 | L | 1 |

**Por dónde arrancar sin esperar a las cuentas:** el **sonido** (2) y los **barrios nuevos a pie**
(10), que no necesitan Supabase. Las barras, los amigos y las changas conviene hacerlas **después**
de las cuentas: si se hacen sobre la clave del navegador, hay que migrarlas.

## 6. Cuidados que valen para todo

- **Balance:** cada fuente nueva de plata (changas, eventos, rankings) tiene que pasar por el aviso
  `[Balance]` y no superar a pescar o vender. Cada cosa nueva para gastar (fundar una barra, ropa de
  evento) ayuda a que la plata no se infle.
- **Nombres de jugadores:** las barras, los puestos de la feria y los títulos pasan por la misma
  limpieza que los nombres (`sanitizeName`, `nameKey`, reservados) y se pueden reportar.
- **Marcas y escudos:** usar colores, no escudos de clubes, logos de empresas ni nombres de comercios
  reales (como con "Moda Coreana" en vez del nombre de un local).
- **Celulares:** todo panel nuevo sigue las reglas de `apps/client/src/CLAUDE.md` (botones de ~40 px,
  nada que dependa sólo de una tecla o del hover).
