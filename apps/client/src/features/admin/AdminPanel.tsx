"use client";

import { CLOCK_PRESETS, MATCHES, WEATHERS, WEATHER_IDS, WeatherId, formatClock, getCityInfo, isVendingOpen } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { sendAdminMatch, sendAdminSetTime, sendAdminWeather, sendChat } from "@/lib/network";
import type { PanelProps } from "../../shell/panels";
import { UiIcon, UiIconName } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./admin.module.css";

const cx = moduleClasses(styles);

const PHASE_ICONS: Record<(typeof CLOCK_PRESETS)[number]["phase"], UiIconName> = {
  dawn: "horizon",
  day: "sun",
  dusk: "horizon",
  night: "moon",
};

const WEATHER_ICONS: Record<WeatherId, UiIconName> = { clear: "sun", rain: "rain", pampero: "wind", heat: "heat" };

/**
 * Controles de admin (tecla P). Sólo se muestra a quien entró con el nombre de admin; igual el
 * server valida cada pedido. Mover el reloj afecta a todos los barrios: desde ahí sigue solo.
 */
export function AdminPanel({ room, cityId, onClose }: PanelProps) {
  const clock = useGame((state) => state.clock);
  const coords = useGame((state) => state.adminCoords);
  const match = useGame((state) => state.match);
  const matchMode = useGame((state) => state.matchMode);
  const weather = useGame((state) => state.weather);
  const weatherMode = useGame((state) => state.weatherMode);
  const cityName = getCityInfo(cityId)?.name ?? cityId;
  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal admin")}
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
        <div className={cx("admin-body")}>
          <h3>
            Reloj del juego <span className={cx("admin-clock")}>{clock === null ? "--:--" : formatClock(clock)}</span>
          </h3>
          <div className={cx("admin-presets")}>
            {CLOCK_PRESETS.map(({ label, phase, minute }) => (
              <button key={label} type="button" onClick={() => sendAdminSetTime(room, minute)}>
                <UiIcon name={PHASE_ICONS[phase]} />
                <span>{label}</span>
                <small>{formatClock(minute)}</small>
              </button>
            ))}
          </div>
          <p className={cx("admin-hint")}>
            El reloj es el mismo para todos los jugadores y sigue avanzando solo: oscurece de a poco al atardecer y
            aclara al amanecer.
          </p>
          {/* Los partidos son del Centenario (Tres Cruces): con el barrio oculto, no se muestran. */}
          {isVendingOpen() && (
            <>
              <h3>
                Partido en el Centenario <span className={cx("admin-clock")}>{match || "sin partido"}</span>
              </h3>
              <div className={cx("admin-presets")}>
                {MATCHES.map(({ name, start, end }) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={matchMode === "on" && match === name}
                    onClick={() => sendAdminMatch(room, "on", name)}
                  >
                    <span aria-hidden="true">⚽</span>
                    <span>{name}</span>
                    <small>
                      {formatClock(start)}–{formatClock(end)}
                    </small>
                  </button>
                ))}
                <button type="button" aria-pressed={matchMode === "off"} onClick={() => sendAdminMatch(room, "off")}>
                  <span aria-hidden="true">🚫</span>
                  <span>Sin partidos</span>
                </button>
                <button type="button" aria-pressed={matchMode === "auto"} onClick={() => sendAdminMatch(room, "auto")}>
                  <UiIcon name="sun" />
                  <span>Según el horario</span>
                </button>
              </div>
              <p className={cx("admin-hint")}>
                Forzar un partido lo juega ya y sigue hasta que elijas otro modo (en todos los barrios): se vende el
                doble y los hinchas compran más. &quot;Según el horario&quot; vuelve a los partidos de cada día.
              </p>
            </>
          )}
          <h3>
            Clima <span className={cx("admin-clock")}>{WEATHERS[weather].name}</span>
          </h3>
          <div className={cx("admin-presets")}>
            {WEATHER_IDS.map((id) => (
              <button key={id} type="button" aria-pressed={weatherMode === id} onClick={() => sendAdminWeather(room, id)}>
                <UiIcon name={WEATHER_ICONS[id]} />
                <span>{WEATHERS[id].name}</span>
              </button>
            ))}
            <button type="button" aria-pressed={weatherMode === "auto"} onClick={() => sendAdminWeather(room, "auto")}>
              <UiIcon name="horizon" />
              <span>Que cambie solo</span>
            </button>
          </div>
          <p className={cx("admin-hint")}>
            El clima es el mismo en todos los barrios. Elegir uno lo deja fijo hasta que vuelvas a &quot;Que cambie
            solo&quot;. Con lluvia pican más los peces y pasa menos gente; con pampero cuesta pescar; con calor da más
            hambre y los refrescos se venden mejor.
          </p>
          <h3>Necesidades</h3>
          <div className={cx("admin-presets")}>
            <button type="button" onClick={() => sendChat(room, "/curar")}>
              <UiIcon name="heart" />
              <span>Curarme</span>
              <small>/curar</small>
            </button>
          </div>
          <p className={cx("admin-hint")}>
            Energía, hambre y salud al 100. Para curar a otro jugador del barrio: <code>/curar nombre</code> en el chat.
          </p>
          <h3>Coordenadas</h3>
          <div className={cx("admin-presets")}>
            <button type="button" aria-pressed={coords} onClick={() => eventBus.emit("admin:coords:toggle", null)}>
              <UiIcon name="map" />
              <span>{coords ? "Ocultar grilla" : "Mostrar grilla"}</span>
              <small>G</small>
            </button>
          </div>
          <p className={cx("admin-hint")}>
            Muestra la coordenada (x, y) de cada tile y qué hay ahí al pasar el mouse. Shift + clic copia la
            coordenada para pasarla (p. ej. para pedir que se edifique algo ahí). Sólo lo ves vos.
          </p>
        </div>
        <footer className={cx("key-hint")}>
          Apretá <kbd>P</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}
