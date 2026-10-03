"use client";

import type { ReactNode } from "react";
import {
  Appearance,
  ClothingOf,
  HAIR_COLORS,
  ITEM_SLOTS,
  ItemSlot,
  OutfitIds,
  SKIN_TONES,
  getClothing,
} from "@montevideo-world/shared";
import { mix } from "../inventory/ItemIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./join.module.css";

const cx = moduleClasses(styles);

/**
 * Vista previa del avatar en SVG, para React (Phaser no se puede importar desde acá): la pantalla de
 * ingreso (Phaser todavía no está cargado) y los detalles de un jugador. Usa la misma geometría y los
 * mismos dibujos de ropa que `Avatar.ts` y `game/objects/clothing/` (px desde los pies) para que se
 * parezca a lo que se ve en el juego. Sin `outfit` lleva la ropa de muestra: el kit inicial real lo
 * reparte el server al entrar.
 */

const HEAD_Y = -69;
const R = 10.5;
const SHOULDER_Y = -55;
const HIP_Y = -30;

const OUTLINE = "rgba(0, 0, 0, 0.28)";
const UNDERWEAR = "#e4e1da";
const BELT = "#2a1d14";
const BUCKLE = "#c9a227";

/** Lo que hace falta de una prenda para dibujarla (las del catálogo lo cumplen). */
type PreviewClothing<S extends ItemSlot> = Pick<ClothingOf<S>, "style" | "color">;
type PreviewOutfit = { [S in ItemSlot]?: PreviewClothing<S> };

/** Remera blanca, jeans y championes blancos (la de muestra de la pantalla de ingreso). */
const SAMPLE_OUTFIT: PreviewOutfit = {
  top: { style: "tshirt", color: "#f1f1f1" },
  bottom: { style: "jeans", color: "#2b3a55" },
  shoes: { style: "sneakers", color: "#f0f0f0" },
};

/** Como `shade` de `game/color.ts` (puntos porcentuales), sobre "#rrggbb". */
function shade(hex: string, amount: number): string {
  return mix(hex, amount / 100);
}

/** Ids de la ropa puesta → prendas del catálogo (un id que no es de ese lugar queda vacío). */
function resolveOutfit(ids: OutfitIds): PreviewOutfit {
  const outfit: Partial<Record<ItemSlot, ClothingOf<ItemSlot>>> = {};
  for (const slot of ITEM_SLOTS) {
    const item = ids[slot] ? getClothing(ids[slot]) : undefined;
    if (item && item.slot === slot) outfit[slot] = item;
  }
  // Cada prenda quedó en su propio lugar (`item.slot === slot`).
  return outfit as PreviewOutfit;
}

interface AvatarPreviewProps {
  appearance: Pick<Appearance, "gender" | "skin" | "hairColor" | "hairStyle">;
  /** Ropa puesta; sin ella, la de muestra. */
  outfit?: OutfitIds;
  size?: number;
  className?: string;
}

