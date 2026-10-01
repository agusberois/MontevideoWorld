"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Primero: carga apps/server/.env antes de que otros módulos lean process.env.
const env_1 = require("./env");
const node_http_1 = __importDefault(require("node:http"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const core_1 = require("@colyseus/core");
const ws_transport_1 = require("@colyseus/ws-transport");
const shared_1 = require("@montevideo-world/shared");
const CityRoom_1 = require("./rooms/CityRoom");
const PORT = Number(process.env.PORT ?? shared_1.DEFAULT_PORT);
const HOST = process.env.HOST ?? "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "*";
const allowedOrigins = CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowAll = allowedOrigins.length === 0 || allowedOrigins.includes("*");
function isOriginAllowed(origin) {
    return allowAll || !origin || allowedOrigins.includes(origin);
}
const corsOptions = {
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    credentials: true,
};
const app = (0, express_1.default)();
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.type("text/plain").send("Montevideo World server OK");
});
app.get("/health", async (_req, res) => {
    const rooms = await core_1.matchMaker.query({ name: shared_1.ROOM_NAME });
    res.json({
        ok: true,
        uptime: process.uptime(),
        rooms: rooms.length,
        players: rooms.reduce((total, room) => total + room.clients, 0),
    });
});
// Los endpoints de matchmaking (/matchmake/*) los atiende Colyseus, no Express:
// se les aplica la misma política de CORS.
core_1.matchMaker.controller.getCorsHeaders = (req) => {
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
const httpServer = node_http_1.default.createServer(app);
const gameServer = new core_1.Server({
    transport: new ws_transport_1.WebSocketTransport({ server: httpServer }),
});
gameServer.define(shared_1.ROOM_NAME, CityRoom_1.CityRoom).filterBy(["cityId"]);
gameServer.listen(PORT, HOST).then(() => {
    console.log(`[Montevideo World] escuchando en ws://${HOST}:${PORT} (CORS: ${allowAll ? "*" : allowedOrigins.join(", ")})`);
    console.log(`[Montevideo World] admin: ${(0, env_1.adminName)() ?? "(ninguno; definí ADMIN_NAME en apps/server/.env)"}`);
    console.log(`[Montevideo World] un día del juego dura ${(0, env_1.dayLengthMinutes)()} minutos reales`);
});
//# sourceMappingURL=index.js.map