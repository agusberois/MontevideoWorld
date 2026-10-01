import type { ReactNode } from "react";
import type { FishItem, ItemDefinition, ItemSlot, ItemStyle } from "@montevideo-world/shared";

/** Aclara (amount > 0) u oscurece (amount < 0) un "#rrggbb" mezclándolo con blanco o negro. */
function mix(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * (1 - t) + target * t);
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
}

/**
 * Silueta de cada estilo de prenda en un viewBox de 32×32. `fill` es el color de la prenda,
 * `dark` su contorno/sombras y `light` los detalles; así cada ícono se ve del color real del ítem.
 */
function shape(style: ItemStyle, fill: string, dark: string, light: string): ReactNode {
  const body = { fill, stroke: dark, strokeWidth: 1.5, strokeLinejoin: "round" as const };
  const detail = { fill: "none", stroke: dark, strokeWidth: 1.2, strokeLinecap: "round" as const };

  switch (style) {
    case "tshirt":
    case "jersey":
      return (
        <>
          <path {...body} d="M11 5 L6 7.5 L2.5 12.5 L6.5 15.5 L8.5 13.5 L8.5 28 L23.5 28 L23.5 13.5 L25.5 15.5 L29.5 12.5 L26 7.5 L21 5 Q16 9 11 5 Z" />
          {style === "jersey" ? (
            <>
              <path d="M12 5.5 L16 11 L20 5.5" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinejoin="round" />
              <circle cx={20.5} cy={15} r={1.8} fill="#f2b705" />
            </>
          ) : (
            <path {...detail} d="M12 5.8 Q16 8.5 20 5.8" />
          )}
        </>
      );
    case "hoodie":
      return (
        <>
          <path {...body} d="M11 5 L5.5 8 L3 26 L7 26 L8.5 15 L8.5 28 L23.5 28 L23.5 15 L25 26 L29 26 L26.5 8 L21 5 Q16 10 11 5 Z" />
          <path {...detail} d="M11 5 Q16 13 21 5" />
          <path {...detail} d="M11.5 21 L20.5 21 L19.5 26 L12.5 26 Z" />
          <path d="M14.5 9.5 L14.5 14 M17.5 9.5 L17.5 14" stroke={light} strokeWidth={1} />
        </>
      );
    case "tank":
      return (
        <>
          <path {...body} d="M11 4 L11 9 Q8 12 8 16 L8 28 L24 28 L24 16 Q24 12 21 9 L21 4 L19 4 Q16 10 13 4 Z" />
          <path {...detail} d="M13.5 4.5 Q16 9 18.5 4.5" />
        </>
      );
    case "jeans":
    case "pants":
      return (
        <>
          <path {...body} d="M8 4 L24 4 L26 29 L19 29 L16 13 L13 29 L6 29 Z" />
          <path {...detail} d="M8 7.5 L24 7.5" />
          {style === "jeans" && <path d="M11 8 Q11 12 8.5 12 M21 8 Q21 12 23.5 12" fill="none" stroke={light} strokeWidth={1} />}
        </>
      );
    case "shorts":
      return (
        <>
          <path {...body} d="M7 7 L25 7 L27.5 21 L18.5 22 L16 14 L13.5 22 L4.5 21 Z" />
          <path {...detail} d="M7 10.5 L25 10.5" />
          <path d="M15 8 L15 12 M17 8 L17 12" stroke={light} strokeWidth={1} />
        </>
      );
    case "sneakers":
      return (
        <>
          <path {...body} d="M3 21 L3 14 Q3 11 6.5 11 L12 11 L15 14 L22 16 Q29 17 29 21 L29 22.5 L3 22.5 Z" />
          <rect x={3} y={22.5} width={26} height={3} rx={1} fill={light} stroke={dark} strokeWidth={1.2} />
          <path d="M11 13 L14 15.5 M13 12.5 L16.5 15.5" stroke={light} strokeWidth={1.2} />
        </>
      );
    case "boots":
      return (
        <>
          <path {...body} d="M8 4 L17.5 4 L17.5 17 L24 19 Q29 20 29 24 L29 26 L8 26 Z" />
          <rect x={7.5} y={26} width={22} height={2.8} rx={1} fill={dark} />
          <path {...detail} d="M8 8.5 L17.5 8.5" />
        </>
      );
    case "flipflops":
      return (
        <>
          <ellipse cx={16} cy={17.5} rx={7.5} ry={12} fill={fill} stroke={dark} strokeWidth={1.5} />
          <path d="M10 14 L16 19.5 L22 14" fill="none" stroke={light} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={16} cy={19.5} r={1.3} fill={light} />
        </>
      );
    case "cap":
      return (
        <>
          <path {...body} d="M5 21 Q5 8 15 8 Q25 8 25 21 Z" />
          <path {...body} d="M21 19.5 Q30 19 30.5 22.5 L19 23 Z" />
          <path {...detail} d="M15 8.5 L15 21" />
          <circle cx={15} cy={8} r={1.4} fill={dark} />
        </>
      );
    case "beanie":
      return (
        <>
          <path {...body} d="M6 21 Q6 8 16 8 Q26 8 26 21 Z" />
          <rect x={5} y={19.5} width={22} height={6} rx={2} fill={dark} />
          <path d="M10 20 L10 25 M14 20 L14 25 M18 20 L18 25 M22 20 L22 25" stroke={fill} strokeWidth={1} opacity={0.6} />
          <circle cx={16} cy={6} r={3.2} fill={light} stroke={dark} strokeWidth={1} />
        </>
      );
    case "beret":
      return (
        <>
          <ellipse cx={15} cy={18} rx={13} ry={6.5} fill={fill} stroke={dark} strokeWidth={1.5} />
          <ellipse cx={12} cy={16} rx={5} ry={2} fill={light} opacity={0.35} />
          <rect x={14.3} y={9} width={1.6} height={4} rx={0.8} fill={dark} />
        </>
      );
  }
}

