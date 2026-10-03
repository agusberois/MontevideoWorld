import { ClothingOf, Gender, ITEM_SLOTS, ItemSlot, OutfitIds, SlotStyle, getClothing } from "@montevideo-world/shared";
import { HEAD_R, HEAD_Y, OUTLINE, OUTLINE_ALPHA, SHOULDER_Y } from "./head";
import { Paint, Shape, arcPoints, circle, ellipse, hexToNumber, line, poly, rect, shade } from "./shapes";

/**
 * Cuerpo y ropa del avatar como listas de formas (ver `shapes.ts`), igual que la cabeza en `head.ts`:
 * los pinta `Avatar.ts` en el juego y `AvatarPreview` en SVG. Cada `Record` por estilo obliga a que
 * una prenda nueva tenga su dibujo (no compila si falta). Px desde los pies; piernas y brazos, desde
 * la cadera y el hombro (el avatar los rota ahí al caminar).
 */

export const HIP_Y = -30;
/** Donde se enganchan piernas y brazos (el avatar los pone en Containers que rotan desde ahí). */
export const LEG_X = 4.5;
export const ARM_X = 12;

const UNDERWEAR = 0xe4e1da;
const BELT = 0x2a1d14;
const BUCKLE = 0xc9a227;
const OUTLINED: Paint = { stroke: OUTLINE, strokeWidth: 1.5, strokeAlpha: OUTLINE_ALPHA };

/** Lo que hace falta de una prenda para dibujarla (las del catálogo lo cumplen). */
export type WornItem<S extends ItemSlot> = Pick<ClothingOf<S>, "style" | "color">;
export type WornOutfit = { [S in ItemSlot]?: WornItem<S> };

/** Ids de la ropa puesta (del Schema) → prendas del catálogo. Un id que no es de ese lugar queda vacío. */
export function wornOutfit(ids: OutfitIds): WornOutfit {
  const outfit: Partial<Record<ItemSlot, ClothingOf<ItemSlot>>> = {};
  for (const slot of ITEM_SLOTS) {
    const item = ids[slot] ? getClothing(ids[slot]) : undefined;
    if (item && item.slot === slot) outfit[slot] = item;
  }
  // Cada prenda quedó en su propio lugar (`item.slot === slot`).
  return outfit as WornOutfit;
}

// --- Abajo: pantalón, short o ropa interior -------------------------------------------------

interface BottomStyle {
  /** Pierna desde la cadera (y = -2) hacia abajo, sobre la piel. */
  leg: (color: number) => Shape[];
  /** Lleva cinturón en la cintura. */
  belt: boolean;
}

/** Pierna de pantalón de `length` px con una franja más oscura (rodilla o ruedo) en `seamY`. */
function trouserLeg(color: number, length: number, seamY: number, seamHeight: number, extra: Shape[] = []): Shape[] {
  return [
    rect(-3.5, -2, 7, length, { fill: color }, 3),
    rect(-3.5, seamY, 7, seamHeight, { fill: shade(color, -15) }),
    ...extra,
    rect(-3.5, -2, 7, length, OUTLINED, 3),
  ];
}

const BOTTOMS: Record<SlotStyle<"bottom">, BottomStyle> = {
  pants: { belt: true, leg: (color) => trouserLeg(color, 28, 12, 1.5) },
  jeans: { belt: true, leg: (color) => trouserLeg(color, 28, 12, 1.5, [line(1.5, 0, 1.5, 24, shade(color, 25), 1, 0.7)]) },
  shorts: { belt: false, leg: (color) => trouserLeg(color, 15, 11, 2) },
};

// --- Calzado ---------------------------------------------------------------------------------

/** Zapato cerrado desde `top` hasta el piso (y = 30), con la suela de `sole`. */
function closedShoe(color: number, top: number, sole: number): Shape[] {
  return [rect(-4, top, 10, 30 - top, { fill: color }, 3), rect(-4, 28.5, 10, 1.5, { fill: sole }), rect(-4, top, 10, 30 - top, OUTLINED, 3)];
}

/** Calzado al pie de la pierna (la punta mira a +x). `skin` por si deja el pie a la vista. */
const SHOES: Record<SlotStyle<"shoes">, (color: number, skin: number) => Shape[]> = {
  // Suela blanca; si el champión ya es blanco, gris para que se note.
  sneakers: (color) => closedShoe(color, 24, color > 0xe0e0e0 ? 0xbdbdbd : 0xf4f4f4),
  boots: (color) => closedShoe(color, 18, BELT),
  // Pie a la vista sobre una suela finita, con la tira en V.
  flipflops: (color, skin) => [
    ellipse(1.5, 29, 5.5, 1.75, { fill: shade(color, -20) }),
    ellipse(1, 27, 4.5, 2.25, { fill: skin }),
    poly(
      [
        { x: -2, y: 25.5 },
        { x: 2, y: 27.5 },
        { x: 5, y: 25.5 },
      ],
      { stroke: color, strokeWidth: 1.5 },
      false,
    ),
  ],
};

