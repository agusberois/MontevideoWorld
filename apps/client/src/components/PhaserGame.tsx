"use client";

import { useEffect, useRef } from "react";
import type * as Phaser from "phaser";
import type { CitySession } from "@/lib/network";

interface PhaserGameProps {
  session: CitySession;
}

/**
 * Monta una única instancia de Phaser.Game dentro de un <div>.
 * - Phaser se importa dinámicamente dentro del efecto (toca `window`, no puede correr en SSR).
 * - En StrictMode el efecto corre → cleanup → corre: el flag `cancelled` evita que la primera
 *   importación (aún pendiente) cree un juego, y el cleanup destruye el canvas si ya existía.
 */
export function PhaserGame({ session }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let game: Phaser.Game | null = null;

    import("@/game/createGame").then(({ createGame }) => {
      const parent = containerRef.current;
      if (cancelled || !parent) return;
      game = createGame(parent, session.room, session.cityId);
    });

    return () => {
      cancelled = true;
      game?.destroy(true);
      game = null;
    };
  }, [session]);

  return <div ref={containerRef} className="game-container" />;
}
