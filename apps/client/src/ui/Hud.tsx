"use client";

import { ReactNode, useEffect, useState } from "react";
import { eventBus } from "@/lib/eventBus";
import { openPanel, useGame } from "@/lib/gameStore";
import { WEATHERS, WeatherId, darknessAt, formatClock, formatMoney } from "@montevideo-world/shared";
import { UiIcon, UiIconName } from "./UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./Hud.module.css";

const cx = moduleClasses(styles);

/** Ícono del reloj según el clima; despejado, el sol o la luna según la hora. */
const WEATHER_ICONS: Record<Exclude<WeatherId, "clear">, UiIconName> = { rain: "rain", pampero: "wind", heat: "heat" };

interface HudProps {
  cityName: string;
  onExit: () => void;
}

export function Hud({ cityName, onExit }: HudProps) {
  const [self, setSelf] = useState<{ name: string; color: string } | null>(null);
  const money = useGame((state) => state.money);
  const clock = useGame((state) => state.clock);
  const weather = useGame((state) => state.weather);
  const playerCount = useGame((state) => state.players.length);
  const isAdmin = useGame((state) => state.isAdmin);
  const cityCopy = useGame((state) => state.cityCopy);

  useEffect(() => {
    return eventBus.on("player:self", setSelf);
  }, []);

  return (
    <div className={cx("hud")}>
      {/*
        Datos (quién y dónde: nombre, barrio, hora, plata) y acciones (menús). En escritorio, cada
        grupo es un panel en su esquina de arriba; en celulares, dos filas de punta a punta. Energía,
        hambre y salud van aparte, abajo (`Vitals`).
      */}
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
        <span className={cx("hud-item hud-clock")} title={`Hora del juego · ${WEATHERS[weather].name}`}>
          <UiIcon name={weather !== "clear" ? WEATHER_ICONS[weather] : clock !== null && darknessAt(clock) > 0.5 ? "moon" : "sun"} />
          {clock === null ? "--:--" : formatClock(clock)}
        </span>
        <span className={cx("hud-item hud-money")} title="Tu dinero">
          <UiIcon name="moneyBag" className={cx("hud-money-icon")} />
          {money === null ? "$…" : formatMoney(money)}
        </span>
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
      <span className={cx("hud-button-icon")}>
        <UiIcon name={icon} />
        {children}
      </span>
      <span className={cx("hud-label")}>{label}</span>
      {shortcut && <kbd>{shortcut}</kbd>}
    </button>
  );
}
