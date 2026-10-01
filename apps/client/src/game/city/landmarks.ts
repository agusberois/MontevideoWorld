import type { Landmark, TilePoint } from "@montevideo-world/shared";
import { shade } from "../color";
import { PieceSpec } from "./buildings";
import { Face, IsoPainter, boxColors } from "./IsoPainter";

/**
 * Edificios emblemáticos dibujados con primitivas. Cada uno se expresa en coordenadas locales:
 * el área de w × h tiles va de (-0.5, -0.5) a (w - 0.5, h - 0.5).
 *
 * Las áreas de un solo volumen son cuadradas a propósito: así un único valor de profundidad
 * ordena bien al edificio contra los avatares que pasan por delante y por detrás. Las áreas
 * alargadas (la Puerta de la Ciudadela) se dibujan como varias piezas de 1 × 1.
 */
export interface PlacedPiece {
  /** Tile ancla de la pieza en el mapa. */
  tile: TilePoint;
  spec: PieceSpec;
}

const WINDOW = 0x2f3946;
const DARK_OPENING = 0x2a2420;
const WOOD = 0x4a3426;
const IRON = 0x1f1f22;

/**
 * Punto del techo (en coordenadas del dibujo base, antes de escalar) donde puede ir un cartel
 * encima de cada tipo de edificio. Elegido para no chocar con torres ni cúpulas.
 */
export const ROOF_SPOTS: Partial<Record<Landmark["kind"], { u: number; v: number; z: number }>> = {
  // Cabildo: parte de atrás del techo plano, detrás del campanario.
  cabildo: { u: 1.0, v: 0.55, z: 67 },
};

export function landmarkPieces(landmark: Landmark): PlacedPiece[] {
  const { area } = landmark;
  const anchor = { x: area.x, y: area.y };
  /**
   * Cada dibujo está escrito para un área cuadrada de `size` tiles; si el área real es más grande
   * se escala al hornear (más ancho y más alto en la misma proporción).
   */
  const single = (size: number, maxZ: number, draw: (p: IsoPainter) => void): PlacedPiece[] => [
    {
      tile: anchor,
      spec: { key: `landmark-${landmark.id}`, width: size, height: size, maxZ, draw, scale: area.width / size },
    },
  ];

  switch (landmark.kind) {
    case "palacioSalvo":
      return single(4, 340, drawPalacioSalvo);
    case "theater":
      return single(4, 108, drawTeatroSolis);
    case "cathedral":
      return single(3, 150, drawCatedral);
    case "cabildo":
      return single(3, 104, drawCabildo);
    case "market":
      return single(4, 122, drawMercado);
    case "equestrianMonument":
      return single(2, 100, drawMonumentoArtigas);
    case "fountain":
      return single(1, 52, drawFuente);
    case "lighthouse":
      return single(1, 96, drawFarola);
    case "gate":
      return gatePieces(landmark);
  }
}

// ---------------------------------------------------------------------------------------------
// Farola de la Escollera Sarandí: torrecita blanca con franjas rojas y linterna.

function drawFarola(p: IsoPainter) {
  const white = 0xf2f0ea;
  const red = 0xc0392b;
  p.box(-0.42, -0.42, 0.42, 0.42, 0, 6, boxColors(0x8d8a83));
  p.box(-0.22, -0.22, 0.22, 0.22, 6, 62, boxColors(white));
  for (const [z0, z1] of [
    [18, 26],
    [38, 46],
  ]) {
    p.box(-0.225, -0.225, 0.225, 0.225, z0, z1, boxColors(red), false);
  }
  p.box(-0.3, -0.3, 0.3, 0.3, 62, 65, boxColors(0x3a3f4c));
  // Linterna vidriada con la luz encendida.
  p.box(-0.16, -0.16, 0.16, 0.16, 65, 76, boxColors(0xffe28a), false);
  for (const face of facesOf(0.16, 0.16)) {
    const [u0, u1] = [-0.16, 0.16];
    p.faceRect(face, u0, u0 + 0.03, 65, 76, 0x3a3f4c);
    p.faceRect(face, u1 - 0.03, u1, 65, 76, 0x3a3f4c);
  }
  p.pyramid(-0.2, -0.2, 0.2, 0.2, 76, 88, red, shade(red, -20));
  p.spire(0, 0, 88, 94, 0x3a3f4c, 1.5);
}