export function AvatarPreview({ appearance, outfit: outfitIds, size = 168, className }: AvatarPreviewProps) {
  const skin = SKIN_TONES[appearance.skin] ?? SKIN_TONES[0];
  const hair = HAIR_COLORS[appearance.hairColor] ?? HAIR_COLORS[0];
  const style = appearance.hairStyle;
  const female = appearance.gender === "f";
  const outfit = outfitIds ? resolveOutfit(outfitIds) : SAMPLE_OUTFIT;
  const cap = (radius: number) => `M ${-radius} ${HEAD_Y} A ${radius} ${radius} 0 0 1 ${radius} ${HEAD_Y}`;

  return (
    <svg
      className={`${cx("avatar-preview")}${className ? ` ${className}` : ""}`}
      viewBox="-40 -104 80 112"
      width={size}
      height={(size * 112) / 80}
      aria-hidden="true"
    >
      <ellipse cx={0} cy={0} rx={17} ry={7} fill="rgba(0,0,0,0.3)" />

      {/* Pelo de atrás (largo, afro, colita). */}
      {style === "long" && <rect x={-R - 2} y={HEAD_Y - 4} width={R * 2 + 3} height={25} rx={5} fill={hair} />}
      {style === "afro" && <circle cx={-1} cy={HEAD_Y - 3} r={R + 6} fill={hair} />}
      {style === "ponytail" && <ellipse cx={-R - 3} cy={HEAD_Y + 4} rx={3.5} ry={8} fill={hair} />}

      {/* Piernas (desde la cadera) con la prenda de abajo y el calzado. */}
      {[-4.5, 4.5].map((x) => (
        <g key={x} transform={`translate(${x} ${HIP_Y})`}>
          <rect x={-3} y={-2} width={6} height={28} rx={3} fill={shade(skin, -6)} />
          {bottomLeg(outfit.bottom)}
          {shoes(outfit.shoes, skin)}
        </g>
      ))}

      {/* Brazos (desde el hombro) con la manga de la prenda de arriba. */}
      {[-12, 12].map((x) => (
        <g key={x} transform={`translate(${x} ${SHOULDER_Y})`}>
          <rect x={-2.5} y={-1} width={5} height={21} rx={2.5} fill={shade(skin, -6)} />
          <circle cx={0} cy={21} r={3.3} fill={skin} stroke={OUTLINE} strokeWidth={1.5} />
          {sleeve(outfit.top)}
        </g>
      ))}

      {/* Torso: cuello, cadera, prenda de arriba (o torso desnudo), cinturón y escote en V. */}
      <rect x={-3} y={HEAD_Y + 8} width={6} height={7} fill={shade(skin, -12)} />
      <rect x={-9.5} y={HIP_Y - 4} width={19} height={8} rx={3} fill={outfit.bottom?.color ?? UNDERWEAR} />
      {torso(outfit.top, skin, female)}
      {outfit.bottom && outfit.bottom.style !== "shorts" && (
        <>
          <rect x={-10} y={HIP_Y - 5} width={20} height={3} fill={BELT} />
          <rect x={2} y={HIP_Y - 5} width={3} height={3} fill={BUCKLE} />
        </>
      )}
      <polygon points={`-3.5,${SHOULDER_Y - 3} 3.5,${SHOULDER_Y - 3} 0,${SHOULDER_Y + 2}`} fill={skin} />

      {/* Cabeza. */}
      <ellipse cx={-R + 0.5} cy={HEAD_Y + 1} rx={2.5} ry={3.5} fill={skin} />
      <ellipse cx={R - 0.5} cy={HEAD_Y + 1} rx={2.5} ry={3.5} fill={skin} />
      <ellipse cx={0} cy={HEAD_Y} rx={R} ry={R + 1} fill={skin} stroke={OUTLINE} strokeWidth={1.5} />

      {/* Ojos (con pestañas en el de mujer), cejas y boca. */}
      {[-2.5, 3.5].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={HEAD_Y - 0.5} rx={2.1} ry={2.3} fill="#fff" />
          <circle cx={x + 0.4} cy={HEAD_Y - 0.2} r={1.5} fill="#2b1d14" />
          {female && (
            <path
              d={`M ${x + (x < 0 ? -2 : 2)} ${HEAD_Y - 2} l ${x < 0 ? -1.6 : 1.6} -1.4`}
              stroke="#2b1d14"
              strokeWidth={1.2}
              strokeLinecap="round"
            />
          )}
          <line
            x1={x - 2}
            y1={HEAD_Y - 4.3}
            x2={x + 2}
            y2={HEAD_Y - 4.6}
            stroke={hair}
            strokeWidth={female ? 1.2 : 1.8}
            strokeLinecap="round"
            style={{ filter: "brightness(0.85)" }}
          />
        </g>
      ))}
      <path
        d={`M ${-2.2} ${HEAD_Y + 4.6} Q 0.5 ${HEAD_Y + 7.6} ${3.2} ${HEAD_Y + 4.6}`}
        fill="none"
        stroke={female ? "#c0475a" : "#7a3b2e"}
        strokeWidth={female ? 2 : 1.5}
        strokeLinecap="round"
      />

      {/* Pelo de adelante. */}
      {style === "buzz" && <path d={`${cap(R + 0.5)} L ${R + 0.5} ${HEAD_Y - 2} L ${-R - 0.5} ${HEAD_Y - 2} Z`} fill={hair} />}
      {style === "afro" && (
        <>
          {Array.from({ length: 7 }, (_, i) => {
            const angle = Math.PI * (1 + i / 6);
            return <circle key={i} cx={Math.cos(angle) * (R + 1)} cy={HEAD_Y - 2 + Math.sin(angle) * (R + 1)} r={5.5} fill={hair} />;
          })}
          <path d={`${cap(R + 1)} L ${R + 1} ${HEAD_Y - 3} L ${-R - 1} ${HEAD_Y - 3} Z`} fill={hair} />
        </>
      )}
      {(style === "short" || style === "long" || style === "ponytail") && (
        <path
          d={`${cap(R + 1.5)} L ${R + 1.5} ${HEAD_Y + (style === "long" ? 12 : 1)} L 6 ${HEAD_Y - 5} L 1 ${HEAD_Y - 6} L -4 ${HEAD_Y - 4.5} L ${-R + 2} ${HEAD_Y - 2} L ${-R - 1.5} ${HEAD_Y + (style === "long" ? 12 : 4)} Z`}
          fill={hair}
        />
      )}

      {hat(outfit.hat, cap)}
    </svg>
  );
}

