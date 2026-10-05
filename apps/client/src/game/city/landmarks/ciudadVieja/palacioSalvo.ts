import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { WINDOW, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/**
 * Palacio Salvo (Mario Palanti, 1928), en un área de 6 × 6: el cuerpo de diez pisos que llena la
 * manzana, con el basamento de arcadas, pilastras corridas, "bow windows" de balcones curvos y
 * torrecitas con cúpula en las esquinas; y **la torre en la esquina** que da a la Plaza
 * Independencia y a 18 de Julio (la noroeste), no en el medio. La torre sube en dos cuerpos y arriba
 * tiene sus famosos "cohetes": cuatro agujas en punta, como misiles, en las esquinas, y más
 * chiquitas alrededor del faro, que remata con cúpula, corona y la antena.
 */

const STONE = 0xdcc7a1;
const STONE_DARK = shade(STONE, -22);
const TRIM = shade(STONE, 16);
const DOME = 0xb79b6c;
const ROCKET = 0xcdb68c;

/** Lado del área (en tiles): el dibujo va de -0.5 a SIZE - 0.5. */
const SIZE = 6;
const MIN = -0.5;
const MAX = SIZE - 0.5;
const BASE_TOP = 132;
/** La torre: un cuadrado en la esquina noroeste del cuerpo. */
const TOWER = { a: -0.2, b: 2.2 };

/** Pilastras (franjas verticales más claras) cada `step` a lo largo de la cara. */
function pilasters(p: IsoPainter, face: Face, u0: number, u1: number, z0: number, z1: number, step: number) {
  for (let u = u0; u <= u1 + 0.001; u += step) p.faceRect(face, u - 0.035, u + 0.035, z0, z1, TRIM);
}

/** Cornisa saliente: una losa apenas más ancha que el cuerpo (de a0,b0 a a1,b1). */
function cornice(p: IsoPainter, x0: number, y0: number, x1: number, y1: number, z: number, height = 5) {
  p.box(x0 - 0.06, y0 - 0.06, x1 + 0.06, y1 + 0.06, z, z + height, boxColors(TRIM));
}

/** Torrecita de esquina con cúpula y aguja. */
function turret(p: IsoPainter, x: number, y: number, z: number) {
  p.box(x - 0.24, y - 0.24, x + 0.24, y + 0.24, z, z + 24, boxColors(STONE));
  for (const face of facesOf(x + 0.24, y + 0.24)) {
    const [u0, u1] = face.side === "south" ? [x - 0.24, x + 0.24] : [y - 0.24, y + 0.24];
    p.windows(face, u0, u1, z + 4, z + 21, 1, 1, { color: WINDOW, arched: true, widthRatio: 0.5, heightRatio: 0.8 });
  }
  p.box(x - 0.28, y - 0.28, x + 0.28, y + 0.28, z + 24, z + 27, boxColors(TRIM));
  p.dome(x, y, z + 27, 10, DOME);
  p.spire(x, y, z + 35, z + 48, 0x6f6450, 1.5);
}

/**
 * "Cohete" (los del Salvo): un cilindro redondo con anillos y ventanitas, un collar más ancho y la
 * punta en ogiva (curva, como la nariz de un cohete) con su aguja. Se dibuja en pantalla: (x, y) es
 * el centro en el plano, `r` el radio en tiles y la punta llega a `z1`.
 */
function rocket(p: IsoPainter, x: number, y: number, z0: number, z1: number, r: number) {
  const g = p.g;
  const radius = r * 44;
  const bottom = p.p(x, y, z0);
  const neck = p.p(x, y, z1 - (z1 - z0) * 0.42);
  const tip = p.p(x, y, z1);
  const light = shade(ROCKET, 14);
  const dark = shade(ROCKET, -22);
  const ry = radius * 0.45;

  // Cuerpo cilíndrico: base elíptica, el fuste (sombreado a la derecha) y la tapa.
  g.fillStyle(dark, 1).fillEllipse(bottom.x, bottom.y, radius * 2, ry * 2);
  g.fillStyle(ROCKET, 1).fillRect(bottom.x - radius, neck.y, radius * 2, bottom.y - neck.y);
  g.fillStyle(dark, 1).fillRect(bottom.x + radius * 0.35, neck.y, radius * 0.65, bottom.y - neck.y);
  g.fillStyle(light, 1).fillRect(bottom.x - radius * 0.7, neck.y, radius * 0.25, bottom.y - neck.y);
  // Anillos y ventanitas a lo largo del fuste.
  for (const t of [0.22, 0.55, 0.85]) {
    const yy = bottom.y + (neck.y - bottom.y) * t;
    g.lineStyle(1.4, dark, 1).beginPath();
    g.arc(bottom.x, yy - ry, radius, Math.PI * 0.05, Math.PI * 0.95, false);
    g.strokePath();
  }
  g.fillStyle(0x2a2a30, 1).fillEllipse(bottom.x - radius * 0.1, bottom.y + (neck.y - bottom.y) * 0.4, radius * 0.5, radius * 0.9);
  // Collar más ancho donde arranca la punta.
  g.fillStyle(TRIM, 1).fillEllipse(neck.x, neck.y, radius * 2.5, ry * 2.4);
  g.fillStyle(shade(TRIM, -12), 1).fillEllipse(neck.x, neck.y + 1.5, radius * 2.5, ry * 1.6);
  // Punta en ogiva: dos curvas desde el collar hasta la punta, con la mitad derecha en sombra.
  const nose = (side: number, color: number) => {
    g.fillStyle(color, 1).beginPath();
    g.moveTo(neck.x, neck.y);
    g.lineTo(neck.x + side * radius, neck.y);
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      // Perfil de ogiva: ancho que se cierra suave hacia la punta.
      const width = radius * Math.sqrt(1 - t * t);
      g.lineTo(neck.x + side * width, neck.y + (tip.y - neck.y) * t);
    }
    g.lineTo(tip.x, tip.y);
    g.closePath();
    g.fillPath();
  };
  nose(-1, light);
  nose(1, dark);
  // Aguja.
  g.lineStyle(1.4, 0x6f6450, 1).lineBetween(tip.x, tip.y, tip.x, tip.y - 9);
}

