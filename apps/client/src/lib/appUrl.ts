/**
 * Adónde lleva el botón "Jugar" de la landing: el subdominio `app.` del host actual
 * (localhost:3000 → app.localhost:3000; montevideoworld.com → app.montevideoworld.com).
 * Entrando por IP no hay subdominio posible: ahí va a `/jugar`. En producción se puede fijar con
 * `NEXT_PUBLIC_APP_URL`. Sólo en el navegador (usa `window.location`).
 */
const APP_URL_ENV = process.env.NEXT_PUBLIC_APP_URL;

export function appUrl(): string {
  if (APP_URL_ENV) return APP_URL_ENV;
  const { protocol, hostname, port } = window.location;
  if (hostname.startsWith("app.")) return "/";
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
  if (isIp) return "/jugar";
  return `${protocol}//app.${hostname.replace(/^www\./, "")}${port ? `:${port}` : ""}`;
}
