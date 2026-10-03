"use client";

import { ReactNode, useEffect, useState } from "react";
import { eventBus } from "@/lib/eventBus";
import { openPanel, useGame } from "@/lib/gameStore";
import { LOW_ENERGY, LOW_HEALTH, MAX_ENERGY, MAX_HEALTH, MAX_HUNGER, STARVING, darknessAt, formatClock, formatMoney } from "@montevideo-world/shared";
import { UiIcon, UiIconName } from "./UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./Hud.module.css";

const cx = moduleClasses(styles);

interface HudProps {
  cityName: string;
  onExit: () => void;
}

export function Hud({ cityName, onExit }: HudProps) {
  const [self, setSelf] = useState<{ name: string; color: string } | null>(null);
  const money = useGame((state) => state.money);
  const clock = useGame((state) => state.clock);
  const energy = useGame((state) => state.energy);
  const hunger = useGame((state) => state.hunger);
  const health = useGame((state) => state.health);
  const playerCount = useGame((state) => state.players.length);
  const isAdmin = useGame((state) => state.isAdmin);
  const cityCopy = useGame((state) => state.cityCopy);

  useEffect(() => {
    return eventBus.on("player:self", setSelf);
  }, []);

  return (
    <div className={cx("hud")}>
      {/* Datos (arriba en celulares) y acciones (abajo, sólo íconos). En escritorio, una sola fila. */}
      <div className={cx("hud-info")}>
        <strong className={cx("hud-item hud-name")} style={self ? { color: self.color } : undefined} title="Tu personaje">
          <UiIcon name="user" />
          {self?.name ?? "…"}
        </strong>
        <span
          className={cx("hud-item hud-city")}
          title={cityCopy > 1 ? `Barrio actual. Estaba lleno: estás en la copia ${cityCopy} (no ves a los de las otras)` : "Barrio actual"}
        >
          <UiIcon name="pin" />
          <span className={cx("hud-city-name")}>
            {cityName}
            {cityCopy > 1 && ` · ${cityCopy}`}
          </span>
        </span>
        <span className={cx("hud-item hud-clock")} title="Hora del juego">
          <UiIcon name={clock !== null && darknessAt(clock) > 0.5 ? "moon" : "sun"} />
          {clock === null ? "--:--" : formatClock(clock)}
        </span>
        <span className={cx("hud-item hud-money")} title="Tu dinero">
          <UiIcon name="moneyBag" className={cx("hud-money-icon")} />
          {money === null ? "$…" : formatMoney(money)}
        </span>
        <NeedMeter
          kind="energy"
          label="Energía"
          icon="zap"
          title="Energía: caminar, pescar y vender la gastan; quedarte quieto o sentarte en un banco la recupera (con hambre, más lento)"
          value={energy}
          max={MAX_ENERGY}
          low={LOW_ENERGY}
        />
        <NeedMeter
          kind="hunger"
          label="Hambre"
          icon="food"
          title="Hambre: baja con el tiempo y el esfuerzo. Comé algo (kioscos, Mercado del Puerto o un pescado) para llenarla"
          value={hunger}
          max={MAX_HUNGER}
          low={STARVING}
        />
        <NeedMeter
          kind="health"
          label="Salud"
          icon="heart"
          title="Salud: la bajan los picudos, pasar hambre y el pescado crudo. Vuelve comiendo bien y descansando, o en la guardia del Sanatorio Americano. En 0 te desmayás"
          value={health}
          max={MAX_HEALTH}
          low={LOW_HEALTH}
        />
      </div>
      <div className={cx("hud-actions")}>
        <HudButton icon="users" label="online" onClick={() => openPanel("players")} title="Jugadores en el barrio" shortcut="Tab">
          <span className={cx("hud-count")}>{playerCount}</span>
        </HudButton>
        <HudButton icon="map" label="Barrios" onClick={() => openPanel("cities")} title="Lista de barrios" shortcut="M" />
        <HudButton icon="backpack" label="Mochila" onClick={() => openPanel("backpack")} title="Mochila" shortcut="H" />
        <HudButton icon="terminal" label="Comandos" onClick={() => openPanel("commands")} title="Comandos de chat" shortcut="C" />
        {isAdmin && (
          <HudButton icon="shield" label="Admin" onClick={() => openPanel("admin")} title="Controles de admin" shortcut="P" admin />
        )}
        {isAdmin && (
          <HudButton icon="wand" label="Maker" onClick={() => openPanel("maker")} title="Maker: crear ítems (admin)" shortcut="I" admin />
        )}
        <HudButton icon="exit" label="Salir" onClick={onExit} title="Salir del juego" />
      </div>
    </div>
  );
}

interface HudButtonProps {
  icon: UiIconName;
  /** Texto del botón: en celulares se oculta y queda sólo el ícono (y el nombre para lectores de pantalla). */
  label: string;
  title: string;
  shortcut?: string;
  admin?: boolean;
  onClick: () => void;
  /** Algo que se ve siempre, también sin texto (p. ej. la cantidad de jugadores). */
  children?: ReactNode;
}

function HudButton({ icon, label, title, shortcut, admin, onClick, children }: HudButtonProps) {
  return (
    <button type="button" className={cx(`hud-item hud-button${admin ? " hud-admin" : ""}`)} onClick={onClick} title={title} aria-label={title}>
      <UiIcon name={icon} />
      {children}
      <span className={cx("hud-label")}>{label}</span>
      {shortcut && <kbd>{shortcut}</kbd>}
    </button>
  );
}

interface NeedMeterProps {
  /** Clase (colores): `hud-energy`, `hud-hunger`, `hud-health`. */
  kind: "energy" | "hunger" | "health";
  label: string;
  icon: UiIconName;
  title: string;
  value: number | null;
  max: number;
  /** Por debajo, en rojo (y el ícono titila); por debajo de la mitad, amarillo. */
  low: number;
}

/** Barra de una necesidad (energía, hambre): llena = bien, amarilla por la mitad, roja cuando queda poca. */
function NeedMeter({ kind, label, icon, title, value, max, low }: NeedMeterProps) {
  const shown = value ?? max;
  const level = shown <= low ? "low" : shown <= max / 2 ? "mid" : "high";
  return (
    <span
      className={cx(`hud-item hud-need hud-${kind} ${level}`)}
      title={title}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={shown}
    >
      <UiIcon name={icon} />
      <span className={cx("hud-need-bar")}>
        <span style={{ width: `${(shown / max) * 100}%` }} />
      </span>
      <span className={cx("hud-need-value")}>{value === null ? "…" : shown}</span>
    </span>
  );
}