// ---------------------------------------------------------------------------------------------
// Palacio Salvo: torre escalonada de 1928 con remate tipo faro.

function drawPalacioSalvo(p: IsoPainter) {
  const stone = 0xd9c4a0;
  const trim = shade(stone, 14);
  const tiers: Array<{ inset: number; z0: number; z1: number; cols: number; rows: number }> = [
    { inset: 0, z0: 0, z1: 120, cols: 8, rows: 9 },
    { inset: 0.55, z0: 126, z1: 205, cols: 6, rows: 6 },
    { inset: 1.05, z0: 210, z1: 250, cols: 4, rows: 3 },
  ];

  for (const tier of tiers) {
    const a = -0.5 + tier.inset;
    const b = 3.5 - tier.inset;
    p.box(a, a, b, b, tier.z0, tier.z1, boxColors(stone));
    for (const face of facesOf(b, b)) {
      p.windows(face, a + 0.12, b - 0.12, tier.z0 + 6, tier.z1 - 4, tier.cols, tier.rows, {
        color: WINDOW,
        widthRatio: 0.45,
        heightRatio: 0.55,
      });
    }
    // Cornisa saliente sobre cada cuerpo.
    p.box(a, a, b, b, tier.z1, tier.z1 + 5, boxColors(trim));
  }

  // Basamento comercial más oscuro.
  for (const face of facesOf(3.5, 3.5)) p.faceRect(face, -0.5, 3.5, 0, 12, shade(stone, -28));

  // Linterna con arcos, cúpula y antena.
  const a = 0.85;
  const b = 2.15;
  p.box(a, a, b, b, 255, 284, boxColors(stone));
  for (const face of facesOf(b, b)) p.windows(face, a + 0.1, b - 0.1, 259, 281, 3, 1, { color: WINDOW, arched: true, widthRatio: 0.55, heightRatio: 0.85 });
  p.box(a - 0.05, a - 0.05, b + 0.05, b + 0.05, 284, 288, boxColors(trim));
  p.dome(1.5, 1.5, 288, 16, 0xcdb48a);
  p.spire(1.5, 1.5, 300, 336, 0x55555c, 2);
  p.g.fillStyle(0xffd166, 1);
  const light = p.p(1.5, 1.5, 336);
  p.g.fillCircle(light.x, light.y, 2.5);
}

// ---------------------------------------------------------------------------------------------
// Teatro Solís: cuerpo neoclásico con pórtico de columnas hacia el este.

function drawTeatroSolis(p: IsoPainter) {
  const cream = 0xeee3cc;
  const trim = 0xf7f0e0;
  const front = 2.75; // cara este del cuerpo principal; el pórtico va de acá a 3.5

  p.box(-0.5, -0.5, front, 3.5, 0, 58, boxColors(cream));
  const south: Face = { side: "south", y: 3.5 };
  p.windows(south, -0.4, front - 0.1, 6, 54, 5, 2, { color: WINDOW, arched: true, widthRatio: 0.42, heightRatio: 0.7 });
  p.faceRect(south, -0.5, front, 0, 4, shade(cream, -22));

  // Puertas bajo el pórtico.
  p.windows({ side: "east", x: front }, 0.2, 2.8, 0, 30, 3, 1, { color: WOOD, arched: true, widthRatio: 0.45, heightRatio: 0.85 });
  p.box(-0.5, -0.5, front, 3.5, 58, 62, boxColors(trim));

  // Pórtico: piso, seis columnas y entablamento.
  p.box(front, 0.05, 3.5, 2.95, 0, 4, boxColors(0xc9bda5));
  const columns = 6;
  for (let i = 0; i < columns; i++) {
    const cy = 0.2 + (i * 2.6) / (columns - 1);
    p.box(3.26, cy - 0.07, 3.4, cy + 0.07, 4, 46, boxColors(0xf6f0e2), false);
  }
  p.box(front, 0.05, 3.5, 2.95, 46, 58, boxColors(trim));
  p.faceRect({ side: "east", x: 3.5 }, 0.05, 2.95, 50, 53, shade(trim, -18));

  // Ático central y bandera.
  p.box(0.1, 0.3, 2.3, 2.7, 62, 80, boxColors(cream));
  p.windows({ side: "east", x: 2.3 }, 0.4, 2.6, 66, 78, 3, 1, { color: WINDOW, widthRatio: 0.35 });
  p.box(0.05, 0.25, 2.35, 2.75, 80, 83, boxColors(trim));
  drawUruguayFlag(p, 1.2, 1.5, 83);
}

