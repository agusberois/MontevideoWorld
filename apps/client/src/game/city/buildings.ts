import { shade } from "../color";
import type { ShopBuilding } from "@montevideo-world/shared";
import { BoxColors, Face, IsoPainter, Vec2, boxColors } from "./IsoPainter";

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

export function benchSpec(facing: "south" | "east", pair?: "start" | "end"): PieceSpec {
  // Banco doble: cada mitad se estira hasta el borde que comparte con la otra (sin patas ahí).
  const a0 = pair === "end" ? -0.5 : -0.4;
  const a1 = pair === "start" ? 0.5 : 0.4;
  return {
    key: `bench-${facing}-${pair ?? "single"}`,
    width: 1,
    height: 1,
    maxZ: 30,
    draw: (p) => {
      const wood = boxColors(BENCH_WOOD);
      const iron = boxColors(BENCH_IRON);
      // En coordenadas "a lo largo" (a) y "a lo ancho" (b) del banco; se rotan según facing.
      const box = (x0: number, x1: number, b0: number, b1: number, z0: number, z1: number, colors: typeof wood) => {
        if (facing === "south") p.box(x0, b0, x1, b1, z0, z1, colors);
        else p.box(b0, x0, b1, x1, z0, z1, colors);
      };
      const legsAt = (b: number) => {
        if (pair !== "end") box(-0.36, -0.3, b - 0.03, b + 0.03, 0, 10, iron);
        if (pair !== "start") box(0.3, 0.36, b - 0.03, b + 0.03, 0, 10, iron);
      };

      legsAt(-0.12);
      // Respaldo: dos tablas sobre parantes.
      if (pair !== "end") box(-0.36, -0.32, -0.24, -0.19, 10, 28, iron);
      if (pair !== "start") box(0.32, 0.36, -0.24, -0.19, 10, 28, iron);
      box(a0, a1, -0.24, -0.19, 15, 20, wood);
      box(a0, a1, -0.24, -0.19, 22, 27, wood);
      // Asiento.
      box(a0, a1, -0.17, 0.17, 10, 13, wood);
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
  // Café (el Facal): tazas sobre el mostrador (pares) y medialunas apiladas (impares), toldo bordó.
  cafe: {
    facade: 0xefe2c8,
    trim: 0x6d1f2a,
    glass: 0xf2dcb3,
    awning: 0xf4efe3,
    showcase: (p, face, u, i) => {
      p.faceRect(face, u - 0.09, u + 0.09, 7, 9, 0x5a3a24);
      if (i % 2 === 0) {
        p.faceRect(face, u - 0.05, u + 0.05, 9, 14, 0xf8f4ea);
        p.faceRect(face, u - 0.05, u + 0.05, 13, 14, 0x6b3e1e);
        p.faceRect(face, u + 0.05, u + 0.08, 10.5, 12.5, 0xf8f4ea);
        return;
      }
      for (const dz of [9, 12, 15]) {
        const center = p.facePoint(face, u, dz + 1);
        p.g.fillStyle(0xd99a4e, 1);
        p.g.fillEllipse(center.x, center.y, 6, 2.6);
      }
    },
  },
  // Mercado de los Artesanos: mates con bombilla (pares) y ponchos y gorros tejidos colgados (impares).
  crafts: {
    facade: 0xe7d3b3,
    trim: 0x2f5d4a,
    glass: 0xe9dcc0,
    awning: 0xc1440e,
    showcase: (p, face, u, i) => {
      if (i % 2 === 0) {
        const cup = p.facePoint(face, u, 11);
        p.g.fillStyle(0x7a5230, 1);
        p.g.fillEllipse(cup.x, cup.y, 7, 8);
        p.line(p.facePoint(face, u + 0.01, 13), p.facePoint(face, u + 0.05, 20), 0xc9c9cf, 1.2);
        return;
      }
      const color = WHOLESALE_COLORS[i % WHOLESALE_COLORS.length];
      p.facePoly(
        face,
        [
          [u - 0.09, 21],
          [u + 0.09, 21],
          [u + 0.07, 10],
          [u, 8],
          [u - 0.07, 10],
        ],
        color,
      );
      for (const z of [13, 17]) p.faceRect(face, u - 0.08, u + 0.08, z, z + 1, shade(color, 40));
    },
  },
  // Casa de Música: guitarras colgadas (pares) y bandoneones / tambores (impares) en la vidriera.
  music: {
    facade: 0xe3e0ea,
    trim: 0x3b2f6b,
    glass: 0xd8eef5,
    awning: 0xf2c94c,
    showcase: (p, face, u, i) => {
      if (i % 2 === 0) {
        p.faceRect(face, u - 0.012, u + 0.012, 15, 23, 0x5a3b1e);
        const body = p.facePoint(face, u, 11);
        p.g.fillStyle(0xb5651d, 1);
        p.g.fillEllipse(body.x, body.y, 7, 8);
        p.g.fillEllipse(body.x, body.y - 4.5, 5.5, 5);
        p.g.fillStyle(0x2b1a10, 1);
        p.g.fillCircle(body.x, body.y - 3, 1.2);
        return;
      }
      if (i % 4 === 1) {
        p.faceRect(face, u - 0.08, u - 0.04, 9, 17, 0x2b2b30);
        p.faceRect(face, u + 0.04, u + 0.08, 9, 17, 0x2b2b30);
        for (let k = 0; k < 4; k++) p.faceRect(face, u - 0.04 + k * 0.02, u - 0.03 + k * 0.02, 9.5, 16.5, 0xf4efe3);
        return;
      }
      p.facePoly(
        face,
        [
          [u - 0.06, 7],
          [u + 0.06, 7],
          [u + 0.07, 18],
          [u - 0.07, 18],
        ],
        0xc0392b,
      );
      p.faceRect(face, u - 0.07, u + 0.07, 17.5, 19, 0xf2e6cf);
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

const INNER_WALL = 0xefe6d6;
const INNER_TILES = 0x5fb3c9;
const INNER_WALL_HEIGHT = 40;
const JACUZZI_STONE = 0xd8d0c2;
const JACUZZI_WATER = 0x5ec4e0;

/**
 * Pared de adentro (las Termas, `TileChar.InnerWall`): revoque claro con zócalo de azulejos
 * celestes. Sólo hay paredes al norte y al oeste, así que se ven sus caras de adentro (sur y este).
 * Con `door`, en la cara que da a la sala va una puerta de madera (la salida).
 */
/** Qué parte de una puerta cae en este tile de pared: una simple, o la mitad norte / sur de una doble. */
export type InnerDoorPart = "single" | "start" | "end";

/** Colores de la pared de un interior (`InteriorStyle`, ya como números); sin estilo, cal y azulejos. */
export interface InnerWallStyle {
  id: string;
  wall: number;
  base: number;
  trim: number;
  neon?: number;
}

const DEFAULT_INNER_WALL: InnerWallStyle = { id: "default", wall: INNER_WALL, base: INNER_TILES, trim: shade(INNER_WALL, -12) };

export function innerWallSpec(door: InnerDoorPart | null, style: InnerWallStyle = DEFAULT_INNER_WALL): PieceSpec {
  return {
    key: `inner-wall-${style.id}-${door ?? "plain"}`,
    width: 1,
    height: 1,
    maxZ: INNER_WALL_HEIGHT + 4,
    draw: (p) => {
      p.box(-0.5, -0.5, 0.5, 0.5, 0, INNER_WALL_HEIGHT, boxColors(style.wall), false);
      for (const face of [
        { side: "south", y: 0.5 },
        { side: "east", x: 0.5 },
      ] as const) {
        p.faceRect(face, -0.5, 0.5, 0, 14, style.base);
        p.faceRect(face, -0.5, 0.5, 14, 15.5, shade(style.base, -25));
        p.faceRect(face, -0.5, 0.5, INNER_WALL_HEIGHT - 2, INNER_WALL_HEIGHT, style.trim);
        if (style.neon !== undefined && !door) {
          // Tubo de neón con su resplandor.
          p.faceRect(face, -0.5, 0.5, 25, 29, style.neon, 0.25);
          p.faceRect(face, -0.5, 0.5, 26.3, 27.7, style.neon);
        }
      }
      const east = { side: "east", x: 0.5 } as const;
      if (door === "single") {
        p.faceArch(east, -0.32, 0.32, 0, 30, DOOR_COLOR);
        p.faceRect(east, -0.02, 0.02, 2, 26, shade(DOOR_COLOR, -20));
        p.faceRect(east, -0.38, 0.38, 31, 34, 0xe2b53e);
      } else if (door) {
        // Puerta doble de dos tiles: cada tile dibuja una hoja (con vidrio y su manija junto al medio),
        // el marco dorado de su lado y la mitad del cartel verde de "salida" arriba.
        const [outer, seam] = door === "start" ? [-0.38, 0.5] : [0.38, -0.5];
        const [u0, u1] = [Math.min(outer, seam), Math.max(outer, seam)];
        p.faceRect(east, u0, u1, 0, 32, DOOR_COLOR);
        const inset = (u: number, by: number) => (u < 0 ? u + by : u - by);
        p.faceRect(east, Math.min(inset(outer, 0.1), inset(seam, 0.1)), Math.max(inset(outer, 0.1), inset(seam, 0.1)), 12, 28, 0xa9d6e5, 0.85);
        p.faceRect(east, Math.min(inset(outer, 0.1), inset(seam, 0.1)), Math.max(inset(outer, 0.1), inset(seam, 0.1)), 4, 9, shade(DOOR_COLOR, -15));
        p.faceRect(east, inset(seam, 0.09) - 0.02, inset(seam, 0.09) + 0.02, 14, 22, 0xe2b53e);
        p.faceRect(east, seam - 0.015, seam + 0.015, 0, 32, shade(DOOR_COLOR, -30));
        p.faceRect(east, outer < 0 ? outer - 0.06 : outer, outer < 0 ? outer : outer + 0.06, 0, 35, 0xe2b53e);
        p.faceRect(east, u0 - (outer < 0 ? 0.06 : 0), u1 + (outer > 0 ? 0.06 : 0), 32, 35, 0xe2b53e);
        const sign = door === "start" ? [0.15, 0.5] : [-0.5, -0.15];
        p.faceRect(east, sign[0], sign[1], 35.5, 39.5, 0x1f8a4c);
        p.faceRect(east, sign[0] + (door === "start" ? 0.08 : 0), sign[1] - (door === "end" ? 0.08 : 0), 37, 38, 0xffffff, 0.9);
      }
    },
  };
}

const STAIR_MARBLE = 0xece6da;
const STAIR_GOLD = 0xe2b53e;
const STAIR_HOLE = 0x2b2622;
/** Escalones de la escalera del hotel y altura de cada uno al subir (llega justo al borde de la pared). */
const STAIR_STEPS = 8;
const STAIR_RISE = INNER_WALL_HEIGHT / STAIR_STEPS;
/** Al bajar (el hueco del piso de arriba) los escalones son bajitos: casi todo el hueco se ve. */
const STAIR_DROP = 4;
const RAIL_HEIGHT = 14;

/**
 * La escalera entre los pisos del Hotel del Donador (`Door.stairs`), en un área de 2 × 2 contra la
 * pared norte. `up`: escalones de mármol que suben hacia el norte hasta el borde de la pared, con
 * baranda y pasamanos dorados del lado este. `down` (el piso de arriba): el hueco en el piso con los
 * escalones que bajan hacia el norte, sus paredes de adentro y la misma baranda.
 */
export function stairsSpec(direction: "up" | "down"): PieceSpec {
  return {
    key: `stairs-${direction}`,
    width: 2,
    height: 2,
    maxZ: direction === "up" ? INNER_WALL_HEIGHT + RAIL_HEIGHT + 4 : RAIL_HEIGHT + 4,
    draw: (p) => (direction === "up" ? drawStairsUp(p) : drawStairsDown(p)),
  };
}

const STAIR_X0 = -0.45;
const STAIR_X1 = 1.45;
const STAIR_SOUTH = 1.45;
const STAIR_NORTH = -0.5;
const STAIR_DEPTH = (STAIR_SOUTH - STAIR_NORTH) / STAIR_STEPS;

function drawStairsUp(p: IsoPainter) {
  // Del escalón de más atrás (el más alto, contra la pared) al de adelante: así cada uno tapa al de atrás.
  for (let i = STAIR_STEPS - 1; i >= 0; i--) {
    const front = STAIR_SOUTH - i * STAIR_DEPTH;
    const back = front - STAIR_DEPTH;
    const top = (i + 1) * STAIR_RISE;
    p.box(STAIR_X0, back, STAIR_X1, front, 0, top, boxColors(shade(STAIR_MARBLE, i % 2 === 0 ? 0 : -4), shade(STAIR_MARBLE, 8)));
    // La nariz del escalón, apenas más oscura.
    p.line(p.p(STAIR_X0, front, top), p.p(STAIR_X1, front, top), shade(STAIR_MARBLE, -22), 1);
  }
  drawStairRail(p, (i) => (i + 1) * STAIR_RISE);
}

function drawStairsDown(p: IsoPainter) {
  // El hueco en la pantalla (el rombo del área en el piso): lo de adentro se recorta a esto, porque
  // lo hondo se dibuja más abajo y si no asomaría por debajo del piso de adelante.
  const hole = [p.p(STAIR_X0, STAIR_NORTH), p.p(STAIR_X1, STAIR_NORTH), p.p(STAIR_X1, STAIR_SOUTH), p.p(STAIR_X0, STAIR_SOUTH)];
  const deepest = STAIR_STEPS * STAIR_DROP + 30;
  const clipped = (points: Vec2[]) => clipConvex(points, hole);
  p.fill(STAIR_HOLE, hole);
  // Las paredes de adentro que se ven (la del oeste y la del norte), oscuras.
  p.fill(shade(STAIR_HOLE, 18), clipped([p.p(STAIR_X0, STAIR_NORTH, 0), p.p(STAIR_X0, STAIR_SOUTH, 0), p.p(STAIR_X0, STAIR_SOUTH, -deepest), p.p(STAIR_X0, STAIR_NORTH, -deepest)]));
  p.fill(shade(STAIR_HOLE, 8), clipped([p.p(STAIR_X0, STAIR_NORTH, 0), p.p(STAIR_X1, STAIR_NORTH, 0), p.p(STAIR_X1, STAIR_NORTH, -deepest), p.p(STAIR_X0, STAIR_NORTH, -deepest)]));
  // Los escalones bajan hacia el norte: primero los más hondos (atrás), después los de adelante.
  for (let i = STAIR_STEPS - 1; i >= 0; i--) {
    const front = STAIR_SOUTH - i * STAIR_DEPTH;
    const back = front - STAIR_DEPTH;
    const z = -(i + 1) * STAIR_DROP;
    // Más oscuros cuanto más hondos (llega menos luz).
    const color = shade(STAIR_MARBLE, -10 - i * 9);
    const tread = clipped([p.p(STAIR_X0, back, z), p.p(STAIR_X1, back, z), p.p(STAIR_X1, front, z), p.p(STAIR_X0, front, z)]);
    if (tread.length >= 3) p.fill(color, tread);
    const nose = clipped([p.p(STAIR_X0, back, z), p.p(STAIR_X1, back, z), p.p(STAIR_X1, back, z - 1.2), p.p(STAIR_X0, back, z - 1.2)]);
    if (nose.length >= 3) p.fill(shade(color, -25), nose);
  }
  p.outline(hole, 0.35);
  // El borde de mármol del hueco, al ras del piso.
  p.line(p.p(STAIR_X0, STAIR_SOUTH), p.p(STAIR_X1, STAIR_SOUTH), shade(STAIR_MARBLE, -15), 2);
  p.line(p.p(STAIR_X1, STAIR_NORTH), p.p(STAIR_X1, STAIR_SOUTH), shade(STAIR_MARBLE, -15), 2);
  drawStairRail(p, () => 0);
}

/** Baranda del lado este: un balaustre por escalón y el pasamanos dorado arriba (`base(i)`: altura del escalón). */
function drawStairRail(p: IsoPainter, base: (step: number) => number) {
  const x = STAIR_X1 - 0.06;
  const at = (i: number) => STAIR_SOUTH - (i + 0.5) * STAIR_DEPTH;
  for (let i = 0; i < STAIR_STEPS; i++) {
    p.line(p.p(x, at(i), base(i)), p.p(x, at(i), base(i) + RAIL_HEIGHT), shade(STAIR_GOLD, -25), 1.4);
  }
  for (let i = 0; i < STAIR_STEPS - 1; i++) {
    p.line(p.p(x, at(i), base(i) + RAIL_HEIGHT), p.p(x, at(i + 1), base(i + 1) + RAIL_HEIGHT), STAIR_GOLD, 2.4);
  }
  // Pilar del arranque, con su remate.
  p.box(x - 0.06, STAIR_SOUTH - 0.12, x + 0.06, STAIR_SOUTH, base(0), base(0) + RAIL_HEIGHT + 3, boxColors(STAIR_GOLD));
}

/** Recorta un polígono a otro convexo (Sutherland–Hodgman, en coordenadas de pantalla). */
function clipConvex(subject: Vec2[], clip: Vec2[]): Vec2[] {
  // Orientación del recorte, para saber de qué lado de cada borde queda "adentro".
  let area = 0;
  for (let i = 0; i < clip.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    area += a.x * b.y - b.x * a.y;
  }
  const sign = Math.sign(area) || 1;
  let output = subject;
  for (let i = 0; i < clip.length && output.length > 0; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const inside = (q: Vec2) => sign * ((b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x)) >= 0;
    const cross = (q: Vec2, r: Vec2): Vec2 => {
      const dx = r.x - q.x;
      const dy = r.y - q.y;
      const ex = b.x - a.x;
      const ey = b.y - a.y;
      const t = (ex * (q.y - a.y) - ey * (q.x - a.x)) / (ey * dx - ex * dy);
      return { x: q.x + dx * t, y: q.y + dy * t };
    };
    const input = output;
    output = [];
    for (let k = 0; k < input.length; k++) {
      const current = input[k];
      const previous = input[(k + input.length - 1) % input.length];
      if (inside(current)) {
        if (!inside(previous)) output.push(cross(previous, current));
        output.push(current);
      } else if (inside(previous)) {
        output.push(cross(previous, current));
      }
    }
  }
  return output;
}

/**
 * Jacuzzi termal de `size` × `size` (el spa del Hotel del Donador): borde bajo de piedra clara y el agua celeste adentro, con
 * reflejos. Es bajo: se dibuja detrás de los avatares (los que se meten se ven por encima, con el
 * agua por delante, `Avatar.setBathing`).
 */
export function jacuzziSpec(size = 3): PieceSpec {
  const e = size - 0.55;
  const w = size - 0.8;
  return {
    key: `jacuzzi-${size}`,
    width: size,
    height: size,
    maxZ: 12,
    draw: (p) => {
      // Borde de mármol con una franja dorada y el agua celeste con reflejos y burbujas.
      p.box(-0.45, -0.45, e, e, 0, 8, boxColors(JACUZZI_STONE));
      p.box(-0.45, -0.45, e, e, 8, 9, boxColors(0xd4a52c));
      p.fill(JACUZZI_WATER, [p.p(-0.2, -0.2, 8), p.p(w, -0.2, 8), p.p(w, w, 8), p.p(-0.2, w, 8)]);
      p.fill(shade(JACUZZI_WATER, 18), [p.p(0.1, 0.1, 8), p.p(size * 0.45, 0.1, 8), p.p(size * 0.2, size * 0.3, 8), p.p(0.1, size * 0.2, 8)], 0.6);
      for (let i = 0; i < size * 2; i++) {
        const c = p.p(((i * 7) % (size * 10)) / 10 + 0.2, ((i * 13) % (size * 10)) / 10 + 0.2, 8);
        p.g.lineStyle(1, 0xffffff, 0.6);
        p.g.strokeEllipse(c.x, c.y, 12, 5);
      }
    },
  };
}

/** Fachadas coloniales: cal blanca y pasteles de época (ocre, salmón, terracota, celeste, verde agua). */
const COLONIAL_COLORS = [0xf4efe4, 0xe9d3a6, 0xe8b9a0, 0xc98c6b, 0xb7cfd6, 0xbfd3b6, 0xf0dca8, 0xe6c7c0];
const COLONIAL_SHUTTERS = [0x3f6b4f, 0x5a3e2b, 0x2f4f6b];
const TILE_ROOF = 0xa24b2e;
const IRON_WORK = 0x262626;

/**
 * Casa colonial del casco viejo (relleno de 2 × 2, `Filler`), como las del 1800: de 1 a 3 pisos, cal
 * de color con zócalo y cornisa moldurada, ventanas altas y angostas (con reja en planta baja y
 * balconcito de hierro arriba), el portón del zaguán con arco y, arriba, azotea con pretil y
 * balaustrada, techo de tejas o, en algunas, el mirador.
 */
export function bigHouseSpec(x: number, y: number): PieceSpec {
  const hash = tileHash(x, y, 5);
  const floors = 1 + (hash % 3);
  const colorIndex = (hash >>> 4) % COLONIAL_COLORS.length;
  const shutterIndex = (hash >>> 8) % COLONIAL_SHUTTERS.length;
  /** 0: azotea con balaustrada, 1: techo de tejas a cuatro aguas, 2: azotea con mirador. */
  const roof = (hash >>> 10) % 3;
  const height = 6 + floors * 22;

  return {
    key: `colonial-${floors}-${colorIndex}-${shutterIndex}-${roof}`,
    width: 2,
    height: 2,
    maxZ: height + (roof === 1 ? 20 : roof === 2 ? 26 : 8),
    draw: (p) => {
      const facade = COLONIAL_COLORS[colorIndex];
      const shutters = COLONIAL_SHUTTERS[shutterIndex];
      p.box(-0.45, -0.45, 1.45, 1.45, 0, height, boxColors(facade, shade(facade, -8)));
      for (const face of [
        { side: "south", y: 1.45 },
        { side: "east", x: 1.45 },
      ] as const) {
        // Zócalo y pilastras en las esquinas.
        p.faceRect(face, -0.45, 1.45, 0, 5, shade(facade, -28));
        p.faceRect(face, -0.45, -0.33, 5, height, shade(facade, 10));
        p.faceRect(face, 1.33, 1.45, 5, height, shade(facade, 10));
        // Cornisa moldurada (dos líneas) y una moldura entre pisos.
        p.faceRect(face, -0.45, 1.45, height - 7, height - 4, shade(facade, 18));
        p.faceRect(face, -0.45, 1.45, height - 3, height - 1, shade(facade, -12));
        for (let floor = 0; floor < floors; floor++) {
          const z0 = 5 + floor * 22;
          if (floor > 0) p.faceRect(face, -0.33, 1.33, z0 - 1.5, z0, shade(facade, 12));
          if (floor === 0 && face.side === "south") {
            // Portón del zaguán con arco y una ventana enrejada al costado.
            p.faceArch(face, 0.05, 0.5, 0, 19, DOOR_COLOR);
            p.faceRect(face, 0.27, 0.28, 2, 15, shade(DOOR_COLOR, -25));
            p.faceRect(face, 0.85, 1.2, 5, 18, WINDOW_COLOR);
            for (let u = 0.89; u < 1.2; u += 0.07) p.faceRect(face, u, u + 0.015, 5, 18, IRON_WORK);
            continue;
          }
          // Ventanas altas y angostas con postigos; en planta baja con reja, arriba con balconcito.
          p.windows(face, -0.33, 1.33, z0 + 2, z0 + 20, 3, 1, {
            color: WINDOW_COLOR,
            widthRatio: 0.34,
            heightRatio: 0.8,
            arched: floor === floors - 1 && (hash & 1) === 1,
            shutters,
            balcony: floor > 0 ? IRON_WORK : undefined,
          });
          if (floor === 0) {
            for (const [u0, u1] of [
              [-0.17, 0.11],
              [0.39, 0.67],
              [0.95, 1.23],
            ]) {
              for (let u = u0; u < u1; u += 0.07) p.faceRect(face, u, u + 0.015, z0 + 4, z0 + 18, IRON_WORK);
            }
          }
        }
      }
      if (roof === 1) {
        // Techo de tejas a cuatro aguas.
        p.pyramid(-0.5, -0.5, 1.5, 1.5, height, height + 18, TILE_ROOF, shade(TILE_ROOF, -18));
        return;
      }
      // Azotea con pretil y balaustrada (columnitas) sobre la cornisa.
      p.box(-0.45, -0.45, 1.45, -0.37, height, height + 6, boxColors(shade(facade, 6)));
      p.box(-0.45, -0.37, -0.37, 1.45, height, height + 6, boxColors(shade(facade, 6)));
      for (const face of [
        { side: "south", y: 1.45 },
        { side: "east", x: 1.45 },
      ] as const) {
        p.faceRect(face, -0.45, 1.45, height, height + 1.5, shade(facade, 14));
        for (let u = -0.35; u < 1.4; u += 0.12) p.faceRect(face, u, u + 0.05, height + 1.5, height + 5, shade(facade, 4));
        p.faceRect(face, -0.45, 1.45, height + 5, height + 6.5, shade(facade, 14));
      }
      if (roof === 2) {
        // Mirador: torrecita con ventanas en arco y techito de tejas.
        p.box(0.2, 0.2, 0.8, 0.8, height, height + 16, boxColors(facade));
        for (const face of [
          { side: "south", y: 0.8 },
          { side: "east", x: 0.8 },
        ] as const) {
          p.windows(face, 0.24, 0.76, height + 3, height + 14, 2, 1, { color: WINDOW_COLOR, arched: true, widthRatio: 0.5, heightRatio: 0.85 });
        }
        p.pyramid(0.15, 0.15, 0.85, 0.85, height + 16, height + 25, TILE_ROOF, shade(TILE_ROOF, -18));
      }
    },
  };
}

/** Piedra y revoques de los edificios de principios del 1900 (eclécticos, art nouveau). */
const ECLECTIC_COLORS = [0xe6dcc8, 0xd8c7a6, 0xcbb38f, 0xe3d2bf, 0xc9b9a5, 0xd6cab0];
const MANSARD = 0x5d6b78;

/**
 * Edificio de principios del 1900 (relleno de 2 × 2 del Centro, al este de Florida): de 4 a 7 pisos
 * de piedra clara, basamento con locales, balcones de hierro, pilastras, cornisa y, a veces, mansarda
 * de pizarra con lucarnas. Nada de vidrio: es el Montevideo del 900.
 */
export function bigTowerSpec(x: number, y: number): PieceSpec {
  const hash = tileHash(x, y, 6);
  const floors = 4 + (hash % 4);
  const colorIndex = (hash >>> 4) % ECLECTIC_COLORS.length;
  const mansard = ((hash >>> 8) & 1) === 1;
  const height = 14 + floors * 17;

  return {
    key: `eclectic-${floors}-${colorIndex}-${mansard ? 1 : 0}`,
    width: 2,
    height: 2,
    maxZ: height + (mansard ? 20 : 8),
    draw: (p) => {
      const stone = ECLECTIC_COLORS[colorIndex];
      p.box(-0.42, -0.42, 1.42, 1.42, 0, height, boxColors(stone, shade(stone, -10)));
      for (const face of [
        { side: "south", y: 1.42 },
        { side: "east", x: 1.42 },
      ] as const) {
        // Basamento con vidrieras de locales bajo arcos.
        p.faceRect(face, -0.42, 1.42, 0, 14, shade(stone, -26));
        p.windows(face, -0.35, 1.35, 1, 13, 3, 1, { color: WINDOW_COLOR, arched: true, widthRatio: 0.7, heightRatio: 0.9 });
        p.faceRect(face, -0.42, 1.42, 14, 16, shade(stone, 14));
        for (let floor = 0; floor < floors; floor++) {
          const z0 = 16 + floor * 17;
          p.windows(face, -0.36, 1.36, z0, z0 + 16, 4, 1, {
            color: WINDOW_COLOR,
            widthRatio: 0.4,
            heightRatio: 0.7,
            arched: floor === floors - 1,
            balcony: floor % 2 === 0 ? IRON_WORK : undefined,
          });
        }
        for (const u of [-0.42, 0.5, 1.36]) p.faceRect(face, u, u + 0.06, 16, height - 4, shade(stone, 12));
        p.faceRect(face, -0.42, 1.42, height - 5, height - 2, shade(stone, 18));
      }
      p.box(-0.46, -0.46, 1.46, 1.46, height, height + 3, boxColors(shade(stone, 12)));
      if (mansard) {
        p.pyramid(-0.38, -0.38, 1.38, 1.38, height + 3, height + 19, MANSARD, shade(MANSARD, -14));
        for (const [u, v] of [
          [0.5, 1.2],
          [1.2, 0.5],
        ]) {
          const c = p.p(u, v, height + 9);
          p.g.fillStyle(0xe8e2d4, 1).fillRect(c.x - 3, c.y - 5, 6, 6);
          p.g.fillStyle(WINDOW_COLOR, 1).fillRect(c.x - 2, c.y - 4, 4, 4);
        }
      } else {
        p.box(-0.42, -0.42, 1.42, -0.34, height + 3, height + 7, boxColors(shade(stone, 6)));
        p.box(-0.42, -0.34, -0.34, 1.42, height + 3, height + 7, boxColors(shade(stone, 6)));
      }
    },
  };
}

/** Colores de los barcos pesqueros del puerto: casco, franja y cabina. */
const BOAT_COLORS: ReadonlyArray<readonly [number, number, number]> = [
  [0xc0392b, 0xf4f1ea, 0xf4f1ea],
  [0x1f5fa8, 0xf2c94c, 0xf4f1ea],
  [0x2a9d8f, 0xf4f1ea, 0xe8e2d4],
  [0xf4f1ea, 0xc0392b, 0xf4f1ea],
  [0x264653, 0xe76f51, 0xf4f1ea],
  [0xe9b10a, 0x1f5fa8, 0xf4f1ea],
];

/**
 * Barco pesquero (la bahía de Montevideo), dibujado en 2 × 2 y escalado a 3 × 3: casco con proa en punta y franja de
 * color, cabina blanca con ventanas a popa, mástil con los cables, las redes amontonadas en cubierta,
 * una boya naranja y la banderita. `facing` = hacia dónde apunta la proa.
 */
export function boatSpec(variant: number, facing: "east" | "south"): PieceSpec {
  const [hull, stripe, cabin] = BOAT_COLORS[variant % BOAT_COLORS.length];
  return {
    key: `boat-${variant % BOAT_COLORS.length}-${facing}`,
    width: 2,
    height: 2,
    maxZ: 62,
    // Ocupa 3 × 3 tiles en el mapa: al lado de las casas de 2 × 2, un pesquero chico se perdía.
    scale: 1.5,
    draw: (p) => {
      // En coordenadas del barco: a = a lo largo (de popa, -0.4, a proa, 1.4), b = a lo ancho.
      const at = (a: number, b: number, z: number) => (facing === "east" ? p.p(a, b, z) : p.p(b, a, z));
      const box = (a0: number, a1: number, b0: number, b1: number, z0: number, z1: number, color: number) => {
        if (facing === "east") p.box(a0, b0, a1, b1, z0, z1, boxColors(color));
        else p.box(b0, a0, b1, a1, z0, z1, boxColors(color));
      };
      const b0 = 0.2;
      const b1 = 0.8;
      const g = p.g;
      // Sombra en el agua.
      g.fillStyle(0x000000, 0.18);
      g.fillPoints([at(-0.45, b0 - 0.05, 0), at(1.1, b0 - 0.05, 0), at(1.5, 0.5, 0), at(1.1, b1 + 0.05, 0), at(-0.45, b1 + 0.05, 0)], true);
      // Casco: la parte recta y la proa en punta.
      box(-0.4, 1.0, b0, b1, 0, 9, hull);
      p.fill(shade(hull, -10), [at(1.0, b0, 0), at(1.4, 0.5, 2), at(1.0, b1, 0)]);
      p.fill(shade(hull, -6), [at(1.0, b1, 0), at(1.4, 0.5, 2), at(1.4, 0.5, 11), at(1.0, b1, 9)]);
      p.fill(shade(hull, 8), [at(1.0, b0, 9), at(1.4, 0.5, 11), at(1.0, b1, 9)]);
      // Franja de color y línea de flotación.
      p.fill(stripe, [at(-0.4, b1, 6), at(1.0, b1, 6), at(1.0, b1, 8), at(-0.4, b1, 8)]);
      p.fill(0x1b1b1f, [at(-0.4, b1, 0), at(1.0, b1, 0), at(1.0, b1, 1.6), at(-0.4, b1, 1.6)]);
      // Cubierta, cabina con ventanas a popa y las redes.
      box(-0.35, 0.95, b0 + 0.04, b1 - 0.04, 9, 9.6, 0x9c7a55);
      box(-0.3, 0.25, b0 + 0.1, b1 - 0.1, 9.6, 22, cabin);
      p.fill(0x2f3946, [at(0.25, b0 + 0.18, 15), at(0.25, b1 - 0.18, 15), at(0.25, b1 - 0.18, 19), at(0.25, b0 + 0.18, 19)]);
      box(-0.34, 0.29, b0 + 0.06, b1 - 0.06, 22, 23.5, shade(cabin, -15));
      const net = at(0.65, 0.5, 11);
      g.fillStyle(0x3d6b4f, 1);
      g.fillEllipse(net.x, net.y, 14, 6);
      g.lineStyle(1, 0x24412f, 0.7);
      g.strokeEllipse(net.x, net.y, 14, 6);
      const buoy = at(0.85, b0 + 0.1, 11);
      g.fillStyle(0xf28c28, 1);
      g.fillCircle(buoy.x, buoy.y - 1, 2.2);
      // Mástil con los cables a proa y popa, y la banderita.
      const mastBase = at(0.45, 0.5, 9.6);
      const mastTop = at(0.45, 0.5, 52);
      g.lineStyle(2, 0x5a4632, 1);
      g.lineBetween(mastBase.x, mastBase.y, mastTop.x, mastTop.y);
      g.lineStyle(1, 0x2b2b30, 0.6);
      for (const [a, z] of [
        [1.35, 11],
        [-0.38, 10],
      ]) {
        const end = at(a, 0.5, z);
        g.lineBetween(mastTop.x, mastTop.y, end.x, end.y);
      }
      g.fillStyle(0x4f86c6, 1);
      g.fillTriangle(mastTop.x, mastTop.y, mastTop.x + 7, mastTop.y + 2, mastTop.x, mastTop.y + 5);
    },
  };
}

/**
 * Farol de la rambla (decorado, `CityDefinition.streetLamps`): columna de hierro negra con base,
 * brazo y el farol de vidrio; de noche lo ilumina `CityRenderer.nightLights`.
 */
export function streetLampSpec(): PieceSpec {
  return {
    key: "street-lamp",
    width: 1,
    height: 1,
    maxZ: 66,
    draw: (p) => {
      p.box(0.25, 0.25, 0.4, 0.4, 0, 5, boxColors(0x2b2b30));
      const g = p.g;
      const base = p.p(0.32, 0.32, 5);
      const top = p.p(0.32, 0.32, 56);
      g.lineStyle(2.5, 0x1f1f22, 1).lineBetween(base.x, base.y, top.x, top.y);
      g.fillStyle(0x1f1f22, 1).fillRect(top.x - 4, top.y - 2, 8, 3);
      g.fillStyle(0xfff3b0, 1).fillRect(top.x - 3, top.y - 11, 6, 9);
      g.lineStyle(1, 0x1f1f22, 1).strokeRect(top.x - 3, top.y - 11, 6, 9);
      g.fillStyle(0x1f1f22, 1).fillTriangle(top.x - 5, top.y - 11, top.x + 5, top.y - 11, top.x, top.y - 16);
    },
  };
}

/** Piedra clara de los pilares (la de la Puerta de la Ciudadela y los edificios del 900) y hierro forjado. */
const ARCH_STONE = 0xd8cdb8;
const ARCH_IRON = 0x262626;
const ARCH_PLATE = 0x1d4f8a;
const ARCH_LANTERN = 0xffe7a8;
/** Altura del arco de hierro (la luz de abajo deja pasar holgado a un avatar). */
const ARCH_BEAM_Z = 118;

/**
 * El arco de la salida por el borde del mapa (`Door.edge`: 18 de Julio entre Ciudad Vieja y el
 * Centro), en piezas de 1 × 1 a lo largo del borde (eje y): en las puntas (`start` al norte, `end` al
 * sur) un **pilar** de piedra clara con basamento, cornisa y un farol de hierro arriba; en el medio,
 * sobre la calle, el **arco de hierro forjado** con volutas y, al centro, la chapa azul del cartel.
 */
export function portalSpec(role: "start" | "curtain" | "end"): PieceSpec {
  // El arco va hacia adentro desde cada pilar (no sobresale afuera).
  const [beam0, beam1] = role === "start" ? [0, 0.5] : role === "end" ? [-0.5, 0] : [-0.5, 0.5];
  return {
    key: `street-arch-${role}`,
    width: 1,
    height: 1,
    maxZ: role === "curtain" ? 150 : 178,
    draw: (p) => {
      const east: Face = { side: "east", x: 0.04 };
      // Arco de hierro: dos barras con volutas entre medio (y, en el medio, la curva hacia arriba).
      const rise = (u: number) => (role === "curtain" ? 10 * Math.cos(u * Math.PI * 0.9) : 0);
      p.box(-0.04, beam0, 0.04, beam1, ARCH_BEAM_Z, ARCH_BEAM_Z + 3, boxColors(ARCH_IRON), false);
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const u0 = beam0 + ((beam1 - beam0) * i) / steps;
        const u1 = beam0 + ((beam1 - beam0) * (i + 1)) / steps;
        p.line(p.facePoint(east, u0, ARCH_BEAM_Z + 14 + rise(u0)), p.facePoint(east, u1, ARCH_BEAM_Z + 14 + rise(u1)), ARCH_IRON, 2.2);
      }
      for (let u = beam0 + 0.1; u < beam1 - 0.05; u += 0.2) {
        const c = p.facePoint(east, u, ARCH_BEAM_Z + 7 + rise(u) / 2);
        p.g.lineStyle(1.2, ARCH_IRON, 1);
        p.g.strokeCircle(c.x, c.y, 3);
      }
      if (role === "curtain") {
        // La chapa del cartel colgada al medio del arco: azul con borde y letras blancas (en bloques).
        p.faceRect(east, -0.34, 0.34, ARCH_BEAM_Z + 18, ARCH_BEAM_Z + 30, 0xf4f1ea);
        p.faceRect(east, -0.31, 0.31, ARCH_BEAM_Z + 19.5, ARCH_BEAM_Z + 28.5, ARCH_PLATE);
        for (let u = -0.24; u < 0.25; u += 0.08) p.faceRect(east, u, u + 0.05, ARCH_BEAM_Z + 22, ARCH_BEAM_Z + 26, 0xf4f1ea);
        return;
      }
      // Pilar de piedra: basamento más ancho, fuste con almohadillado, cornisa y el farol arriba.
      p.box(-0.32, -0.32, 0.32, 0.32, 0, 14, boxColors(shade(ARCH_STONE, -12)));
      p.box(-0.24, -0.24, 0.24, 0.24, 14, 132, boxColors(ARCH_STONE));
      for (const face of [
        { side: "south", y: 0.24 },
        { side: "east", x: 0.24 },
      ] as const) {
        for (let z = 30; z < 130; z += 16) p.line(p.facePoint(face, -0.24, z), p.facePoint(face, 0.24, z), 0x000000, 1, 0.12);
        p.faceRect(face, -0.1, 0.1, 50, 90, shade(ARCH_STONE, -8));
      }
      p.box(-0.3, -0.3, 0.3, 0.3, 132, 140, boxColors(shade(ARCH_STONE, 12)));
      // Farol de hierro: poste corto, el vidrio con luz cálida y el sombrerito.
      p.spire(0, 0, 140, 152, ARCH_IRON, 2.5);
      p.box(-0.1, -0.1, 0.1, 0.1, 152, 168, boxColors(ARCH_LANTERN), false);
      for (const face of [
        { side: "south", y: 0.1 },
        { side: "east", x: 0.1 },
      ] as const) {
        p.faceRect(face, -0.1, -0.08, 152, 168, ARCH_IRON);
        p.faceRect(face, 0.08, 0.1, 152, 168, ARCH_IRON);
      }
      p.pyramid(-0.13, -0.13, 0.13, 0.13, 168, 178, ARCH_IRON, shade(ARCH_IRON, -10));
    },
  };
}
