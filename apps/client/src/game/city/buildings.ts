import { shade } from "../color";
import type { ShopBuilding } from "@montevideo-world/shared";
import { BoxColors, Face, IsoPainter, boxColors } from "./IsoPainter";

/**
 * Volumen dibujable en coordenadas locales: el tile ancla está en (0, 0) y el área ocupa de
 * (-0.5, -0.5) a (width - 0.5, height - 0.5). `key` identifica la textura horneada: dos piezas
 * con la misma key comparten textura.
 */
export interface PieceSpec {
  key: string;
  /** Tamaño en tiles para el que está escrito `draw`. */
  width: number;
  height: number;
  /** Altura máxima en píxeles (define el tamaño de la textura). */
  maxZ: number;
  /**
   * Escala uniforme al hornear (1 por defecto): el área ocupada pasa a ser width·scale × height·scale
   * tiles y las alturas crecen en la misma proporción. Debe dar tamaños enteros.
   */
  scale?: number;
  draw: (painter: IsoPainter) => void;
}

/** Hash entero determinístico por tile: mismo aspecto en todos los clientes y recargas. */
export function tileHash(x: number, y: number, salt = 0): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Fachadas típicas de la Ciudad Vieja: crema, ocre, terracota, rosado, celeste grisáceo… */
const FACADE_COLORS = [0xe8d5b0, 0xd9a46c, 0xc7745a, 0xe3b9a1, 0xb9c7c9, 0xa7b88f, 0xf0e6d2, 0xd6c17a];
const SHUTTER_COLORS = [0x3f6b4f, 0x6b4a32];
const ROOF_COLOR = 0x9c8f80;
const WINDOW_COLOR = 0x2b3442;
const DOOR_COLOR = 0x4a3426;
const IRON_COLOR = 0x1f1f22;
const FLOOR_HEIGHT = 20;

/** Casa/edificio colonial de 1 a 3 pisos sobre un tile de manzana. */
export function houseSpec(x: number, y: number): PieceSpec {
  const hash = tileHash(x, y, 1);
  const floors = 1 + (hash % 3);
  const colorIndex = (hash >>> 4) % FACADE_COLORS.length;
  const shutterIndex = (hash >>> 8) % SHUTTER_COLORS.length;
  const hasDoor = ((hash >>> 10) & 1) === 1;
  const height = 8 + floors * FLOOR_HEIGHT;

  return {
    key: `house-${floors}-${colorIndex}-${shutterIndex}-${hasDoor ? 1 : 0}`,
    width: 1,
    height: 1,
    maxZ: height,
    draw: (p) => {
      const facade = FACADE_COLORS[colorIndex];
      const shutters = SHUTTER_COLORS[shutterIndex];
      p.box(-0.5, -0.5, 0.5, 0.5, 0, height, boxColors(facade, ROOF_COLOR));

      for (const face of [
        { side: "south", y: 0.5 },
        { side: "east", x: 0.5 },
      ] as const) {
        // Zócalo, cornisa y pretil.
        p.faceRect(face, -0.5, 0.5, 0, 4, shade(facade, -25));
        p.faceRect(face, -0.5, 0.5, height - 5, height - 2, shade(facade, 18));

        for (let floor = 0; floor < floors; floor++) {
          const z0 = 4 + floor * FLOOR_HEIGHT;
          if (floor === 0 && hasDoor && face.side === "south") {
            p.faceArch(face, -0.12, 0.12, 0, 16, DOOR_COLOR);
            continue;
          }
          p.windows(face, -0.45, 0.45, z0, z0 + FLOOR_HEIGHT, 2, 1, {
            color: WINDOW_COLOR,
            widthRatio: 0.38,
            heightRatio: 0.62,
            shutters,
            balcony: floor > 0 ? IRON_COLOR : undefined,
          });
        }
      }
    },
  };
}

