// Primero: carga apps/server/.env antes de que otros módulos lean process.env.
import { adminName, allowAnyOrigin, allowedOrigins, dayLengthMinutes, healthToken, isOriginAllowed } from "./env";
import { createHash, timingSafeEqual } from "node:crypto";
import http from "node:http";
import cors, { CorsOptions } from "cors";
import express from "express";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { Encoder } from "@colyseus/schema";
import {
  CARTS,
  INSTRUMENTS,
  DEFAULT_PORT,
  MAX_FOOD_SHARE,
  RODS,
  ROOM_NAME,
  WEATHERS,
  cartInWeather,
  instrumentInWeather,
  foodCostPerHour,
  foodTooExpensiveFor,
  formatMoney,
  formatPercent,
  hourlyIncome,
  lifetimeValue,
  rodInWeather,
  unprofitableTools,
} from "@montevideo-world/shared";
import { liveRooms, tickMetrics } from "./metrics";
import { barraStore } from "./barraStore";
import { playerStore, travelTickets } from "./playerStore";
import { CityRoom, saveEveryone } from "./rooms/CityRoom";

// Buffer de cada sala para codificar el estado: el de fábrica (8 KB) no alcanza con más de ~55
// jugadores en una sala (de tope son `MAX_PLAYERS_PER_ROOM`) y, al desbordar, Colyseus agranda y
// vuelve a codificar todo en cada entrada. Tiene que estar antes de crear cualquier sala.
Encoder.BUFFER_SIZE = 32 * 1024;

// Cañas, carritos e instrumentos se gastan: cada uno tiene que dejar más plata de lo que cuesta. Si alguien toca
// precios, usos o probabilidades y uno deja de ser rentable, se avisa al arrancar.
for (const tool of unprofitableTools()) {
  console.warn(
    `[Balance] ${tool.name} no es rentable: deja ~${formatMoney(Math.floor(lifetimeValue(tool)))} en ${tool.maxUses} usos y cuesta ${formatMoney(tool.price)}.`,
  );
}
// Comer tiene que costar una parte chica de lo que se gana: con ninguna herramienta la comida de una
// hora de trabajo puede pasar de MAX_FOOD_SHARE de lo que deja (ver `needsBalance.ts`).
// Se mide con el clima que más hambre da (el calor): es el peor caso.
const worstHunger = Math.max(...Object.values(WEATHERS).map((weather) => weather.hungerFactor));
for (const { tool, share } of foodTooExpensiveFor(worstHunger)) {
  console.warn(
    `[Balance] Con ${tool.name} comer se lleva ${formatPercent(share)} de lo que se gana (máximo ${formatPercent(MAX_FOOD_SHARE)}): ~${formatMoney(Math.round(foodCostPerHour(worstHunger)))}/h de comida contra ~${formatMoney(Math.round(hourlyIncome(tool)))}/h.`,
  );
}
// El clima empeora la pesca (pampero) o la venta y la música (lluvia): con cualquiera, cada herramienta se tiene que seguir pagando sola.
for (const weather of Object.values(WEATHERS)) {
  for (const tool of [
    ...RODS.map((rod) => rodInWeather(rod, weather)),
    ...CARTS.map((cart) => cartInWeather(cart, weather)),
    ...INSTRUMENTS.map((instrument) => instrumentInWeather(instrument, weather)),
  ]) {
    if (lifetimeValue(tool) > tool.price) continue;
    console.warn(
      `[Balance] Con ${weather.name.toLowerCase()}, ${tool.name} no es rentable: deja ~${formatMoney(Math.floor(lifetimeValue(tool)))} en ${tool.maxUses} usos y cuesta ${formatMoney(tool.price)}.`,
    );
  }
}

const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

const PORT = Number(process.env.PORT ?? DEFAULT_PORT);
// En producción, sólo la propia máquina (atrás de Caddy): si alguien arranca el server a mano sin
// PM2, el 2567 no queda expuesto sin TLS. En desarrollo, toda la red (para probar desde otras compus).
const HOST = process.env.HOST ?? (process.env.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0");

if (process.env.NODE_ENV === "production" && allowAnyOrigin) {
  console.warn(
    "[Seguridad] CORS_ORIGIN no está fijado (o es *): cualquier página puede usar el server. Poné los dominios del juego en el .env.",
  );
}

// `credentials: true` no es por cookies (no hay): colyseus.js pide el matchmaking siempre con
// `withCredentials`, y sin este header el navegador lo bloquea. Por eso el origen se refleja sólo si
// está en la lista (nunca `*`).
const corsOptions: CorsOptions = {
  origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
  credentials: true,
};

const app = express();
app.disable("x-powered-by");
app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (_req, res) => {
  res.type("text/plain").send("Montevideo World server OK");
});

