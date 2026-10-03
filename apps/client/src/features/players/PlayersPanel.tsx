"use client";

import { getCityInfo, nameKey } from "@montevideo-world/shared";
import { toggleBlocked, useGame } from "@/lib/gameStore";
import type { PanelProps } from "../../shell/panels";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./players.module.css";

const cx = moduleClasses(styles);

/** Lista de jugadores conectados en el barrio (tecla Tab). Vos primero, el resto por nombre. */
export function PlayersPanel({ cityId, onClose }: PanelProps) {
  const players = useGame((state) => state.players);
  const blocked = useGame((state) => state.blocked);
  const cityName = getCityInfo(cityId)?.name ?? cityId;
  const sorted = [...players].sort(
    (a, b) => Number(b.isSelf) - Number(a.isSelf) || a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal players")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="players-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="players-title">
            <UiIcon name="users" size={18} />
            En {cityName}
            <span className={cx("players-count")}>{players.length}</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <ul className={cx("players-list")}>
          {sorted.map((player) => (
            <li key={player.sessionId}>
              <span className={cx("players-dot")} style={{ background: player.color }} aria-hidden="true" />
              <span className={cx("players-name")}>{player.name}</span>
              {player.isDonor && (
                <span className={cx("players-donor")} title="Donador: apoya a Montevideo World">
                  ♥ Donador
                </span>
              )}
              {player.isSelf ? (
                <span className={cx("players-self")}>Vos</span>
              ) : (
                <button
                  type="button"
                  className={cx("players-block")}
                  aria-pressed={blocked.includes(nameKey(player.name))}
                  title="Bloquear: dejás de ver su chat y sus mensajes (sólo vos, en este navegador)"
                  onClick={() => toggleBlocked(player.name)}
                >
                  {blocked.includes(nameKey(player.name)) ? "Desbloquear" : "🚫"}
                </button>
              )}
            </li>
          ))}
        </ul>
        <footer className={cx("key-hint")}>
          Apretá <kbd>Tab</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}