function drawPalacioSalvo(p: IsoPainter) {
  // --- Cuerpo bajo (10 pisos), toda la manzana ---
  p.box(MIN, MIN, MAX, MAX, 0, BASE_TOP, boxColors(STONE));
  for (const face of facesOf(MAX, MAX)) {
    // Basamento: zócalo oscuro y las arcadas de la planta baja (galería sobre la vereda).
    p.faceRect(face, MIN, MAX, 0, 22, STONE_DARK);
    p.windows(face, MIN + 0.1, MAX - 0.1, 2, 20, 9, 1, { color: 0x2a2420, arched: true, widthRatio: 0.7, heightRatio: 0.92 });
    p.faceRect(face, MIN, MAX, 22, 25, TRIM);
    // Pisos con ventanas verticales entre pilastras.
    p.windows(face, MIN + 0.1, MAX - 0.1, 26, BASE_TOP - 6, 12, 9, { color: WINDOW, widthRatio: 0.42, heightRatio: 0.6 });
    pilasters(p, face, MIN + 0.5, MAX - 0.5, 25, BASE_TOP - 4, 1);
    // Dos bow windows por fachada: los cuerpos de balcones que salen hacia afuera.
    for (const mid of [1.5, 3.5]) {
      if (face.side === "south") p.box(mid - 0.45, MAX, mid + 0.45, MAX + 0.18, 25, BASE_TOP - 2, boxColors(TRIM));
      else p.box(MAX, mid - 0.45, MAX + 0.18, mid + 0.45, 25, BASE_TOP - 2, boxColors(TRIM));
      const out = face.side === "south" ? { side: "south" as const, y: MAX + 0.18 } : { side: "east" as const, x: MAX + 0.18 };
      p.windows(out, mid - 0.4, mid + 0.4, 28, BASE_TOP - 6, 3, 9, { color: WINDOW, widthRatio: 0.6, heightRatio: 0.6, balcony: 0x5a5144 });
    }
  }
  cornice(p, MIN, MIN, MAX, MAX, BASE_TOP, 6);
  p.box(MIN, MIN, MAX, MAX, BASE_TOP + 6, BASE_TOP + 10, boxColors(shade(STONE, 6)));
  // Torrecitas en las esquinas del cuerpo que no tienen la torre.
  for (const [x, y] of [
    [MAX - 0.3, MIN + 0.3],
    [MIN + 0.3, MAX - 0.3],
    [MAX - 0.3, MAX - 0.3],
  ]) {
    turret(p, x, y, BASE_TOP + 10);
  }

  // --- La torre, en la esquina noroeste ---
  const stage1 = { ...TOWER, z0: BASE_TOP + 10, z1: 238 };
  p.box(stage1.a, stage1.a, stage1.b, stage1.b, stage1.z0, stage1.z1, boxColors(STONE));
  for (const face of facesOf(stage1.b, stage1.b)) {
    p.windows(face, stage1.a + 0.08, stage1.b - 0.08, stage1.z0 + 4, stage1.z1 - 4, 5, 8, { color: WINDOW, arched: true, widthRatio: 0.45, heightRatio: 0.62 });
    pilasters(p, face, stage1.a + 0.05, stage1.b - 0.05, stage1.z0, stage1.z1, (stage1.b - stage1.a - 0.1) / 2);
  }
  cornice(p, stage1.a, stage1.a, stage1.b, stage1.b, stage1.z1, 6);

  // Los cuatro cohetes grandes en las esquinas del primer cuerpo de la torre.
  const rocketsAt = (a: number, b: number) => [
    [a + 0.16, a + 0.16],
    [b - 0.16, a + 0.16],
    [a + 0.16, b - 0.16],
    [b - 0.16, b - 0.16],
  ];

  // Segundo cuerpo, más angosto, con ventanales en arco.
  const stage2 = { a: TOWER.a + 0.45, b: TOWER.b - 0.45, z0: stage1.z1 + 6, z1: 286 };
  // Los cohetes de atrás se dibujan antes que el cuerpo (quedan detrás).
  const [backLeft, backRight, frontLeft, frontRight] = rocketsAt(stage1.a, stage1.b);
  for (const [x, y] of [backLeft, backRight, frontLeft]) rocket(p, x, y, stage1.z1 + 6, 300, 0.14);
  p.box(stage2.a, stage2.a, stage2.b, stage2.b, stage2.z0, stage2.z1, boxColors(STONE));
  for (const face of facesOf(stage2.b, stage2.b)) {
    p.windows(face, stage2.a + 0.08, stage2.b - 0.08, stage2.z0 + 4, stage2.z1 - 4, 3, 3, { color: WINDOW, arched: true, widthRatio: 0.5, heightRatio: 0.7 });
  }
  cornice(p, stage2.a, stage2.a, stage2.b, stage2.b, stage2.z1, 5);
  rocket(p, frontRight[0], frontRight[1], stage1.z1 + 6, 300, 0.14);

  // --- El faro: templete de columnas, los cohetes chicos alrededor, cúpula, corona y antena ---
  const c = (TOWER.a + TOWER.b) / 2;
  const lantern = { a: c - 0.38, b: c + 0.38, z0: stage2.z1 + 5, z1: stage2.z1 + 32 };
  for (const [x, y] of rocketsAt(stage2.a, stage2.b).slice(0, 3)) rocket(p, x, y, stage2.z1 + 5, stage2.z1 + 36, 0.08);
  p.box(lantern.a, lantern.a, lantern.b, lantern.b, lantern.z0, lantern.z1, boxColors(0x3a3a3e));
  for (const face of facesOf(lantern.b, lantern.b)) {
    pilasters(p, face, lantern.a + 0.04, lantern.b - 0.04, lantern.z0, lantern.z1, (lantern.b - lantern.a - 0.08) / 3);
  }
  const [x4, y4] = rocketsAt(stage2.a, stage2.b)[3];
  rocket(p, x4, y4, stage2.z1 + 5, stage2.z1 + 36, 0.08);
  cornice(p, lantern.a, lantern.a, lantern.b, lantern.b, lantern.z1, 4);
  p.dome(c, c, lantern.z1 + 4, 14, DOME);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    p.spire(c + Math.cos(angle) * 0.34, c + Math.sin(angle) * 0.34, lantern.z1 + 4, lantern.z1 + 13, 0x6f6450, 1.2);
  }
  const tip = lantern.z1 + 70;
  p.spire(c, c, lantern.z1 + 16, tip, 0x55555c, 2);
  p.g.fillStyle(0xffd166, 1);
  const light = p.p(c, c, tip);
  p.g.fillCircle(light.x, light.y, 2.5);
}

export const palacioSalvo: LandmarkDrawing = {
  size: SIZE,
  maxZ: 400,
  draw: drawPalacioSalvo,
};