/** Pierna desde la cadera: piel, prenda de abajo (o ropa interior) y calzado (o el pie descalzo). */
export function leg(skin: number, outfit: WornOutfit): Shape[] {
  const shapes: Shape[] = [rect(-3, -2, 6, 28, { fill: shade(skin, -6) }, 3)];
  const { bottom, shoes } = outfit;
  shapes.push(...(bottom ? BOTTOMS[bottom.style].leg(hexToNumber(bottom.color)) : [rect(-3.5, -2, 7, 8, { fill: UNDERWEAR }, 3)]));
  if (shoes) shapes.push(...SHOES[shoes.style](hexToNumber(shoes.color), skin));
  else shapes.push(ellipse(1, 27.5, 4.5, 2.5, { fill: skin, stroke: OUTLINE, strokeWidth: 1, strokeAlpha: OUTLINE_ALPHA }));
  return shapes;
}

// --- Arriba: remera, camiseta, buzo, musculosa o el torso a la vista -------------------------

interface TopStyle {
  /** Manga sobre el brazo, desde el hombro. Sin `sleeve` el brazo queda a la vista. */
  sleeve?: (color: number) => Shape[];
  /** Lo que asoma detrás del torso (p. ej. la capucha caída). */
  behind?: (color: number) => Shape[];
  /** Si cubre el torso: la base del cuerpo es del color de la prenda (si no, es la piel). */
  covers: boolean;
  /** Detalles sobre la base del cuerpo. */
  body: (color: number) => Shape[];
}

/** Manga de `length` px; `cuff` = con puño (manga larga). */
function sleeve(color: number, length: number, cuff = false): Shape[] {
  return [
    rect(-3.2, -1, 6.4, length, { fill: color }, 3),
    ...(cuff ? [rect(-3.2, length - 4, 6.4, 3, { fill: shade(color, -15) })] : []),
    rect(-3.2, -1, 6.4, length, OUTLINED, 3),
  ];
}

/** Brillo del pecho de las prendas con mangas. */
const chestLight = (color: number): Shape => rect(2, SHOULDER_Y + 1, 6, 12, { fill: shade(color, 12) }, 3);

const TOPS: Record<SlotStyle<"top">, TopStyle> = {
  tshirt: { covers: true, sleeve: (color) => sleeve(color, 11), body: (color) => [chestLight(color)] },
  jersey: {
    covers: true,
    sleeve: (color) => sleeve(color, 11),
    // Cuello blanco (el escote en V de la cara queda encima) y escudo con el sol.
    body: (color) => [
      chestLight(color),
      poly(
        [
          { x: -5, y: SHOULDER_Y - 3 },
          { x: 5, y: SHOULDER_Y - 3 },
          { x: 0, y: SHOULDER_Y + 4 },
        ],
        { fill: 0xffffff },
      ),
      circle(5.5, SHOULDER_Y + 6, 2, { fill: 0xf2b705 }),
    ],
  },
  hoodie: {
    covers: true,
    sleeve: (color) => sleeve(color, 19, true),
    behind: (color) => [ellipse(-1, SHOULDER_Y - 2, 9, 4, { fill: shade(color, -25) })],
    // Bolsillo canguro y cordones.
    body: (color) => [
      chestLight(color),
      rect(-6, SHOULDER_Y + 13, 13, 7, { fill: shade(color, -15) }, 3),
      line(-2, SHOULDER_Y - 1, -2, SHOULDER_Y + 7, 0xf4f4f4, 1, 0.9),
      line(2, SHOULDER_Y - 1, 2, SHOULDER_Y + 7, 0xf4f4f4, 1, 0.9),
    ],
  },
  tank: {
    covers: false,
    body: (color) => [
      rect(-9, SHOULDER_Y + 1, 18, 23, { fill: shade(color, -12) }, 5),
      rect(-6.5, SHOULDER_Y + 1, 15.5, 23, { fill: color }, 5),
      rect(-6.5, SHOULDER_Y - 3, 3, 6, { fill: color }),
      rect(4, SHOULDER_Y - 3, 3, 6, { fill: color }),
    ],
  },
};

