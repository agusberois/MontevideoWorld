import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";

/**
 * Fuente de los Candados (18 de Julio y Yí, al lado del Café Facal): la pileta redonda con su borde
 * de granito, el pedestal en el medio con el chorro y, alrededor, la reja donde las parejas cuelgan
 * candados de colores (dicen que si lo ponen juntos, vuelven juntos).
 */

const GRANITE = 0x9a9ea3;
const STONE = 0xc9c0b0;
const WATER = 0x4f9fc4;
const IRON = 0x2f3338;
const LOCK_COLORS = [0xe8c547, 0xd9534f, 0xc0c4c8, 0xe58ab0, 0x5cb85c, 0x4c9be8, 0xb8862b] as const;

function drawFuenteCandados(p: IsoPainter) {
  const g = p.g;
  const c = p.p(0.5, 0.5, 0);

  // Pileta: borde de granito (con su sombra) y el agua.
  g.fillStyle(shade(GRANITE, -25), 1).fillEllipse(c.x, c.y + 2, 104, 52);
  g.fillStyle(STONE, 1).fillEllipse(c.x, c.y - 4, 104, 52);
  g.fillStyle(WATER, 1).fillEllipse(c.x, c.y - 4, 88, 42);
  g.fillStyle(shade(WATER, 25), 1).fillEllipse(c.x - 18, c.y - 10, 22, 6);

  // Pedestal del medio con el plato y el chorro.
  p.box(0.3, 0.3, 0.7, 0.7, 0, 22, boxColors(GRANITE));
  const top = p.p(0.5, 0.5, 22);
  g.fillStyle(STONE, 1).fillEllipse(top.x, top.y, 26, 10);
  g.fillStyle(WATER, 1).fillEllipse(top.x, top.y - 1, 20, 6);
  g.lineStyle(1.5, 0xbfe6f5, 0.85);
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(top.x, top.y - 10);
    g.lineTo(top.x + side * 8, top.y - 6);
    g.lineTo(top.x + side * 13, top.y + 2);
    g.strokePath();
  }
  g.fillStyle(0xdff3fb, 0.9).fillCircle(top.x, top.y - 10, 2);

  // La reja sobre el borde: barrotes y pasamanos, y los candados colgados (los de atrás primero).
  const RAIL = 14;
  const posts = 28;
  const ring = (angle: number, z: number) => ({ x: c.x + Math.cos(angle) * 50, y: c.y - 4 + Math.sin(angle) * 25 - z });
  const order = Array.from({ length: posts }, (_, i) => (i / posts) * Math.PI * 2).sort((a, b) => Math.sin(a) - Math.sin(b));
  for (const angle of order) {
    const front = Math.sin(angle) > 0;
    const foot = ring(angle, 0);
    const head = ring(angle, RAIL);
    g.lineStyle(1.2, front ? IRON : shade(IRON, 25), 1).lineBetween(foot.x, foot.y, head.x, head.y);
  }
  g.lineStyle(1.6, IRON, 1).strokeEllipse(c.x, c.y - 4 - RAIL, 100, 50);
  g.lineStyle(1, shade(IRON, 20), 1).strokeEllipse(c.x, c.y - 4 - RAIL / 2, 100, 50);
  // Muchos candados, en dos alturas, con el color variando como en la fuente de verdad.
  for (let i = 0; i < 44; i++) {
    const angle = (i / 44) * Math.PI * 2 + (i % 2) * 0.05;
    const z = i % 2 === 0 ? RAIL - 2 : RAIL / 2 - 1;
    const at = ring(angle, z);
    const color = LOCK_COLORS[(i * 5) % LOCK_COLORS.length];
    const back = Math.sin(angle) < 0;
    g.fillStyle(back ? shade(color, -25) : color, 1).fillRect(at.x - 1.6, at.y, 3.2, 3);
    g.lineStyle(0.8, back ? shade(color, -35) : shade(color, -15), 1).strokeCircle(at.x, at.y - 0.4, 1.2);
  }
}

export const fuenteCandados: LandmarkDrawing = {
  size: 2,
  maxZ: 40,
  draw: drawFuenteCandados,
};