/** Mástil con la bandera uruguaya: nueve franjas resumidas en blanco/azul y el Sol de Mayo. */
function drawUruguayFlag(p: IsoPainter, x: number, y: number, z: number) {
  p.spire(x, y, z, z + 24, 0x5b5b60, 1.5);
  const top = p.p(x, y, z + 24);
  const g = p.g;
  g.fillStyle(0xffffff, 1);
  g.fillRect(top.x, top.y, 16, 10);
  g.fillStyle(0x1d4fa0, 1);
  for (const stripe of [1, 3, 5, 7]) g.fillRect(top.x, top.y + stripe * 1.1, 16, 1.1);
  g.fillStyle(0xffffff, 1);
  g.fillRect(top.x, top.y, 6, 5.5);
  g.fillStyle(0xf2b705, 1);
  g.fillCircle(top.x + 3, top.y + 2.75, 1.8);
}

// ---------------------------------------------------------------------------------------------
// Catedral Metropolitana: nave con cúpula y dos torres campanario mirando a la Plaza Matriz (este).

function drawCatedral(p: IsoPainter) {
  const brick = 0xd8b49a;
  const trim = 0xefe2cf;
  const tile = 0x5f9ea0;
  const towerA = { y0: -0.5, y1: 0.3 };
  const towerB = { y0: 1.7, y1: 2.5 };

  // Nave lateral norte (atrás).
  p.box(-0.5, -0.35, 1.7, 0.3, 0, 40, boxColors(brick));
  drawBellTower(p, towerA.y0, towerA.y1, brick, trim, tile);

  // Nave central, cúpula sobre el crucero y fachada con frontón.
  p.box(-0.5, 0.3, 2.35, 1.7, 0, 66, boxColors(brick));
  p.windows({ side: "south", y: 1.7 }, -0.4, 1.6, 22, 60, 3, 1, { color: WINDOW, arched: true, widthRatio: 0.35 });
  p.box(0.25, 0.65, 1.05, 1.35, 66, 84, boxColors(trim));
  p.windows({ side: "south", y: 1.35 }, 0.3, 1.0, 70, 82, 2, 1, { color: WINDOW, arched: true, widthRatio: 0.4 });
  p.dome(0.65, 1.0, 84, 17, tile);
  p.spire(0.65, 1.0, 100, 112, 0xd9c48a, 1.5);

  const facade: Face = { side: "east", x: 2.35 };
  p.faceArch(facade, 0.75, 1.25, 0, 32, WOOD);
  p.faceRect(facade, 0.3, 1.7, 36, 39, trim);
  const rose = p.facePoint(facade, 1.0, 50);
  p.g.fillStyle(trim, 1);
  p.g.fillEllipse(rose.x, rose.y, 14, 12);
  p.g.fillStyle(WINDOW, 1);
  p.g.fillEllipse(rose.x, rose.y, 9, 8);
  p.facePoly(
    facade,
    [
      [0.3, 66],
      [1.7, 66],
      [1.0, 88],
    ],
    trim,
  );
  const cross = p.facePoint(facade, 1.0, 88);
  p.line(cross, { x: cross.x, y: cross.y - 10 }, 0xd9c48a, 1.5);
  p.line({ x: cross.x - 3, y: cross.y - 7 }, { x: cross.x + 3, y: cross.y - 7 }, 0xd9c48a, 1.5);

  // Nave lateral sur (adelante) y torre sur.
  p.box(-0.5, 1.7, 1.7, 2.35, 0, 40, boxColors(brick));
  p.windows({ side: "south", y: 2.35 }, -0.4, 1.6, 8, 36, 3, 1, { color: WINDOW, arched: true, widthRatio: 0.3 });
  drawBellTower(p, towerB.y0, towerB.y1, brick, trim, tile);
}