/** Edificios de apartamentos: hormigón claro, ladrillo, revoque gris, algún vidriado. */
const TOWER_COLORS = [0xe7e2d8, 0xc9b8a2, 0xb46a4c, 0xa9b0b6, 0xd8d0bf, 0x8fa3ad];
const GLASS_COLORS = [0x3d5568, 0x2f3d4b, 0x4a6a7e];
const TOWER_FLOOR = 13;

/** Edificio de apartamentos en altura (Tres Cruces y barrios modernos): de 4 a 10 pisos. */
export function towerSpec(x: number, y: number): PieceSpec {
  const hash = tileHash(x, y, 3);
  const floors = 4 + (hash % 7);
  const colorIndex = (hash >>> 4) % TOWER_COLORS.length;
  const glassIndex = (hash >>> 8) % GLASS_COLORS.length;
  /** Ventanas corridas (moderno) o balcones (años 60–70). */
  const ribbon = ((hash >>> 11) & 1) === 1;
  const height = 10 + floors * TOWER_FLOOR;

  return {
    key: `tower-${floors}-${colorIndex}-${glassIndex}-${ribbon ? 1 : 0}`,
    width: 1,
    height: 1,
    maxZ: height + 12,
    draw: (p) => {
      const facade = TOWER_COLORS[colorIndex];
      const glass = GLASS_COLORS[glassIndex];
      p.box(-0.42, -0.42, 0.42, 0.42, 0, height, boxColors(facade, shade(facade, -12)));
      for (const face of [
        { side: "south", y: 0.42 },
        { side: "east", x: 0.42 },
      ] as const) {
        // Planta baja con vidrieras de locales.
        p.faceRect(face, -0.42, 0.42, 0, 10, shade(facade, -30));
        p.faceRect(face, -0.32, 0.32, 1, 8, glass);
        for (let floor = 0; floor < floors; floor++) {
          const z0 = 10 + floor * TOWER_FLOOR;
          if (ribbon) {
            p.faceRect(face, -0.38, 0.38, z0 + 3, z0 + TOWER_FLOOR - 2, glass);
          } else {
            p.windows(face, -0.4, 0.4, z0, z0 + TOWER_FLOOR, 2, 1, { color: glass, widthRatio: 0.55, heightRatio: 0.62 });
            p.faceRect(face, -0.42, 0.42, z0 + 1, z0 + 3, shade(facade, 14));
          }
        }
      }
      // Azotea: tanque de agua y sala de máquinas.
      p.box(-0.2, -0.2, 0.1, 0.1, height, height + 9, boxColors(shade(facade, -8)));
      p.box(0.15, 0.12, 0.32, 0.3, height, height + 5, boxColors(0x9aa0a6));
    },
  };
}

/** Árbol de copa (plátanos de las plazas). */
export function treeSpec(x: number, y: number): PieceSpec {
  const variant = tileHash(x, y, 2) % 2;
  const scale = variant === 0 ? 1 : 0.85;
  return {
    key: `tree-${variant}`,
    width: 1,
    height: 1,
    maxZ: 70 * scale,
    draw: (p) => {
      const base = p.p(0, 0, 0);
      const g = p.g;
      g.fillStyle(0x000000, 0.22);
      g.fillEllipse(base.x, base.y, 40 * scale, 18 * scale);
      g.fillStyle(0x6b4a2f, 1);
      g.fillRect(base.x - 2.5, base.y - 26 * scale, 5, 26 * scale);

      const crown = p.p(0, 0, 44 * scale);
      const blobs: Array<[number, number, number, number]> = [
        [-10, 4, 13, 0x3d6f35],
        [10, 4, 13, 0x3d6f35],
        [0, -8, 15, 0x4a8240],
        [-7, -2, 12, 0x4f8a44],
        [8, -4, 11, 0x5a9a4c],
        [-3, -14, 9, 0x67a85a],
      ];
      for (const [dx, dy, r, color] of blobs) {
        g.fillStyle(color, 1);
        g.fillCircle(crown.x + dx * scale, crown.y + dy * scale, r * scale);
      }
    },
  };
}

