import type { Metadata } from "next";
import { App } from "@/shell/App";

export const metadata: Metadata = {
  title: "Jugar · Montevideo World",
};

/**
 * El juego. Se entra por `app.<dominio>` (el `proxy.ts` reescribe `/` a esta página) o directo por
 * `/jugar` (p. ej. desde otra compu de la red, entrando por IP, donde no hay subdominio).
 */
export default function PlayPage() {
  return <App />;
}