function drawBellTower(p: IsoPainter, y0: number, y1: number, brick: number, trim: number, tile: number) {
  const x0 = 1.7;
  const x1 = 2.5;
  p.box(x0, y0, x1, y1, 0, 112, boxColors(brick));
  for (const face of facesOf(x1, y1)) {
    const [u0, u1] = face.side === "south" ? [x0, x1] : [y0, y1];
    p.windows(face, u0, u1, 40, 70, 1, 1, { color: WINDOW, arched: true, widthRatio: 0.3 });
    p.windows(face, u0, u1, 82, 108, 1, 1, { color: DARK_OPENING, arched: true, widthRatio: 0.5, heightRatio: 0.8 });
    p.faceRect(face, u0, u1, 76, 79, trim);
  }
  p.box(x0 - 0.03, y0 - 0.03, x1, y1, 112, 117, boxColors(trim));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  p.dome(cx, cy, 117, 12, tile);
  p.spire(cx, cy, 128, 140, 0xd9c48a, 1.5);
}

// ---------------------------------------------------------------------------------------------
// Cabildo: edificio colonial blanco de dos plantas con recova y campanario, frente al sur.

function drawCabildo(p: IsoPainter) {
  const white = 0xf1ede4;
  const trim = 0xd8cfbd;
  const south: Face = { side: "south", y: 2.5 };
  const east: Face = { side: "east", x: 2.5 };

  p.box(-0.5, -0.3, 2.5, 2.5, 0, 62, boxColors(white));
  p.windows(south, -0.4, 2.4, 0, 28, 5, 1, { color: DARK_OPENING, arched: true, widthRatio: 0.62, heightRatio: 0.92 });
  p.windows(south, -0.4, 2.4, 32, 58, 5, 1, { color: WINDOW, widthRatio: 0.32, heightRatio: 0.7, balcony: IRON });
  p.windows(east, -0.2, 2.4, 6, 58, 3, 2, { color: WINDOW, widthRatio: 0.3, heightRatio: 0.6, shutters: 0x3f6b4f });
  p.faceRect(south, -0.5, 2.5, 28, 31, trim);

  p.box(-0.5, -0.3, 2.5, 2.5, 62, 67, boxColors(trim));
  p.facePoly(
    south,
    [
      [0.4, 67],
      [1.6, 67],
      [1.0, 78],
    ],
    white,
  );

  // Campanario central.
  p.box(0.7, 1.6, 1.3, 2.2, 67, 92, boxColors(white));
  p.windows({ side: "south", y: 2.2 }, 0.7, 1.3, 70, 90, 1, 1, { color: DARK_OPENING, arched: true, widthRatio: 0.5 });
  p.windows({ side: "east", x: 1.3 }, 1.6, 2.2, 70, 90, 1, 1, { color: DARK_OPENING, arched: true, widthRatio: 0.5 });
  p.box(0.66, 1.56, 1.34, 2.24, 92, 95, boxColors(trim));
  p.dome(1.0, 1.9, 95, 8, 0xd9cfb8);
}

// ---------------------------------------------------------------------------------------------
// Mercado del Puerto: muros de ladrillo, gran techo de hierro y la torre del reloj al centro.

function drawMercado(p: IsoPainter) {
  const brick = 0xa4553c;
  const iron = 0x56625f;

  p.box(-0.5, -0.5, 3.5, 3.5, 0, 32, boxColors(brick));
  for (const face of facesOf(3.5, 3.5)) {
    p.windows(face, -0.4, 3.4, 4, 30, 6, 1, { color: 0x2e2a28, arched: true, widthRatio: 0.6, heightRatio: 0.85 });
  }
  p.box(-0.5, -0.5, 3.5, 3.5, 32, 35, boxColors(0xd9c9b0));

  p.pyramid(-0.5, -0.5, 3.5, 3.5, 35, 75, shade(iron, 8), shade(iron, -12));
  // Nervaduras de hierro del techo.
  const apex = p.p(1.5, 1.5, 75);
  for (let i = 1; i < 6; i++) {
    const t = -0.5 + (i * 4) / 6;
    p.line(p.p(t, 3.5, 35), apex, IRON, 1, 0.35);
    p.line(p.p(3.5, t, 35), apex, IRON, 1, 0.35);
  }

  // Torre del reloj.
  const a = 1.22;
  const b = 1.78;
  p.box(a, a, b, b, 68, 104, boxColors(0x7d8a86));
  for (const face of facesOf(b, b)) {
    const clock = p.facePoint(face, 1.5, 92);
    p.g.fillStyle(0xf4efe3, 1);
    p.g.fillEllipse(clock.x, clock.y, 9, 9);
    p.line(clock, { x: clock.x, y: clock.y - 3.5 }, IRON, 1);
    p.line(clock, { x: clock.x + 2.5, y: clock.y }, IRON, 1);
  }
  p.pyramid(a - 0.04, a - 0.04, b + 0.04, b + 0.04, 104, 120, shade(iron, 8), shade(iron, -12));
}

