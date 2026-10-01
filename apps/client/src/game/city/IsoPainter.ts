import type * as Phaser from "phaser";
import { shade } from "../color";
import { isoPoint } from "../iso";

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Cara vertical visible de un volumen. Con la cámara mirando desde el sureste sólo se ven
 * la cara sur (plano y = cte, a la izquierda en pantalla) y la cara este (plano x = cte, a la derecha).
 * En una cara, `u` recorre el eje horizontal del plano (x para la sur, y para la este).
 */
export type Face = { side: "south"; y: number } | { side: "east"; x: number };

export interface BoxColors {
  top: number;
  south: number;
  east: number;
}

export interface WindowStyle {
  color: number;
  /** Fracción del ancho de cada celda que ocupa la ventana (0..1). */
  widthRatio?: number;
  /** Fracción del alto de cada fila que ocupa la ventana (0..1). */
  heightRatio?: number;
  arched?: boolean;
  /** Color de los postigos a los lados (casas coloniales). */
  shutters?: number;
  /** Baranda de balcón bajo la ventana. */
  balcony?: number;
}

/** Ancho en pantalla de una unidad de tile a lo largo de una cara (hipotenusa 32×16). */
const FACE_UNIT_PX = Math.hypot(32, 16);
const OUTLINE_ALPHA = 0.22;

/** Volumen estándar con sus caras derivadas de un color base. */
export function boxColors(base: number, top = shade(base, 10)): BoxColors {
  return { top, south: shade(base, -6), east: shade(base, -20) };
}

/**
 * Dibuja geometría isométrica en coordenadas de tile continuas + altura en píxeles.
 * Todo se traslada por (ox, oy) para poder hornearlo en una textura que empieza en (0, 0).
 */
export class IsoPainter {
  constructor(
    readonly g: Phaser.GameObjects.Graphics,
    private readonly ox = 0,
    private readonly oy = 0,
  ) {}

  p(x: number, y: number, z = 0): Vec2 {
    const point = isoPoint(x, y, z);
    return { x: point.x - this.ox, y: point.y - this.oy };
  }

  fill(color: number, points: Vec2[], alpha = 1) {
    this.g.fillStyle(color, alpha);
    this.g.fillPoints(points, true);
  }

  outline(points: Vec2[], alpha = OUTLINE_ALPHA) {
    this.g.lineStyle(1, 0x000000, alpha);
    this.g.strokePoints(points, true);
  }

  line(a: Vec2, b: Vec2, color: number, width = 1, alpha = 1) {
    this.g.lineStyle(width, color, alpha);
    this.g.lineBetween(a.x, a.y, b.x, b.y);
  }

  /** Prisma recto de (x0, y0) a (x1, y1) entre las alturas z0 y z1. */
  box(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, colors: BoxColors, outlined = true) {
    const south = [this.p(x0, y1, z0), this.p(x1, y1, z0), this.p(x1, y1, z1), this.p(x0, y1, z1)];
    const east = [this.p(x1, y1, z0), this.p(x1, y0, z0), this.p(x1, y0, z1), this.p(x1, y1, z1)];
    const top = [this.p(x0, y0, z1), this.p(x1, y0, z1), this.p(x1, y1, z1), this.p(x0, y1, z1)];
    this.fill(colors.south, south);
    this.fill(colors.east, east);
    this.fill(colors.top, top);
    if (outlined) {
      this.outline(south);
      this.outline(east);
      this.outline(top);
    }
  }

  /**
   * Pirámide (techo a cuatro aguas) sobre el rectángulo, con vértice en el centro. Vista desde
   * arriba se ven las cuatro aguas: primero las de atrás (norte y oeste), después las de adelante.
   */
  pyramid(x0: number, y0: number, x1: number, y1: number, z0: number, zApex: number, south: number, east: number) {
    const apex = this.p((x0 + x1) / 2, (y0 + y1) / 2, zApex);
    const faces: Array<[Vec2[], number]> = [
      [[this.p(x0, y0, z0), this.p(x1, y0, z0), apex], shade(south, 14)],
      [[this.p(x0, y1, z0), this.p(x0, y0, z0), apex], shade(south, 6)],
      [[this.p(x0, y1, z0), this.p(x1, y1, z0), apex], south],
      [[this.p(x1, y1, z0), this.p(x1, y0, z0), apex], east],
    ];
    for (const [points, color] of faces) {
      this.fill(color, points);
      this.outline(points);
    }
  }