/** Silueta de pez (de perfil o plano, como el lenguado) mirando a la derecha. */
function fishShape(shape: FishItem["shape"], fill: string, dark: string, light: string): ReactNode {
  if (shape === "flat") {
    return (
      <>
        <ellipse cx={15} cy={16} rx={11} ry={8.5} fill={fill} stroke={dark} strokeWidth={1.5} />
        <path d="M26 16 L31 11.5 L31 20.5 Z" fill={fill} stroke={dark} strokeWidth={1.2} strokeLinejoin="round" />
        <path d="M6 16 Q15 9.5 24 16 Q15 22.5 6 16" fill="none" stroke={light} strokeWidth={1} opacity={0.7} />
        <circle cx={20.5} cy={12.5} r={1.4} fill="#1b1b1b" />
        <circle cx={22.5} cy={14} r={1.2} fill="#1b1b1b" />
        <circle cx={11} cy={17} r={1} fill={dark} opacity={0.6} />
        <circle cx={15} cy={20} r={1} fill={dark} opacity={0.6} />
      </>
    );
  }
  return (
    <>
      <path d="M3 16 L9 11 L9 21 Z" fill={fill} stroke={dark} strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M8 16 Q14 7.5 22 9.5 Q29 11.5 30 16 Q29 20.5 22 22.5 Q14 24.5 8 16 Z" fill={fill} stroke={dark} strokeWidth={1.5} />
      <path d="M14 9.5 Q17 6 21 9.2" fill={dark} />
      <path d="M10 16 Q19 13.5 28 15.5" fill="none" stroke={light} strokeWidth={1} opacity={0.8} />
      <path d="M23 11 Q21 16 23 21" fill="none" stroke={dark} strokeWidth={1} />
      <circle cx={26} cy={14.5} r={1.5} fill="#1b1b1b" />
    </>
  );
}

/** Prenda genérica de cada lugar (para lugares vacíos y placeholders). */
const SLOT_PLACEHOLDER_STYLE: Record<ItemSlot, ItemStyle> = {
  hat: "cap",
  top: "tshirt",
  bottom: "pants",
  shoes: "sneakers",
};

interface ItemIconProps {
  item: ItemDefinition;
  size?: number;
}

/** Ícono de un ítem (prenda o pescado) con su forma y su color reales. */
export function ItemIcon({ item, size = 30 }: ItemIconProps) {
  return (
    <span className="item-icon" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 32 32" width={size - 4} height={size - 4}>
        {item.category === "fish"
          ? fishShape(item.shape, item.color, mix(item.color, -0.45), mix(item.color, 0.55))
          : shape(item.style, item.color, mix(item.color, -0.45), mix(item.color, 0.55))}
      </svg>
    </span>
  );
}

/** Silueta gris del lugar vacío (cabeza, torso, piernas, pies). */
export function SlotPlaceholderIcon({ slot, size = 30 }: { slot: ItemSlot; size?: number }) {
  return (
    <span className="item-icon item-icon-empty" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 32 32" width={size - 4} height={size - 4}>
        {shape(SLOT_PLACEHOLDER_STYLE[slot], "#5b6274", "#3a3f4c", "#7d8496")}
      </svg>
    </span>
  );
}