// --- Ropa: los mismos dibujos que `game/objects/clothing/<lugar>.ts`, en SVG --------------------

/** Pierna: la prenda de abajo (largo según el estilo) o, sin ella, la ropa interior. */
function bottomLeg(bottom: PreviewClothing<"bottom"> | undefined): ReactNode {
  if (!bottom) return <rect x={-3.5} y={-2} width={7} height={8} rx={3} fill={UNDERWEAR} />;
  const { color, style } = bottom;
  const length = style === "shorts" ? 15 : 28;
  return (
    <>
      <rect x={-3.5} y={-2} width={7} height={length} rx={3} fill={color} />
      <rect x={-3.5} y={style === "shorts" ? 11 : 12} width={7} height={style === "shorts" ? 2 : 1.5} fill={shade(color, -15)} />
      {style === "jeans" && <line x1={1.5} y1={0} x2={1.5} y2={24} stroke={shade(color, 25)} strokeOpacity={0.7} />}
      <rect x={-3.5} y={-2} width={7} height={length} rx={3} fill="none" stroke={OUTLINE} strokeWidth={1.5} />
    </>
  );
}

/** Calzado al pie de la pierna (y = 30 es el piso); descalzo, el pie. */
function shoes(item: PreviewClothing<"shoes"> | undefined, skin: string): ReactNode {
  if (!item) return <ellipse cx={1} cy={27.5} rx={4.5} ry={2.5} fill={skin} stroke={OUTLINE} strokeWidth={1} />;
  const { color, style } = item;
  if (style === "flipflops") {
    return (
      <>
        <ellipse cx={1.5} cy={29} rx={5.5} ry={1.75} fill={shade(color, -20)} />
        <ellipse cx={1} cy={27} rx={4.5} ry={2.25} fill={skin} />
        <path d="M -2 25.5 L 2 27.5 L 5 25.5" fill="none" stroke={color} strokeWidth={1.5} />
      </>
    );
  }
  // Suela blanca; si el champión ya es blanco, gris para que se note. Las botas, suela marrón.
  const top = style === "boots" ? 18 : 24;
  const sole = style === "boots" ? BELT : Number.parseInt(color.slice(1), 16) > 0xe0e0e0 ? "#bdbdbd" : "#f4f4f4";
  return (
    <>
      <rect x={-4} y={top} width={10} height={30 - top} rx={3} fill={color} />
      <rect x={-4} y={28.5} width={10} height={1.5} fill={sole} />
      <rect x={-4} y={top} width={10} height={30 - top} rx={3} fill="none" stroke={OUTLINE} strokeWidth={1.5} />
    </>
  );
}

/** Manga sobre el brazo (la musculosa no tiene); el buzo, larga y con puño. */
function sleeve(top: PreviewClothing<"top"> | undefined): ReactNode {
  if (!top || top.style === "tank") return null;
  const color = shade(top.color, -10);
  const length = top.style === "hoodie" ? 19 : 11;
  return (
    <>
      <rect x={-3.2} y={-1} width={6.4} height={length} rx={3} fill={color} />
      {top.style === "hoodie" && <rect x={-3.2} y={length - 4} width={6.4} height={3} fill={shade(top.color, -25)} />}
      <rect x={-3.2} y={-1} width={6.4} height={length} rx={3} fill="none" stroke={OUTLINE} strokeWidth={1.5} />
    </>
  );
}

