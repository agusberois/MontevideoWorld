import type { ClothingOf, SlotStyle } from "@montevideo-world/shared";
import { shade } from "../../color";
import { Graphics, HIP_Y, OUTLINE, OUTLINE_ALPHA, UNDERWEAR_COLOR, itemColor } from "./body";

const BELT_COLOR = 0x2a1d14;
const BUCKLE_COLOR = 0xc9a227;

interface BottomDrawer {
  /** Pierna desde la cadera (y = -2) hacia abajo, sobre la piel. */
  leg: (g: Graphics, color: number) => void;
  /** Lleva cinturón en la cintura. */
  belt: boolean;
}

/** Pierna de pantalón de `length` px con una franja más oscura (rodilla o ruedo) en `seamY`. */
function trouserLeg(g: Graphics, color: number, length: number, seamY: number, seamHeight: number) {
  g.fillStyle(color, 1);
  g.fillRoundedRect(-3.5, -2, 7, length, 3);
  g.fillStyle(shade(color, -15), 1);
  g.fillRect(-3.5, seamY, 7, seamHeight);
}

function outlineLeg(g: Graphics, length: number) {
  g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
  g.strokeRoundedRect(-3.5, -2, 7, length, 3);
}

const BOTTOMS: Record<SlotStyle<"bottom">, BottomDrawer> = {
  pants: {
    belt: true,
    leg: (g, color) => {
      trouserLeg(g, color, 28, 12, 1.5);
      outlineLeg(g, 28);
    },
  },
  jeans: {
    belt: true,
    leg: (g, color) => {
      trouserLeg(g, color, 28, 12, 1.5);
      g.lineStyle(1, shade(color, 25), 0.7);
      g.lineBetween(1.5, 0, 1.5, 24);
      outlineLeg(g, 28);
    },
  },
  shorts: {
    belt: false,
    leg: (g, color) => {
      trouserLeg(g, color, 15, 11, 2);
      outlineLeg(g, 15);
    },
  },
};

/** Lo que va sobre la pierna: la prenda de abajo o, sin ella, la ropa interior. */
export function drawBottomLeg(g: Graphics, bottom: ClothingOf<"bottom"> | undefined) {
  if (bottom) {
    BOTTOMS[bottom.style].leg(g, itemColor(bottom));
  } else {
    g.fillStyle(UNDERWEAR_COLOR, 1);
    g.fillRoundedRect(-3.5, -2, 7, 8, 3);
  }
}

/** Cadera, debajo de la prenda de arriba. */
export function drawHips(g: Graphics, bottom: ClothingOf<"bottom"> | undefined) {
  g.fillStyle(bottom ? itemColor(bottom) : UNDERWEAR_COLOR, 1);
  g.fillRoundedRect(-9.5, HIP_Y - 4, 19, 8, 3);
}

/** Cinturón, por encima de la prenda de arriba. */
export function drawBelt(g: Graphics, bottom: ClothingOf<"bottom"> | undefined) {
  if (!bottom || !BOTTOMS[bottom.style].belt) return;
  g.fillStyle(BELT_COLOR, 1);
  g.fillRect(-10, HIP_Y - 5, 20, 3);
  g.fillStyle(BUCKLE_COLOR, 1);
  g.fillRect(2, HIP_Y - 5, 3, 3);
}
