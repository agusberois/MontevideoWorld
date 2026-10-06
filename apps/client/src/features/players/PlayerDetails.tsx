"use client";

import { useEffect } from "react";
import {
  Gender,
  ITEM_SLOTS,
  ITEM_SLOT_LABELS,
  MAX_ENERGY,
  MAX_HEALTH,
  MAX_HUNGER,
  formatJailLeft,
  formatMoney,
  getCityInfo,
  getItem,
  getPet,
  nameKey,
} from "@montevideo-world/shared";
import type { PlayerActivity, PlayerSummary } from "@/lib/eventBus";
import { closePanel, toggleBlocked, useGame } from "@/lib/gameStore";
import { CityRoom, sendGreet, sendTradeRequest } from "@/lib/network";
import type { PanelProps } from "../../shell/panels";
import { AvatarPreview } from "../join/AvatarPreview";
import { ItemIcon, SlotPlaceholderIcon } from "../inventory/ItemIcon";
import { PetIcon } from "../pets/PetShop";
import { moduleClasses } from "@/lib/cx";
import styles from "./players.module.css";

const cx = moduleClasses(styles);

/** Lo que muestra el panel: lo público del jugador (sale del Schema vía `players:list`), con su barra. */
type PlayerDetailsData = PlayerSummary;

/** Mismo naranja que el nombre del admin sobre la cabeza (`Avatar.ts`). */
const ADMIN_COLOR = "#ff9f1c";

/**
 * Detalles de un jugador del barrio (panel `playerDetails`): se abre desde su menú (clic en otro
 * avatar → "Detalles del jugador") o con un clic en tu propio avatar. Muestra sólo lo público (del
 * Schema); de vos suma tu plata, hambre y salud, que son privadas y ya están en el store. Si el
 * jugador se va del barrio, se cierra.
 */
export function PlayerDetails({ room, cityId, onClose }: PanelProps) {
  const detailsId = useGame((state) => state.detailsId);
  const players = useGame((state) => state.players);
  const blocked = useGame((state) => state.blocked);
  const cityCopy = useGame((state) => state.cityCopy);
  const found = players.find((player) => player.sessionId === detailsId);

  // Se fue del barrio (o nunca estuvo): no queda nada que mostrar.
  useEffect(() => {
    if (!found) closePanel();
  }, [found]);
  if (!found) return null;

  const player: PlayerDetailsData = found;
  const cityName = getCityInfo(cityId)?.name ?? cityId;
  const isBlocked = blocked.includes(nameKey(player.name));
  const pet = player.pet ? getPet(player.pet.id) : undefined;

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal player-details")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="player-details-title">🪪 {player.isSelf ? "Tus detalles" : "Detalles del jugador"}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className={cx("player-details-top")}>
          <div className={cx("player-details-avatar")}>
            <AvatarPreview appearance={player.look} outfit={player.outfit} size={88} />
          </div>
          <div className={cx("player-details-who")}>
            <div className={cx("player-details-name")} style={{ color: player.isAdmin ? ADMIN_COLOR : player.color }}>
              {player.isAdmin && <span title="Admin">★ </span>}
              {player.name}
            </div>
            <div className={cx("player-details-badges")}>
              {player.isSelf && <span className={cx("players-self")}>Vos</span>}
              {player.isDonor && (
                <span className={cx("players-donor")} title="Donador: apoya a Montevideo World">
                  ♥ Donador
                </span>
              )}
              {player.jailLeft > 0 && <span className={cx("player-details-jailed")}>🔒 Preso</span>}
            </div>
            <div className={cx("player-details-activity")}>{activityText(player.activity, player.look.gender)}</div>
          </div>
        </div>

        <dl className={cx("player-details-info")}>
          <div>
            <dt>Barra</dt>
            <dd>
              {player.barra ? (
                <span style={{ color: player.barra.color }}>
                  [{player.barra.tag}] {player.barra.name}
                </span>
              ) : (
                "Sin barra"
              )}
            </dd>
          </div>
          <div>
            <dt>Barrio</dt>
            <dd>
              {cityName}
              {cityCopy > 1 && ` (copia ${cityCopy})`}
            </dd>
          </div>
          {player.jailLeft > 0 && (
            <div>
              <dt>Condena</dt>
              <dd>En el COMCAR, le quedan {formatJailLeft(player.jailLeft)}</dd>
            </div>
          )}
          <div>
            <dt>Mascota</dt>
            <dd className={cx("player-details-pet")}>
              {player.pet && pet ? (
                <>
                  <PetIcon pet={pet} size={28} />
                  <span>
                    {player.pet.name || pet.name}
                    {player.pet.name && <small> · {pet.name}</small>}
                  </span>
                </>
              ) : (
                "Sin mascota"
              )}
            </dd>
          </div>
          <Meter label="Energía" value={player.energy} max={MAX_ENERGY} />
          {player.isSelf && <SelfPrivateRows />}
        </dl>

        <h3 className={cx("player-details-subtitle")}>Ropa puesta</h3>
        <ul className={cx("player-details-outfit")}>
          {ITEM_SLOTS.map((slot) => {
            const item = player.outfit[slot] ? getItem(player.outfit[slot]) : undefined;
            return (
              <li key={slot}>
                {item ? <ItemIcon item={item} size={34} /> : <SlotPlaceholderIcon slot={slot} size={34} />}
                <span>
                  <small>{ITEM_SLOT_LABELS[slot]}</small>
                  {item?.name ?? "Nada"}
                </span>
              </li>
            );
          })}
        </ul>

        {!player.isSelf && (
          <PlayerActions room={room} targetId={player.sessionId} name={player.name} isBlocked={isBlocked} onDone={onClose} />
        )}
        <footer className={cx("key-hint")}>
          Apretá <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}

