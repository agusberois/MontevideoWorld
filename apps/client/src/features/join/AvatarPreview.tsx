"use client";

import { Appearance, EYE_COLORS, HAIR_COLORS, OutfitIds, SKIN_TONES } from "@montevideo-world/shared";
import { ARM_X, HIP_Y, LEG_X, WornOutfit, arm, hat, leg, torso, wornOutfit } from "@/lib/avatar/clothing";
import { EYE_Y, HeadLook, SHOULDER_Y, eyes, faceFeatures, frontHair, glasses, headFront } from "@/lib/avatar/head";
import { Shape, hexToNumber, numberToHex } from "@/lib/avatar/shapes";
import { moduleClasses } from "@/lib/cx";
import styles from "./join.module.css";

const cx = moduleClasses(styles);

/**
 * Vista previa del avatar en SVG, para React (Phaser no se puede importar desde acá): la pantalla de
 * ingreso (Phaser todavía no está cargado) y los detalles de un jugador. No dibuja nada propio: pasa
 * a SVG las mismas formas que `Avatar.ts` pinta en el juego (`lib/avatar/head.ts` y `clothing.ts`), en
 * el mismo orden de capas, así se ven iguales. Sin `outfit` lleva la ropa de muestra: el kit inicial
 * real lo reparte el server al entrar.
 */

/** Remera blanca, jeans y championes blancos (la de muestra de la pantalla de ingreso). */
const SAMPLE_OUTFIT: WornOutfit = {
  top: { style: "tshirt", color: "#f1f1f1" },
  bottom: { style: "jeans", color: "#2b3a55" },
  shoes: { style: "sneakers", color: "#f0f0f0" },
};

interface AvatarPreviewProps {
  appearance: Pick<Appearance, "gender" | "skin" | "hairColor" | "hairStyle" | "eyeColor" | "facialHair" | "glasses">;
  /** Ropa puesta; sin ella, la de muestra. */
  outfit?: OutfitIds;
  size?: number;
  className?: string;
}

export function AvatarPreview({ appearance, outfit: outfitIds, size = 168, className }: AvatarPreviewProps) {
  const look: HeadLook = {
    gender: appearance.gender,
    skin: hexToNumber(SKIN_TONES[appearance.skin] ?? SKIN_TONES[0]),
    hair: hexToNumber(HAIR_COLORS[appearance.hairColor] ?? HAIR_COLORS[0]),
    hairStyle: appearance.hairStyle,
    eye: hexToNumber(EYE_COLORS[appearance.eyeColor] ?? EYE_COLORS[0]),
    facialHair: appearance.facialHair,
    glasses: appearance.glasses,
  };
  const outfit = outfitIds ? wornOutfit(outfitIds) : SAMPLE_OUTFIT;
  const legShapes = leg(look.skin, outfit);
  const armShapes = arm(look.skin, outfit);

  return (
    <svg
      className={`${cx("avatar-preview")}${className ? ` ${className}` : ""}`}
      viewBox="-40 -104 80 112"
      width={size}
      height={(size * 112) / 80}
      aria-hidden="true"
    >
      <ellipse cx={0} cy={0} rx={17} ry={7} fill="rgba(0,0,0,0.3)" />

      {/* Mismo orden que el juego: piernas, brazo lejano, torso, cabeza y brazo cercano adelante. */}
      {[-LEG_X, LEG_X].map((x) => (
        <g key={x} transform={`translate(${x} ${HIP_Y})`}>
          <SvgShapes shapes={legShapes} />
        </g>
      ))}
      <g transform={`translate(${-ARM_X} ${SHOULDER_Y})`}>
        <SvgShapes shapes={armShapes} />
      </g>
      <SvgShapes shapes={torso(look.skin, look.gender, outfit)} />

      <SvgShapes shapes={headFront(look)} />
      <SvgShapes shapes={faceFeatures(look, "neutral")} />
      <g transform={`translate(0 ${EYE_Y})`}>
        <SvgShapes shapes={eyes(look, "neutral")} />
      </g>
      <SvgShapes shapes={glasses(look)} />
      <SvgShapes shapes={frontHair(look)} />
      <SvgShapes shapes={hat(outfit.hat, false)} />

      <g transform={`translate(${ARM_X} ${SHOULDER_Y})`}>
        <SvgShapes shapes={armShapes} />
      </g>
    </svg>
  );
}

/** Las formas de `lib/avatar` en SVG (lo mismo que `paintShapes` hace en Phaser). */
function SvgShapes({ shapes }: { shapes: readonly Shape[] }) {
  return (
    <>
      {shapes.map((shape, index) => {
        const paint = {
          fill: shape.fill === undefined ? "none" : numberToHex(shape.fill),
          fillOpacity: shape.fillAlpha,
          stroke: shape.stroke === undefined ? undefined : numberToHex(shape.stroke),
          strokeWidth: shape.strokeWidth,
          strokeOpacity: shape.strokeAlpha,
          strokeLinecap: "round" as const,
          strokeLinejoin: "round" as const,
        };
        switch (shape.kind) {
          case "ellipse":
            return <ellipse key={index} cx={shape.x} cy={shape.y} rx={shape.rx} ry={shape.ry} {...paint} />;
          case "rect":
            return <rect key={index} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.radius} {...paint} />;
          case "poly": {
            const points = shape.points.map((p) => `${p.x},${p.y}`).join(" ");
            return shape.closed ? <polygon key={index} points={points} {...paint} /> : <polyline key={index} points={points} {...paint} fill="none" />;
          }
        }
      })}
    </>
  );
}
