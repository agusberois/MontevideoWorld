import type { ClothingOf, Gender, SlotStyle } from "@montevideo-world/shared";
import { shade } from "../../color";
import { Graphics, OUTLINE, OUTLINE_ALPHA, SHOULDER_Y, UNDERWEAR_COLOR, itemColor } from "./body";

interface TopDrawer {
  /** Manga sobre el brazo, desde el hombro. Sin `sleeve` el brazo queda a la vista. */
  sleeve?: (g: Graphics, color: number) => void;
  /** Lo que asoma detrás del torso (p. ej. la capucha caída). */
  behind?: (g: Graphics, color: number) => void;
  /** Si cubre el torso: la base del cuerpo es del color de la prenda (si no, es la piel). */
  covers: boolean;
  /** Detalles sobre la base del cuerpo. */
  body: (g: Graphics, color: number) => void;
}

/** Manga de `length` px; `cuff` = con puño (manga larga). */
function sleeve(g: Graphics, color: number, length: number, cuff = false) {
  g.fillStyle(color, 1);
  g.fillRoundedRect(-3.2, -1, 6.4, length, 3);
  if (cuff) {
    g.fillStyle(shade(color, -15), 1);
    g.fillRect(-3.2, length - 4, 6.4, 3);
  }
  g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
  g.strokeRoundedRect(-3.2, -1, 6.4, length, 3);
}

/** Brillo del pecho de las prendas con mangas. */
function chestLight(g: Graphics, color: number) {
  g.fillStyle(shade(color, 12), 1);
  g.fillRoundedRect(2, SHOULDER_Y + 1, 6, 12, 3);
}

const TOPS: Record<SlotStyle<"top">, TopDrawer> = {
  tshirt: {
    covers: true,
    sleeve: (g, color) => sleeve(g, color, 11),
    body: chestLight,
  },
  jersey: {
    covers: true,
    sleeve: (g, color) => sleeve(g, color, 11),
    body: (g, color) => {
      chestLight(g, color);
      // Cuello blanco (el escote en V de la cara queda encima) y escudo con el sol.
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(-5, SHOULDER_Y - 3, 5, SHOULDER_Y - 3, 0, SHOULDER_Y + 4);
      g.fillStyle(0xf2b705, 1);
      g.fillCircle(5.5, SHOULDER_Y + 6, 2);
    },
  },
  hoodie: {
    covers: true,
    sleeve: (g, color) => sleeve(g, color, 19, true),
    behind: (g, color) => {
      g.fillStyle(shade(color, -25), 1);
      g.fillEllipse(-1, SHOULDER_Y - 2, 18, 8);
    },
    body: (g, color) => {
      chestLight(g, color);
      // Bolsillo canguro y cordones.
      g.fillStyle(shade(color, -15), 1);
      g.fillRoundedRect(-6, SHOULDER_Y + 13, 13, 7, 3);
      g.lineStyle(1, 0xf4f4f4, 0.9);
      g.lineBetween(-2, SHOULDER_Y - 1, -2, SHOULDER_Y + 7);
      g.lineBetween(2, SHOULDER_Y - 1, 2, SHOULDER_Y + 7);
    },
  },
  tank: {
    covers: false,
    body: (g, color) => {
      g.fillStyle(shade(color, -12), 1);
      g.fillRoundedRect(-9, SHOULDER_Y + 1, 18, 23, 5);
      g.fillStyle(color, 1);
      g.fillRoundedRect(-6.5, SHOULDER_Y + 1, 15.5, 23, 5);
      g.fillRect(-6.5, SHOULDER_Y - 3, 3, 6);
      g.fillRect(4, SHOULDER_Y - 3, 3, 6);
    },
  },
};

/** Manga de la prenda de arriba sobre el brazo (ya dibujado con la piel). */
export function drawTopSleeve(g: Graphics, top: ClothingOf<"top"> | undefined) {
  if (top) TOPS[top.style].sleeve?.(g, shade(itemColor(top), -10));
}

/** Torso: la prenda de arriba o, sin ella, el pecho (con bikini el avatar de mujer). Con contorno. */
export function drawTop(g: Graphics, top: ClothingOf<"top"> | undefined, skin: number, gender: Gender) {
  const drawer = top && TOPS[top.style];
  const color = top ? itemColor(top) : skin;
  drawer?.behind?.(g, color);

  // Base: sombra lateral + cuerpo. Sin remera (o con musculosa) la base es la piel.
  const base = drawer?.covers ? color : skin;
  g.fillStyle(shade(base, -18), 1);
  g.fillRoundedRect(-11, SHOULDER_Y - 3, 22, 27, 6);
  g.fillStyle(base, 1);
  g.fillRoundedRect(-7.5, SHOULDER_Y - 3, 18.5, 27, 6);

  if (drawer) drawer.body(g, color);
  else drawBareChest(g, skin, gender);

  g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
  g.strokeRoundedRect(-11, SHOULDER_Y - 3, 22, 27, 6);
}

function drawBareChest(g: Graphics, skin: number, gender: Gender) {
  if (gender === "f") {
    // Sin remera, el avatar de mujer queda con una bikini.
    g.fillStyle(UNDERWEAR_COLOR, 1);
    g.fillRoundedRect(-9, SHOULDER_Y + 3, 19, 8, 3);
    g.lineStyle(1, shade(UNDERWEAR_COLOR, -30), 0.8);
    g.strokeRoundedRect(-9, SHOULDER_Y + 3, 19, 8, 3);
    return;
  }
  g.lineStyle(1.2, shade(skin, -22), 0.8);
  g.beginPath();
  g.arc(-2.5, SHOULDER_Y + 6, 5, Math.PI * 0.15, Math.PI * 0.85, false);
  g.strokePath();
  g.beginPath();
  g.arc(5.5, SHOULDER_Y + 6, 5, Math.PI * 0.15, Math.PI * 0.85, false);
  g.strokePath();
  g.fillStyle(shade(skin, -25), 1);
  g.fillCircle(2, SHOULDER_Y + 18, 1);
}