/** "Pescando con Caña de fibra", "Vendiendo con …", "Tocando …", "Sentada en un banco" o "Paseando". */
function activityText(activity: PlayerActivity | null, gender: Gender): string {
  if (!activity) return "Paseando";
  switch (activity.kind) {
    case "fishing":
      return `🎣 Pescando${toolName(activity.rod, " con ")}`;
    case "vending":
      return `🛒 Vendiendo${toolName(activity.cart, " con ")}`;
    case "busking":
      return `🎵 Tocando${toolName(activity.instrument, " ")}`;
    case "sitting":
      return `🪑 ${gender === "f" ? "Sentada" : "Sentado"} en un banco`;
  }
}

function toolName(itemId: string, prefix: string): string {
  const item = itemId ? getItem(itemId) : undefined;
  return item ? `${prefix}${item.name}` : "";
}

/** Tu plata, hambre y salud: privadas (no salen del server para los demás), sólo en tus detalles. */
function SelfPrivateRows() {
  const money = useGame((state) => state.money);
  const hunger = useGame((state) => state.hunger);
  const health = useGame((state) => state.health);
  return (
    <>
      <div>
        <dt>Plata</dt>
        <dd>{money === null ? "…" : formatMoney(money)}</dd>
      </div>
      {hunger !== null && <Meter label="Hambre" value={hunger} max={MAX_HUNGER} />}
      {health !== null && <Meter label="Salud" value={health} max={MAX_HEALTH} />}
    </>
  );
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const rounded = Math.round(value);
  return (
    <div>
      <dt>{label}</dt>
      <dd className={cx("player-details-meter")}>
        <span className={cx("player-details-bar")} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={rounded}>
          <span style={{ width: `${Math.min(100, Math.max(0, (rounded / max) * 100))}%` }} />
        </span>
        <span>
          {rounded}/{max}
        </span>
      </dd>
    </div>
  );
}

interface PlayerActionsProps {
  room: CityRoom;
  targetId: string;
  name: string;
  isBlocked: boolean;
  onDone: () => void;
}

/** Lo mismo que el menú del jugador: Saludar, Intercambiar y Bloquear / Desbloquear. */
function PlayerActions({ room, targetId, name, isBlocked, onDone }: PlayerActionsProps) {
  const choose = (action: (room: CityRoom, targetId: string) => void) => {
    action(room, targetId);
    onDone();
  };
  return (
    <div className={cx("player-details-actions")}>
      <button type="button" onClick={() => choose(sendGreet)}>
        👋 Saludar
      </button>
      <button type="button" onClick={() => choose(sendTradeRequest)}>
        🔁 Intercambiar
      </button>
      <button
        type="button"
        aria-pressed={isBlocked}
        title="Dejás de ver su chat y sus mensajes (sólo vos, en este navegador)"
        onClick={() => toggleBlocked(name)}
      >
        {isBlocked ? "✅ Desbloquear" : "🚫 Bloquear"}
      </button>
    </div>
  );
}
