"use client";

import { useEffect, useState } from "react";
import { CITY_INFOS, CityOccupancy, MessageType, TICKET_ID, formatJailLeft, isPublicCity, whereToBuy } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { requestTravel } from "@/lib/gameActions";
import { useGame } from "@/lib/gameStore";
import type { PanelProps } from "../../shell/panels";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./cities.module.css";

const cx = moduleClasses(styles);

/** Cada cuánto se vuelve a pedir la ocupación con la lista abierta. */
const OCCUPANCY_REFRESH_MS = 5000;

/** "12 jugando" (y en cuántas copias, si el barrio se llenó y se abrió otra). */
function occupancyLabel(occupancy: CityOccupancy | undefined): string {
  const players = occupancy?.players ?? 0;
  const label = players === 0 ? "nadie jugando" : players === 1 ? "1 jugando" : `${players} jugando`;
  return occupancy && occupancy.copies > 1 ? `${label} · ${occupancy.copies} copias` : label;
}

/**
 * Lista de barrios (tecla M): los nombres, cuántos juegan en cada uno, dónde estás y el botón para viajar a los demás.
 * Cada viaje gasta un boleto STM de la mochila (se compran en la Agencia STM); la mochila viaja con vos.
 */
export function CityMenu({ room, cityId: currentCityId, onClose }: PanelProps) {
  /** Boletos STM en la mochila (cada viaje gasta uno). */
  const tickets = useGame(
    (state) => state.inventory?.stacks.reduce((total, stack) => total + (stack.itemId === TICKET_ID ? stack.quantity : 0), 0) ?? 0,
  );
  /** Con un viaje en curso los botones se deshabilitan. */
  const traveling = useGame((state) => state.traveling !== null);
  /** Preso en el COMCAR: no se viaja a ningún lado (el server tampoco lo deja). */
  const jailLeft = useGame((state) => state.jailLeft);
  const canTravel = tickets > 0 && jailLeft === 0;
  /** Ocupación de cada barrio (la pide al abrir y cada `OCCUPANCY_REFRESH_MS`). */
  const [occupancy, setOccupancy] = useState<Map<string, CityOccupancy> | null>(null);

  useEffect(() => {
    const off = eventBus.on("cities:update", (message) => setOccupancy(new Map(message.cities.map((city) => [city.cityId, city]))));
    const request = () => room.send(MessageType.CitiesRequest);
    request();
    const timer = window.setInterval(request, OCCUPANCY_REFRESH_MS);
    return () => {
      off();
      window.clearInterval(timer);
    };
  }, [room]);

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal city-menu")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-menu-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="city-menu-title">
            <UiIcon name="map" size={18} />
            Barrios de Montevideo
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <ul>
          {CITY_INFOS.filter(isPublicCity).map((city) => (
            <li key={city.id} className={cx(city.id === currentCityId ? "current" : undefined)}>
              <div className={cx("city-menu-title")}>
                <strong>{city.name}</strong>
                {city.prison && <small className={cx("city-menu-note")}>de visita</small>}
                {occupancy && <small className={cx("city-menu-note city-menu-occupancy")}>{occupancyLabel(occupancy.get(city.id))}</small>}
                {city.id === currentCityId ? (
                  <span className={cx("city-menu-badge")}>Estás acá</span>
                ) : (
                  <button
                    type="button"
                    className={cx("city-menu-go")}
                    disabled={traveling || !canTravel}
                    title={
                      jailLeft > 0
                        ? "Estás preso: no podés salir del COMCAR"
                        : canTravel
                          ? "Usa 1 boleto STM"
                          : `No tenés boletos: se compran en ${whereToBuy(TICKET_ID)}`
                    }
                    onClick={() => requestTravel(room, currentCityId, city.id)}
                  >
                    Ir · 1 boleto
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <footer>
          {jailLeft > 0 ? (
            <>
              🚔 Estás preso en el COMCAR: no podés ir a ningún lado. Te quedan <strong>{formatJailLeft(jailLeft)}</strong>.
            </>
          ) : (
            <>
              🚌 Cada viaje usa un boleto STM. Tenés <strong>{tickets}</strong>
              {tickets === 0 ? `: se compran en ${whereToBuy(TICKET_ID)}.` : "."}
            </>
          )}{" "}
          <span className={cx("key-hint")}>
            Apretá <kbd>M</kbd> o <kbd>Esc</kbd> para cerrar
          </span>
        </footer>
      </section>
    </div>
  );
}
