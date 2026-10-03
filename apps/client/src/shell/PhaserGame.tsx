"use client";

import { useEffect, useRef } from "react";
import type * as Phaser from "phaser";
import type { CitySession } from "@/lib/network";
import { moduleClasses } from "@/lib/cx";
import styles from "./PhaserGame.module.css";

const cx = moduleClasses(styles);

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

  // Phaser cancela el pointerdown del canvas, así que tocar el mapa no le saca el foco al chat (y
  // WASD, F, etc. seguían escribiendo). Se lo saca a mano, antes de que el evento llegue a Phaser.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const blurInput = () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && (active.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName))) {
        active.blur();
      }
    };
    container.addEventListener("pointerdown", blurInput, { capture: true });
    return () => container.removeEventListener("pointerdown", blurInput, { capture: true });
  }, []);

  return <div ref={containerRef} className={cx("game-container")} />;
}
