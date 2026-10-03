import type { FacialHair, Gender, Glasses, HairStyle } from "@montevideo-world/shared";
import { Point, Shape, arcPoints, circle, ellipse, line, poly, rect, shade } from "./shapes";

/**
 * La cabeza del avatar como listas de formas (ver `shapes.ts`): la misma para el juego (Phaser) y
 * para la vista previa (SVG). Vista 3/4 hacia +x (la cara mira a la derecha; el cuerpo se espeja
 * para la izquierda). Px desde los pies.
 *
 * Capas, de atrás hacia adelante (el avatar las apila así; la vista previa también):
 * `headFront` (pelo de atrás, cuello, cara con volumen, oreja, nariz) → `faceFeatures` (barba, boca,
 * bigote, cejas) → `eyes` (aparte: parpadean) → `glasses` → `frontHair` (flequillo, casco, trenza de
 * adelante) → gorro. De espaldas, sólo `headBack`.
 */

export const HEAD_Y = -69;
export const HEAD_R = 10.5;
export const SHOULDER_Y = -55;
/** Línea de los ojos: `eyes` dibuja con y relativo a ésta (así el parpadeo achica alrededor de los ojos). */
export const EYE_Y = HEAD_Y - 0.5;

export const OUTLINE = 0x000000;
export const OUTLINE_ALPHA = 0.28;

/** Centros de los ojos (el de atrás más cerca del borde: vista 3/4). */
const EYE_X: readonly [number, number] = [-2, 6];
const MOUTH_X = 3;
const MOUTH_Y = HEAD_Y + 5;
const MOUTH_COLOR = 0x7a3b2e;
const LIPS_COLOR = 0xc0475a;
const BLUSH = 0xff8a80;
const FRAME = 0x2b2b30;

/** Rasgos ya resueltos a colores (lo arma `avatarLook` en el juego y la vista previa en React). */
export interface HeadLook {
  gender: Gender;
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  eye: number;
  facialHair: FacialHair;
  glasses: Glasses;
}

/** Cara del momento: normal, contento (pateó un picudo) o dolorido (le picó uno). */
export type Expression = "neutral" | "happy" | "ouch";

const R = HEAD_R;

/** Medio círculo superior (de oreja a oreja por la coronilla) que baja por los costados hasta `leftY` / `rightY`. */
function cap(radius: number, leftY: number, rightY: number, extra: Point[] = []): Point[] {
  return [...arcPoints(0, HEAD_Y, radius, radius, Math.PI, Math.PI * 2, 16), { x: radius, y: rightY }, ...extra, { x: -radius, y: leftY }];
}

/** Cadena de óvalos que cuelga (trenzas): de (x, y0) hacia abajo, alternando el tono para que se vea trenzada. */
function braid(x: number, y0: number, length: number, color: number): Shape[] {
  const shapes: Shape[] = [];
  for (let i = 0, y = y0; y < y0 + length; i++, y += 3.4) shapes.push(ellipse(x + (i % 2 ? 0.5 : -0.5), y, 2, 2.1, { fill: i % 2 ? shade(color, -12) : color }));
  shapes.push(rect(x - 1.6, y0 + length, 3.2, 1.8, { fill: 0xe63946 }, 0.8));
  return shapes;
}

/** Rasta: tira redondeada con marcas oscuras. */
function dread(x: number, y0: number, length: number, color: number): Shape[] {
  const shapes: Shape[] = [rect(x - 1.5, y0, 3, length, { fill: color }, 1.5)];
  for (let y = y0 + 4; y < y0 + length - 2; y += 4) shapes.push(line(x - 1.4, y, x + 1.4, y + 0.8, shade(color, -18), 0.8));
  return shapes;
}

// --- De frente ------------------------------------------------------------------------------

