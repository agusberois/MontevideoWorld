/**
 * Dibujo del avatar sin Phaser: listas de formas simples (elipses, rectángulos, polígonos, líneas)
 * en coordenadas del cuerpo (px, origen en los pies). Las traducen dos pintores: el de Phaser
 * (`game/objects/paintShapes.ts`, el juego) y el de SVG (`features/join/AvatarPreview.tsx`, la
 * pantalla de ingreso y los detalles de un jugador). Así los dos se ven igual sin copiar el dibujo.
 * Este archivo y `head.ts` no pueden importar Phaser (los usa React).
 */

export interface Point {
  x: number;
  y: number;
}

/** Relleno y/o contorno (colores 0xRRGGBB). */
export interface Paint {
  fill?: number;
  fillAlpha?: number;
  stroke?: number;
  strokeWidth?: number;
  strokeAlpha?: number;
}

export type Shape =
  | ({ kind: "ellipse"; x: number; y: number; rx: number; ry: number } & Paint)
  | ({ kind: "rect"; x: number; y: number; width: number; height: number; radius?: number } & Paint)
  /** `closed: false` = línea abierta (sólo contorno). */
  | ({ kind: "poly"; points: Point[]; closed: boolean } & Paint);

export const ellipse = (x: number, y: number, rx: number, ry: number, paint: Paint): Shape => ({ kind: "ellipse", x, y, rx, ry, ...paint });
export const circle = (x: number, y: number, r: number, paint: Paint): Shape => ellipse(x, y, r, r, paint);
export const rect = (x: number, y: number, width: number, height: number, paint: Paint, radius?: number): Shape => ({
  kind: "rect",
  x,
  y,
  width,
  height,
  radius,
  ...paint,
});
export const poly = (points: Point[], paint: Paint, closed = true): Shape => ({ kind: "poly", points, closed, ...paint });
export const line = (x1: number, y1: number, x2: number, y2: number, color: number, width: number, alpha = 1): Shape =>
  poly(
    [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ],
    { stroke: color, strokeWidth: width, strokeAlpha: alpha },
    false,
  );

/** Puntos de un arco (ángulos en radianes, 0 = derecha, π/2 = abajo, como en pantalla). */
export function arcPoints(cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 12): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = from + ((to - from) * i) / steps;
    return { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
  });
}

/**
 * Aclara (amount > 0) u oscurece (amount < 0) un color en puntos porcentuales del brillo (V de HSV),
 * igual que `Phaser.Display.Color.lighten/darken` (lo que usa `game/color.ts`), pero sin Phaser y
 * sin pasarse de rango.
 */
export function shade(color: number, amount: number): number {
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  const v = Math.min(1, Math.max(0, max + amount / 100));
  const channel = (n: number) => {
    const k = (n + h * 6) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return (channel(5) << 16) | (channel(3) << 8) | channel(1);
}

/** "#rrggbb" → 0xRRGGBB. */
export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.slice(1), 16);
}

/** 0xRRGGBB → "#rrggbb" (para SVG). */
export function numberToHex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}
