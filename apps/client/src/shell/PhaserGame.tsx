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
 * Monta una única instancia de Phaser.Game dentro de un <div> y le cambia el barrio con cada sesión.
 * - Phaser se importa dinámicamente dentro del efecto (toca `window`, no puede correr en SSR).
 * - El juego vive mientras esté montado el componente: al viajar sólo se cambia la escena
 *   (`startCity`), no se recrea el contexto de WebGL ni las texturas compartidas.
 * - En StrictMode los efectos corren → cleanup → corren: el flag `cancelled` evita que una
 *   importación pendiente use una sesión vieja, y el cleanup del montaje destruye el canvas.
 */
export function PhaserGame({ session }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/game/createGame").then(async ({ createGame, startCity, whenStateReady }) => {
      await whenStateReady(session.room);
      const parent = containerRef.current;
      if (cancelled || !parent) return;
      gameRef.current ??= createGame(parent);
      try {
        startCity(gameRef.current, session.room, session.cityId);
      } catch (error) {
        // Si cambiar de escena falla, se rearma el juego de cero (lo de antes del juego persistente)
        // en vez de quedar trabado en el último cuadro del barrio anterior.
        console.error("[Montevideo World] no se pudo cambiar de barrio; se rearma el juego", error);
        gameRef.current.destroy(true);
        gameRef.current = createGame(parent);
        startCity(gameRef.current, session.room, session.cityId);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Al desmontar (salir del juego): se destruye el juego entero.
  useEffect(
    () => () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    },
    [],
  );

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