/** Torso: la prenda de arriba o, sin ella, el pecho (con bikini el avatar de mujer). Con contorno. */
function torso(top: PreviewClothing<"top"> | undefined, skin: string, female: boolean): ReactNode {
  const S = SHOULDER_Y;
  const color = top?.color ?? skin;
  // Sin remera (o con musculosa) la base del cuerpo es la piel.
  const base = top && top.style !== "tank" ? color : skin;
  const chestLight = <rect x={2} y={S + 1} width={6} height={12} rx={3} fill={shade(color, 12)} />;

  let details: ReactNode;
  if (!top) {
    details = female ? (
      <rect x={-9} y={S + 3} width={19} height={8} rx={3} fill={UNDERWEAR} stroke={shade(UNDERWEAR, -30)} strokeWidth={1} />
    ) : (
      <>
        <path d={`M ${-2.5 + 5 * Math.cos(Math.PI * 0.15)} ${S + 6 + 5 * Math.sin(Math.PI * 0.15)} A 5 5 0 0 1 ${-2.5 + 5 * Math.cos(Math.PI * 0.85)} ${S + 6 + 5 * Math.sin(Math.PI * 0.85)}`} fill="none" stroke={shade(skin, -22)} strokeWidth={1.2} />
        <path d={`M ${5.5 + 5 * Math.cos(Math.PI * 0.15)} ${S + 6 + 5 * Math.sin(Math.PI * 0.15)} A 5 5 0 0 1 ${5.5 + 5 * Math.cos(Math.PI * 0.85)} ${S + 6 + 5 * Math.sin(Math.PI * 0.85)}`} fill="none" stroke={shade(skin, -22)} strokeWidth={1.2} />
        <circle cx={2} cy={S + 18} r={1} fill={shade(skin, -25)} />
      </>
    );
  } else if (top.style === "tank") {
    details = (
      <>
        <rect x={-9} y={S + 1} width={18} height={23} rx={5} fill={shade(color, -12)} />
        <rect x={-6.5} y={S + 1} width={15.5} height={23} rx={5} fill={color} />
        <rect x={-6.5} y={S - 3} width={3} height={6} fill={color} />
        <rect x={4} y={S - 3} width={3} height={6} fill={color} />
      </>
    );
  } else if (top.style === "jersey") {
    // Cuello blanco (el escote en V queda encima) y escudo con el sol.
    details = (
      <>
        {chestLight}
        <polygon points={`-5,${S - 3} 5,${S - 3} 0,${S + 4}`} fill="#ffffff" />
        <circle cx={5.5} cy={S + 6} r={2} fill="#f2b705" />
      </>
    );
  } else if (top.style === "hoodie") {
    // Bolsillo canguro y cordones.
    details = (
      <>
        {chestLight}
        <rect x={-6} y={S + 13} width={13} height={7} rx={3} fill={shade(color, -15)} />
        <path d={`M -2 ${S - 1} L -2 ${S + 7} M 2 ${S - 1} L 2 ${S + 7}`} stroke="#f4f4f4" strokeOpacity={0.9} strokeWidth={1} />
      </>
    );
  } else {
    details = chestLight;
  }

  return (
    <>
      {/* Capucha caída, detrás del torso. */}
      {top?.style === "hoodie" && <ellipse cx={-1} cy={S - 2} rx={9} ry={4} fill={shade(color, -25)} />}
      <rect x={-11} y={S - 3} width={22} height={27} rx={6} fill={shade(base, -18)} />
      <rect x={-7.5} y={S - 3} width={18.5} height={27} rx={6} fill={base} />
      {details}
      <rect x={-11} y={S - 3} width={22} height={27} rx={6} fill="none" stroke={OUTLINE} strokeWidth={1.5} />
    </>
  );
}

/** Gorro sobre el pelo, de frente. `cap` = medio círculo superior de radio dado. */
function hat(item: PreviewClothing<"hat"> | undefined, cap: (radius: number) => string): ReactNode {
  if (!item) return null;
  const { color, style } = item;
  switch (style) {
    case "cap":
      return (
        <>
          <path d={`${cap(R + 1.8)} L ${R + 1.8} ${HEAD_Y - 1} L ${-R - 1.8} ${HEAD_Y - 1} Z`} fill={color} />
          <ellipse cx={R + 3} cy={HEAD_Y - 2} rx={6.5} ry={2.25} fill={shade(color, -20)} />
          <circle cx={0} cy={HEAD_Y - R - 1.5} r={1.6} fill={shade(color, 20)} />
        </>
      );
    case "beanie":
      return (
        <>
          <path d={`${cap(R + 2.5)} L ${R + 2.5} ${HEAD_Y - 1} L ${-R - 2.5} ${HEAD_Y - 1} Z`} fill={color} />
          <rect x={-R - 2.5} y={HEAD_Y - 5} width={R * 2 + 5} height={5} rx={2} fill={shade(color, -18)} />
          <circle cx={0} cy={HEAD_Y - R - 4} r={3.5} fill={shade(color, 25)} />
        </>
      );
    case "beret":
      return (
        <>
          <ellipse cx={-1} cy={HEAD_Y - R + 1} rx={R + 4} ry={4.5} fill={color} />
          <ellipse cx={-3} cy={HEAD_Y - R - 0.5} rx={R / 2} ry={1.5} fill={shade(color, 18)} />
          <rect x={-0.75} y={HEAD_Y - R - 5} width={1.5} height={3} fill={color} />
        </>
      );
  }
  // Un estilo nuevo sin dibujo no compila (ReactNode acepta undefined y no lo avisaría).
  const missing: never = style;
  return missing;
}
