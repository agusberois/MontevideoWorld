"use client";

import { CLOCK_PRESETS, formatClock } from "@montevideo-world/shared";
import { CityRoom, sendAdminSetTime } from "@/lib/network";
import { UiIcon, UiIconName } from "./UiIcon";

const PHASE_ICONS: Record<(typeof CLOCK_PRESETS)[number]["phase"], UiIconName> = {
  dawn: "horizon",
  day: "sun",
  dusk: "horizon",
  night: "moon",
};

interface AdminPanelProps {
  room: CityRoom;
  cityName: string;
  /** Hora actual del juego (minuto del día); null hasta que se sincroniza. */
  clock: number | null;
  onClose: () => void;
}

/**
 * Controles de admin (tecla P). Sólo se muestra a quien entró con el nombre de admin; igual el
 * server valida cada pedido. Mover el reloj afecta a todos los barrios: desde ahí sigue solo.
 */
export function AdminPanel({ room, cityName, clock, onClose }: AdminPanelProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal admin"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="admin-title">
            <UiIcon name="shield" size={18} />
            Admin · {cityName}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="admin-body">
          <h3>
            Reloj del juego <span className="admin-clock">{clock === null ? "--:--" : formatClock(clock)}</span>
          </h3>
          <div className="admin-presets">
            {CLOCK_PRESETS.map(({ label, phase, minute }) => (
              <button key={label} type="button" onClick={() => sendAdminSetTime(room, minute)}>
                <UiIcon name={PHASE_ICONS[phase]} />
                <span>{label}</span>
                <small>{formatClock(minute)}</small>
              </button>
            ))}
          </div>
          <p className="admin-hint">
            El reloj es el mismo para todos los jugadores y sigue avanzando solo: oscurece de a poco al atardecer y
            aclara al amanecer.
          </p>
        </div>
        <footer>
          Apretá <kbd>P</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}