/** Pelo de atrás, cuello en V, cara con volumen, oreja y nariz. */
export function headFront(look: HeadLook): Shape[] {
  const { skin, hair } = look;
  const shapes: Shape[] = [];

  // Pelo que queda detrás de la cabeza.
  switch (look.hairStyle) {
    case "long":
      shapes.push(rect(-R - 2, HEAD_Y - 4, R * 2 + 3, 25, { fill: hair }, 5));
      break;
    case "afro":
      shapes.push(circle(-1, HEAD_Y - 3, R + 6, { fill: hair }));
      break;
    case "ponytail":
      shapes.push(ellipse(-R - 3, HEAD_Y + 4, 3.5, 8, { fill: hair }));
      break;
    case "curly":
      for (const [x, y] of [
        [-R - 1, HEAD_Y - 2],
        [-R - 1.5, HEAD_Y + 3],
        [-R + 0.5, HEAD_Y + 8],
        [-R + 5, HEAD_Y + 10],
        [R - 3, HEAD_Y + 9],
      ]) {
        shapes.push(circle(x, y, 4.2, { fill: hair }));
      }
      break;
    case "braids":
      shapes.push(...braid(-R + 1, HEAD_Y + 3, 20, hair));
      break;
    case "bun":
      shapes.push(circle(-2, HEAD_Y - R - 2.5, 5, { fill: hair }), circle(-3, HEAD_Y - R - 3.5, 2, { fill: shade(hair, 15) }));
      break;
    case "dreads":
      // Sólo a los costados: las del medio caían sobre el pecho como una cortina.
      for (const [x, length] of [
        [-R - 2, 22],
        [-R + 1.5, 25],
        [R - 0.5, 20],
      ]) {
        shapes.push(...dread(x, HEAD_Y - 2, length, shade(hair, -6)));
      }
      break;
    case "short":
    case "buzz":
      break;
  }

  // Escote en V (la piel que asoma sobre la remera).
  shapes.push(poly(
    [
      { x: -3.5, y: SHOULDER_Y - 3 },
      { x: 3.5, y: SHOULDER_Y - 3 },
      { x: 0, y: SHOULDER_Y + 2 },
    ],
    { fill: skin },
  ));

  // Cara con volumen (el lado lejano y la mandíbula en sombra, el resto en la luz), la oreja del lado
  // lejano sobre el borde y el contorno encima de las dos.
  shapes.push(
    ellipse(0, HEAD_Y, R, R + 1, { fill: shade(skin, -9) }),
    ellipse(1.3, HEAD_Y - 0.6, R - 1.3, R + 0.2, { fill: skin }),
    ellipse(3.5, HEAD_Y - 4.5, 3.5, 2, { fill: shade(skin, 6), fillAlpha: 0.6 }),
    ellipse(-R + 0.5, HEAD_Y + 1, 2.5, 3.5, { fill: shade(skin, -4) }),
    ellipse(0, HEAD_Y, R, R + 1, { stroke: OUTLINE, strokeWidth: 1.5, strokeAlpha: OUTLINE_ALPHA }),
    ellipse(-R + 0.5, HEAD_Y + 1, 1, 2, { fill: shade(skin, -15) }),
  );

  // Cachetes.
  const blush = look.gender === "f" ? 0.32 : 0.18;
  for (const x of [EYE_X[0] + 0.2, EYE_X[1] + 1.4]) shapes.push(ellipse(x, HEAD_Y + 3.6, 1.9, 1.1, { fill: BLUSH, fillAlpha: blush }));

  // Nariz con brillo.
  shapes.push(ellipse(4.5, HEAD_Y + 3.5, 1.5, 1.25, { fill: shade(skin, -15) }), circle(4.9, HEAD_Y + 2.8, 0.6, { fill: 0xffffff, fillAlpha: 0.45 }));
  return shapes;
}

