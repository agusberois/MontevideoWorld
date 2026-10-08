import type { ReactNode } from "react";
import type { FishItem, FoodShape, InstrumentKind, ItemCategory, MedicineShape, ItemDefinition, ItemSlot, ItemStyle } from "@montevideo-world/shared";
import { moduleClasses } from "@/lib/cx";
import styles from "./inventory.module.css";

const cx = moduleClasses(styles);

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
    case "vest":
      // Chaleco abierto adelante, con las dos bandas reflectivas.
      return (
        <>
          <path {...body} d="M10 4 L10 9 Q7 12 7 16 L7 28 L15 28 L15 12 L12.5 4 Z M22 4 L22 9 Q25 12 25 16 L25 28 L17 28 L17 12 L19.5 4 Z" />
          <path d="M7.5 17.5 L15 17.5 M17 17.5 L24.5 17.5 M7.5 22.5 L15 22.5 M17 22.5 L24.5 22.5" stroke="#e6e9ee" strokeWidth={2} />
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
  // Un estilo nuevo sin dibujo no compila (ReactNode acepta undefined y no lo avisaría).
  const missing: never = style;
  return missing;
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

/** Caña en diagonal con reel y tanza; las de más nivel llevan más anillos dorados. */
function rodShape(fill: string, dark: string, tier: number) {
  return (
    <>
      <line x1={6} y1={28} x2={27} y2={4} stroke={dark} strokeWidth={3.6} strokeLinecap="round" />
      <line x1={6} y1={28} x2={27} y2={4} stroke={fill} strokeWidth={2.2} strokeLinecap="round" />
      <line x1={6} y1={28} x2={10.5} y2={23} stroke="#2b2b30" strokeWidth={3.4} strokeLinecap="round" />
      {Array.from({ length: tier }, (_, i) => {
        const t = 0.45 + i * 0.13;
        return <circle key={i} cx={6 + 21 * t} cy={28 - 24 * t} r={1.3} fill="#ffd166" stroke={dark} strokeWidth={0.6} />;
      })}
      <circle cx={11} cy={20.5} r={3.2} fill="#5b6274" stroke="#2b2b30" strokeWidth={1.2} />
      <path d="M27 4 Q 29 14 26 22" fill="none" stroke="#7d8496" strokeWidth={0.8} />
      <circle cx={26} cy={23} r={1.4} fill="#e63946" />
    </>
  );
}

/**
 * Carrito de vendedor: la conservadora es una caja con tapa; los demás, carrito con ruedas, y desde
 * el nivel 3 con sombrilla. Lleva tantas estrellitas doradas como su nivel.
 */
function cartShape(fill: string, dark: string, tier: number) {
  if (tier === 1) {
    return (
      <>
        <rect x={7} y={13} width={18} height={13} rx={2} fill={fill} stroke={dark} strokeWidth={1.5} />
        <rect x={6} y={10} width={20} height={4.5} rx={1.5} fill="#f4f4f4" stroke={dark} strokeWidth={1.2} />
        <rect x={12} y={6.5} width={8} height={4} rx={1.5} fill="none" stroke="#2b2b30" strokeWidth={1.6} />
        <circle cx={16} cy={20.5} r={1.4} fill="#ffd166" stroke={dark} strokeWidth={0.6} />
      </>
    );
  }
  return (
    <>
      {tier >= 3 && (
        <>
          <line x1={15} y1={6} x2={15} y2={16} stroke="#9aa1a9" strokeWidth={1.4} />
          <path d="M5 8 Q15 0 25 8 Z" fill={fill} stroke={dark} strokeWidth={1.2} />
          <path d="M11.5 5.2 Q15 1.5 18.5 5.2 L17 8 L13 8 Z" fill="#ffffff" opacity={0.85} />
        </>
      )}
      <line x1={25} y1={17} x2={29} y2={12} stroke="#9aa1a9" strokeWidth={2} strokeLinecap="round" />
      <rect x={4} y={15} width={22} height={10} rx={2} fill={fill} stroke={dark} strokeWidth={1.5} />
      <rect x={5.5} y={19} width={19} height={2} fill="#ffffff" opacity={0.85} />
      <circle cx={9} cy={27} r={2.8} fill="#2b2b30" />
      <circle cx={21} cy={27} r={2.8} fill="#2b2b30" />
      {Array.from({ length: tier }, (_, i) => (
        <circle key={i} cx={8 + i * 4.5} cy={17} r={1.2} fill="#ffd166" stroke={dark} strokeWidth={0.5} />
      ))}
    </>
  );
}

/** Boleto de ómnibus: tarjeta con muescas, franja de color y "STM". */
/** Sobre cerrado con el sello rojo (el de la bienvenida). */
function letterShape(fill: string, dark: string) {
  return (
    <>
      <rect x={4} y={9} width={24} height={16} rx={1.5} fill={fill} stroke={dark} strokeWidth={1.4} />
      <path d="M4.8 9.8 L16 18 L27.2 9.8" fill="none" stroke={dark} strokeWidth={1.3} strokeLinejoin="round" />
      <circle cx={16} cy={18} r={2.6} fill="#c0392b" stroke="#7a1f16" strokeWidth={0.8} />
    </>
  );
}

function ticketShape(fill: string, dark: string) {
  return (
    <>
      <path
        d="M4 9 H28 V13 A3 3 0 0 0 28 19 V23 H4 V19 A3 3 0 0 0 4 13 Z"
        fill="#f4f6f8"
        stroke={dark}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <rect x={4.7} y={9.7} width={22.6} height={4.3} fill={fill} />
      <line x1={21} y1={15} x2={21} y2={22.3} stroke={dark} strokeWidth={1} strokeDasharray="1.5 1.5" />
      <text x={12.5} y={21} textAnchor="middle" fontSize={6} fontWeight={800} fontFamily="system-ui, sans-serif" fill={fill}>
        STM
      </text>
    </>
  );
}

/** Comidas: torta frita, alfajor, mate, pancho, chivito y pescado a la plancha; y los tragos de la barra del casino. */
function foodShape(kind: FoodShape, fill: string, dark: string, light: string): ReactNode {
  const outline = { stroke: dark, strokeWidth: 1.3, strokeLinejoin: "round" as const };
  switch (kind) {
    case "tortaFrita":
      return (
        <>
          <ellipse cx={16} cy={17} rx={12} ry={8} fill={fill} {...outline} />
          <circle cx={16} cy={16} r={1.6} fill={dark} />
          <path d="M9 14 L10 15 M21 19 L22 20 M12 20 L13 21 M20 12.5 L21 13.5" stroke="#f4efe3" strokeWidth={1.2} strokeLinecap="round" />
        </>
      );
    case "alfajor":
      return (
        <>
          <ellipse cx={16} cy={20} rx={11} ry={5} fill={fill} {...outline} />
          <rect x={5} y={15} width={22} height={4} fill="#f4e3c3" />
          <ellipse cx={16} cy={14.5} rx={11} ry={5} fill={fill} {...outline} />
          <path d="M9 13 Q12 11.5 15 13 M17 12 Q20 10.5 23 12.5" stroke={light} strokeWidth={1} fill="none" />
        </>
      );
    case "mate":
      return (
        <>
          <path d="M8 12 Q7 26 16 27 Q25 26 24 12 Z" fill="#8a5a2b" {...outline} />
          <ellipse cx={16} cy={12} rx={8} ry={2.5} fill={fill} {...outline} />
          <path d="M18 12 L23 3" stroke="#c9ccd1" strokeWidth={2.2} strokeLinecap="round" />
          <path d="M9 17 H23" stroke="#c9a227" strokeWidth={1.4} />
        </>
      );
    case "pancho":
      return (
        <>
          <path d="M4 17 Q16 27 28 17 L27 15 Q16 22 5 15 Z" fill="#e0a84a" {...outline} />
          <rect x={3} y={12} width={26} height={5} rx={2.5} fill={fill} {...outline} />
          <path d="M6 14.5 Q9 12.5 12 14.5 T18 14.5 T24 14.5" stroke="#f2c500" strokeWidth={1.4} fill="none" />
          <path d="M4 15 Q16 9 28 15 L27 11 Q16 5 5 11 Z" fill="#e8b65a" {...outline} />
        </>
      );
    case "chivito":
      return (
        <>
          <path d="M4 20 Q16 26 28 20 L28 22 Q16 28 4 22 Z" fill={fill} {...outline} />
          <path d="M5 19 H27" stroke="#5f9a46" strokeWidth={2.2} />
          <path d="M5 17 H27" stroke="#c0392b" strokeWidth={1.8} />
          <path d="M5 15 H27" stroke="#7a3e1e" strokeWidth={2.2} />
          <ellipse cx={16} cy={13} rx={6} ry={2} fill="#ffffff" />
          <circle cx={16} cy={13} r={1.6} fill="#f2b705" />
          <path d="M4 13 Q16 3 28 13 Z" fill={fill} {...outline} />
        </>
      );
    case "fishPlate":
      return (
        <>
          <ellipse cx={16} cy={19} rx={13} ry={7} fill="#f4f6f8" {...outline} />
          <path d="M8 18 Q14 12 21 17 L25 14 L25 21 L21 19 Q14 24 8 18 Z" fill={fill} stroke={dark} strokeWidth={1} />
          <path d="M11 17 L13 19 M14 16 L16 18.5 M17 16.5 L19 18.5" stroke="#9a6b3a" strokeWidth={1} strokeLinecap="round" />
          <circle cx={6.5} cy={21} r={1.8} fill="#f2e86d" />
        </>
      );
    case "coffee":
      return (
        <>
          <ellipse cx={15} cy={26} rx={11} ry={3} fill="#f4f6f8" {...outline} />
          <path d="M8 13 H22 L20.5 24 Q15 26 9.5 24 Z" fill="#f4f6f8" {...outline} />
          <path d="M22 15 Q27 15.5 26 19 Q25 22 21 21.5" fill="none" stroke={dark} strokeWidth={1.4} />
          <ellipse cx={15} cy={13} rx={7} ry={1.8} fill={fill} />
          <path d="M12 9 Q11 7 12.5 5 M16 9 Q15 7 16.5 5" stroke="#c9ccd1" strokeWidth={1.2} fill="none" strokeLinecap="round" />
        </>
      );
    case "beer":
      return (
        <>
          <path d="M9 9 H21 V26 Q15 28 9 26 Z" fill={fill} {...outline} />
          <path d="M21 12 Q26 12 26 17 Q26 22 21 22" fill="none" stroke={dark} strokeWidth={1.6} />
          <path d="M8 9 Q10 5 13 7 Q15 4 18 6.5 Q21 5 22 9 Z" fill="#fffaf0" {...outline} />
          <path d="M12 14 V23 M16 14 V23" stroke={light} strokeWidth={1.1} />
        </>
      );
    case "sparkling":
      return (
        <>
          <path d="M10 4 H22 Q22 14 16 16 Q10 14 10 4 Z" fill={fill} {...outline} />
          <path d="M16 16 V25" stroke={dark} strokeWidth={1.4} />
          <ellipse cx={16} cy={26} rx={6} ry={1.8} fill="#e8eef2" {...outline} />
          <circle cx={14} cy={9} r={0.9} fill="#ffffff" />
          <circle cx={17.5} cy={7} r={0.8} fill="#ffffff" />
          <circle cx={16} cy={11.5} r={0.7} fill="#ffffff" />
        </>
      );
    case "liqueur":
      return (
        <>
          <path d="M11 9 H21 L19.5 25 Q16 26.5 12.5 25 Z" fill="#f4f6f8" fillOpacity={0.5} {...outline} />
          <path d="M11.6 15 H20.4 L19.5 25 Q16 26.5 12.5 25 Z" fill={fill} />
          <path d="M13 12 Q16 10.5 19 12" stroke={light} strokeWidth={1} fill="none" />
        </>
      );
    case "whisky":
      return (
        <>
          <path d="M7 12 H25 L23.5 26 H8.5 Z" fill="#f4f6f8" fillOpacity={0.45} {...outline} />
          <path d="M7.6 17 H24.4 L23.5 26 H8.5 Z" fill={fill} />
          <rect x={11} y={14} width={5} height={5} rx={1} fill="#e8f4f8" stroke={dark} strokeWidth={0.8} transform="rotate(-12 13.5 16.5)" />
          <rect x={16.5} y={15} width={4.5} height={4.5} rx={1} fill="#e8f4f8" stroke={dark} strokeWidth={0.8} transform="rotate(10 18.75 17.25)" />
        </>
      );
  }
}

/** Remedios: blíster de pastillas (Perifar), curita, frasco de vitaminas y botiquín. */
function medicineShape(kind: MedicineShape, fill: string, dark: string): ReactNode {
  const outline = { stroke: dark, strokeWidth: 1.3, strokeLinejoin: "round" as const };
  switch (kind) {
    case "pills":
      return (
        <>
          <rect x={5} y={7} width={22} height={18} rx={2.5} fill="#e6e9ee" {...outline} />
          {[10, 16, 22].flatMap((cx) =>
            [12.5, 19.5].map((cy) => <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={2.4} ry={2.6} fill={fill} stroke={dark} strokeWidth={0.8} />),
          )}
        </>
      );
    case "bandage":
      return (
        <g transform="rotate(-35 16 16)">
          <rect x={3} y={11} width={26} height={10} rx={5} fill={fill} {...outline} />
          <rect x={12} y={11.5} width={8} height={9} fill="#f4efe3" />
          {[14, 16, 18].map((x) => (
            <circle key={x} cx={x} cy={16} r={0.7} fill={dark} />
          ))}
        </g>
      );
    case "vitamins":
      return (
        <>
          <rect x={10} y={4} width={12} height={4} rx={1} fill="#f4f6f8" {...outline} />
          <rect x={8} y={8} width={16} height={20} rx={3} fill={fill} {...outline} />
          <rect x={10} y={13} width={12} height={8} rx={1} fill="#f4f6f8" />
          <text x={16} y={19.5} textAnchor="middle" fontSize={6} fontWeight={800} fontFamily="system-ui, sans-serif" fill={dark}>
            C
          </text>
        </>
      );
    case "kit":
      return (
        <>
          <path d="M12 9 V6.5 Q12 5 13.5 5 H18.5 Q20 5 20 6.5 V9" fill="none" {...outline} />
          <rect x={4} y={9} width={24} height={18} rx={3} fill={fill} {...outline} />
          <rect x={14} y={12} width={4} height={12} fill="#ffffff" />
          <rect x={10} y={16} width={12} height={4} fill="#ffffff" />
        </>
      );
  }
}

/** Instrumentos: armónica, guitarra criolla, bandoneón y tambor de candombe. */
function instrumentShape(kind: InstrumentKind, fill: string, dark: string, light: string): ReactNode {
  const outline = { stroke: dark, strokeWidth: 1.3, strokeLinejoin: "round" as const };
  switch (kind) {
    case "harmonica":
      return (
        <g transform="rotate(-20 16 16)">
          <rect x={4} y={12} width={24} height={8} rx={1.5} fill={light} {...outline} />
          <rect x={4} y={15} width={24} height={2} fill={fill} />
          {[7, 10, 13, 16, 19, 22, 25].map((x) => (
            <rect key={x} x={x - 0.8} y={12.8} width={1.6} height={1.8} fill={dark} />
          ))}
        </g>
      );
    case "guitar":
      return (
        <g transform="rotate(35 16 16)">
          <rect x={14.6} y={2} width={2.8} height={14} fill="#6b3e1e" stroke={dark} strokeWidth={0.8} />
          <rect x={13.5} y={1} width={5} height={3} rx={0.8} fill="#3d2414" />
          <ellipse cx={16} cy={18.5} rx={6} ry={5} fill={fill} {...outline} />
          <ellipse cx={16} cy={25} rx={7.5} ry={5.5} fill={fill} {...outline} />
          <circle cx={16} cy={20.5} r={2.2} fill="#2b1a10" />
          <line x1={16} y1={3} x2={16} y2={27} stroke="#f4efe3" strokeWidth={0.5} />
        </g>
      );
    case "bandoneon":
      return (
        <>
          <rect x={3} y={9} width={7} height={15} rx={1.5} fill={fill} {...outline} />
          <rect x={22} y={9} width={7} height={15} rx={1.5} fill={fill} {...outline} />
          {[11, 13.5, 16, 18.5].map((x) => (
            <path key={x} d={`M${x} 10 L${x + 2.5} 12 L${x} 14 L${x + 2.5} 16 L${x} 18 L${x + 2.5} 20 L${x} 22`} fill="none" stroke={dark} strokeWidth={0.9} />
          ))}
          <rect x={10} y={10} width={12} height={13} fill="#f4efe3" opacity={0.35} />
          {[12, 15, 18, 21].map((y) => (
            <circle key={y} cx={6.5} cy={y} r={0.9} fill="#f4efe3" />
          ))}
        </>
      );
    case "drum":
      return (
        <>
          <path d="M9 6 L23 6 L21 28 L11 28 Z" fill={fill} {...outline} />
          <ellipse cx={16} cy={6} rx={7} ry={2.5} fill="#f2e6cf" {...outline} />
          {[10, 14, 18, 22].map((y) => (
            <line key={y} x1={9 + (y - 6) * 0.09} y1={y} x2={23 - (y - 6) * 0.09} y2={y} stroke={light} strokeWidth={1} />
          ))}
          <line x1={22} y1={2} x2={27} y2={9} stroke="#8a6a45" strokeWidth={1.6} strokeLinecap="round" />
        </>
      );
  }
}

/** Caja de regalo con moño (cajas sorpresa). */
function boxShape(fill: string, dark: string, light: string) {
  const ribbon = "#ffd166";
  return (
    <>
      <rect x={6} y={14} width={20} height={14} rx={1.5} fill={fill} stroke={dark} strokeWidth={1.5} />
      <rect x={4.5} y={10} width={23} height={5.5} rx={1.2} fill={light} stroke={dark} strokeWidth={1.5} />
      <rect x={14.2} y={10} width={3.6} height={18} fill={ribbon} stroke={dark} strokeWidth={0.8} />
      <path d="M16 10 C 11 3, 7 7, 12 10 Z M16 10 C 21 3, 25 7, 20 10 Z" fill={ribbon} stroke={dark} strokeWidth={1.2} />
      <text x={16} y={25} textAnchor="middle" fontSize={7} fontWeight={800} fill={dark}>
        ?
      </text>
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

/** Dibujo de cada categoría: una categoría nueva no compila hasta tener el suyo. */
const CATEGORY_ICONS: { [C in ItemCategory]: (item: Extract<ItemDefinition, { category: C }>) => ReactNode } = {
  clothing: (item) => shape(item.style, item.color, mix(item.color, -0.45), mix(item.color, 0.55)),
  fish: (item) => fishShape(item.shape, item.color, mix(item.color, -0.45), mix(item.color, 0.55)),
  food: (item) => foodShape(item.shape, item.color, mix(item.color, -0.45), mix(item.color, 0.55)),
  medicine: (item) => medicineShape(item.shape, item.color, mix(item.color, -0.45)),
  rod: (item) => rodShape(item.color, mix(item.color, -0.45), item.tier),
  cart: (item) => cartShape(item.color, mix(item.color, -0.45), item.tier),
  instrument: (item) => instrumentShape(item.kind, item.color, mix(item.color, -0.45), mix(item.color, 0.55)),
  box: (item) => boxShape(item.color, mix(item.color, -0.45), mix(item.color, 0.55)),
  ticket: (item) => ticketShape(item.color, mix(item.color, -0.45)),
  letter: (item) => letterShape(item.color, mix(item.color, -0.5)),
};

function itemShape(item: ItemDefinition): ReactNode {
  return (CATEGORY_ICONS[item.category] as (item: ItemDefinition) => ReactNode)(item);
}

interface ItemIconProps {
  item: ItemDefinition;
  size?: number;
}

/** Ícono de un ítem (prenda, pescado, caña, carrito o caja) con su forma y su color reales. */
export function ItemIcon({ item, size = 30 }: ItemIconProps) {
  return (
    <span className={cx("item-icon")} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 32 32" width={size - 4} height={size - 4}>
        {itemShape(item)}
      </svg>
    </span>
  );
}

/** Silueta gris del lugar vacío (cabeza, torso, piernas, pies). */
export function SlotPlaceholderIcon({ slot, size = 30 }: { slot: ItemSlot; size?: number }) {
  return (
    <span className={cx("item-icon item-icon-empty")} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 32 32" width={size - 4} height={size - 4}>
        {shape(SLOT_PLACEHOLDER_STYLE[slot], "#5b6274", "#3a3f4c", "#7d8496")}
      </svg>
    </span>
  );
}
