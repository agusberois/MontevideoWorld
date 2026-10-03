import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "../..");
const isDev = process.env.NODE_ENV === "development";

/**
 * Adónde se conecta la página: el server del juego (WebSocket + matchmaking por http). Con
 * `NEXT_PUBLIC_SERVER_URL` (producción), sólo ése; sin ella el cliente usa `ws://<host>:2567` del
 * host que sea (local o por IP en la red, `getServerUrl`), así que se permite cualquier `ws:`/`http:`.
 */
const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL?.trim();
const serverOrigins = serverUrl ? [serverUrl, serverUrl.replace(/^ws/, "http")] : ["ws:", "http:"];

/**
 * Content Security Policy: una segunda barrera si algún día aparece un XSS (la clave del jugador
 * vive en localStorage). Va en **Report-Only**: no bloquea nada, sólo avisa en la consola del
 * navegador ("[Report Only] Refused to …"). Cuando no aparezca ningún aviso jugando, pasarla a
 * `Content-Security-Policy` (ver docs/pending/seguridad-para-produccion.md, M6).
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  // Next mete scripts inline (hidratación); con nonces se podría sacar 'unsafe-inline'. En
  // desarrollo React necesita eval (Fast Refresh).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Phaser arma texturas en canvas y las pasa por data:/blob:.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  `connect-src 'self' ${serverOrigins.join(" ")}`,
  // Nadie puede meter el juego en un iframe (clickjacking: hacer apretar "Aceptar" en un intercambio).
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
  // Lo mismo que frame-ancestors, para navegadores viejos (y éste sí bloquea ya, no es Report-Only).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Sólo afecta a `next dev`: deja entrar desde cualquier IPv4 (otras compus de la red local).
  // Temporal: restringirlo cuando no haga falta probar desde otros equipos.
  allowedDevOrigins: ["*.*.*.*"],
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
