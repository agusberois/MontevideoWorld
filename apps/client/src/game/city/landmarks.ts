import type { Landmark, TilePoint } from "@montevideo-world/shared";
import { shade } from "../color";
import { PieceSpec } from "./buildings";
import type * as Phaser from "phaser";
import { Face, IsoPainter, Vec2, boxColors } from "./IsoPainter";

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
  // Shopping Tres Cruces: sobre la azotea, del lado de la explanada.
  shopping: { u: 1.0, v: 1.2, z: 36 },
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
    case "shopping":
      return single(4, 72, drawShoppingTresCruces);
    case "hospital":
      return single(4, 150, drawSanatorio);
    case "obelisk":
      return single(1, 76, drawObelisco);
    case "velodrome":
      return single(4, 26, drawVelodromo);
    case "stadium":
      return single(CENTENARIO_BOWL.size, 112, drawEstadioCentenario);
    case "cellBlock":
      return single(3, 84, drawPabellon);
    case "watchtower":
      return single(1, 100, drawGarita);
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

  drawEquestrianStatue(p.g, p.p(0.5, 0.5, 54), bronze, highlight);
}

type Pt = readonly [number, number];

/**
 * Estatua ecuestre de perfil, mirando a la derecha, con los cascos en `base` (arriba del pedestal).
 * Coordenadas en px relativas a `base` (y negativa = hacia arriba). El caballo va al paso, con la
 * mano cercana levantada como en la estatua real; las patas del lado lejano van más oscuras para
 * dar profundidad, y el lomo y el cuello llevan el brillo del bronce.
 */
