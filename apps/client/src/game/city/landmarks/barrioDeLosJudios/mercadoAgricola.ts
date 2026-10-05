import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { IRON, WINDOW, WOOD } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Mercado Agrícola de Montevideo (el MAM, en Goes, pegado a Villa Muñoz): muros de ladrillo con
 * ventanales de medio punto y la gran bóveda de hierro y vidrio de punta a punta (oeste → este),
 * cerrada en la fachada este por un abanico vidriado sobre la entrada.
 */

const BRICK = 0xb4673f;
const TRIM = 0xe6d8bd;
const GLASS = 0x8fb8b4;
const RIB = 0x3f4d4a;

/** Bóveda: de `Y0` a `Y1` (eje norte-sur), apoyada en `SPRING` y con flecha `RISE` (px). */
const X0 = -0.5;
const X1 = 2.5;
const Y0 = -0.3;
const Y1 = 2.3;
const SPRING = 32;
const RISE = 26;
const STEPS = 10;

/** Punto del arco de la bóveda: `t` = 0 (borde norte) … 1 (borde sur). */
function arc(t: number): { y: number; z: number } {
  return { y: Y0 + ((Y1 - Y0) * (1 - Math.cos(Math.PI * t))) / 2, z: SPRING + Math.sin(Math.PI * t) * RISE };
}

function drawMercadoAgricola(p: IsoPainter) {
  const east: Face = { side: "east", x: X1 };
  const south: Face = { side: "south", y: Y1 };

  // Muros de ladrillo con ventanales y cornisa clara.
  p.box(X0, Y0, X1, Y1, 0, SPRING - 3, boxColors(BRICK));
  p.windows(south, X0 + 0.1, X1 - 0.1, 4, 26, 5, 1, { color: WINDOW, arched: true, widthRatio: 0.55, heightRatio: 0.85 });
  p.windows(east, Y0 + 0.1, 0.6, 4, 26, 1, 1, { color: WINDOW, arched: true, widthRatio: 0.55, heightRatio: 0.85 });
  p.windows(east, 1.4, Y1 - 0.1, 4, 26, 1, 1, { color: WINDOW, arched: true, widthRatio: 0.55, heightRatio: 0.85 });
  // Entrada al centro de la fachada este (portón de madera bajo un arco).
  p.faceArch(east, 0.7, 1.3, 0, 24, WOOD);
  p.box(X0 - 0.03, Y0 - 0.03, X1 + 0.03, Y1 + 0.03, SPRING - 3, SPRING, boxColors(TRIM));

  // Bóveda de vidrio: franjas del norte al sur (así las de adelante tapan a las de atrás). Las que
  // miran al sur, más claras.
  for (let i = 0; i < STEPS; i++) {
    const a = arc(i / STEPS);
    const b = arc((i + 1) / STEPS);
    const strip = [p.p(X0, a.y, a.z), p.p(X1, a.y, a.z), p.p(X1, b.y, b.z), p.p(X0, b.y, b.z)];
    p.fill(shade(GLASS, -18 + (i / STEPS) * 30), strip);
    p.outline(strip, 0.12);
  }
  // Nervaduras de hierro a lo largo de la bóveda.
  for (let k = 1; k < 6; k++) {
    const x = X0 + ((X1 - X0) * k) / 6;
    for (let i = 0; i < STEPS; i++) {
      const a = arc(i / STEPS);
      const b = arc((i + 1) / STEPS);
      p.line(p.p(x, a.y, a.z), p.p(x, b.y, b.z), RIB, 1, 0.55);
    }
  }
  // Cumbrera.
  const top = arc(0.5);
  p.line(p.p(X0, top.y, top.z), p.p(X1, top.y, top.z), RIB, 1.4, 0.7);

  // Abanico vidriado en la fachada este: medio círculo con montantes.
  const fan: Array<[number, number]> = [];
  for (let i = 0; i <= STEPS; i++) {
    const point = arc(i / STEPS);
    fan.push([point.y, point.z]);
  }
  p.facePoly(east, fan, shade(GLASS, 12));
  const center = (Y0 + Y1) / 2;
  for (let i = 1; i < 6; i++) {
    const point = arc(i / 6);
    p.line(p.facePoint(east, center, SPRING), p.facePoint(east, point.y, point.z), RIB, 1, 0.8);
  }
  for (let i = 0; i < STEPS; i++) {
    const [ua, za] = fan[i];
    const [ub, zb] = fan[i + 1];
    p.line(p.facePoint(east, ua, za), p.facePoint(east, ub, zb), IRON, 1.6, 0.85);
  }

  // Remates de hierro en las esquinas que se ven.
  for (const [x, y] of [
    [X0, Y1],
    [X1, Y1],
    [X1, Y0],
  ]) {
    p.spire(x, y, SPRING, SPRING + 8, IRON);
  }
}

export const mercadoAgricola: LandmarkDrawing = {
  size: 3,
  maxZ: 66,
  draw: drawMercadoAgricola,
};
