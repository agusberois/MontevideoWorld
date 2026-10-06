import type { Landmark } from "@montevideo-world/shared";
import { shade } from "../../../color";
import { IsoPainter, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing, PlacedPiece } from "../types";

/**
 * La barra del casino, en piezas de 1 × 1 a lo largo (el área es alargada): el **estante** contra la
 * pared norte (madera oscura, espejo, botellas de colores en tres estantes y un tubo de neón arriba)
 * y el **mostrador** (madera con frente capitoneado, tapa de mármol oscuro y baranda dorada) con
 * canillas de cerveza, copas y banquetas rojas adelante. La fila de atrás del mostrador es el
 * pasillo del barman (`npcs`): no tiene pieza, es piso.
 */

const GOLD = 0xe2b53e;
const DARK_WOOD = 0x3a2116;
const WOOD = 0x6b3a22;
const MARBLE = 0x2b2b30;
const MIRROR = 0x9fb8c4;
const NEON = 0xff3d7f;
const BOTTLES = [0x2f7a3a, 0xb5651d, 0xd98e1c, 0x8f1f2c, 0xf2e3a0, 0x1d4fa0, 0x6b2fa0, 0xe9e2d0];

/** Un tramo del estante; `index` cambia las botellas, el del medio lleva el neón más largo. */
function shelfSpec(index: number, count: number) {
  return {
    key: `bar-shelf-${index % 4}-${index === Math.floor(count / 2) ? "neon" : "plain"}`,
    width: 1,
    height: 1,
    maxZ: 76,
    draw: (p: IsoPainter) => {
      const south = { side: "south" as const, y: 0.1 };
      p.box(-0.5, -0.45, 0.5, 0.1, 0, 66, boxColors(DARK_WOOD), false);
      // Mueble de abajo con puertitas.
      p.faceRect(south, -0.46, 0.46, 2, 20, WOOD);
      p.faceRect(south, -0.02, 0.02, 3, 19, shade(WOOD, -30));
      // Espejo con tres estantes de botellas.
      p.faceRect(south, -0.44, 0.44, 22, 62, MIRROR, 0.9);
      for (const z of [22, 35, 48]) {
        p.faceRect(south, -0.46, 0.46, z, z + 1.5, shade(DARK_WOOD, 20));
        for (let i = 0; i < 5; i++) {
          const u = -0.36 + i * 0.18;
          const color = BOTTLES[(index * 3 + i + z) % BOTTLES.length];
          const tall = (index + i + z) % 3 === 0 ? 10 : 8;
          p.faceRect(south, u - 0.035, u + 0.035, z + 1.5, z + 1.5 + tall, color);
          p.faceRect(south, u - 0.012, u + 0.012, z + 1.5 + tall, z + 4 + tall, color);
          p.faceRect(south, u - 0.03, u + 0.03, z + 4, z + 6, 0xf4efe3, 0.8);
        }
      }
      // Cornisa dorada y el tubo de neón rosa.
      p.box(-0.5, -0.45, 0.5, 0.14, 66, 69, boxColors(GOLD), false);
      const wide = index === Math.floor(count / 2);
      p.faceRect({ side: "south", y: 0.14 }, wide ? -0.45 : -0.3, wide ? 0.45 : 0.3, 70, 72.5, NEON);
      p.faceRect({ side: "south", y: 0.14 }, wide ? -0.45 : -0.3, wide ? 0.45 : 0.3, 69.5, 73, NEON, 0.3);
    },
  };
}

