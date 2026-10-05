import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";

/** Muebles del casino: la tragamonedas (1 × 1) y las mesas de ruleta y de blackjack (3 × 3). */

const GOLD = 0xe2b53e;
const FELT = 0x1f6b45;
const WOOD = 0x5a3220;

/** Tragamonedas: gabinete rojo y dorado con la pantalla de tres rodillos, la palanca y luces arriba. */
function drawSlotMachine(p: IsoPainter) {
  const body = 0xb3122e;
  p.box(-0.32, -0.3, 0.32, 0.3, 0, 8, boxColors(0x2b2b30));
  p.box(-0.3, -0.28, 0.3, 0.28, 8, 46, boxColors(body));
  const front = { side: "south" as const, y: 0.28 };
  p.faceRect(front, -0.26, 0.26, 22, 36, 0x111111);
  for (const [u, color] of [
    [-0.17, 0xffffff],
    [0, 0xffffff],
    [0.17, 0xffffff],
  ] as const) {
    p.faceRect(front, u - 0.07, u + 0.07, 24, 34, color);
  }
  for (const [u, symbol] of [
    [-0.17, 0xd62828],
    [0, 0xf2c94c],
    [0.17, 0xd62828],
  ] as const) {
    const c = p.facePoint(front, u, 29);
    p.g.fillStyle(symbol, 1).fillCircle(c.x, c.y, 2);
  }
  p.faceRect(front, -0.28, 0.28, 38, 44, GOLD);
  p.faceRect(front, -0.2, 0.2, 12, 16, 0x2b2b30);
  // Palanca a la derecha.
  const base = p.p(0.3, 0.05, 28);
  const top = p.p(0.42, 0.05, 44);
  p.g.lineStyle(2, 0xc9c9c9, 1).lineBetween(base.x, base.y, top.x, top.y);
  p.g.fillStyle(0xd62828, 1).fillCircle(top.x, top.y, 3);
  // Luces arriba.
  p.box(-0.3, -0.28, 0.3, 0.28, 46, 50, boxColors(GOLD));
  for (let i = 0; i < 5; i++) {
    const c = p.p(-0.24 + i * 0.12, 0.28, 52);
    p.g.fillStyle(i % 2 ? 0xffe08a : 0xff3d7f, 1).fillCircle(c.x, c.y, 1.6);
  }
}

/** Mesa con patas, borde de madera y paño verde (3 × 3); `top` dibuja lo de arriba. */
function table(p: IsoPainter, top: (p: IsoPainter) => void) {
  for (const [x, y] of [
    [-0.2, -0.2],
    [2.0, -0.2],
    [-0.2, 2.0],
    [2.0, 2.0],
  ]) {
    p.box(x, y, x + 0.2, y + 0.2, 0, 14, boxColors(WOOD));
  }
  p.box(-0.4, -0.4, 2.4, 2.4, 14, 20, boxColors(WOOD));
  p.fill(FELT, [p.p(-0.25, -0.25, 20), p.p(2.25, -0.25, 20), p.p(2.25, 2.25, 20), p.p(-0.25, 2.25, 20)]);
  top(p);
}

/** Ruleta: el paño con la grilla de números y el plato giratorio con su cruz dorada. */
function drawRouletteTable(p: IsoPainter) {
  table(p, (p) => {
    // Grilla de apuestas (rojos y negros) del lado de adelante.
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 3; j++) {
        const u = -0.15 + i * 0.19;
        const v = 1.45 + j * 0.24;
        const color = (i + j) % 2 === 0 ? 0xc0392b : 0x1b1b1f;
        p.fill(color, [p.p(u, v, 20.1), p.p(u + 0.17, v, 20.1), p.p(u + 0.17, v + 0.22, 20.1), p.p(u, v + 0.22, 20.1)]);
      }
    }
    // Plato: anillo de madera, casilleros rojos y negros y el centro dorado.
    const c = p.p(1, 0.55, 21);
    const g = p.g;
    g.fillStyle(WOOD, 1).fillEllipse(c.x, c.y, 64, 32);
    for (let i = 0; i < 18; i++) {
      const a0 = (i / 18) * Math.PI * 2;
      const a1 = ((i + 1) / 18) * Math.PI * 2;
      g.fillStyle(i === 0 ? 0x1f6b45 : i % 2 ? 0xc0392b : 0x1b1b1f, 1);
      g.fillTriangle(c.x, c.y, c.x + Math.cos(a0) * 26, c.y + Math.sin(a0) * 13, c.x + Math.cos(a1) * 26, c.y + Math.sin(a1) * 13);
    }
    g.fillStyle(shade(WOOD, 20), 1).fillEllipse(c.x, c.y, 26, 13);
    g.fillStyle(GOLD, 1).fillCircle(c.x, c.y - 4, 3.5);
    g.lineStyle(2, GOLD, 1).lineBetween(c.x - 8, c.y - 4, c.x + 8, c.y - 4).lineBetween(c.x, c.y - 9, c.x, c.y + 1);
    g.fillStyle(0xffffff, 1).fillCircle(c.x + 17, c.y + 3, 2);
  });
}

/** Blackjack: paño en media luna con los lugares de las apuestas, el sabot de cartas y fichas. */
function drawBlackjackTable(p: IsoPainter) {
  table(p, (p) => {
    const g = p.g;
    const c = p.p(1, 0.2, 20.1);
    g.lineStyle(1.5, GOLD, 0.9).beginPath();
    g.arc(c.x, c.y, 52, Math.PI * 0.15, Math.PI * 0.85, false);
    g.strokePath();
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI * (0.22 + i * 0.14);
      g.lineStyle(1.2, 0xffffff, 0.8).strokeEllipse(c.x + Math.cos(angle) * 44, c.y + Math.sin(angle) * 22, 12, 6);
    }
    // Sabot y una mano de cartas del crupier.
    const sabot = p.p(1.9, 0.1, 20);
    g.fillStyle(0x2b2b30, 1).fillRect(sabot.x - 6, sabot.y - 9, 12, 8);
    for (const dx of [-12, -4]) {
      g.fillStyle(0xffffff, 1).fillRect(c.x + dx, c.y - 2, 7, 10);
      g.fillStyle(0xd62828, 1).fillCircle(c.x + dx + 3.5, c.y + 3, 1.6);
    }
    // Pilas de fichas.
    for (const [u, v, color] of [
      [0.2, 0.3, 0xd62828],
      [0.35, 0.4, 0x1d4fa0],
      [1.7, 0.4, 0x2a9d8f],
    ] as const) {
      for (let k = 0; k < 4; k++) {
        const chip = p.p(u, v, 20 + k * 1.6);
        g.fillStyle(k % 2 ? 0xffffff : color, 1).fillEllipse(chip.x, chip.y, 9, 4.5);
      }
    }
  });
}

export const slotMachine: LandmarkDrawing = { size: 1, maxZ: 60, draw: drawSlotMachine };
export const rouletteTable: LandmarkDrawing = { size: 3, maxZ: 30, draw: drawRouletteTable };
export const blackjackTable: LandmarkDrawing = { size: 3, maxZ: 30, draw: drawBlackjackTable };
