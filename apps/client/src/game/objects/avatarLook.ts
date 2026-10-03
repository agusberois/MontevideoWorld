import {
  EYE_COLORS,
  FACIAL_HAIR,
  FacialHair,
  GLASSES,
  Glasses,
  HAIR_COLORS,
  HAIR_STYLES,
  HairStyle,
  SKIN_TONES,
} from "@montevideo-world/shared";
import type { HeadLook } from "@/lib/avatar/head";
import { hexToNumber } from "@/lib/avatar/shapes";

/**
 * Rasgos físicos del avatar (sexo, piel, pelo, ojos, barba y lentes), resueltos a colores. Salen del
 * aspecto que el jugador eligió al entrar, que viaja en el Schema (`gender`, `skin`, `hairColor`,
 * `hairStyle`, `eyeColor`, `facialHair`, `glasses`). Es el `HeadLook` de `lib/avatar/head.ts`, que
 * dibuja la cabeza igual en el juego y en la vista previa. La ropa también viaja en el Schema (la resuelve
 * `wornOutfit` de `lib/avatar/clothing.ts`) porque el jugador la cambia desde la mochila.
 */
export type AvatarLook = HeadLook;

/** Campos del aspecto tal como llegan del Schema (validados por el server, pero se defiende igual). */
export interface AppearanceFields {
  gender: string;
  skin: number;
  hairColor: number;
  hairStyle: string;
  eyeColor: number;
  facialHair: string;
  glasses: string;
}

export function lookFromAppearance(fields: AppearanceFields): AvatarLook {
  return {
    gender: fields.gender === "f" ? "f" : "m",
    skin: hexToNumber(SKIN_TONES[fields.skin] ?? SKIN_TONES[0]),
    hair: hexToNumber(HAIR_COLORS[fields.hairColor] ?? HAIR_COLORS[0]),
    hairStyle: (HAIR_STYLES as readonly string[]).includes(fields.hairStyle) ? (fields.hairStyle as HairStyle) : "short",
    eye: hexToNumber(EYE_COLORS[fields.eyeColor] ?? EYE_COLORS[0]),
    facialHair: (FACIAL_HAIR as readonly string[]).includes(fields.facialHair) ? (fields.facialHair as FacialHair) : "none",
    glasses: (GLASSES as readonly string[]).includes(fields.glasses) ? (fields.glasses as Glasses) : "none",
  };
}
