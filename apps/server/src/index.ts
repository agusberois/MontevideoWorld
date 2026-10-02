// Primero: carga apps/server/.env antes de que otros módulos lean process.env.
import { adminName, dayLengthMinutes } from "./env";
import http from "node:http";
import cors, { CorsOptions } from "cors";
import express from "express";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import {
  DEFAULT_PORT,
  MAX_FOOD_SHARE,
  ROOM_NAME,
  foodCostPerHour,
  foodTooExpensiveFor,
  formatMoney,
  formatPercent,
  hourlyIncome,
  lifetimeValue,
  unprofitableTools,
} from "@montevideo-world/shared";
import { liveRooms, tickMetrics } from "./metrics";
import { playerStore, travelTickets } from "./playerStore";
import { CityRoom } from "./rooms/CityRoom";

// Cañas y carritos se gastan: cada uno tiene que dejar más plata de lo que cuesta. Si alguien toca
// precios, usos o probabilidades y uno deja de ser rentable, se avisa al arrancar.
for (const tool of unprofitableTools()) {
  console.warn(
    `[Balance] ${tool.name} no es rentable: deja ~${formatMoney(Math.floor(lifetimeValue(tool)))} en ${tool.maxUses} usos y cuesta ${formatMoney(tool.price)}.`,
  );
}
// Comer tiene que costar una parte chica de lo que se gana: con ninguna herramienta la comida de una
// hora de trabajo puede pasar de MAX_FOOD_SHARE de lo que deja (ver `needsBalance.ts`).
for (const { tool, share } of foodTooExpensiveFor()) {
  console.warn(
    `[Balance] Con ${tool.name} comer se lleva ${formatPercent(share)} de lo que se gana (máximo ${formatPercent(MAX_FOOD_SHARE)}): ~${formatMoney(Math.round(foodCostPerHour()))}/h de comida contra ~${formatMoney(Math.round(hourlyIncome(tool)))}/h.`,
  );
}

const PORT = Number(process.env.PORT ?? DEFAULT_PORT);
const HOST = process.env.HOST ?? "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";

const allowedOrigins = CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAll = allowedOrigins.length === 0 || allowedOrigins.includes("*");

function isOriginAllowed(origin: string | undefined) {
  return allowAll || !origin || allowedOrigins.includes(origin);
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (_req, res) => {
  res.type("text/plain").send("Montevideo World server OK");
});

// Estado y métricas: salas (barrio, copia, jugadores, picudos), duración de los ticks en una
// ventana reciente (todas las salas juntas) y la última escritura del archivo de jugadores.
app.get("/health", async (_req, res) => {
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

// Los endpoints de matchmaking (/matchmake/*) los atiende Colyseus, no Express:
// se les aplica la misma política de CORS.
matchMaker.controller.getCorsHeaders = (req) => {
  const origin = req.headers.origin;
  return {
    "Access-Control-Allow-Origin": origin && isOriginAllowed(origin) ? origin : allowAll ? "*" : "",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "2592000",
    Vary: "Origin",
  };
};

const httpServer = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define(ROOM_NAME, CityRoom).filterBy(["cityId"]);
// Al apagar (Ctrl+C, PM2, reinicio de `tsx watch`), Colyseus saca a todos (cada `onLeave` guarda)
// y después se escribe el archivo de jugadores.
gameServer.onShutdown(() => playerStore.flush());

gameServer.listen(PORT, HOST).then(() => {
  console.log(`[Montevideo World] escuchando en ws://${HOST}:${PORT} (CORS: ${allowAll ? "*" : allowedOrigins.join(", ")})`);
  console.log(`[Montevideo World] admin: ${adminName() ?? "(ninguno; definí ADMIN_NAME en apps/server/.env)"}`);
  console.log(`[Montevideo World] un día del juego dura ${dayLengthMinutes()} minutos reales`);
});
