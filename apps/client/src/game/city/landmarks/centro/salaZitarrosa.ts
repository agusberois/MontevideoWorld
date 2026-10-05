import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW } from "../common";
import type { LandmarkDrawing } from "../types";
import { onCylinder, roundedBand, roundedBox } from "./common";

/**
 * Edificio Rex (Alfredo Jones Brown, 1926–1928), frente a la Plaza Fabini: ecléctico con aire
 * moderno, revoque claro, la esquina (sureste) **redondeada** con ventanales y, arriba de la esquina,
 * la **cúpula mirador iluminada**. En la planta baja, la entrada del viejo Cine Rex, hoy la Sala
 * Zitarrosa: marquesina de lamparitas, la cartelera con afiches y el cartel vertical.
 */

const WALL = 0xe4d8bf;
const TRIM = shade(WALL, 12);
const GLOW = 0xffe08a;
const SIGN = 0x7a1424;
const FLOOR_PX = 15;
const GROUND = 24;
const FLOORS = 6;
const TOP = GROUND + FLOORS * FLOOR_PX;
const R = 0.9;

function bulbs(p: IsoPainter, face: Face, u0: number, u1: number, z: number, step = 0.12) {
  for (let u = u0; u <= u1; u += step) {
    const c = p.facePoint(face, u, z);
    p.g.fillStyle(GLOW, 1).fillCircle(c.x, c.y, 1.4);
  }
}

function drawSalaZitarrosa(p: IsoPainter) {
  const g = p.g;
  const south: Face = { side: "south", y: 2.5 };
  const east: Face = { side: "east", x: 2.5 };

  // Planta baja oscura (el hall del cine) y el cuerpo con la esquina curva.
  roundedBox(p, -0.5, -0.5, 2.5, 2.5, R, 0, GROUND, shade(WALL, -30));
  roundedBox(p, -0.5, -0.5, 2.5, 2.5, R, GROUND, TOP, WALL);
  for (let f = 0; f < FLOORS; f++) {
    const z = GROUND + f * FLOOR_PX;
    // Ventanas en las caras rectas y ventanales corridos en la curva.
    p.windows(south, -0.4, 1.5, z + 3, z + FLOOR_PX - 2, 4, 1, { color: WINDOW, widthRatio: 0.5, heightRatio: 0.8, balcony: f % 2 === 0 ? 0x262626 : undefined });
    p.windows(east, -0.4, 1.5, z + 3, z + FLOOR_PX - 2, 4, 1, { color: WINDOW, widthRatio: 0.5, heightRatio: 0.8, balcony: f % 2 === 0 ? 0x262626 : undefined });
    roundedBand(p, 1.6, 1.6, 2.5, 2.5, R, z + 4, z + FLOOR_PX - 2, WINDOW);
    roundedBand(p, -0.5, -0.5, 2.5, 2.5, R, z, z + 1.5, TRIM, 0.03);
  }
  roundedBand(p, -0.5, -0.5, 2.5, 2.5, R, TOP - 3, TOP + 2, TRIM, 0.05);

  // La cúpula mirador sobre la esquina: tambor con ventanitas, la cúpula con luz y el mástil.
  const c = { x: 2.5 - R + 0.1, y: 2.5 - R + 0.1 };
  p.box(c.x - 0.3, c.y - 0.3, c.x + 0.3, c.y + 0.3, TOP, TOP + 16, boxColors(TRIM));
  for (const face of [
    { side: "south", y: c.y + 0.3 },
    { side: "east", x: c.x + 0.3 },
  ] as const) {
    const [u0, u1] = face.side === "south" ? [c.x - 0.3, c.x + 0.3] : [c.y - 0.3, c.y + 0.3];
    p.windows(face, u0, u1, TOP + 3, TOP + 14, 3, 1, { color: GLOW, arched: true, widthRatio: 0.5, heightRatio: 0.85 });
  }
  p.dome(c.x, c.y, TOP + 16, 20, 0xc9d6dc);
  const glow = p.p(c.x, c.y, TOP + 24);
  g.fillStyle(GLOW, 0.35).fillEllipse(glow.x, glow.y, 26, 14);
  for (let i = 0; i < 5; i++) {
    const a = onCylinder(p, c.x, c.y, 0.3, -0.6 + i * 0.6, TOP + 17);
    g.lineStyle(1, shade(0xc9d6dc, -25), 1).lineBetween(a.x, a.y, glow.x, glow.y - 8);
  }
  p.spire(c.x, c.y, TOP + 36, TOP + 54, 0x55555c, 1.5);

  // La entrada de la sala (cara este, a la plaza): puertas vidriadas y la marquesina de lamparitas.
  p.faceRect(east, 0.0, 1.3, 0, 20, 0x2a1a10);
  for (const u of [0.3, 0.65, 1.0]) p.faceRect(east, u - 0.02, u + 0.02, 0, 20, 0xc9a227);
  p.box(2.5, -0.1, 2.98, 1.4, 22, 27, boxColors(SIGN));
  bulbs(p, { side: "east", x: 2.98 }, -0.05, 1.35, 24.5);
  // Cartelera con afiches (los de la sala y de la murga).
  for (const [face, u, color] of [
    [south, -0.1, 0xf2b705],
    [south, 0.5, 0xe63946],
    [south, 1.1, 0x2a9d8f],
    [east, -0.35, 0x6cace4],
  ] as const) {
    p.faceRect(face, u - 0.2, u + 0.2, 3, 19, 0xf4efe3);
    p.faceRect(face, u - 0.16, u + 0.16, 5, 17, color);
  }
  // Cartel vertical de la sala, colgado de la fachada este.
  p.box(2.5, 1.35, 2.7, 1.52, 34, 92, boxColors(SIGN));
  for (let i = 0; i < 8; i++) {
    const l = p.facePoint({ side: "east", x: 2.7 }, 1.44, 40 + i * 7);
    g.fillStyle(GLOW, 1).fillRect(l.x - 2, l.y - 2.5, 4, 5);
  }
}

export const salaZitarrosa: LandmarkDrawing = {
  size: 3,
  maxZ: 180,
  draw: drawSalaZitarrosa,
};
