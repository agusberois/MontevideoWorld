import type { ReactNode } from "react";
import { moduleClasses } from "@/lib/cx";
import styles from "./UiIcon.module.css";

const cx = moduleClasses(styles);

/**
 * Íconos de interfaz (HUD y títulos de paneles) en SVG de trazo: se ven nítidos en cualquier
 * pantalla, iguales en todos los sistemas (a diferencia de los emojis) y toman el color del texto
 * (`currentColor`).
 */
export type UiIconName = "user" | "pin" | "moneyBag" | "users" | "map" | "backpack" | "shop" | "exit" | "fishingRod" | "cart" | "music" | "flag" | "wand" | "crosshair" | "zap" | "food" | "heart" | "shield" | "sun" | "moon" | "rain" | "wind" | "heat" | "horizon" | "megaphone" | "terminal" | "hand" | "calendar";

const PATHS: Record<UiIconName, ReactNode> = {
  user: (
    <>
      <circle cx={12} cy={8} r={4} />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx={12} cy={9.5} r={2.5} />
    </>
  ),
  moneyBag: (
    <>
      <path d="M9 3h6l-1.5 3h-3z" />
      <path d="M10.5 6C6 8 4 12 4 15.5 4 19 6.5 21 12 21s8-2 8-5.5S18 8 13.5 6" />
      <path d="M14 11.3c-.4-.6-1.1-.9-2-.9-1.1 0-2 .6-2 1.5s.9 1.3 2 1.5 2 .6 2 1.5-.9 1.5-2 1.5c-.9 0-1.6-.3-2-.9M12 9.2v1.2M12 16.4v1.2" />
    </>
  ),
  users: (
    <>
      <circle cx={9} cy={8} r={3.5} />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
    </>
  ),
  map: (
    <>
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  backpack: (
    <>
      <path d="M5 10a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" />
      <path d="M9 5V4a3 3 0 0 1 6 0v1" />
      <path d="M8 21v-5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v5M8 18h8" />
    </>
  ),
  shop: (
    <>
      <path d="M5 8h14l-1 13H6z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </>
  ),
  fishingRod: (
    <>
      <path d="M4 20L18 4" />
      <path d="M18 4c1.5 3 2 8 1 12" />
      <circle cx={19} cy={18} r={2} />
      <path d="M6 15.5l2.5 2.5" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4h11l-2 4 2 4H5" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V5l11-2v13" />
      <circle cx={6.5} cy={18} r={2.5} />
      <circle cx={17.5} cy={16} r={2.5} />
    </>
  ),
  cart: (
    <>
      <path d="M3 8h13v8H3z" />
      <path d="M16 10h3l2 4v2h-5" />
      <circle cx={7} cy={18.5} r={1.8} />
      <circle cx={17} cy={18.5} r={1.8} />
      <path d="M6 5h7" />
    </>
  ),
  crosshair: (
    <>
      <circle cx={12} cy={12} r={7} />
      <circle cx={12} cy={12} r={1.5} />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  wand: (
    <>
      <path d="M4 20L15 9" />
      <path d="M15 9l2 2" />
      <path d="M18 3v3M16.5 4.5h3M20 9v2M19 10h2M12 3v2M11 4h2" />
    </>
  ),
  zap: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  food: (
    <>
      <path d="M5 3v5a2 2 0 0 0 4 0V3M7 10v11" />
      <path d="M17 3c-2.5 2-2.5 7 0 8.5V21" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  sun: (
    <>
      <circle cx={12} cy={12} r={4} />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  rain: (
    <>
      <path d="M7 15a4.5 4.5 0 0 1-.6-9 5.5 5.5 0 0 1 10.6 1.5A3.75 3.75 0 0 1 17 15z" />
      <path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
    </>
  ),
  wind: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8" />,
  heat: (
    <>
      <path d="M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0z" />
      <path d="M12 9v7M18 4l1.5-1.5M18 9h2M18 14l1.5 1.5" />
    </>
  ),
  megaphone: (
    <>
      <path d="M3 10v4a1 1 0 0 0 1 1h3l7 4V5L7 9H4a1 1 0 0 0-1 1z" />
      <path d="M17.5 8.5a5 5 0 0 1 0 7M8 15l1.5 5h2.5l-1-5" />
    </>
  ),
  horizon: (
    <>
      <path d="M7 17a5 5 0 0 1 10 0" />
      <path d="M2 17h20M5 21h14M12 5v3M4.9 9.9l1.4 1.4M19.1 9.9l-1.4 1.4" />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9l3 3-3 3M12 15h5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2M11 17.5h2" />
    </>
  ),
  hand: (
    <>
      <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M11 10.5v-6a1.5 1.5 0 0 1 3 0V11" />
      <path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-.5a6.5 6.5 0 0 1-5-2.4L2.8 16a1.5 1.5 0 0 1 2.3-1.9L8 16" />
    </>
  ),
  exit: (
    <>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 16l4-4-4-4M19 12H9" />
    </>
  ),
};

interface UiIconProps {
  name: UiIconName;
  size?: number;
  className?: string;
}

export function UiIcon({ name, size = 16, className }: UiIconProps) {
  return (
    <svg
      className={cx(className ? `ui-icon ${className}` : "ui-icon")}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