  /** Cúpula semiesférica apoyada en (x, y, z), con brillo del lado iluminado. */
  dome(x: number, y: number, z: number, radius: number, color: number) {
    const c = this.p(x, y, z);
    const g = this.g;
    g.fillStyle(shade(color, -18), 1);
    g.fillEllipse(c.x, c.y, radius * 2, radius);
    g.fillStyle(color, 1);
    g.beginPath();
    g.arc(c.x, c.y, radius, Math.PI, Math.PI * 2, false);
    g.closePath();
    g.fillPath();
    g.fillStyle(shade(color, 22), 1);
    g.fillEllipse(c.x - radius * 0.35, c.y - radius * 0.55, radius * 0.5, radius * 0.35);
    g.lineStyle(1, 0x000000, OUTLINE_ALPHA);
    g.beginPath();
    g.arc(c.x, c.y, radius, Math.PI, Math.PI * 2, false);
    g.strokePath();
  }

  /** Mástil vertical (agujas, cruces, antenas). */
  spire(x: number, y: number, z0: number, z1: number, color: number, width = 1.5) {
    this.line(this.p(x, y, z0), this.p(x, y, z1), color, width);
  }

  facePoint(face: Face, u: number, z: number): Vec2 {
    return face.side === "south" ? this.p(u, face.y, z) : this.p(face.x, u, z);
  }

  /** Polígono sobre una cara, con vértices [u, z]. */
  facePoly(face: Face, points: ReadonlyArray<readonly [number, number]>, color: number, alpha = 1) {
    this.fill(
      color,
      points.map(([u, z]) => this.facePoint(face, u, z)),
      alpha,
    );
  }

  faceRect(face: Face, u0: number, u1: number, z0: number, z1: number, color: number, alpha = 1) {
    this.facePoly(
      face,
      [
        [u0, z0],
        [u1, z0],
        [u1, z1],
        [u0, z1],
      ],
      color,
      alpha,
    );
  }

  /** Abertura con remate de medio punto: rectángulo hasta `z1 - flecha` y arco encima. */
  faceArch(face: Face, u0: number, u1: number, z0: number, z1: number, color: number, alpha = 1) {
    const radiusU = (u1 - u0) / 2;
    const rise = Math.min(radiusU * FACE_UNIT_PX * 0.9, (z1 - z0) * 0.6);
    const spring = z1 - rise;
    const points: Array<[number, number]> = [
      [u0, z0],
      [u1, z0],
    ];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI;
      points.push([u0 + radiusU + Math.cos(t) * radiusU, spring + Math.sin(t) * rise]);
    }
    this.facePoly(face, points, color, alpha);
  }

  /** Grilla de ventanas sobre una cara: `cols` × `rows` celdas entre (u0, z0) y (u1, z1). */
  windows(face: Face, u0: number, u1: number, z0: number, z1: number, cols: number, rows: number, style: WindowStyle) {
    const cellU = (u1 - u0) / cols;
    const cellZ = (z1 - z0) / rows;
    const w = cellU * (style.widthRatio ?? 0.5);
    const h = cellZ * (style.heightRatio ?? 0.6);

    for (let row = 0; row < rows; row++) {
      const wz0 = z0 + row * cellZ + (cellZ - h) / 2;
      for (let col = 0; col < cols; col++) {
        const wu0 = u0 + col * cellU + (cellU - w) / 2;
        if (style.shutters !== undefined) {
          const shutter = w * 0.35;
          this.faceRect(face, wu0 - shutter, wu0, wz0, wz0 + h, style.shutters);
          this.faceRect(face, wu0 + w, wu0 + w + shutter, wz0, wz0 + h, style.shutters);
        }
        if (style.arched) this.faceArch(face, wu0, wu0 + w, wz0, wz0 + h, style.color);
        else this.faceRect(face, wu0, wu0 + w, wz0, wz0 + h, style.color);
        if (style.balcony !== undefined) {
          const pad = w * 0.25;
          this.faceRect(face, wu0 - pad, wu0 + w + pad, wz0 - 1, wz0 + h * 0.3, style.balcony, 0.85);
        }
      }
    }
  }
}
