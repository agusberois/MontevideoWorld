import { shade } from "../../../color";
import { IsoPainter, Vec2 } from "../../IsoPainter";

/**
 * Lo que comparten los edificios del Centro: volúmenes con la **esquina redondeada** (la sureste, la
 * que se ve), como el Palacio Lapido, el Edificio Rex o la torre de la esquina del London París.
 * La curva se arma con facetas angostas; cada una se sombrea según hacia dónde mira (más clara hacia
 * el sur, más oscura hacia el este, como las caras de `boxColors`).
 */

const FACETS = 8;

/** Punto de la curva de la esquina: θ = 0 mira al este, θ = π/2 al sur. */
function arcPoint(cx: number, cy: number, r: number, theta: number): [number, number] {
  return [cx + r * Math.cos(theta), cy + r * Math.sin(theta)];
}

/** Color de una faceta que mira a `theta` (entre la cara este y la sur). */
function facetColor(base: number, theta: number): number {
  return shade(base, -20 + (14 * theta) / (Math.PI / 2));
}

/**
 * Prisma de (x0, y0) a (x1, y1) entre z0 y z1 con la esquina sureste redondeada (radio `r`): cara sur
 * y cara este rectas, la curva y el techo.
 */
export function roundedBox(p: IsoPainter, x0: number, y0: number, x1: number, y1: number, r: number, z0: number, z1: number, base: number, top = shade(base, 10)) {
  const cx = x1 - r;
  const cy = y1 - r;
  const quad = (a: [number, number], b: [number, number], za: number, zb: number): Vec2[] => [p.p(a[0], a[1], za), p.p(b[0], b[1], za), p.p(b[0], b[1], zb), p.p(a[0], a[1], zb)];
  const south = quad([x0, y1], [cx, y1], z0, z1);
  const east = quad([x1, y0], [x1, cy], z0, z1);
  p.fill(shade(base, -6), south);
  p.outline(south);
  p.fill(shade(base, -20), east);
  p.outline(east);
  for (let i = 0; i < FACETS; i++) {
    const t0 = (i / FACETS) * (Math.PI / 2);
    const t1 = ((i + 1) / FACETS) * (Math.PI / 2);
    p.fill(facetColor(base, (t0 + t1) / 2), quad(arcPoint(cx, cy, r, t0), arcPoint(cx, cy, r, t1), z0, z1));
  }
  const roof: Vec2[] = [p.p(x0, y0, z1), p.p(x1, y0, z1)];
  for (let i = 0; i <= FACETS; i++) {
    const [x, y] = arcPoint(cx, cy, r, (i / FACETS) * (Math.PI / 2));
    roof.push(p.p(x, y, z1));
  }
  roof.push(p.p(x0, y1, z1));
  p.fill(top, roof);
  p.outline(roof);
}

/**
 * Una franja horizontal (ventanas corridas, balcón, cornisa) sobre las caras visibles de un
 * `roundedBox`, entre z0 y z1. `out` la saca un poco hacia afuera (balcones que vuelan).
 */
export function roundedBand(
  p: IsoPainter,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  z0: number,
  z1: number,
  color: number,
  out = 0,
  alpha = 1,
) {
  const cx = x1 - r;
  const cy = y1 - r;
  const R = r + out;
  const quad = (a: [number, number], b: [number, number]): Vec2[] => [p.p(a[0], a[1], z0), p.p(b[0], b[1], z0), p.p(b[0], b[1], z1), p.p(a[0], a[1], z1)];
  p.fill(color, quad([x0, y1 + out], [cx, y1 + out]), alpha);
  p.fill(shade(color, -10), quad([x1 + out, y0], [x1 + out, cy]), alpha);
  for (let i = 0; i < FACETS; i++) {
    const t0 = (i / FACETS) * (Math.PI / 2);
    const t1 = ((i + 1) / FACETS) * (Math.PI / 2);
    p.fill(shade(color, -10 + (10 * (t0 + t1)) / Math.PI), quad(arcPoint(cx, cy, R, t0), arcPoint(cx, cy, R, t1)), alpha);
  }
}

/** Cilindro (torre redonda) de radio `r` centrado en (x, y), entre z0 y z1: sólo la mitad que se ve. */
export function cylinder(p: IsoPainter, x: number, y: number, r: number, z0: number, z1: number, base: number) {
  const steps = 12;
  // Mitad del frente: de θ = −π/4 (noreste) a 3π/4 (suroeste), que es lo que mira a la cámara.
  for (let i = 0; i < steps; i++) {
    const t0 = -Math.PI / 4 + (i / steps) * Math.PI;
    const t1 = -Math.PI / 4 + ((i + 1) / steps) * Math.PI;
    const a = arcPoint(x, y, r, t0);
    const b = arcPoint(x, y, r, t1);
    const facing = (t0 + t1) / 2;
    p.fill(shade(base, -22 + 22 * Math.sin(facing + Math.PI / 4) * 0.8), [p.p(a[0], a[1], z0), p.p(b[0], b[1], z0), p.p(b[0], b[1], z1), p.p(a[0], a[1], z1)]);
  }
  const top: Vec2[] = [];
  for (let i = 0; i < 24; i++) {
    const [px, py] = arcPoint(x, y, r, (i / 24) * Math.PI * 2);
    top.push(p.p(px, py, z1));
  }
  p.fill(shade(base, 12), top);
}

/** Punto sobre la superficie de un cilindro (para ventanas y columnas): θ como en `cylinder`. */
export function onCylinder(p: IsoPainter, x: number, y: number, r: number, theta: number, z: number): Vec2 {
  const [px, py] = arcPoint(x, y, r, theta);
  return p.p(px, py, z);
}