/** Palmera (las de la Plaza Independencia). */
export function palmSpec(x: number, y: number): PieceSpec {
  const lean = tileHash(x, y, 3) % 2 === 0 ? 1 : -1;
  return {
    key: `palm-${lean}`,
    width: 1,
    height: 1,
    maxZ: 92,
    draw: (p) => {
      const g = p.g;
      const base = p.p(0, 0, 0);
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(base.x, base.y, 34, 14);

      // Tronco en segmentos levemente curvos, con anillos.
      const segments = 8;
      let topX = base.x;
      let topY = base.y;
      for (let i = 0; i < segments; i++) {
        const t = (i + 1) / segments;
        const nx = base.x + lean * 6 * t * t;
        const ny = base.y - 70 * t;
        g.lineStyle(6 - t * 2, i % 2 === 0 ? 0x7a6247 : 0x8c7356, 1);
        g.lineBetween(topX, topY, nx, ny);
        topX = nx;
        topY = ny;
      }

      // Hojas: triángulos alargados que caen desde la copa.
      const fronds = 9;
      for (let i = 0; i < fronds; i++) {
        const angle = (i / fronds) * Math.PI * 2;
        const length = 26 + (i % 3) * 4;
        const tipX = topX + Math.cos(angle) * length;
        const tipY = topY + Math.sin(angle) * length * 0.45 + 10;
        const midX = topX + Math.cos(angle) * length * 0.55;
        const midY = topY + Math.sin(angle) * length * 0.25 - 6;
        const nx = -Math.sin(angle) * 4;
        const ny = Math.cos(angle) * 2;
        g.fillStyle(i % 2 === 0 ? 0x3c7d3a : 0x4f9446, 1);
        g.fillTriangle(topX, topY, midX + nx, midY + ny, tipX, tipY);
        g.fillTriangle(topX, topY, midX - nx, midY - ny, tipX, tipY);
      }
      g.fillStyle(0x6b5a3a, 1);
      g.fillCircle(topX, topY, 3.5);
    },
  };
}

const BENCH_WOOD = 0x9a6b3f;
const BENCH_IRON = 0x2b2b30;

/**
 * Banco de plaza de madera con patas de hierro. `facing` es hacia dónde mira quien se sienta:
 * el respaldo queda del lado opuesto (norte u oeste) y el asiento en el centro del tile.
 */
const WALL_CONCRETE = 0xa8a397;
const WALL_HEIGHT = 34;
const WIRE = 0x2b2b30;

/**
 * Muro de la cárcel (`TileChar.Wall`): hormigón con una franja más oscura abajo y, arriba, postes y
 * alambre de púas a lo largo del muro (`alongX` / `alongY`: si sigue hacia el este-oeste o el
 * norte-sur, según los muros vecinos; en las esquinas, los dos).
 */
export function wallSpec(alongX: boolean, alongY: boolean): PieceSpec {
  return {
    key: `wall-${alongX ? 1 : 0}${alongY ? 1 : 0}`,
    width: 1,
    height: 1,
    maxZ: WALL_HEIGHT + 12,
    draw: (p) => {
      p.box(-0.5, -0.5, 0.5, 0.5, 0, WALL_HEIGHT, boxColors(WALL_CONCRETE), false);
      for (const face of [
        { side: "south", y: 0.5 },
        { side: "east", x: 0.5 },
      ] as const) {
        p.faceRect(face, -0.5, 0.5, 0, 5, shade(WALL_CONCRETE, -28));
        p.faceRect(face, -0.5, 0.5, WALL_HEIGHT - 3, WALL_HEIGHT, shade(WALL_CONCRETE, 14));
      }
      const top = WALL_HEIGHT;
      // Postes en el medio y alambre (dos hilos) a lo largo del muro.
      p.line(p.p(0, 0, top), p.p(0, 0, top + 11), WIRE, 1.5);
      const wire = (x0: number, y0: number, x1: number, y1: number) => {
        for (const z of [top + 5, top + 10]) p.line(p.p(x0, y0, z), p.p(x1, y1, z), WIRE, 1, 0.85);
        // Púas: cruces chiquitas sobre el hilo de arriba.
        for (const t of [0.25, 0.75]) {
          const px = x0 + (x1 - x0) * t;
          const py = y0 + (y1 - y0) * t;
          const point = p.p(px, py, top + 10);
          p.line({ x: point.x - 1.5, y: point.y - 1.5 }, { x: point.x + 1.5, y: point.y + 1.5 }, WIRE, 1);
          p.line({ x: point.x - 1.5, y: point.y + 1.5 }, { x: point.x + 1.5, y: point.y - 1.5 }, WIRE, 1);
        }
      };
      if (alongX || !alongY) wire(-0.5, 0, 0.5, 0);
      if (alongY) wire(0, -0.5, 0, 0.5);
    },
  };
}

