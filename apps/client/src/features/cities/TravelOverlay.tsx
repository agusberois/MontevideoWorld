"use client";
import { moduleClasses } from "@/lib/cx";
import styles from "./cities.module.css";

const cx = moduleClasses(styles);


/** Lo que dura el viaje en ómnibus entre barrios (como mínimo: si el server tarda más, se espera). */
export const TRAVEL_MS = 5000;
/** Cruzar una puerta (las Termas) o el borde de 18 de Julio: un fundido corto, sin ómnibus. */
export const DOOR_MS = 700;

/**
 * Pantalla al cruzar una puerta: se oscurece y dice adónde se entra. `walk`: era el borde de 18 de
 * Julio (entre Ciudad Vieja y el Centro), se va caminando.
 */
export function DoorOverlay({ to, walk }: { to: string; walk?: boolean }) {
  return (
    <div className={cx("door-overlay")} role="status" aria-live="polite">
      <p>{walk ? `🚶 Caminando a ${to}` : `🚪 ${to}`}…</p>
    </div>
  );
}

interface TravelOverlayProps {
  from: string;
  to: string;
  /** Te lleva la ambulancia (desmayo), no el ómnibus: blanca con la cruz roja y otro texto. */
  ambulance?: boolean;
}

/**
 * Pantalla del viaje entre barrios: un ómnibus de STM andando por la calle (ruedas que giran,
 * carrocería que se mece, edificios y líneas de la calle pasando) y una barra de progreso.
 * Todo es SVG + CSS: no depende de Phaser, que en ese momento está cambiando de barrio.
 */
export function TravelOverlay({ from, to, ambulance = false }: TravelOverlayProps) {
  const stripe = ambulance ? "#d7263d" : "#1d4fa0";
  const label = ambulance ? "SAMU" : "STM";
  return (
    <div className={cx(`travel-overlay${ambulance ? " ambulance" : ""}`)} role="status" aria-live="polite">
      <div className={cx("travel-card")}>
        <p className={cx("travel-route")}>
          <span>{from}</span>
          <span aria-hidden="true">→</span>
          <strong>{to}</strong>
        </p>

        <div className={cx("travel-scene")} aria-hidden="true">
          <svg className={cx("travel-skyline")} viewBox="0 0 800 120" preserveAspectRatio="none">
            {/* Dos tiras iguales una al lado de la otra: al correr la mitad, el loop no se nota. */}
            {[0, 400].map((offset) => (
              <g key={offset} transform={`translate(${offset} 0)`}>
                <rect x="10" y="40" width="46" height="80" fill="#3a4357" />
                <rect x="62" y="20" width="38" height="100" fill="#465069" />
                <rect x="106" y="58" width="56" height="62" fill="#3a4357" />
                <rect x="170" y="10" width="34" height="110" fill="#505b77" />
                <rect x="212" y="48" width="60" height="72" fill="#3f485e" />
                <rect x="280" y="30" width="44" height="90" fill="#465069" />
                <rect x="332" y="64" width="62" height="56" fill="#3a4357" />
              </g>
            ))}
          </svg>

          <div className={cx("travel-bus")}>
            <svg viewBox="0 0 220 96" width="220" height="96">
              {/* Carrocería */}
              <rect x="4" y="8" width="208" height="70" rx="12" fill="#f4f5f2" stroke="#1d2433" strokeWidth="3" />
              <rect x="4" y="54" width="208" height="10" fill={stripe} />
              <rect x="4" y="64" width="208" height="4" fill={ambulance ? "#f2b705" : "#e63946"} />
              {/* Ventanas (la ambulancia: una sola atrás y la cruz roja al costado) */}
              {ambulance ? (
                <>
                  <rect x="18" y="18" width="30" height="26" rx="3" fill="#9fc9d9" stroke="#1d2433" strokeWidth="2" />
                  <rect x="86" y="16" width="12" height="34" fill="#d7263d" />
                  <rect x="75" y="27" width="34" height="12" fill="#d7263d" />
                  <rect x="70" y="2" width="22" height="7" rx="2" fill="#d7263d" className={cx("travel-siren")} />
                </>
              ) : (
                [18, 54, 90, 126].map((x) => (
                  <rect key={x} x={x} y="18" width="30" height="26" rx="3" fill="#9fc9d9" stroke="#1d2433" strokeWidth="2" />
                ))
              )}
              {/* Parabrisas y cartel de destino */}
              <path d="M166 18 h34 a6 6 0 0 1 6 6 v24 h-40 z" fill="#9fc9d9" stroke="#1d2433" strokeWidth="2" />
              <rect x="150" y="10" width="56" height="7" rx="2" fill="#1d2433" />
              <text x="178" y="16" textAnchor="middle" fontSize="6" fontWeight="800" fill="#ffd166">
                {label}
              </text>
              {/* Puerta y faro */}
              <rect x="166" y="48" width="18" height="26" fill="#9fc9d9" stroke="#1d2433" strokeWidth="2" />
              <circle cx="206" cy="66" r="4" fill="#ffd166" />
              <text x="80" y="62" textAnchor="middle" fontSize="8" fontWeight="800" fill="#ffffff">
                {label}
              </text>
              {/* Ruedas: el rayo gira */}
              {[46, 166].map((wheelX) => (
                <g key={wheelX} transform={`translate(${wheelX} 80)`}>
                  <circle r="14" fill="#1d2433" />
                  <circle r="7" fill="#9aa3b8" />
                  <g className={cx("travel-wheel")}>
                    <rect x="-1.5" y="-7" width="3" height="14" fill="#1d2433" />
                    <rect x="-7" y="-1.5" width="14" height="3" fill="#1d2433" />
                  </g>
                </g>
              ))}
            </svg>
          </div>

          <div className={cx("travel-road")} />
        </div>

        <span className={cx("travel-progress")} aria-hidden="true">
          <span style={{ animationDuration: `${TRAVEL_MS}ms` }} />
        </span>
        <p className={cx("travel-hint")}>{ambulance ? "🚑 La ambulancia te lleva al Sanatorio Americano…" : "🚌 Viajando en ómnibus…"}</p>
      </div>
    </div>
  );
}