function drawEquestrianStatue(g: Phaser.GameObjects.Graphics, base: Vec2, bronze: number, highlight: number) {
  const at = ([x, y]: Pt): Vec2 => ({ x: base.x + x, y: base.y + y });
  const poly = (points: readonly Pt[], color: number) => {
    g.fillStyle(color, 1);
    g.fillPoints(points.map(at), true);
  };
  /** Pata articulada: tramos gruesos con las articulaciones redondeadas y el casco abajo. */
  const leg = (joints: readonly Pt[], widths: readonly number[], color: number) => {
    for (let i = 0; i < joints.length - 1; i++) {
      const a = at(joints[i]);
      const b = at(joints[i + 1]);
      g.lineStyle(widths[i], color, 1);
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.fillStyle(color, 1);
      g.fillCircle(b.x, b.y, widths[i] / 2);
    }
    const hoof = at(joints[joints.length - 1]);
    g.fillStyle(shade(color, -25), 1);
    g.fillRect(hoof.x - 1.6, hoof.y - 1.6, 3.4, 2);
  };
  const far = shade(bronze, -22);
  const dark = shade(bronze, -14);

  // Lado lejano: cola y patas de atrás del cuerpo.
  poly(
    [
      [-15, -22],
      [-19, -20.5],
      [-21.5, -14],
      [-20.5, -6],
      [-18.5, -7.5],
      [-18.5, -13.5],
      [-16.5, -18],
    ],
    dark,
  );
  leg([[-10.5, -16], [-13.5, -8], [-12.5, -2.2], [-12.2, 0]], [5, 2.6, 2.2], far);
  leg([[9.5, -16], [10.5, -7.5], [10.6, -2.2], [11, 0]], [4.4, 2.4, 2.1], far);

  // Cuerpo: pecho, panza, flanco, ancas y grupa.
  poly(
    [
      [12.5, -23],
      [15, -19.5],
      [14.5, -15.5],
      [10.5, -12.5],
      [2, -11.5],
      [-6, -12],
      [-11, -13.5],
      [-15, -16.5],
      [-16.5, -20.5],
      [-14, -24.5],
      [-8, -24],
      [-1, -23],
      [6, -23.6],
      [9, -24.5],
    ],
    bronze,
  );
  // Cuello arqueado hasta la nuca.
  poly(
    [
      [6.5, -23.5],
      [8.5, -29],
      [11.5, -33.5],
      [14.8, -36.5],
      [18, -34.5],
      [18.2, -31],
      [16.5, -26],
      [15, -20],
    ],
    bronze,
  );
  // Cabeza inclinada hacia adelante, con el hocico abajo.
  poly(
    [
      [14.6, -37],
      [17.8, -37],
      [21.5, -33],
      [24.6, -29.5],
      [24.8, -27.6],
      [22.8, -26.6],
      [20, -28],
      [17.2, -31],
      [15, -33],
    ],
    bronze,
  );
  poly(
    [
      [15.4, -36.8],
      [16, -40.6],
      [17.4, -37],
    ],
    bronze,
  );
  // Crin sobre el cuello, ollar y ojo.
  poly(
    [
      [6, -24],
      [7.6, -29.8],
      [10.8, -34.6],
      [14.6, -38],
      [13.2, -34.2],
      [10.2, -30],
      [8.6, -25.2],
    ],
    dark,
  );
  g.fillStyle(far, 1);
  g.fillCircle(at([23.4, -28.6]).x, at([23.4, -28.6]).y, 0.8);
  g.fillCircle(at([18.8, -33.6]).x, at([18.8, -33.6]).y, 0.9);

  // Lado cercano: patas delante del cuerpo (la de adelante levantada, al paso).
  leg([[-8, -15.5], [-10.5, -7.5], [-8.6, -2.2], [-8.2, 0]], [5.4, 2.8, 2.3], bronze);
  leg([[12, -16.5], [16, -10.2], [14.4, -5.2], [15.4, -3.6]], [4.6, 2.6, 2.2], bronze);

  // Brillo del bronce sobre el lomo, la grupa y la cresta del cuello.
  g.lineStyle(1.3, highlight, 1);
  g.strokePoints(
    [at([-15, -22.5]), at([-12.5, -24.2]), at([-6, -23.4]), at([1, -22.6]), at([7, -23.4])],
    false,
  );
  g.strokePoints([at([9, -27.6]), at([11.6, -32]), at([14.4, -35])], false);
  g.fillStyle(highlight, 1);
  g.fillEllipse(at([-11, -19]).x, at([-11, -19]).y, 5, 3);

  // Jinete: poncho al viento, torso erguido, pierna sobre el flanco, brazo con las riendas.
  poly(
    [
      [-1.5, -33.5],
      [-6.5, -26],
      [-5, -21.5],
      [-0.5, -23.5],
    ],
    dark,
  );
  poly(
    [
      [-2, -23.5],
      [4, -23.5],
      [3.6, -33],
      [-1.2, -33.4],
    ],
    bronze,
  );
  leg([[1.5, -23.5], [5.5, -19.5], [4.6, -13.6]], [3.4, 2.4], bronze);
  leg([[2.8, -31], [6.6, -27.8], [9, -26]], [2.2, 1.8], bronze);
  g.lineStyle(0.8, far, 1);
  g.lineBetween(at([9, -26]).x, at([9, -26]).y, at([22.5, -28]).x, at([22.5, -28]).y);
  // Cabeza con sombrero de ala.
  g.fillStyle(bronze, 1);
  g.fillRect(at([0, -35.4]).x, at([0, -35.4]).y, 2.4, 2.4);
  g.fillCircle(at([1.2, -37.4]).x, at([1.2, -37.4]).y, 3);
  g.fillStyle(dark, 1);
  g.fillEllipse(at([1.2, -39.6]).x, at([1.2, -39.6]).y, 10, 2.4);
  g.fillRoundedRect(at([-1.4, -43]).x, at([-1.4, -43]).y, 5.2, 3.6, 1.2);
  g.fillStyle(highlight, 1);
  g.fillRect(at([-1, -32.6]).x, at([-1, -32.6]).y, 1.4, 8);
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

// ---------------------------------------------------------------------------------------------
// Tres Cruces y Parque Batlle.

const CONCRETE = 0xe6e2d9;
const GLASS = 0x6fa3c0;

/** Shopping Tres Cruces: volumen blanco con vidriados, franja roja, y la terminal con ómnibus al este. */
function drawShoppingTresCruces(p: IsoPainter) {
  const red = 0xd7263d;
  const south: Face = { side: "south", y: 2.6 };
  const east: Face = { side: "east", x: 2.7 };

  p.box(-0.5, -0.5, 2.7, 2.6, 0, 34, boxColors(CONCRETE));
  p.windows(south, -0.4, 2.6, 6, 26, 6, 2, { color: GLASS, widthRatio: 0.85, heightRatio: 0.8 });
  p.windows(east, -0.4, 2.5, 6, 26, 5, 2, { color: GLASS, widthRatio: 0.85, heightRatio: 0.8 });
  p.faceRect(south, 0.7, 1.4, 0, 12, 0x2f3d4b);
  p.faceRect(south, -0.5, 2.7, 27, 31, red);
  p.faceRect(east, -0.5, 2.6, 27, 31, red);
  p.box(-0.5, -0.5, 2.7, 2.6, 34, 36, boxColors(shade(CONCRETE, 8)));
  // Claraboya del patio de comidas.
  p.box(0.2, 0.0, 1.6, 1.0, 36, 40, boxColors(GLASS));

  // Terminal: andenes al este, con ómnibus bajo el alero.
  p.box(2.7, -0.45, 3.45, 2.55, 0, 2, boxColors(0xb9b4aa));
  for (const [y0, y1, color] of [
    [-0.25, 0.95, 0xf2f2f2],
    [1.2, 2.4, 0x2d6cb4],
  ] as const) {
    p.box(2.85, y0, 3.3, y1, 2, 14, boxColors(color));
    p.faceRect({ side: "east", x: 3.3 }, y0 + 0.05, y1 - 0.05, 8, 12, 0x2f3d4b);
    p.faceRect({ side: "east", x: 3.3 }, y0, y1, 4, 5.5, red);
  }
  for (const y of [-0.35, 1.05, 2.45]) p.box(3.38, y - 0.04, 3.45, y + 0.04, 2, 22, boxColors(0x8d8a83), false);
  p.box(2.7, -0.45, 3.5, 2.55, 22, 25, boxColors(0xd8d4cb));
}

/** Sanatorio Americano: basamento y torre blanca con cruz roja y helipuerto en la azotea. */
function drawSanatorio(p: IsoPainter) {
  const white = 0xf2f4f5;
  const top = 132;
  p.box(-0.5, -0.5, 3.5, 3.5, 0, 22, boxColors(0xd9dde0));
  for (const face of facesOf(3.5, 3.5)) {
    p.windows(face, -0.4, 3.4, 3, 20, 6, 1, { color: GLASS, widthRatio: 0.7, heightRatio: 0.7 });
  }
  p.box(0.0, 0.0, 3.1, 3.1, 22, top, boxColors(white));
  for (const face of facesOf(3.1, 3.1)) {
    p.windows(face, 0.1, 3.0, 26, top - 6, 6, 9, { color: 0x4a6a7e, widthRatio: 0.6, heightRatio: 0.55 });
  }
  // Cruz roja sobre la fachada sur.
  const south: Face = { side: "south", y: 3.1 };
  p.faceRect(south, 1.15, 1.95, top - 30, top - 8, 0xffffff);
  p.faceRect(south, 1.47, 1.63, top - 27, top - 11, 0xd7263d);
  p.faceRect(south, 1.27, 1.83, top - 21, top - 17, 0xd7263d);
  p.box(-0.05, -0.05, 3.15, 3.15, top, top + 3, boxColors(shade(white, -10)));
  // Helipuerto: círculo oscuro con la H amarilla.
  p.fill(0x4b4f55, ovalPoints(p, 1.55, 1.55, 1.15, 1.15, top + 3.2, 0, Math.PI * 2));
  p.g.lineStyle(1.5, 0xffd166, 1);
  p.g.strokePoints(ovalPoints(p, 1.55, 1.55, 1.0, 1.0, top + 3.3, 0, Math.PI * 2), true);
  for (const [a, b] of [
    [p.p(1.2, 1.25, top + 3.3), p.p(1.2, 1.85, top + 3.3)],
    [p.p(1.9, 1.25, top + 3.3), p.p(1.9, 1.85, top + 3.3)],
    [p.p(1.2, 1.55, top + 3.3), p.p(1.9, 1.55, top + 3.3)],
  ]) {
    p.line(a, b, 0xffd166, 2);
  }
}

/** Obelisco a los Constituyentes: escalinata, tres figuras de bronce y el fuste de granito. */
function drawObelisco(p: IsoPainter) {
  const granite = 0xbdb6aa;
  p.box(-0.45, -0.45, 0.45, 0.45, 0, 3, boxColors(0xa39d92));
  p.box(-0.3, -0.3, 0.3, 0.3, 3, 8, boxColors(granite));
  // Figuras de bronce (Ley, Libertad, Fuerza) contra el pedestal, en las caras que se ven.
  const g = p.g;
  for (const [x, y] of [
    [0.0, 0.36],
    [0.36, 0.0],
    [0.3, 0.3],
  ]) {
    const base = p.p(x, y, 3);
    g.fillStyle(0x3f4d3c, 1);
    g.fillEllipse(base.x, base.y - 6, 5, 11);
    g.fillCircle(base.x, base.y - 13, 2);
  }
  // Fuste que se afina hacia arriba y punta piramidal.
  const z0 = 8;
  const z1 = 66;
  const b = 0.17;
  const t = 0.09;
  p.fill(shade(granite, -6), [p.p(-b, b, z0), p.p(b, b, z0), p.p(t, t, z1), p.p(-t, t, z1)]);
  p.fill(shade(granite, -20), [p.p(b, b, z0), p.p(b, -b, z0), p.p(t, -t, z1), p.p(t, t, z1)]);
  p.pyramid(-t, -t, t, t, z1, z1 + 8, shade(granite, 6), shade(granite, -14));
}

/** Velódromo Municipal: óvalo con pista peraltada de ladrillo, césped al centro y una tribuna. */
function drawVelodromo(p: IsoPainter) {
  drawBowl(p, 1.5, 1.5, 1.0, 0.82, [
    { r: 1.95, z: 9, color: 0xc9c4ba },
    { r: 1.82, z: 8, color: 0xb5653f },
    { r: 1.32, z: 2, color: 0x7fae5a },
  ], 0xa7a196);
  // Líneas de la pista.
  p.g.lineStyle(1, 0xffffff, 0.85);
  p.g.strokePoints(ovalPoints(p, 1.5, 1.5, 1.55, 1.55 * 0.82, 5.2, 0, Math.PI * 2), true);
  // Tribuna techada sobre la recta sur.
  p.box(0.4, 3.0, 2.6, 3.45, 0, 13, boxColors(0xb9b4aa));
  p.windows({ side: "south", y: 3.45 }, 0.45, 2.55, 2, 11, 6, 1, { color: 0x3a3f4c, widthRatio: 0.6 });
  p.box(0.35, 2.95, 2.65, 3.5, 13, 15, boxColors(0x6f7c86));
}

/**
 * Estadio Centenario: la Torre de los Homenajes (atrás, al oeste), la tribuna en escalones con los
 * colores de las cuatro tribunas, la cancha con sus líneas y el muro exterior.
 */
/**
 * Geometría del Estadio Centenario (coordenadas del dibujo base de 5 × 5, antes de escalar).
 * `rings` va de afuera hacia adentro: el borde, cuatro escalones de tribuna y la cancha.
 */
const CENTENARIO_BOWL = {
  size: 5,
  cx: 2.2,
  cy: 2.0,
  aspectY: 0.92,
  rings: [
    { r: 2.3, z: 34, color: 0xd9d4c9 },
    { r: 2.12, z: 30, color: 0xa9b3bb },
    { r: 1.92, z: 23, color: 0x8fa3ad },
    { r: 1.72, z: 16, color: 0xa9b3bb },
    { r: 1.52, z: 9, color: 0x8fa3ad },
    { r: 1.35, z: 4, color: 0x5f9a46 },
  ],
} as const;

function drawEstadioCentenario(p: IsoPainter) {
  drawTorreHomenajes(p, -0.2, 2.0);
  const { cx, cy, aspectY, rings } = CENTENARIO_BOWL;
  // Las líneas van sobre el césped pero antes de la tribuna de adelante, que las tapa: si no, se
  // dibujarían por encima de las gradas y la cancha se saldría del estadio.
  const drawPitch = () => {
    const z = 4.2;
    const hx = 0.95;
    const hy = 0.6;
    const g = p.g;
    g.lineStyle(1, 0xffffff, 0.9);
    g.strokePoints([p.p(cx - hx, cy - hy, z), p.p(cx + hx, cy - hy, z), p.p(cx + hx, cy + hy, z), p.p(cx - hx, cy + hy, z)], true);
    g.lineBetween(p.p(cx, cy - hy, z).x, p.p(cx, cy - hy, z).y, p.p(cx, cy + hy, z).x, p.p(cx, cy + hy, z).y);
    g.strokePoints(ovalPoints(p, cx, cy, 0.2, 0.2, z, 0, Math.PI * 2), true);
    for (const side of [-1, 1]) {
      const x0 = cx + side * hx;
      const x1 = cx + side * (hx - 0.28);
      g.strokePoints([p.p(x0, cy - 0.3, z), p.p(x1, cy - 0.3, z), p.p(x1, cy + 0.3, z), p.p(x0, cy + 0.3, z)], false);
    }
  };
  drawBowl(p, cx, cy, 1.0, aspectY, rings, 0xbcb6aa, true, drawPitch);
}

/** Torre de los Homenajes: alta, blanca, con nervaduras verticales, mirador y mástil con bandera. */
function drawTorreHomenajes(p: IsoPainter, x: number, y: number) {
  const white = 0xf3f1ea;
  const w = 0.2;
  const top = 96;
  p.box(x - w, y - w, x + w, y + w, 0, top, boxColors(white));
  for (const face of facesOf(x + w, y + w)) {
    const [u0, u1] = face.side === "south" ? [x - w, x + w] : [y - w, y + w];
    for (let i = 1; i < 4; i++) {
      const u = u0 + ((u1 - u0) * i) / 4;
      p.faceRect(face, u - 0.012, u + 0.012, 10, top - 14, shade(white, -22));
    }
    p.faceRect(face, u0 + 0.05, u1 - 0.05, top - 12, top - 4, 0x3a3f4c);
  }
  p.box(x - w - 0.04, y - w - 0.04, x + w + 0.04, y + w + 0.04, top, top + 4, boxColors(shade(white, -6)));
  drawUruguayFlag(p, x, y, top + 4);
}

/**
 * Óvalo en escalones (estadio, velódromo) visto desde la cámara. `rings` va de afuera hacia
 * adentro: cada anillo baja de altura y el último es el centro (cancha). Para que lo de adelante
 * tape bien: primero la mitad de atrás de afuera hacia adentro, después el centro (y `drawCenter`), y por último la
 * mitad de adelante de adentro hacia afuera, y el muro exterior.
 */
function drawBowl(
  p: IsoPainter,
  cx: number,
  cy: number,
  aspectX: number,
  aspectY: number,
  rings: ReadonlyArray<{ r: number; z: number; color: number }>,
  wall: number,
  pillars = false,
  /** Lo que va sobre el centro (líneas de la cancha), tapado por la mitad de adelante. */
  drawCenter?: () => void,
) {
  // "Adelante" = hacia la cámara (x + y crece): de -45° a 135°.
  const front: [number, number] = [-Math.PI / 4, (3 * Math.PI) / 4];
  const back: [number, number] = [(3 * Math.PI) / 4, (7 * Math.PI) / 4];
  const arc = (i: number, [t0, t1]: [number, number], z = rings[i].z) =>
    ovalPoints(p, cx, cy, rings[i].r * aspectX, rings[i].r * aspectY, z, t0, t1);
  const band = (i: number, range: [number, number]) => [...arc(i, range), ...arc(i + 1, range).reverse()];

  for (let i = 0; i < rings.length - 1; i++) p.fill(shade(rings[i].color, -10), band(i, back));
  const last = rings.length - 1;
  p.fill(rings[last].color, arc(last, [0, Math.PI * 2]));
  drawCenter?.();
  for (let i = rings.length - 2; i >= 0; i--) p.fill(rings[i].color, band(i, front));

  // Muro exterior (sólo se ve la mitad de adelante).
  const wallPoints = [...arc(0, front), ...arc(0, front, 0).reverse()];
  p.fill(wall, wallPoints);
  p.outline(wallPoints);
  if (pillars) {
    for (let i = 0; i <= 12; i++) {
      const t = front[0] + ((front[1] - front[0]) * i) / 12;
      const x = cx + Math.cos(t) * rings[0].r * aspectX;
      const y = cy + Math.sin(t) * rings[0].r * aspectY;
      p.line(p.p(x, y, 0), p.p(x, y, rings[0].z), shade(wall, -18), 1.5);
    }
  }
  p.g.lineStyle(1, 0x000000, 0.25);
  p.g.strokePoints(arc(0, [0, Math.PI * 2]), true);
}

/** Puntos de un óvalo horizontal a la altura `z`, de `t0` a `t1` (radianes). */
function ovalPoints(p: IsoPainter, cx: number, cy: number, rx: number, ry: number, z: number, t0: number, t1: number, steps = 40): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = t0 + ((t1 - t0) * i) / steps;
    points.push(p.p(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, z));
  }
  return points;
}