/** Barba (debajo de la boca), boca, bigote y cejas, según la expresión. */
export function faceFeatures(look: HeadLook, expression: Expression): Shape[] {
  const shapes: Shape[] = [];
  const female = look.gender === "f";
  const beard = look.hair;

  // Barba y barba de días: la parte baja de la cara, hasta un poco abajo de los cachetes.
  if (look.facialHair === "beard" || look.facialHair === "stubble") {
    const jaw = [...arcPoints(0, HEAD_Y, R + 0.4, R + 1.4, Math.PI * 0.08, Math.PI * 0.95, 14), { x: -R + 1.5, y: HEAD_Y + 3 }, { x: R - 0.5, y: HEAD_Y + 2.5 }];
    shapes.push(look.facialHair === "beard" ? poly(jaw, { fill: beard }) : poly(jaw, { fill: shade(beard, 10), fillAlpha: 0.32 }));
  }
  if (look.facialHair === "goatee") shapes.push(ellipse(MOUTH_X + 0.3, HEAD_Y + 8.7, 2.4, 2, { fill: beard }));

  // Boca.
  const lips = female ? LIPS_COLOR : MOUTH_COLOR;
  if (expression === "happy") {
    shapes.push(poly(arcPoints(MOUTH_X, MOUTH_Y - 0.6, 3.2, 3, 0, Math.PI, 10), { fill: 0x5a1f1f }));
    shapes.push(line(MOUTH_X - 3.2, MOUTH_Y - 0.6, MOUTH_X + 3.2, MOUTH_Y - 0.6, lips, female ? 1.6 : 1.2));
  } else if (expression === "ouch") {
    shapes.push(ellipse(MOUTH_X, MOUTH_Y + 1, 1.6, 2, { fill: 0x5a1f1f, stroke: lips, strokeWidth: 0.8 }));
  } else {
    shapes.push(poly(arcPoints(MOUTH_X, MOUTH_Y, female ? 2.6 : 3, female ? 2.6 : 3, Math.PI * 0.2, Math.PI * 0.8, 8), { stroke: lips, strokeWidth: female ? 2 : 1.5 }, false));
  }

  // Bigote (arriba de la boca; la barba y la chiva lo llevan también).
  if (look.facialHair === "mustache" || look.facialHair === "goatee" || look.facialHair === "beard") {
    shapes.push(rect(MOUTH_X - 3.4, MOUTH_Y - 2.3, 6.8, 2, { fill: look.facialHair === "beard" ? shade(beard, -8) : beard }, 1));
  }

  // Cejas: más finas en el avatar de mujer; dolorido, se juntan hacia arriba; contento, suben.
  const brow = shade(look.hair, -10);
  const width = female ? 1.2 : 1.8;
  const lift = expression === "happy" ? -0.8 : 0;
  if (expression === "ouch") {
    shapes.push(line(-4, HEAD_Y - 4.2, 0, HEAD_Y - 5.6, brow, width), line(4, HEAD_Y - 5.6, 8, HEAD_Y - 4.2, brow, width));
  } else {
    shapes.push(line(-4, HEAD_Y - 4 + lift, 0, HEAD_Y - 4.6 + lift, brow, width), line(4, HEAD_Y - 4.6 + lift, 8, HEAD_Y - 4 + lift, brow, width));
  }
  return shapes;
}

/** Ojos (y relativo a `EYE_Y`): blanco, iris del color elegido y brillo; contento o dolorido, cerrados. */
export function eyes(look: HeadLook, expression: Expression): Shape[] {
  const shapes: Shape[] = [];
  for (const x of EYE_X) {
    if (expression === "happy") {
      // ^ ^
      shapes.push(poly(arcPoints(x, 1, 2.1, 2, Math.PI * 1.1, Math.PI * 1.9, 6), { stroke: 0x2b1d14, strokeWidth: 1.4 }, false));
      continue;
    }
    if (expression === "ouch") {
      // > <: dos rayitas apretadas hacia la nariz.
      const toward = x < 2 ? 1 : -1;
      shapes.push(
        line(x - 1.8 * toward, -1.6, x + 1.4 * toward, 0, 0x2b1d14, 1.3),
        line(x + 1.4 * toward, 0, x - 1.8 * toward, 1.6, 0x2b1d14, 1.3),
      );
      continue;
    }
    shapes.push(
      ellipse(x, 0, 2.1, 2.3, { fill: 0xffffff }),
      circle(x + 0.7, 0.3, 1.5, { fill: look.eye }),
      circle(x + 0.8, 0.4, 0.7, { fill: 0x111111 }),
      circle(x + 0.2, -0.4, 0.5, { fill: 0xffffff, fillAlpha: 0.9 }),
    );
    if (look.gender === "f") {
      // Pestañas: dos trazos hacia afuera en cada ojo.
      const out = x < 2 ? -1 : 1;
      shapes.push(line(x + 2 * out, -1.1, x + 3.6 * out, -2.5, 0x2b1d14, 1.2), line(x + 1.2 * out, -1.8, x + 2.2 * out, -3.4, 0x2b1d14, 1.2));
    }
  }
  return shapes;
}