const FENCE_BAR = 0x3b4046;
const FENCE_HEIGHT = 34;

/**
 * Reja de la cárcel (`TileChar.Fence`): barrotes finos entre dos travesaños, con un poste grueso al
 * medio. Se ve a través: desde la explanada de visitas se ve el patio de los presos.
 */
export function fenceSpec(alongX: boolean): PieceSpec {
  return {
    key: `fence-${alongX ? "x" : "y"}`,
    width: 1,
    height: 1,
    maxZ: FENCE_HEIGHT + 6,
    draw: (p) => {
      const at = (t: number, z: number) => (alongX ? p.p(-0.5 + t, 0, z) : p.p(0, -0.5 + t, z));
      // Base de hormigón baja.
      if (alongX) p.box(-0.5, -0.06, 0.5, 0.06, 0, 4, boxColors(WALL_CONCRETE), false);
      else p.box(-0.06, -0.5, 0.06, 0.5, 0, 4, boxColors(WALL_CONCRETE), false);
      const bars = 7;
      for (let i = 0; i < bars; i++) {
        const t = (i + 0.5) / bars;
        p.line(at(t, 4), at(t, FENCE_HEIGHT), FENCE_BAR, 1.3);
        // Punta de lanza.
        const tip = at(t, FENCE_HEIGHT + 3);
        const base = at(t, FENCE_HEIGHT);
        p.fill(FENCE_BAR, [tip, { x: base.x - 1.5, y: base.y }, { x: base.x + 1.5, y: base.y }]);
      }
      for (const z of [8, FENCE_HEIGHT - 3]) p.line(at(0, z), at(1, z), FENCE_BAR, 2);
      p.line(at(0.5, 0), at(0.5, FENCE_HEIGHT + 2), shade(FENCE_BAR, -10), 3);
    },
  };
}

export function benchSpec(facing: "south" | "east"): PieceSpec {
  return {
    key: `bench-${facing}`,
    width: 1,
    height: 1,
    maxZ: 30,
    draw: (p) => {
      const wood = boxColors(BENCH_WOOD);
      const iron = boxColors(BENCH_IRON);
      // En coordenadas "a lo largo" (a) y "a lo ancho" (b) del banco; se rotan según facing.
      const box = (a0: number, a1: number, b0: number, b1: number, z0: number, z1: number, colors: typeof wood) => {
        if (facing === "south") p.box(a0, b0, a1, b1, z0, z1, colors);
        else p.box(b0, a0, b1, a1, z0, z1, colors);
      };
      const legsAt = (b: number) => {
        box(-0.36, -0.3, b - 0.03, b + 0.03, 0, 10, iron);
        box(0.3, 0.36, b - 0.03, b + 0.03, 0, 10, iron);
      };

      legsAt(-0.12);
      // Respaldo: dos tablas sobre parantes.
      box(-0.36, -0.32, -0.24, -0.19, 10, 28, iron);
      box(0.32, 0.36, -0.24, -0.19, 10, 28, iron);
      box(-0.4, 0.4, -0.24, -0.19, 15, 20, wood);
      box(-0.4, 0.4, -0.24, -0.19, 22, 27, wood);
      // Asiento.
      box(-0.4, 0.4, -0.17, 0.17, 10, 13, wood);
      legsAt(0.12);
    },
  };
}