// ---------------------------------------------------------------------------------------------
// COMCAR.

const PRISON_CONCRETE = 0xa9a49a;

/**
 * Pabellón de celdas: bloque gris de tres pisos con ventanitas enrejadas, una franja descascarada,
 * la puerta de rejas al sur y el tanque de agua en la azotea.
 */
function drawPabellon(p: IsoPainter) {
  const top = 66;
  p.box(-0.45, -0.45, 2.45, 2.45, 0, top, boxColors(PRISON_CONCRETE));
  for (const face of facesOf(2.45, 2.45)) {
    p.faceRect(face, -0.45, 2.45, 0, 6, shade(PRISON_CONCRETE, -30));
    p.faceRect(face, -0.45, 2.45, 22, 24, shade(PRISON_CONCRETE, -14));
    p.faceRect(face, -0.45, 2.45, 44, 46, shade(PRISON_CONCRETE, -14));
    barredWindows(p, face, -0.35, 2.35, 8, top - 4, 8, 3);
  }
  // Puerta de rejas.
  const south: Face = { side: "south", y: 2.45 };
  p.faceRect(south, 0.75, 1.25, 0, 16, 0x26292e);
  for (let i = 1; i < 6; i++) {
    const u = 0.75 + (0.5 * i) / 6;
    p.faceRect(south, u - 0.012, u + 0.012, 0, 16, 0x8c9096);
  }
  // Pretil y tanque de agua.
  p.box(-0.5, -0.5, 2.5, 2.5, top, top + 3, boxColors(shade(PRISON_CONCRETE, -8)));
  p.box(0.2, 0.2, 0.75, 0.75, top + 3, top + 16, boxColors(0x7d8288));
}

