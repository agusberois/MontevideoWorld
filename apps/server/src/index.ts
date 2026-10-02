// Primero: carga apps/server/.env antes de que otros módulos lean process.env.
import { adminName, dayLengthMinutes } from "./env";
import http from "node:http";
import cors, { CorsOptions } from "cors";
import express from "express";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { DEFAULT_PORT, ROOM_NAME, formatMoney, lifetimeValue, unprofitableTools } from "@montevideo-world/shared";
import { playerStore } from "./playerStore";
import { CityRoom } from "./rooms/CityRoom";

// Cañas y carritos se gastan: cada uno tiene que dejar más plata de lo que cuesta. Si alguien toca
// precios, usos o probabilidades y uno deja de ser rentable, se avisa al arrancar.
for (const tool of unprofitableTools()) {
  console.warn(
    `[Balance] ${tool.name} no es rentable: deja ~${formatMoney(Math.floor(lifetimeValue(tool)))} en ${tool.maxUses} usos y cuesta ${formatMoney(tool.price)}.`,
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

app.get("/health", async (_req, res) => {
  const rooms = await matchMaker.query({ name: ROOM_NAME });
  res.json({
    ok: true,
    uptime: process.uptime(),
    rooms: rooms.length,
    players: rooms.reduce((total, room) => total + room.clients, 0),
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
