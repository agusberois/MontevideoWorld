import * as Phaser from "phaser";
import type { Shape } from "@/lib/avatar/shapes";
import { paintShapes } from "./paintShapes";

/**
 * Las texturas se hornean a esta resolución (y la imagen se muestra a 1 / SHAPE_RES): así se ven
 * nítidas hasta el zoom máximo de la cámara (`MAX_ZOOM` = 2).
 */
export const SHAPE_RES = 2;
/** Margen alrededor de las formas (px de dibujo), para el contorno y el suavizado. */
const PAD = 2;

/**
 * Una parte del avatar (pierna, torso, cara, pelo…) hecha con las formas de `lib/avatar`, horneada a
 * una textura en vez de quedar como `Graphics`: en WebGL Phaser vuelve a triangular cada `Graphics`
 * en cada frame y corta el lote de dibujo; una `Image` no. Formas iguales (dos avatares con la misma
 * remera) comparten la textura. El origen de la imagen es el (0, 0) de las formas, como era el del
 * `Graphics`: rotar y mover se comporta igual.
 *
 * Ojo con la escala: la base es 1 / SHAPE_RES (usar `scaleY = factor / SHAPE_RES` para aplastarla).
 */
export class ShapeSprite extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene, x = 0, y = 0) {
    super(scene, x, y, "__DEFAULT");
    this.setScale(1 / SHAPE_RES).setVisible(false);
  }

  /** Muestra estas formas (hornea la textura la primera vez que aparecen). Sin formas, no se ve. */
  paint(shapes: readonly Shape[]): this {
    if (shapes.length === 0) return this.setVisible(false);
    const { key, minX, minY } = bakeShapes(this.scene, shapes);
    this.setTexture(key);
    this.setDisplayOrigin(-minX * SHAPE_RES, -minY * SHAPE_RES);
    return this.setVisible(true);
  }
}

interface Baked {
  key: string;
  minX: number;
  minY: number;
}

const baked = new Map<string, Baked>();

function bakeShapes(scene: Phaser.Scene, shapes: readonly Shape[]): Baked {
  const signature = JSON.stringify(shapes);
  const key = `shape-${hash(signature)}-${signature.length}`;
  const known = baked.get(key);
  if (known && scene.textures.exists(key)) return known;

  const { minX, minY, maxX, maxY } = boundsOf(shapes);
  const width = Math.ceil((maxX - minX) * SHAPE_RES);
  const height = Math.ceil((maxY - minY) * SHAPE_RES);
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    g.scaleCanvas(SHAPE_RES, SHAPE_RES);
    g.translateCanvas(-minX, -minY);
    paintShapes(g, shapes);
    g.generateTexture(key, Math.max(1, width), Math.max(1, height));
    g.destroy();
  }
  const result = { key, minX, minY };
  baked.set(key, result);
  return result;
}

/** Caja que encierra todas las formas (con medio trazo y `PAD` de margen). */
function boundsOf(shapes: readonly Shape[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x0: number, y0: number, x1: number, y1: number, stroke: number) => {
    minX = Math.min(minX, x0 - stroke);
    minY = Math.min(minY, y0 - stroke);
    maxX = Math.max(maxX, x1 + stroke);
    maxY = Math.max(maxY, y1 + stroke);
  };
  for (const shape of shapes) {
    const stroke = shape.stroke !== undefined ? (shape.strokeWidth ?? 1) / 2 : 0;
    if (shape.kind === "ellipse") add(shape.x - shape.rx, shape.y - shape.ry, shape.x + shape.rx, shape.y + shape.ry, stroke);
    else if (shape.kind === "rect") add(shape.x, shape.y, shape.x + shape.width, shape.y + shape.height, stroke);
    else for (const point of shape.points) add(point.x, point.y, point.x, point.y, stroke);
  }
  return { minX: Math.floor(minX - PAD), minY: Math.floor(minY - PAD), maxX: Math.ceil(maxX + PAD), maxY: Math.ceil(maxY + PAD) };
}

/** FNV-1a de 32 bits (en base 36): una clave corta para la textura. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Para hornear un dibujo hecho a mano (no con formas de `lib/avatar`: las mascotas): un `Graphics`
 * fuera de la escena donde el (0, 0) queda en el centro de una textura de 2 × `radius` px de lado.
 * Se dibuja en él y después `bakeGraphics` lo pasa a una `Image` con el mismo pivote.
 */
export function bakingGraphics(scene: Phaser.Scene, radius: number): Phaser.GameObjects.Graphics {
  return scene.make.graphics({}, false).scaleCanvas(SHAPE_RES, SHAPE_RES).translateCanvas(radius, radius);
}

/**
 * Hornea `g` (de `bakingGraphics`) con esa clave, si no existía, y lo destruye. La `Image` queda en
 * la posición y rotación que tenía el `Graphics` (`generateTexture` las ignora: usa su propia cámara).
 */
export function bakeGraphics(g: Phaser.GameObjects.Graphics, key: string, radius: number): Phaser.GameObjects.Image {
  const scene = g.scene;
  if (!scene.textures.exists(key)) {
    const size = Math.ceil(radius * 2 * SHAPE_RES);
    g.generateTexture(key, size, size);
  }
  const image = new Phaser.GameObjects.Image(scene, g.x, g.y, key)
    .setDisplayOrigin(radius * SHAPE_RES, radius * SHAPE_RES)
    .setScale(1 / SHAPE_RES)
    .setRotation(g.rotation);
  g.destroy();
  return image;
}