/** Ventanas chicas con barrotes, en una grilla sobre la cara. */
function barredWindows(p: IsoPainter, face: Face, u0: number, u1: number, z0: number, z1: number, cols: number, rows: number) {
  const cellU = (u1 - u0) / cols;
  const cellZ = (z1 - z0) / rows;
  const w = cellU * 0.42;
  const h = cellZ * 0.42;
  for (let row = 0; row < rows; row++) {
    const wz = z0 + row * cellZ + (cellZ - h) / 2;
    for (let col = 0; col < cols; col++) {
      const wu = u0 + col * cellU + (cellU - w) / 2;
      p.faceRect(face, wu, wu + w, wz, wz + h, 0x22252a);
      for (const t of [0.33, 0.66]) p.faceRect(face, wu + w * t - 0.008, wu + w * t + 0.008, wz, wz + h, 0x9aa0a6);
    }
  }
}

/** Garita de vigilancia: columna de hormigón, cabina con ventanales, techo y un reflector. */
function drawGarita(p: IsoPainter) {
  const legTop = 62;
  const cabinTop = 80;
  p.box(-0.16, -0.16, 0.16, 0.16, 0, legTop, boxColors(shade(PRISON_CONCRETE, -6)));
  p.box(-0.34, -0.34, 0.34, 0.34, legTop - 3, legTop, boxColors(shade(PRISON_CONCRETE, -20)));
  p.box(-0.3, -0.3, 0.3, 0.3, legTop, cabinTop, boxColors(0xd9d4c8));
  for (const face of facesOf(0.3, 0.3)) p.faceRect(face, -0.24, 0.24, legTop + 6, cabinTop - 3, 0x2f3a44);
  p.pyramid(-0.38, -0.38, 0.38, 0.38, cabinTop, cabinTop + 10, 0x5b4a3f, 0x463931);
  // Reflector.
  p.box(0.22, 0.22, 0.34, 0.34, cabinTop + 1, cabinTop + 5, boxColors(0x2b2b30));
  p.fill(0xfff3b0, [p.p(0.34, 0.26, cabinTop + 4), p.p(0.34, 0.32, cabinTop + 4), p.p(0.34, 0.32, cabinTop + 2), p.p(0.34, 0.26, cabinTop + 2)]);
}
