"use client";

import { ReactNode, useEffect, useState } from "react";
import { eventBus } from "@/lib/eventBus";
import { LOW_STAMINA, MAX_STAMINA, darknessAt, formatClock, formatMoney } from "@montevideo-world/shared";
import { UiIcon, UiIconName } from "./UiIcon";

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
  onOpenCommands: () => void;
  /** Sólo para el admin: abre sus controles. */
  onOpenAdmin?: () => void;
  /** Sólo para el admin: abre el maker de ítems. */
  onOpenMaker?: () => void;
  onExit: () => void;
}

export function Hud({ cityName, money, clock, stamina, playerCount, onOpenPlayers, onOpenMap, onOpenBackpack, onOpenCommands, onOpenAdmin, onOpenMaker, onExit }: HudProps) {
  const [self, setSelf] = useState<{ name: string; color: string } | null>(null);

  useEffect(() => {
    return eventBus.on("player:self", setSelf);
  }, []);

  return (
    <div className="hud">
      {/* Datos (arriba en celulares) y acciones (abajo, sólo íconos). En escritorio, una sola fila. */}
      <div className="hud-info">
        <strong className="hud-item hud-name" style={self ? { color: self.color } : undefined} title="Tu personaje">
          <UiIcon name="user" />
          {self?.name ?? "…"}
        </strong>
        <span className="hud-item hud-city" title="Barrio actual">
          <UiIcon name="pin" />
          <span className="hud-city-name">{cityName}</span>
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
      </div>
      <div className="hud-actions">
        <HudButton icon="users" label="online" onClick={onOpenPlayers} title="Jugadores en el barrio" shortcut="Tab">
          <span className="hud-count">{playerCount}</span>
        </HudButton>
        <HudButton icon="map" label="Barrios" onClick={onOpenMap} title="Lista de barrios" shortcut="M" />
        <HudButton icon="backpack" label="Mochila" onClick={onOpenBackpack} title="Mochila" shortcut="H" />
        <HudButton icon="terminal" label="Comandos" onClick={onOpenCommands} title="Comandos de chat" shortcut="C" />
        {onOpenAdmin && (
          <HudButton icon="shield" label="Admin" onClick={onOpenAdmin} title="Controles de admin" shortcut="P" admin />
        )}
        {onOpenMaker && (
          <HudButton icon="wand" label="Maker" onClick={onOpenMaker} title="Maker: crear ítems (admin)" shortcut="I" admin />
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
    <button type="button" className={`hud-item hud-button${admin ? " hud-admin" : ""}`} onClick={onClick} title={title} aria-label={title}>
      <UiIcon name={icon} />
      {children}
      <span className="hud-label">{label}</span>
      {shortcut && <kbd>{shortcut}</kbd>}
    </button>
  );
}

/** Barra de energía: verde, amarilla por debajo de la mitad y roja cuando queda poca. */
function StaminaMeter({ stamina }: { stamina: number | null }) {
  const value = stamina ?? MAX_STAMINA;
  const level = value <= LOW_STAMINA ? "low" : value <= MAX_STAMINA / 2 ? "mid" : "high";
  return (
    <span
      className={`hud-item hud-stamina ${level}`}
      title="Energía: caminar, pescar y vender la gastan; quedarte quieto o sentarte en un banco la recupera"
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