// ---------------------------------------------------------------------------------------------
// Monumento a Artigas: pedestal de granito y estatua ecuestre de bronce.

function drawMonumentoArtigas(p: IsoPainter) {
  const granite = 0x8e9296;
  const bronze = 0x3f4d3c;
  const highlight = 0x5f7356;

  p.box(-0.45, -0.45, 1.45, 1.45, 0, 6, boxColors(0xb0b3b6));
  p.box(-0.1, -0.1, 1.1, 1.1, 6, 50, boxColors(granite));
  p.faceRect({ side: "south", y: 1.1 }, 0.2, 0.8, 22, 34, 0x8a6d3b);
  p.box(-0.15, -0.15, 1.15, 1.15, 50, 54, boxColors(shade(granite, 12)));

  const c = p.p(0.5, 0.5, 54);
  const g = p.g;
  g.fillStyle(bronze, 1);
  // Patas del caballo.
  for (const [dx, lift] of [
    [-9, 0],
    [-6, 0],
    [7, 3],
    [10, 0],
  ]) {
    g.fillRect(c.x + dx, c.y - 15 - lift, 2.5, 15);
  }
  g.fillEllipse(c.x, c.y - 19, 27, 11);
  g.fillPoints(
    [
      { x: c.x + 8, y: c.y - 22 },
      { x: c.x + 12, y: c.y - 34 },
      { x: c.x + 16, y: c.y - 33 },
      { x: c.x + 13, y: c.y - 19 },
    ],
    true,
  );
  g.fillEllipse(c.x + 16, c.y - 33, 10, 5);
  g.fillPoints(
    [
      { x: c.x - 12, y: c.y - 21 },
      { x: c.x - 17, y: c.y - 10 },
      { x: c.x - 14, y: c.y - 10 },
      { x: c.x - 11, y: c.y - 18 },
    ],
    true,
  );
  // Jinete.
  g.fillRect(c.x - 3, c.y - 36, 7, 13);
  g.fillCircle(c.x + 0.5, c.y - 39, 3.4);
  g.fillEllipse(c.x + 0.5, c.y - 42, 9, 2.6);
  g.fillStyle(highlight, 1);
  g.fillEllipse(c.x - 3, c.y - 21, 12, 3);
  g.fillRect(c.x - 2, c.y - 35, 2, 10);
}

// ---------------------------------------------------------------------------------------------
// Fuente de la Plaza Matriz.

function drawFuente(p: IsoPainter) {
  const stone = 0xc9c0b0;
  const water = 0x4f9fc4;
  const g = p.g;
  const c = p.p(0, 0, 0);

  g.fillStyle(shade(stone, -20), 1);
  g.fillEllipse(c.x, c.y - 2, 54, 27);
  g.fillStyle(stone, 1);
  g.fillEllipse(c.x, c.y - 6, 54, 27);
  g.fillStyle(water, 1);
  g.fillEllipse(c.x, c.y - 6, 45, 21);
  g.fillStyle(shade(water, 25), 1);
  g.fillEllipse(c.x - 8, c.y - 8, 14, 4);

  g.fillStyle(stone, 1);
  g.fillRect(c.x - 3, c.y - 30, 6, 24);
  g.fillEllipse(c.x, c.y - 30, 24, 9);
  g.fillStyle(water, 1);
  g.fillEllipse(c.x, c.y - 31, 18, 5);
  g.fillStyle(stone, 1);
  g.fillRect(c.x - 1.5, c.y - 42, 3, 12);
  g.fillCircle(c.x, c.y - 44, 3);

  // Chorros que caen del plato superior.
  g.lineStyle(1.5, 0xbfe6f5, 0.85);
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(c.x + side * 10, c.y - 30);
    g.lineTo(c.x + side * 15, c.y - 22);
    g.lineTo(c.x + side * 17, c.y - 10);
    g.strokePath();
  }
}

