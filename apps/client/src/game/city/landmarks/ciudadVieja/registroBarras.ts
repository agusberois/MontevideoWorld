import { BARRA_COLORS } from "@montevideo-world/shared";
import * as Phaser from "phaser";
import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, WOOD, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Registro de Barras (Ciudad Vieja, 3 × 3, sobre la peatonal Sarandí): una casona colonial de dos
 * plantas como las del casco viejo, de cal amarilla, con zócalo, rejas en las ventanas de abajo,
 * balcones de hierro arriba, la puerta de madera con escalón y el cartel del Registro sobre la
 * entrada. De lado a lado, una tira de banderines con los colores de las barras, y un mástil con la
 * bandera de una barra en la azotea.
 */

const LIME = 0xe9d3a6;
const TRIM = 0xf4efe4;
const IRON = 0x262626;
const SIGN = 0x2f4f3f;
const PARAPET = shade(LIME, 8);
const HEIGHT = 58;

/** Ventanas de la planta baja con reja y las de arriba con balcón de hierro. */
function facade(p: IsoPainter, face: Face) {
  p.faceRect(face, -0.5, 2.5, 0, 5, shade(LIME, -22));
  for (const u of [-0.05, 2.05]) {
    p.faceRect(face, u - 0.17, u + 0.17, 5, 24, TRIM);
    p.faceRect(face, u - 0.13, u + 0.13, 7, 23, WINDOW);
    for (let k = u - 0.11; k < u + 0.13; k += 0.055) p.faceRect(face, k, k + 0.012, 7, 23, IRON);
  }
  p.faceRect(face, -0.5, 2.5, 27, 29, TRIM);
  for (const u of [-0.05, 1, 2.05]) {
    p.faceRect(face, u - 0.16, u + 0.16, 32, 50, TRIM);
    p.faceRect(face, u - 0.12, u + 0.12, 33, 49, WINDOW);
    p.faceRect(face, u - 0.2, u + 0.2, 31, 32, IRON);
    for (let k = u - 0.19; k < u + 0.2; k += 0.045) p.faceRect(face, k, k + 0.01, 32, 37, IRON);
    p.faceRect(face, u - 0.2, u + 0.2, 37, 38, IRON);
  }
}

/** Una tira de banderines triangulares colgando en curva entre `u0` y `u1`, a la altura `z`. */
function pennants(p: IsoPainter, face: Face, u0: number, u1: number, z: number) {
  const count = 9;
  const sag = (t: number) => z - Math.sin(t * Math.PI) * 4;
  const points = Array.from({ length: count * 4 + 1 }, (_, i) => {
    const t = i / (count * 4);
    return p.facePoint(face, Phaser.Math.Linear(u0, u1, t), sag(t));
  });
  p.g.lineStyle(0.8, 0x3b3b3b, 1).strokePoints(points, false);
  for (let i = 0; i < count; i++) {
    const t0 = (i + 0.15) / count;
    const t1 = (i + 0.85) / count;
    const tm = (t0 + t1) / 2;
    const color = Phaser.Display.Color.HexStringToColor(BARRA_COLORS[i % BARRA_COLORS.length].hex).color;
    p.fill(color, [
      p.facePoint(face, Phaser.Math.Linear(u0, u1, t0), sag(t0)),
      p.facePoint(face, Phaser.Math.Linear(u0, u1, t1), sag(t1)),
      p.facePoint(face, Phaser.Math.Linear(u0, u1, tm), sag(tm) - 6),
    ]);
  }
}

function drawRegistroBarras(p: IsoPainter) {
  const g = p.g;
  const south: Face = { side: "south", y: 2.5 };
  p.box(-0.5, -0.5, 2.5, 2.5, 0, HEIGHT, boxColors(LIME));
  for (const face of facesOf(2.5, 2.5)) facade(p, face);

  // La entrada al medio de la fachada sur: escalón, puerta de dos hojas con arco y el cartel.
  p.box(0.6, 2.5, 1.4, 2.66, 0, 2, boxColors(shade(TRIM, -10)));
  p.faceRect(south, 0.7, 1.3, 2, 25, TRIM);
  p.faceArch(south, 0.76, 1.24, 2, 24, WOOD);
  p.faceRect(south, 0.99, 1.01, 2, 21, shade(WOOD, -25));
  p.faceRect(south, 0.55, 1.45, 26.5, 31, SIGN);
  for (let i = 0; i < 6; i++) {
    const c = p.facePoint(south, 0.64 + i * 0.145, 28.8);
    g.fillStyle(0xf4efe4, 1).fillRect(c.x - 2, c.y - 1.5, 4, 3);
  }

  // Cornisa, pretil con pilarcitos y la tira de banderines de lado a lado de las dos fachadas.
  p.box(-0.55, -0.55, 2.55, 2.55, HEIGHT, HEIGHT + 3, boxColors(TRIM));
  for (const face of facesOf(2.5, 2.5)) {
    const rail: Face = face.side === "south" ? { side: "south", y: 2.52 } : { side: "east", x: 2.52 };
    p.faceRect(rail, -0.5, 2.52, HEIGHT + 3, HEIGHT + 8, PARAPET);
    for (const u of [-0.45, 0.5, 1.5, 2.45]) p.faceRect(rail, u - 0.05, u + 0.05, HEIGHT + 3, HEIGHT + 11, TRIM);
    pennants(p, face, -0.45, 2.45, 53);
  }

  // Mástil en la azotea con la bandera de una barra (dos colores en diagonal).
  const base = p.p(0.6, 0.6, HEIGHT + 3);
  const top = p.p(0.6, 0.6, HEIGHT + 34);
  g.lineStyle(1.5, 0x5b5b60, 1).lineBetween(base.x, base.y, top.x, top.y);
  g.fillStyle(0x6cace4, 1).fillTriangle(top.x, top.y, top.x + 16, top.y, top.x, top.y + 10);
  g.fillStyle(0xf1f1f1, 1).fillTriangle(top.x + 16, top.y, top.x + 16, top.y + 10, top.x, top.y + 10);
}

export const registroBarras: LandmarkDrawing = {
  size: 3,
  maxZ: 100,
  draw: drawRegistroBarras,
};
