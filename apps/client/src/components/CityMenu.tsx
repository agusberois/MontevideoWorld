"use client";

import { CITIES, TRAVEL_FARE, formatMoney } from "@montevideo-world/shared";
import { UiIcon } from "./UiIcon";

interface CityMenuProps {
  currentCityId: string;
  /** Saldo propio (para saber si alcanza el boleto); null hasta que llega. */
  money: number | null;
  /** Hay un viaje en curso (los botones se deshabilitan). */
  traveling: boolean;
  onTravel: (cityId: string) => void;
  onClose: () => void;
}

/**
 * Lista de barrios (tecla M): sólo los nombres, dónde estás y el botón para viajar a los demás.
 * Viajar cuesta un boleto de STM (`TRAVEL_FARE`); la mochila viaja con vos.
 */
export function CityMenu({ currentCityId, money, traveling, onTravel, onClose }: CityMenuProps) {
  const canAfford = money !== null && money >= TRAVEL_FARE;

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
                {city.id === currentCityId ? (
                  <span className="city-menu-badge">Estás acá</span>
                ) : (
                  <button
                    type="button"
                    className="city-menu-go"
                    disabled={traveling || !canAfford}
                    title={canAfford ? `Boleto de STM: ${formatMoney(TRAVEL_FARE)}` : `No te alcanza: el boleto sale ${formatMoney(TRAVEL_FARE)}`}
                    onClick={() => onTravel(city.id)}
                  >
                    Ir · {formatMoney(TRAVEL_FARE)}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <footer>
          🚌 Moverse entre barrios cuesta un boleto de STM ({formatMoney(TRAVEL_FARE)}). Apretá <kbd>M</kbd> o <kbd>Esc</kbd>{" "}
          para cerrar
        </footer>
      </section>
    </div>
  );
}