// Público: sólo si el server está vivo (para el chequeo externo). El detalle no: le servía a quien
// ataca para medir su efecto en vivo y sacar los `roomId` de cada copia.
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// Estado y métricas: salas (barrio, copia, jugadores, picudos), duración de los ticks en una
// ventana reciente (todas las salas juntas) y la última escritura del archivo de jugadores.
// Sólo desde la misma máquina o con `HEALTH_TOKEN` (ver `canSeeHealthDetail`).
app.get("/health/full", async (req, res) => {
  if (!canSeeHealthDetail(req)) {
    res.status(404).end();
    return;
  }
  const rooms = await matchMaker.query({ name: ROOM_NAME });
  const memory = process.memoryUsage();
  res.json({
    ok: true,
    uptime: process.uptime(),
    rooms: rooms.length,
    players: rooms.reduce((total, room) => total + room.clients, 0),
    cities: [...liveRooms].map((room) => room.stats()),
    ticks: { players: tickMetrics.players.summary(), weevils: tickMetrics.weevils.summary() },
    store: { players: playerStore.size, lastFlush: playerStore.lastFlush, travelTickets: travelTickets.size },
    memoryMb: { rss: Math.round(memory.rss / 1048576), heapUsed: Math.round(memory.heapUsed / 1048576) },
  });
});

/**
 * ¿Puede ver el detalle de salud? Desde la misma máquina sin pasar por un proxy (Caddy siempre manda
 * `X-Real-IP`/`X-Forwarded-For`, así que lo que llega de afuera nunca cuenta como local), o con
 * `Authorization: Bearer <HEALTH_TOKEN>`. Se responde 404 para no anunciar que existe.
 */
function canSeeHealthDetail(req: express.Request): boolean {
  const proxied = req.headers["x-real-ip"] !== undefined || req.headers["x-forwarded-for"] !== undefined;
  const address = req.socket.remoteAddress ?? "";
  if (!proxied && LOOPBACK_ADDRESSES.has(address)) return true;
  const token = healthToken();
  const header = req.headers.authorization ?? "";
  if (!token || !header.startsWith("Bearer ")) return false;
  const given = createHash("sha256").update(header.slice("Bearer ".length)).digest();
  return timingSafeEqual(given, createHash("sha256").update(token).digest());
}

// Los endpoints de matchmaking (/matchmake/*) los atiende Colyseus, no Express:
// se les aplica la misma política de CORS.
matchMaker.controller.getCorsHeaders = (req) => {
  const origin = req.headers.origin;
  return {
    "Access-Control-Allow-Origin": origin && isOriginAllowed(origin) ? origin : allowAnyOrigin ? "*" : "",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "2592000",
    Vary: "Origin",
  };
};

// El cliente sólo usa `joinOrCreate` y `joinById` (`lib/network.ts`): `create`, `join` y `reconnect`
// no se exponen (con `create` cualquiera abría una sala nueva por pedido).
matchMaker.controller.exposedMethods = ["joinOrCreate", "joinById"];

const httpServer = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define(ROOM_NAME, CityRoom).filterBy(["cityId"]);
// Al apagar (Ctrl+C, PM2, reinicio de `tsx watch`), Colyseus saca a todos (cada `onLeave` guarda)
// y después se escribe el archivo de jugadores.
gameServer.onShutdown(() => Promise.all([playerStore.flush(), barraStore.flush()]).then(() => undefined));

/** Tope para guardar antes de salir en un cierre de emergencia (si el disco no responde, se sale igual). */
const CRASH_FLUSH_TIMEOUT_MS = 5000;
let crashing = false;

/**
 * Último recurso si algo se escapa (los mensajes ya están protegidos en `CityRoom.route`, pero no
 * los timers): se guarda a todos los conectados, se escribe el archivo y se sale con error para que
 * PM2 levante el server limpio. Seguir corriendo después de un error así dejaría el estado a medias.
 */
function crash(kind: string, error: unknown) {
  console.error(`[Montevideo World] ${kind}: se guarda todo y se reinicia`, error);
  if (crashing) return;
  crashing = true;
  try {
    saveEveryone();
  } catch (saveError) {
    console.error("[Montevideo World] no se pudo guardar a los conectados", saveError);
  }
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, CRASH_FLUSH_TIMEOUT_MS).unref());
  void Promise.race([Promise.all([playerStore.flush(), barraStore.flush()]), timeout])
    .catch((flushError) => console.error("[Montevideo World] no se pudo escribir el archivo de jugadores", flushError))
    .finally(() => process.exit(1));
}
process.on("uncaughtException", (error) => crash("error sin atrapar", error));
process.on("unhandledRejection", (reason) => crash("promesa rechazada sin atrapar", reason));

gameServer.listen(PORT, HOST).then(() => {
  console.log(`[Montevideo World] escuchando en ws://${HOST}:${PORT} (CORS: ${allowAnyOrigin ? "*" : allowedOrigins.join(", ")})`);
  console.log(`[Montevideo World] admin: ${adminName() ?? "(ninguno; definí ADMIN_NAME en apps/server/.env)"}`);
  console.log(`[Montevideo World] un día del juego dura ${dayLengthMinutes()} minutos reales`);
});