const STOP_FRAME = 0x3a3f46;
const STOP_ROOF = 0x2f4a5c;
const STOP_GLASS = 0xa9d3e6;
const STOP_SIGN = 0x1d5fa8;

/**
 * Parada de ómnibus: refugio con techo, vidrio atrás y a un costado, banco adentro y el poste con
 * el cartel de la parada. `facing` es hacia dónde mira (la calle): el vidrio queda del lado opuesto.
 */
export function busStopSpec(facing: "south" | "east"): PieceSpec {
  return {
    key: `bus-stop-${facing}`,
    width: 1,
    height: 1,
    maxZ: 56,
    draw: (p) => {
      // Igual que el banco: "a" a lo largo de la calle, "b" hacia la calle; se rotan según facing.
      const box = (a0: number, a1: number, b0: number, b1: number, z0: number, z1: number, colors: BoxColors) => {
        if (facing === "south") p.box(a0, b0, a1, b1, z0, z1, colors);
        else p.box(b0, a0, b1, a1, z0, z1, colors);
      };
      /** Plano b = cte (de frente a la calle). */
      const across = (b: number): Face => (facing === "south" ? { side: "south", y: b } : { side: "east", x: b });
      /** Plano a = cte (costado del refugio). */
      const along = (a: number): Face => (facing === "south" ? { side: "east", x: a } : { side: "south", y: a });
      const frame = boxColors(STOP_FRAME);

      // Vidrio de atrás y del costado (oeste o norte), con marco.
      p.faceRect(across(-0.32), -0.42, 0.42, 4, 34, STOP_GLASS, 0.45);
      p.faceRect(along(-0.42), -0.32, 0.22, 4, 34, STOP_GLASS, 0.45);
      p.faceRect(across(-0.32), -0.42, 0.42, 30, 32, STOP_FRAME);
      box(-0.44, -0.4, -0.34, -0.3, 0, 36, frame);
      box(0.4, 0.44, -0.34, -0.3, 0, 36, frame);

      // Banco adentro, contra el vidrio.
      box(-0.3, -0.27, -0.24, -0.14, 0, 10, frame);
      box(0.27, 0.3, -0.24, -0.14, 0, 10, frame);
      box(-0.34, 0.34, -0.28, -0.1, 10, 13, boxColors(BENCH_WOOD));

      // Parantes de adelante y techo.
      box(-0.44, -0.4, 0.2, 0.24, 0, 36, frame);
      box(0.4, 0.44, 0.2, 0.24, 0, 36, frame);
      box(-0.48, 0.48, -0.38, 0.3, 36, 39, boxColors(STOP_ROOF));

      // Poste con el cartel de la parada (azul, con un ómnibus blanco).
      box(0.44, 0.47, 0.38, 0.41, 0, 54, frame);
      const sign = across(0.42);
      p.faceRect(sign, 0.3, 0.5, 40, 54, STOP_SIGN);
      p.faceRect(sign, 0.34, 0.46, 44, 50, 0xffffff);
      p.faceRect(sign, 0.35, 0.45, 47, 49, STOP_SIGN);
      p.faceRect(sign, 0.36, 0.38, 43, 44, 0x1f1f22);
      p.faceRect(sign, 0.42, 0.44, 43, 44, 0x1f1f22);
    },
  };
}

/** Lo que cambia de una tienda a otra: colores y qué se ve en la vidriera. */
interface ShopStyle {
  facade: number;
  trim: number;
  glass: number;
  awning: number;
  /** Dibuja un objeto de la vidriera centrado en `u` (i = índice, para variar colores). */
  showcase: (p: IsoPainter, face: Face, u: number, i: number) => void;
}

/** Colores de las prendas que se ven en la vidriera de la ropería. */
const SHOWCASE_COLORS = [0xe63946, 0x6cace4, 0xf2b705, 0x2b3a55, 0xf1f1f1];
/** Colores de las cañas de la vidriera de la tienda de pesca (los de las cañas del catálogo). */
const ROD_COLORS = [0x8a6a45, 0x2a9d8f, 0x3a3f4c, 0xc9a227];

