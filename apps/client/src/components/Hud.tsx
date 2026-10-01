"use client";

import { useEffect, useState } from "react";
import { eventBus } from "@/lib/eventBus";
import { LOW_STAMINA, MAX_STAMINA, darknessAt, formatClock, formatMoney } from "@montevideo-world/shared";
import { UiIcon } from "./UiIcon";

interface HudProps {
  cityName: string;
  /** Saldo propio según el server; null hasta que llega. */
  money: number | null;
  /** Hora del juego (minuto del día); null hasta que se sincroniza. */
  clock: number | null;
  /** Energía del avatar propio; null hasta que se sincroniza. */
  stamina: number | null;
  /** Jugadores conectados en el barrio. */
  playerCount: number;
  onOpenPlayers: () => void;
  onOpenMap: () => void;
  onOpenBackpack: () => void;
  /** Sólo para el admin: abre sus controles. */
  onOpenAdmin?: () => void;
  onExit: () => void;
}

export function Hud({ cityName, money, clock, stamina, playerCount, onOpenPlayers, onOpenMap, onOpenBackpack, onOpenAdmin, onExit }: HudProps) {
  const [self, setSelf] = useState<{ name: string; color: string } | null>(null);

  useEffect(() => {
    return eventBus.on("player:self", setSelf);
  }, []);

  return (
    <div className="hud">
      <strong className="hud-item" style={self ? { color: self.color } : undefined} title="Tu personaje">
        <UiIcon name="user" />
        {self?.name ?? "…"}
      </strong>
      <span className="hud-item hud-city" title="Barrio actual">
        <UiIcon name="pin" />
        {cityName}
      </span>
      <span className="hud-item hud-clock" title="Hora del juego">
        <UiIcon name={clock !== null && darknessAt(clock) > 0.5 ? "moon" : "sun"} />
        {clock === null ? "--:--" : formatClock(clock)}
      </span>
      <span className="hud-item hud-money" title="Tu dinero">
        <UiIcon name="moneyBag" className="hud-money-icon" />
        {money === null ? "$…" : formatMoney(money)}
      </span>
      <StaminaMeter stamina={stamina} />
      <button type="button" className="hud-item" onClick={onOpenPlayers} title="Jugadores en el barrio">
        <UiIcon name="users" />
        {playerCount} online <kbd>Tab</kbd>
      </button>
      <button type="button" className="hud-item" onClick={onOpenMap} title="Lista de barrios">
        <UiIcon name="map" />
        Barrios <kbd>M</kbd>
      </button>
      <button type="button" className="hud-item" onClick={onOpenBackpack} title="Mochila">
        <UiIcon name="backpack" />
        Mochila <kbd>H</kbd>
      </button>
      {onOpenAdmin && (
        <button type="button" className="hud-item hud-admin" onClick={onOpenAdmin} title="Controles de admin">
          <UiIcon name="shield" />
          Admin <kbd>P</kbd>
        </button>
      )}
      <button type="button" className="hud-item" onClick={onExit} title="Salir del juego">
        <UiIcon name="exit" />
        Salir
      </button>
    </div>
  );
}

/** Barra de energía: verde, amarilla por debajo de la mitad y roja cuando queda poca. */
function StaminaMeter({ stamina }: { stamina: number | null }) {
  const value = stamina ?? MAX_STAMINA;
  const level = value <= LOW_STAMINA ? "low" : value <= MAX_STAMINA / 2 ? "mid" : "high";
  return (
    <span
      className={`hud-item hud-stamina ${level}`}
      title="Energía: caminar y pescar la gastan; quedarte quieto o sentarte en un banco la recupera"
      role="meter"
      aria-label="Energía"
      aria-valuemin={0}
      aria-valuemax={MAX_STAMINA}
      aria-valuenow={value}
    >
      <UiIcon name="zap" />
      <span className="hud-stamina-bar">
        <span style={{ width: `${(value / MAX_STAMINA) * 100}%` }} />
      </span>
      <span className="hud-stamina-value">{stamina === null ? "…" : value}</span>
    </span>
  );
}
