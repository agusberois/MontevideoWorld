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

const SHOP_STYLES: Record<Exclude<ShopBuilding, "none">, ShopStyle> = {
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