// ---------------------------------------------------------------------------------------------
// Puerta de la Ciudadela: muro norte-sur con el arco sobre el tile caminable de la peatonal.

const GATE_STONE = 0xbcae94;

function gatePieces(landmark: Landmark): PlacedPiece[] {
  const { area } = landmark;
  const isPassage = (x: number, y: number) => landmark.passable?.some((t) => t.x === x && t.y === y) ?? false;
  const pieces: PlacedPiece[] = [];

  for (let y = area.y; y < area.y + area.height; y++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      const nextToPassage = isPassage(x, y - 1) || isPassage(x, y + 1);
      const role = isPassage(x, y) ? "arch" : nextToPassage ? "pier" : "wall";
      const draw = role === "arch" ? drawGateArch : role === "pier" ? drawGatePier : drawGateWall;
      const maxZ = role === "arch" ? 180 : role === "pier" ? 162 : 104;
      pieces.push({ tile: { x, y }, spec: { key: `gate-${role}`, width: 1, height: 1, maxZ, draw } });
    }
  }
  return pieces;
}

function stoneCourses(p: IsoPainter, face: Face, u0: number, u1: number, z0: number, z1: number) {
  for (let z = z0 + 10; z < z1; z += 10) {
    p.line(p.facePoint(face, u0, z), p.facePoint(face, u1, z), 0x000000, 1, 0.12);
  }
}

function drawGateWall(p: IsoPainter) {
  p.box(-0.3, -0.5, 0.3, 0.5, 0, 90, boxColors(GATE_STONE));
  stoneCourses(p, { side: "east", x: 0.3 }, -0.5, 0.5, 0, 90);
  // Almenas.
  p.box(-0.3, -0.45, 0.3, -0.1, 90, 102, boxColors(GATE_STONE));
  p.box(-0.3, 0.1, 0.3, 0.45, 90, 102, boxColors(GATE_STONE));
}

function drawGatePier(p: IsoPainter) {
  const east: Face = { side: "east", x: 0.38 };
  p.box(-0.38, -0.5, 0.38, 0.5, 0, 150, boxColors(GATE_STONE));
  stoneCourses(p, east, -0.5, 0.5, 0, 150);
  // Pilastras y hornacina.
  p.faceRect(east, -0.36, -0.18, 0, 148, shade(GATE_STONE, 10));
  p.faceRect(east, 0.18, 0.36, 0, 148, shade(GATE_STONE, 10));
  p.faceArch(east, -0.08, 0.08, 64, 100, shade(GATE_STONE, -30));
  p.box(-0.42, -0.5, 0.42, 0.5, 150, 160, boxColors(shade(GATE_STONE, 12)));
}

/** Arco sobre el tile caminable: la luz (hasta z = 110) deja pasar holgado a un avatar. */
function drawGateArch(p: IsoPainter) {
  const east: Face = { side: "east", x: 0.38 };
  p.box(-0.38, -0.5, 0.38, 0.5, 112, 150, boxColors(GATE_STONE));
  stoneCourses(p, east, -0.5, 0.5, 112, 150);

  // Enjutas: la piedra entre el arco de medio punto y el dintel.
  const spandrel: Array<[number, number]> = [[-0.5, 112]];
  for (let i = 0; i <= 12; i++) {
    const u = -0.5 + i / 12;
    spandrel.push([u, 90 + 22 * Math.sqrt(Math.max(0, 1 - (2 * u) ** 2))]);
  }
  spandrel.push([0.5, 112]);
  p.facePoly(east, spandrel, GATE_STONE);
  p.faceRect(east, -0.06, 0.06, 104, 118, shade(GATE_STONE, 18));

  p.box(-0.42, -0.5, 0.42, 0.5, 150, 160, boxColors(shade(GATE_STONE, 12)));
  p.facePoly(
    east,
    [
      [-0.4, 160],
      [0.4, 160],
      [0, 176],
    ],
    GATE_STONE,
  );
}

// ---------------------------------------------------------------------------------------------

/** Caras visibles (sur y este) de un volumen cuyo borde sureste está en (x1, y1). */
function facesOf(x1: number, y1: number): Face[] {
  return [
    { side: "south", y: y1 },
    { side: "east", x: x1 },
  ];
}