/** Colores de las botellas de refresco y las bolsas de garrapiñada de la vidriera del kiosco. */
const KIOSK_COLORS = [0xe63946, 0x2a9d8f, 0xf2b705, 0x6cace4];

/** Rollos de tela y pilas de ropa doblada de los mayoristas del Barrio de los Judíos. */
const WHOLESALE_COLORS = [0xe63946, 0x6cace4, 0xf2b705, 0x2b3a55, 0xb39ddb, 0xf4b6c2];
/** Championes y botas de la vidriera de la zapatería. */
const SHOE_COLORS = [0xf0f0f0, 0xc0392b, 0x6b3e1e, 0x2b2b30, 0x2a9d8f];

/** Colores de las camitas para mascotas de la vidriera de la veterinaria. */
const PET_BED_COLORS = [0xe63946, 0x6cace4, 0xf2b705, 0x2a9d8f];

const SHOP_STYLES: Record<Exclude<ShopBuilding, "none">, ShopStyle> = {
  pharmacy: {
    facade: 0xf4f6f8,
    trim: 0x2e9e5b,
    glass: 0xbfe3ee,
    awning: 0x2e9e5b,
    // Cruz verde de farmacia (pares) y cajitas de remedios de colores (impares).
    showcase: (p, face, u, i) => {
      if (i % 2 === 0) {
        p.faceRect(face, u - 0.025, u + 0.025, 10, 20, 0x2e9e5b);
        p.faceRect(face, u - 0.075, u + 0.075, 13.5, 16.5, 0x2e9e5b);
        return;
      }
      const color = [0xd7263d, 0xf2a541, 0x6cace4][i % 3];
      p.faceRect(face, u - 0.07, u + 0.01, 9, 14, color);
      p.faceRect(face, u - 0.01, u + 0.07, 9, 17, 0xf4f6f8);
      p.faceRect(face, u - 0.005, u + 0.065, 13, 14, color);
    },
  },
  pets: {
    facade: 0xe3f0e1,
    trim: 0x3f7d4f,
    glass: 0xbfe3ee,
    awning: 0xf6e7c8,
    // Huesitos (pares) y camitas de colores (impares) en la vidriera.
    showcase: (p, face, u, i) => {
      if (i % 2 === 0) {
        p.faceRect(face, u - 0.06, u + 0.06, 13, 14.5, 0xf4efe3);
        for (const end of [-0.07, 0.05]) p.faceRect(face, u + end, u + end + 0.02, 12, 16, 0xf4efe3);
        return;
      }
      const color = PET_BED_COLORS[i % PET_BED_COLORS.length];
      p.facePoly(
        face,
        [
          [u - 0.09, 9],
          [u + 0.09, 9],
          [u + 0.08, 13],
          [u - 0.08, 13],
        ],
        color,
      );
      p.faceRect(face, u - 0.06, u + 0.06, 11, 12.5, shade(color, 30));
    },
  },
  // Mayorista de ropa (Barrio de los Judíos): pilas de prendas dobladas (pares) y rollos de tela (impares).
  wholesale: {
    facade: 0xf3e6d0,
    trim: 0x8e2c48,
    glass: 0xc9dde6,
    awning: 0xf4efe3,
    showcase: (p, face, u, i) => {
      const color = WHOLESALE_COLORS[i % WHOLESALE_COLORS.length];
      if (i % 2 === 0) {
        for (let layer = 0; layer < 4; layer++) {
          p.faceRect(face, u - 0.08, u + 0.08, 7 + layer * 3, 9.5 + layer * 3, WHOLESALE_COLORS[(i + layer) % WHOLESALE_COLORS.length]);
        }
        return;
      }
      p.faceRect(face, u - 0.04, u + 0.04, 7, 22, color);
      p.faceRect(face, u - 0.04, u + 0.04, 21, 22, shade(color, -30));
    },
  },
  // Zapatería: championes en estantes, uno arriba de otro.
  shoes: {
    facade: 0xe8e4ef,
    trim: 0x3a3f8f,
    glass: 0xc9dde6,
    awning: 0xf4efe3,
    showcase: (p, face, u, i) => {
      for (const [z, shift] of [
        [8, 0],
        [16, 1],
      ]) {
        const color = SHOE_COLORS[(i + shift) % SHOE_COLORS.length];
        p.facePoly(
          face,
          [
            [u - 0.08, z],
            [u + 0.08, z],
            [u + 0.08, z + 2],
            [u - 0.02, z + 4],
            [u - 0.08, z + 4],
          ],
          color,
        );
        p.faceRect(face, u - 0.08, u + 0.08, z, z + 0.8, 0xf4efe3);
      }
    },
  },
  // Panadería: flautas y tortas fritas en canastos.
  bakery: {
    facade: 0xf6e3c6,
    trim: 0x8a5a2b,
    glass: 0xd8eef5,
    awning: 0xf4efe3,
    showcase: (p, face, u, i) => {
      p.faceRect(face, u - 0.09, u + 0.09, 7, 10, 0x8a5a2b);
      if (i % 2 === 0) {
        p.facePoly(
          face,
          [
            [u - 0.07, 10],
            [u + 0.07, 10],
            [u + 0.04, 20],
            [u - 0.02, 21],
          ],
          0xd9a35b,
        );
        return;
      }
      for (const dz of [10, 13]) p.faceRect(face, u - 0.07, u + 0.07, dz, dz + 2.5, 0xe0b06a);
    },
  },
  // Rotisería: pollos al spiedo dorándose en la vidriera.
  rotisserie: {
    facade: 0xf3d9b1,
    trim: 0xb22222,
    glass: 0xf2d2a2,
    awning: 0xffd166,
    showcase: (p, face, u, i) => {
      for (const z of [9, 16]) {
        const center = p.facePoint(face, u, z + 2);
        p.g.fillStyle(i % 2 === 0 ? 0xb8692d : 0xc77d3a, 1);
        p.g.fillEllipse(center.x, center.y, 7, 4.5);
        p.line(p.facePoint(face, u - 0.1, z + 2), p.facePoint(face, u + 0.1, z + 2), 0x5b5b60, 1);
      }
    },
  },
  clothing: {
    facade: 0xe9dcc0,
    trim: 0x2f6f5e,
    glass: 0x9fc9d9,
    awning: 0xf4efe3,
    // Prendas colgadas.
    showcase: (p, face, u, i) =>
      p.facePoly(
        face,
        [
          [u - 0.08, 20],
          [u + 0.08, 20],
          [u + 0.06, 11],
          [u - 0.06, 11],
        ],
        SHOWCASE_COLORS[i % SHOWCASE_COLORS.length],
      ),
  },
  fishing: {
    facade: 0xdfe8ee,
    trim: 0x1d4f7a,
    glass: 0xa9d6e5,
    awning: 0xffffff,
    // Cañas apoyadas en diagonal con el reel abajo, y un pez colgado en las pares.
    showcase: (p, face, u, i) => {
      const color = ROD_COLORS[i % ROD_COLORS.length];
      p.facePoly(
        face,
        [
          [u - 0.07, 7],
          [u - 0.04, 7],
          [u + 0.08, 24],
          [u + 0.06, 24],
        ],
        color,
      );
      p.faceRect(face, u - 0.06, u - 0.01, 9, 11.5, 0x2b2b30);
      if (i % 2 === 0) {
        p.facePoly(
          face,
          [
            [u + 0.02, 17],
            [u + 0.1, 15],
            [u + 0.02, 13],
          ],
          0xb8c4cc,
        );
      }
    },
  },
  stm: {
    facade: 0xf4f6f8,
    trim: 0x1d6fb8,
    glass: 0xbfe3ee,
    awning: 0x1d6fb8,
    // Boletos en la vidriera: tarjetitas blancas con la franja azul o verde.
    showcase: (p, face, u, i) => {
      p.faceRect(face, u - 0.08, u + 0.08, 10, 19, 0xffffff);
      p.faceRect(face, u - 0.08, u + 0.08, 16, 19, i % 2 === 0 ? 0x1d6fb8 : 0x2e9e5b);
    },
  },
  kiosk: {
    facade: 0xf6e7c8,
    trim: 0xc1440e,
    glass: 0xbfe3ee,
    awning: 0xffd166,
    // Botellas de refresco (pares) y bolsitas de garrapiñada (impares) en el estante.
    showcase: (p, face, u, i) => {
      const color = KIOSK_COLORS[i % KIOSK_COLORS.length];
      if (i % 2 === 0) {
        p.faceRect(face, u - 0.04, u + 0.04, 9, 18, color);
        p.faceRect(face, u - 0.02, u + 0.02, 18, 21, shade(color, -25));
      } else {
        p.facePoly(
          face,
          [
            [u - 0.07, 9],
            [u + 0.07, 9],
            [u + 0.05, 17],
            [u - 0.05, 17],
          ],
          0xb87333,
        );
        p.faceRect(face, u - 0.05, u + 0.05, 17, 18.5, color);
      }
    },
  },
};

