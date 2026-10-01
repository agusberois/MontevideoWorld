"use client";

import { CITIES } from "@montevideo-world/shared";
import { UiIcon } from "./UiIcon";

interface CityMenuProps {
  currentCityId: string;
  onClose: () => void;
}

/** Lista de barrios (tecla M). Por ahora sólo informa dónde estás; viajar entre barrios viene después. */
export function CityMenu({ currentCityId, onClose }: CityMenuProps) {
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
                {city.id === currentCityId && <span className="city-menu-badge">Estás acá</span>}
              </div>
              <p>{city.description}</p>
              <ul className="city-menu-landmarks">
                {city.landmarks.map((landmark) => (
                  <li key={landmark.id} title={landmark.description}>
                    {landmark.name}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <footer>
          Apretá <kbd>M</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}