/** Brazo desde el hombro: piel, mano y la manga de la prenda de arriba. */
export function arm(skin: number, outfit: WornOutfit): Shape[] {
  const shapes: Shape[] = [rect(-2.5, -1, 5, 21, { fill: shade(skin, -6) }, 2.5), circle(0, 21, 3.3, { fill: skin, ...OUTLINED })];
  const top = outfit.top;
  const drawSleeve = top && TOPS[top.style].sleeve;
  if (top && drawSleeve) shapes.push(...drawSleeve(shade(hexToNumber(top.color), -10)));
  return shapes;
}

/** Sin remera: el pecho (con bikini el avatar de mujer). */
function bareChest(skin: number, gender: Gender): Shape[] {
  if (gender === "f") return [rect(-9, SHOULDER_Y + 3, 19, 8, { fill: UNDERWEAR, stroke: shade(UNDERWEAR, -30), strokeWidth: 1, strokeAlpha: 0.8 }, 3)];
  const pec = (cx: number) => poly(arcPoints(cx, SHOULDER_Y + 6, 5, 5, Math.PI * 0.15, Math.PI * 0.85, 8), { stroke: shade(skin, -22), strokeWidth: 1.2, strokeAlpha: 0.8 }, false);
  return [pec(-2.5), pec(5.5), circle(2, SHOULDER_Y + 18, 1, { fill: shade(skin, -25) })];
}

/** Cuello, cadera, prenda de arriba (o torso desnudo, con sombra al costado y contorno) y cinturón. */
export function torso(skin: number, gender: Gender, outfit: WornOutfit): Shape[] {
  const { top, bottom } = outfit;
  const style = top && TOPS[top.style];
  const color = top ? hexToNumber(top.color) : skin;
  const bottomColor = bottom ? hexToNumber(bottom.color) : UNDERWEAR;
  // Base: sombra lateral + cuerpo. Sin remera (o con musculosa) la base es la piel.
  const base = style?.covers ? color : skin;
  return [
    rect(-3, HEAD_Y + 8, 6, 7, { fill: shade(skin, -12) }),
    rect(-9.5, HIP_Y - 4, 19, 8, { fill: bottomColor }, 3),
    ...(style?.behind?.(color) ?? []),
    rect(-11, SHOULDER_Y - 3, 22, 27, { fill: shade(base, -18) }, 6),
    rect(-7.5, SHOULDER_Y - 3, 18.5, 27, { fill: base }, 6),
    ...(style ? style.body(color) : bareChest(skin, gender)),
    rect(-11, SHOULDER_Y - 3, 22, 27, OUTLINED, 6),
    ...(bottom && BOTTOMS[bottom.style].belt ? [rect(-10, HIP_Y - 5, 20, 3, { fill: BELT }), rect(2, HIP_Y - 5, 3, 3, { fill: BUCKLE })] : []),
  ];
}

// --- Gorros ----------------------------------------------------------------------------------

const R = HEAD_R;

/** Casco sobre el pelo: media circunferencia por la coronilla que baja hasta `bottomY`. */
function crown(radius: number, bottomY: number, color: number): Shape {
  return poly([...arcPoints(0, HEAD_Y, radius, radius, Math.PI, Math.PI * 2, 16), { x: radius, y: bottomY }, { x: -radius, y: bottomY }], { fill: color });
}

/** Gorro sobre el pelo. `back` = vista de espaldas (sin visera ni detalles de frente). */
const HATS: Record<SlotStyle<"hat">, (color: number, back: boolean) => Shape[]> = {
  cap: (color, back) => [
    crown(R + 1.8, HEAD_Y - 1, color),
    back ? rect(-3, HEAD_Y - 4, 6, 2.5, { fill: shade(color, -30) }) : ellipse(R + 3, HEAD_Y - 2, 6.5, 2.25, { fill: shade(color, -20) }),
    circle(0, HEAD_Y - R - 1.5, 1.6, { fill: shade(color, 20) }),
  ],
  beanie: (color) => [
    crown(R + 2.5, HEAD_Y - 1, color),
    rect(-R - 2.5, HEAD_Y - 5, R * 2 + 5, 5, { fill: shade(color, -18) }, 2),
    circle(0, HEAD_Y - R - 4, 3.5, { fill: shade(color, 25) }),
  ],
  beret: (color) => [
    ellipse(-1, HEAD_Y - R + 1, R + 4, 4.5, { fill: color }),
    ellipse(-3, HEAD_Y - R - 0.5, R / 2, 1.5, { fill: shade(color, 18) }),
    rect(-0.75, HEAD_Y - R - 5, 1.5, 3, { fill: color }),
  ],
};

export function hat(item: WornItem<"hat"> | undefined, back: boolean): Shape[] {
  return item ? HATS[item.style](hexToNumber(item.color), back) : [];
}
