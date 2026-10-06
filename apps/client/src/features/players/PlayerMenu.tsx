"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerClick, eventBus } from "@/lib/eventBus";
import { openPlayerDetails, toggleBlocked, useGame } from "@/lib/gameStore";
import { PAIR_GESTURES, PAIR_GESTURE_IDS, PairGestureId, nameKey } from "@montevideo-world/shared";
import { CityRoom, sendBarraInvite, sendGreet, sendPairGesture, sendTaunt, sendTradeRequest } from "@/lib/network";
import { moduleClasses } from "@/lib/cx";
import styles from "./players.module.css";

const cx = moduleClasses(styles);

interface PlayerMenuProps {
  room: CityRoom;
}

/**
 * Menú que aparece al hacer clic sobre otro jugador: Saludar, gestos de a dos (chocar los cinco,
 * abrazo, pasar el mate: le llega una invitación), Intercambiar, Burlarse (si está preso),
 * Detalles del jugador (abre el panel `playerDetails`) y Bloquear (dejás de ver su chat; sólo en tu
 * navegador). Se cierra con Esc, con un clic afuera o
 * al elegir una opción.
 */
export function PlayerMenu({ room }: PlayerMenuProps) {
  /** Jugadores del barrio: si el elegido se va, el menú se cierra. */
  const players = useGame((state) => state.players);
  /** Preso vos: no te podés burlar de nadie. */
  const selfJailed = useGame((state) => state.jailLeft > 0);
  const blocked = useGame((state) => state.blocked);
  /** Sos fundador de una barra: podés invitar a los que no tienen. */
  const founder = useGame((state) => state.barra?.founder === true);
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
        top: Math.max(8, Math.min(target.screenY, window.innerHeight - 300)),
      }}
    >
      <div className={cx("player-menu-name")}>{target.name}</div>
      <button type="button" role="menuitem" onClick={() => choose(sendGreet)}>
        👋 Saludar
      </button>
      {PAIR_GESTURE_IDS.map((gesture: PairGestureId) => (
        <button
          key={gesture}
          type="button"
          role="menuitem"
          title="Le llega una invitación; tienen que estar uno al lado del otro"
          onClick={() => choose((room, targetId) => sendPairGesture(room, targetId, gesture))}
        >
          {PAIR_GESTURES[gesture].cry} {PAIR_GESTURES[gesture].name}
        </button>
      ))}
      {founder && !players.find((player) => player.sessionId === target.sessionId)?.barra && (
        <button type="button" role="menuitem" onClick={() => choose(sendBarraInvite)}>
          🚩 Invitar a mi barra
        </button>
      )}
      <button type="button" role="menuitem" onClick={() => choose(sendTradeRequest)}>
        🔁 Intercambiar
      </button>
      {target.jailed && !selfJailed && (
        <button type="button" role="menuitem" onClick={() => choose(sendTaunt)}>
          😜 Burlarse
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          openPlayerDetails(target.sessionId);
          setTarget(null);
        }}
      >
        🪪 Detalles del jugador
      </button>
      <button
        type="button"
        role="menuitem"
        title="Dejás de ver su chat y sus mensajes (sólo vos, en este navegador)"
        onClick={() => {
          toggleBlocked(target.name);
          setTarget(null);
        }}
      >
        {blocked.includes(nameKey(target.name)) ? "✅ Desbloquear" : "🚫 Bloquear"}
      </button>
    </div>
  );
}
