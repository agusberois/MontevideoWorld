import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Subdominio del juego: `app.<dominio>/` muestra el juego (`/jugar`) y `<dominio>/` la landing.
 * Es un rewrite: la URL sigue siendo `app.<dominio>`. Ejemplo local: app.localhost:3000 (juego) y
 * localhost:3000 (landing). `/jugar` también anda directo en cualquier host (sirve entrando por IP).
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("app.")) return NextResponse.rewrite(new URL("/jugar", request.url));
  return NextResponse.next();
}

export const config = {
  // Sólo la raíz: los assets (`/_next`, `/landing/*.webp`, el logo) no pasan por acá.
  matcher: "/",
};