/** Lentes sobre los ojos (no parpadean): redondos, cuadrados o de sol, con puente y patilla. */
export function glasses(look: HeadLook): Shape[] {
  if (look.glasses === "none") return [];
  const shapes: Shape[] = [];
  const [a, b] = EYE_X;
  const y = EYE_Y;
  for (const x of EYE_X) {
    if (look.glasses === "round") shapes.push(circle(x, y, 2.9, { fill: 0xd8eef5, fillAlpha: 0.18, stroke: FRAME, strokeWidth: 1 }));
    else if (look.glasses === "square") shapes.push(rect(x - 2.9, y - 2.3, 5.8, 4.6, { fill: 0xd8eef5, fillAlpha: 0.18, stroke: FRAME, strokeWidth: 1.1 }, 0.8));
    else {
      shapes.push(rect(x - 3, y - 2.2, 6, 4.4, { fill: 0x1d1d22, fillAlpha: 0.93, stroke: FRAME, strokeWidth: 0.8 }, 1.6));
      shapes.push(line(x - 1.6, y - 1.2, x - 0.2, y - 1.6, 0xffffff, 0.8, 0.45));
    }
  }
  shapes.push(line(a + 2.9, y - 0.4, b - 2.9, y - 0.4, FRAME, 1), line(a - 2.9, y - 0.4, -R + 0.8, y - 1.2, FRAME, 1));
  return shapes;
}

/** Pelo que va por delante de la cara: casco, flequillo y, según el peinado, rulos, trenza o rastas. */
export function frontHair(look: HeadLook): Shape[] {
  const { hair } = look;
  const shine = shade(hair, 18);
  switch (look.hairStyle) {
    case "buzz":
      return [poly(cap(R + 0.5, HEAD_Y + 1, HEAD_Y - 2), { fill: hair }), ellipse(3, HEAD_Y - 8.5, 5, 1.6, { fill: shine, fillAlpha: 0.5 })];
    case "afro": {
      // Del lado de la cara el pelo termina arriba del ojo (antes lo tapaba).
      const shapes: Shape[] = arcPoints(0, HEAD_Y - 2, R + 1, R + 1, Math.PI * 0.9, Math.PI * 1.88, 6).map((p) => circle(p.x, p.y, 5.5, { fill: hair }));
      return [...shapes, circle(R + 2.5, HEAD_Y - 8, 4.5, { fill: hair }), poly(cap(R + 1, HEAD_Y + 2, HEAD_Y - 4.5), { fill: hair })];
    }
    case "curly": {
      // Rulos arriba y sobre la oreja del lado lejano; del lado de la cara, uno solo y alto (no tapan los ojos).
      const fringe: Point[] = [
        { x: 7, y: HEAD_Y - 6.5 },
        { x: 1, y: HEAD_Y - 7 },
        { x: -5, y: HEAD_Y - 5 },
      ];
      const shapes: Shape[] = [poly(cap(R + 1, HEAD_Y + 2, HEAD_Y - 2, fringe), { fill: hair })];
      const curls = [
        ...arcPoints(0, HEAD_Y - 3, R + 1.5, R + 1.5, Math.PI * 1.15, Math.PI * 1.85, 6),
        { x: -R - 0.5, y: HEAD_Y - 1 },
        { x: -R + 0.5, y: HEAD_Y + 3.5 },
        { x: R + 0.5, y: HEAD_Y - 6 },
      ];
      for (const p of curls) shapes.push(circle(p.x, p.y, 3.6, { fill: hair }), circle(p.x + 0.8, p.y - 0.9, 1.2, { fill: shine, fillAlpha: 0.6 }));
      return shapes;
    }
    case "braids":
      // Raya al medio y la trenza del lado cercano cayendo por delante del hombro.
      return [
        poly(cap(R + 1.2, HEAD_Y + 3, HEAD_Y - 1, [{ x: 3, y: HEAD_Y - 6 }, { x: 1.5, y: HEAD_Y - 9.5 }, { x: 0, y: HEAD_Y - 6 }]), { fill: hair }),
        ...braid(R - 1.5, HEAD_Y + 3, 18, hair),
      ];
    case "bun":
      return [poly(cap(R + 0.8, HEAD_Y + 1, HEAD_Y - 2, [{ x: 4, y: HEAD_Y - 5 }]), { fill: hair }), ellipse(2, HEAD_Y - 8.5, 5, 1.6, { fill: shine, fillAlpha: 0.6 })];
    case "dreads":
      return [
        poly(cap(R + 1.5, HEAD_Y + 2, HEAD_Y - 1), { fill: hair }),
        ...dread(-R - 0.5, HEAD_Y - 3, 16, hair),
        ...dread(R + 0.2, HEAD_Y - 3, 13, hair),
        ...dread(5, HEAD_Y - 7, 6, hair),
      ];
    case "short":
    case "long":
    case "ponytail": {
      // Casco con flequillo; el largo cae también por el costado lejano.
      const fringe: Point[] = [
        { x: 7, y: HEAD_Y - 5 },
        { x: 2, y: HEAD_Y - 6 },
        { x: -4, y: HEAD_Y - 4.5 },
        { x: -R + 2, y: HEAD_Y - 2 },
      ];
      return [poly(cap(R + 1.5, HEAD_Y + (look.hairStyle === "long" ? 12 : 4), HEAD_Y + 1, fringe), { fill: hair }), ellipse(3, HEAD_Y - 8.5, 3.5, 1.25, { fill: shine })];
    }
  }
}

