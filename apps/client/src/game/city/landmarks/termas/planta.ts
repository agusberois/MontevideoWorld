import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";

/** Planta grande en maceta de barro (las Termas del Donador por dentro). */

const POT = 0xb0623b;
const LEAF = 0x3f8a4f;

function drawPlanta(p: IsoPainter) {
  p.box(-0.22, -0.22, 0.22, 0.22, 0, 12, boxColors(POT));
  p.box(-0.26, -0.26, 0.26, 0.26, 12, 14, boxColors(shade(POT, 15)));
  const g = p.g;
  const base = p.p(0, 0, 14);
  // Hojas largas en abanico, de atrás para adelante.
  for (let i = 0; i < 9; i++) {
    const angle = -Math.PI / 2 + (i - 4) * 0.32;
    const length = 24 + (i % 3) * 5;
    const tip = { x: base.x + Math.cos(angle) * length * 0.7, y: base.y + Math.sin(angle) * length };
    g.fillStyle(shade(LEAF, (i % 3) * 10 - 10), 1);
    g.fillTriangle(base.x - 2.5, base.y, base.x + 2.5, base.y, tip.x, tip.y);
  }
}

export const planta: LandmarkDrawing = {
  size: 1,
  maxZ: 50,
  draw: drawPlanta,
};

/** Palmera chica en maceta grande (las del spa). */
function drawPottedPalm(p: IsoPainter) {
  p.box(-0.26, -0.26, 0.26, 0.26, 0, 14, boxColors(0xe8e0d0));
  p.box(-0.3, -0.3, 0.3, 0.3, 14, 16, boxColors(0xd4a52c));
  const g = p.g;
  const base = p.p(0, 0, 16);
  const top = p.p(0, 0, 44);
  g.lineStyle(3, 0x7a5a3a, 1).lineBetween(base.x, base.y, top.x, top.y);
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI + (i / 6) * Math.PI;
    const tip = { x: top.x + Math.cos(angle) * 18, y: top.y + Math.sin(angle) * 6 + 8 };
    g.fillStyle(shade(0x3f8a4f, (i % 2) * 15), 1);
    g.fillTriangle(top.x - 2, top.y, top.x + 2, top.y, tip.x, tip.y);
  }
}

/** Macetero bajo con flores de colores. */
function drawFlowers(p: IsoPainter) {
  p.box(-0.32, -0.32, 0.32, 0.32, 0, 9, boxColors(0xb0623b));
  const g = p.g;
  const top = p.p(0, 0, 9);
  g.fillStyle(0x3f8a4f, 1).fillEllipse(top.x, top.y - 3, 26, 11);
  const colors = [0xe0476b, 0xf2c94c, 0xffffff, 0xb07cd8, 0xff8a5c];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    g.fillStyle(colors[i % colors.length], 1).fillCircle(top.x + Math.cos(angle) * 8, top.y - 4 + Math.sin(angle) * 3.5, 2.4);
  }
}

/** Farol de pie dorado (se prende de noche: la luz la pone `CityRenderer.nightLights`). */
function drawLamp(p: IsoPainter) {
  p.box(-0.12, -0.12, 0.12, 0.12, 0, 3, boxColors(0x2b2b30));
  const g = p.g;
  const base = p.p(0, 0, 3);
  const top = p.p(0, 0, 40);
  g.lineStyle(2, 0xd4a52c, 1).lineBetween(base.x, base.y, top.x, top.y);
  g.fillStyle(0xd4a52c, 1).fillRect(top.x - 4, top.y - 2, 8, 2);
  g.fillStyle(0xfff3b0, 1).fillRect(top.x - 3, top.y - 10, 6, 8);
  g.lineStyle(1, 0xd4a52c, 1).strokeRect(top.x - 3, top.y - 10, 6, 8);
  g.fillStyle(0xd4a52c, 1).fillTriangle(top.x - 5, top.y - 10, top.x + 5, top.y - 10, top.x, top.y - 15);
}

export const pottedPalm: LandmarkDrawing = { size: 1, maxZ: 60, draw: drawPottedPalm };
export const flowers: LandmarkDrawing = { size: 1, maxZ: 22, draw: drawFlowers };
export const lamp: LandmarkDrawing = { size: 1, maxZ: 56, draw: drawLamp };
