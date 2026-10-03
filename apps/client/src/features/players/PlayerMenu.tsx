"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerClick, eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { CityRoom, sendGreet, sendTaunt, sendTradeRequest } from "@/lib/network";
import { moduleClasses } from "@/lib/cx";
import styles from "./players.module.css";

const cx = moduleClasses(styles);

interface PlayerMenuProps {
  room: CityRoom;
}

/**
 * Menú que aparece al hacer clic sobre otro jugador: Saludar o Intercambiar. Se cierra con Esc,
 * con un clic afuera o al elegir una opción.
 */
export function PlayerMenu({ room }: PlayerMenuProps) {
  /** Jugadores del barrio: si el elegido se va, el menú se cierra. */
  const players = useGame((state) => state.players);
  /** Preso vos: no te podés burlar de nadie. */
  const selfJailed = useGame((state) => state.jailLeft > 0);
  const [target, setTarget] = useState<PlayerClick | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => eventBus.on("player:click", setTarget), []);

  useEffect(() => {
    if (!target) return;
    // En captura: corre antes que Phaser, así un clic en otro jugador cierra este menú y abre el nuevo.
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setTarget(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTarget(null);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [target]);

  if (!target || !players.some((player) => player.sessionId === target.sessionId)) return null;

  const choose = (action: (room: CityRoom, targetId: string) => void) => {
    action(room, target.sessionId);
    setTarget(null);
  };

  return (
    <div
      ref={menuRef}
      className={cx("player-menu")}
      role="menu"
      aria-label={`Opciones para ${target.name}`}
      style={{
        left: Math.min(target.screenX, window.innerWidth - 180),
        top: Math.min(target.screenY, window.innerHeight - 160),
      }}
    >
      <div className={cx("player-menu-name")}>{target.name}</div>
      <button type="button" role="menuitem" onClick={() => choose(sendGreet)}>
        👋 Saludar
      </button>
      <button type="button" role="menuitem" onClick={() => choose(sendTradeRequest)}>
        🔁 Intercambiar
      </button>
      {target.jailed && !selfJailed && (
        <button type="button" role="menuitem" onClick={() => choose(sendTaunt)}>
          😜 Burlarse
        </button>
      )}
    </div>
  );
}
