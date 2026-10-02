"use client";

import { CITIES, TICKET_ID, formatJailLeft, whereToBuy } from "@montevideo-world/shared";
import { requestTravel } from "@/lib/gameActions";
import { useGame } from "@/lib/gameStore";
import type { PanelProps } from "./panels";
import { UiIcon } from "./UiIcon";

/**
 * Lista de barrios (tecla M): sólo los nombres, dónde estás y el botón para viajar a los demás.
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal city-menu"
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
          {CITIES.map((city) => (
            <li key={city.id} className={city.id === currentCityId ? "current" : undefined}>
              <div className="city-menu-title">
                <strong>{city.name}</strong>
                {city.prison && <small className="city-menu-note">de visita</small>}
                {city.id === currentCityId ? (
                  <span className="city-menu-badge">Estás acá</span>
                ) : (
                  <button
                    type="button"
                    className="city-menu-go"
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
          <span className="key-hint">
            Apretá <kbd>M</kbd> o <kbd>Esc</kbd> para cerrar
          </span>
        </footer>
      </section>
    </div>
  );
}
