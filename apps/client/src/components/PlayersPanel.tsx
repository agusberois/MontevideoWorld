"use client";

import { getCity } from "@montevideo-world/shared";
import { useGame } from "@/lib/gameStore";
import type { PanelProps } from "./panels";
import { UiIcon } from "./UiIcon";

/** Lista de jugadores conectados en el barrio (tecla Tab). Vos primero, el resto por nombre. */
export function PlayersPanel({ cityId, onClose }: PanelProps) {
  const players = useGame((state) => state.players);
  const cityName = getCity(cityId)?.name ?? cityId;
  const sorted = [...players].sort(
    (a, b) => Number(b.isSelf) - Number(a.isSelf) || a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal players"
        role="dialog"
        aria-modal="true"
        aria-labelledby="players-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="players-title">
            <UiIcon name="users" size={18} />
            En {cityName}
            <span className="players-count">{players.length}</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <ul className="players-list">
          {sorted.map((player) => (
            <li key={player.sessionId}>
              <span className="players-dot" style={{ background: player.color }} aria-hidden="true" />
              <span className="players-name">{player.name}</span>
              {player.isDonor && (
                <span className="players-donor" title="Donador: apoya a Montevideo World">
                  ♥ Donador
                </span>
              )}
              {player.isSelf && <span className="players-self">Vos</span>}
            </li>
          ))}
        </ul>
        <footer className="key-hint">
          Apretá <kbd>Tab</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}