// --- De espaldas ----------------------------------------------------------------------------

/** Nuca, orejas y pelo (de espaldas no se ve la cara). */
export function headBack(look: HeadLook): Shape[] {
  const { skin, hair } = look;
  const shapes: Shape[] = [
    ellipse(-R, HEAD_Y + 1, 2.5, 3.5, { fill: skin }),
    ellipse(R, HEAD_Y + 1, 2.5, 3.5, { fill: skin }),
    ellipse(0, HEAD_Y, R, R + 1, { fill: shade(skin, -6), stroke: OUTLINE, strokeWidth: 1.5, strokeAlpha: OUTLINE_ALPHA }),
  ];
  // Casco que baja hasta la nuca, un poco más angosto abajo.
  const nape = (radius: number) =>
    poly([...arcPoints(0, HEAD_Y, radius, radius, Math.PI, Math.PI * 2, 16), { x: R - 1, y: HEAD_Y + 6 }, { x: -R + 1, y: HEAD_Y + 6 }], { fill: hair });

  switch (look.hairStyle) {
    case "afro":
      shapes.push(circle(0, HEAD_Y - 3, R + 6, { fill: hair }));
      break;
    case "long":
      shapes.push(rect(-R - 2, HEAD_Y - 4, R * 2 + 4, 25, { fill: hair }, 5), poly(cap(R + 2, HEAD_Y, HEAD_Y), { fill: hair }));
      break;
    case "curly":
      shapes.push(nape(R + 1.5));
      for (const p of arcPoints(0, HEAD_Y + 1, R + 1.5, R + 2, Math.PI * 0.9, Math.PI * 2.1, 8)) shapes.push(circle(p.x, p.y, 4, { fill: hair }));
      for (const x of [-6, 0, 6]) shapes.push(circle(x, HEAD_Y + 9, 4, { fill: hair }));
      break;
    case "braids":
      shapes.push(nape(R + 1.2), ...braid(-4, HEAD_Y + 6, 18, hair), ...braid(4, HEAD_Y + 6, 18, hair));
      break;
    case "bun":
      shapes.push(nape(R + 0.8), circle(0, HEAD_Y - 6, 5, { fill: hair }), rect(-3, HEAD_Y - 2.5, 6, 2, { fill: 0xe63946 }, 1));
      break;
    case "dreads":
      shapes.push(nape(R + 1.5));
      for (let x = -R; x <= R; x += 3.5) shapes.push(...dread(x, HEAD_Y - 2, 22 + (Math.round(x) % 3), hair));
      break;
    case "ponytail":
      shapes.push(nape(R + 1.5), ellipse(0, HEAD_Y + 11, 3.5, 8, { fill: hair }), rect(-3, HEAD_Y + 4, 6, 2.5, { fill: 0xe63946 }));
      break;
    case "short":
      shapes.push(nape(R + 1.5));
      break;
    case "buzz":
      shapes.push(nape(R + 0.5));
      break;
  }
  return shapes;
}