/** Un tramo del mostrador; según `index`, arriba van canillas, copas o un trago. */
function counterSpec(index: number) {
  const top = index % 4;
  return {
    key: `bar-counter-${top}`,
    width: 1,
    height: 1,
    maxZ: 44,
    draw: (p: IsoPainter) => {
      const g = p.g;
      // Mueble con el frente capitoneado y zócalo dorado.
      p.box(-0.5, -0.4, 0.5, 0.18, 0, 24, boxColors(WOOD), false);
      const front = { side: "south" as const, y: 0.18 };
      p.faceRect(front, -0.5, 0.5, 0, 2.5, GOLD);
      for (const u of [-0.25, 0.25]) p.faceRect(front, u - 0.2, u + 0.2, 5, 20, shade(WOOD, -12));
      // Tapa de mármol con baranda dorada adelante.
      p.box(-0.5, -0.45, 0.5, 0.28, 24, 27, boxColors(MARBLE), false);
      p.faceRect({ side: "south", y: 0.28 }, -0.5, 0.5, 22, 23.5, GOLD);
      if (top === 0) {
        // Canillas de cerveza.
        for (const u of [-0.2, 0.05]) {
          const base = p.p(u, -0.15, 27);
          const tip = p.p(u, -0.15, 40);
          g.lineStyle(2.5, 0xc9c9d1, 1).lineBetween(base.x, base.y, tip.x, tip.y);
          g.fillStyle(0x1b1b1f, 1).fillRect(tip.x - 2, tip.y - 6, 4, 6);
        }
      } else if (top === 1) {
        // Dos copas de medio y medio.
        for (const u of [-0.2, 0.15]) {
          const c = p.p(u, 0, 27);
          g.lineStyle(1, 0xffffff, 0.9).lineBetween(c.x, c.y, c.x, c.y - 6);
          g.fillStyle(0xf2e3a0, 0.9).fillTriangle(c.x - 3, c.y - 12, c.x + 3, c.y - 12, c.x, c.y - 6);
        }
      } else if (top === 2) {
        // Vaso de whisky con hielo y la botella.
        const c = p.p(0.1, 0, 27);
        g.fillStyle(0xb5651d, 0.85).fillRect(c.x - 3, c.y - 5, 6, 5);
        g.fillStyle(0xffffff, 0.7).fillRect(c.x - 1, c.y - 4, 2, 2);
        const b = p.p(-0.2, -0.1, 27);
        g.fillStyle(0x2f7a3a, 1).fillRect(b.x - 2.5, b.y - 11, 5, 11);
        g.fillRect(b.x - 1, b.y - 15, 2, 4);
      } else {
        // Pancho en el plato.
        const c = p.p(0, 0, 27);
        g.fillStyle(0xf4f6f8, 1).fillEllipse(c.x, c.y - 1, 14, 6);
        g.fillStyle(0xe0a84a, 1).fillEllipse(c.x, c.y - 2, 10, 3.5);
        g.fillStyle(0xc0392b, 1).fillEllipse(c.x, c.y - 3, 9, 2);
      }
      // Banqueta roja adelante (de este lado se sienta la gente que pide).
      const seat = p.p(0, 0.42, 0);
      const cushion = p.p(0, 0.42, 16);
      g.lineStyle(2, 0xc9c9d1, 1).lineBetween(seat.x, seat.y, cushion.x, cushion.y);
      g.fillStyle(0x8a8a92, 1).fillEllipse(seat.x, seat.y, 10, 4);
      g.fillStyle(0xa3202f, 1).fillEllipse(cushion.x, cushion.y, 13, 6);
      g.fillStyle(shade(0xa3202f, 25), 1).fillEllipse(cushion.x, cushion.y - 1, 9, 3.5);
    },
  };
}

export const barShelf: LandmarkDrawing = {
  pieces: ({ area }: Landmark): PlacedPiece[] =>
    Array.from({ length: area.width }, (_, i) => ({ tile: { x: area.x + i, y: area.y }, spec: shelfSpec(i, area.width) })),
};

/** Sólo la fila de adelante es mostrador: la de atrás queda de piso para el barman. */
export const barCounter: LandmarkDrawing = {
  pieces: ({ area }: Landmark): PlacedPiece[] =>
    Array.from({ length: area.width }, (_, i) => ({ tile: { x: area.x + i, y: area.y + area.height - 1 }, spec: counterSpec(i) })),
};
