"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerClick, PlayerSummary, eventBus } from "@/lib/eventBus";
import { CityRoom, sendGreet, sendTradeRequest } from "@/lib/network";

interface PlayerMenuProps {
  room: CityRoom;
  /** Jugadores del barrio: si el elegido se va, el menú se cierra. */
  players: PlayerSummary[];
}

/**
 * Menú que aparece al hacer clic sobre otro jugador: Saludar o Intercambiar. Se cierra con Esc,
 * con un clic afuera o al elegir una opción.
 */
export function PlayerMenu({ room, players }: PlayerMenuProps) {
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
      className="player-menu"
      role="menu"
      aria-label={`Opciones para ${target.name}`}
      style={{
        left: Math.min(target.screenX, window.innerWidth - 180),
        top: Math.min(target.screenY, window.innerHeight - 120),
      }}
    >
      <div className="player-menu-name">{target.name}</div>
      <button type="button" role="menuitem" onClick={() => choose(sendGreet)}>
        👋 Saludar
      </button>
      <button type="button" role="menuitem" onClick={() => choose(sendTradeRequest)}>
        🔁 Intercambiar
      </button>
    </div>
  );
}