/**
 * Tienda de 2×2 tiles: vidrieras con lo que vende (según `SHOP_STYLES`), toldo a rayas, puerta,
 * cartel y planta alta con balcones.
 */
export function shopBuildingSpec(building: Exclude<ShopBuilding, "none">): PieceSpec {
  const style = SHOP_STYLES[building];
  return {
    key: `shop-${building}`,
    width: 2,
    height: 2,
    maxZ: 60,
    draw: (p) => {
      p.box(-0.5, -0.5, 1.5, 1.5, 0, 54, boxColors(style.facade, shade(style.facade, -40)));

      const faces = [
        { side: "south", y: 1.5 },
        { side: "east", x: 1.5 },
      ] as const;
      for (const face of faces) {
        p.faceRect(face, -0.5, 1.5, 0, 4, shade(style.trim, -15));

        // Vidrieras (la puerta va en el centro de la cara sur).
        const windows: Array<[number, number]> = face.side === "south" ? [[-0.38, 0.32], [0.68, 1.38]] : [[-0.38, 1.38]];
        windows.forEach(([u0, u1], w) => {
          p.faceRect(face, u0 - 0.04, u1 + 0.04, 4, 27, style.trim);
          p.faceRect(face, u0, u1, 6, 25, style.glass);
          const count = Math.max(2, Math.round((u1 - u0) / 0.28));
          for (let i = 0; i < count; i++) {
            const u = u0 + ((i + 0.5) * (u1 - u0)) / count;
            style.showcase(p, face, u, i + w * 2 + (face.side === "east" ? 3 : 0));
          }
          p.faceRect(face, u0, u1, 22.5, 23.5, 0x5b5b60);
        });
        if (face.side === "south") p.faceArch(face, 0.38, 0.62, 4, 26, 0x4a3426);

        // Cartel y toldo a rayas sobre la planta baja.
        p.faceRect(face, -0.3, 1.3, 31, 38, style.trim);
        p.faceRect(face, -0.2, 1.2, 33.5, 35.5, 0xf4efe3, 0.85);
        const stripes = 8;
        for (let i = 0; i < stripes; i++) {
          const u0 = -0.5 + (i * 2) / stripes;
          const u1 = u0 + 2 / stripes;
          p.faceRect(face, u0, u1, 27, 30.5, i % 2 === 0 ? style.trim : style.awning);
        }

        // Planta alta: ventanas con balcón.
        p.windows(face, -0.45, 1.45, 40, 52, 3, 1, { color: 0x2b3442, widthRatio: 0.35, heightRatio: 0.8, shutters: style.trim });
        p.faceRect(face, -0.5, 1.5, 50, 53, shade(style.facade, 15));
      }
    },
  };
}
