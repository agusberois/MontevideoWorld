import type * as Phaser from "phaser";
import type { Shape } from "@/lib/avatar/shapes";

/**
 * Pinta en un Graphics de Phaser las formas de `lib/avatar` (las mismas que la vista previa en SVG
 * dibuja con `<ellipse>`, `<rect>` y `<polygon>`): primero el relleno y después el contorno.
 */
export function paintShapes(g: Phaser.GameObjects.Graphics, shapes: readonly Shape[]) {
  for (const shape of shapes) {
    const { fill, stroke } = shape;
    const filled = fill !== undefined;
    const stroked = stroke !== undefined;
    if (filled) g.fillStyle(fill, shape.fillAlpha ?? 1);
    if (stroked) g.lineStyle(shape.strokeWidth ?? 1, stroke, shape.strokeAlpha ?? 1);

    switch (shape.kind) {
      case "ellipse":
        if (filled) g.fillEllipse(shape.x, shape.y, shape.rx * 2, shape.ry * 2);
        if (stroked) g.strokeEllipse(shape.x, shape.y, shape.rx * 2, shape.ry * 2);
        break;
      case "rect": {
        const { x, y, width, height, radius } = shape;
        if (radius) {
          // Phaser no deja un radio mayor que la mitad del lado.
          const r = Math.min(radius, width / 2, height / 2);
          if (filled) g.fillRoundedRect(x, y, width, height, r);
          if (stroked) g.strokeRoundedRect(x, y, width, height, r);
        } else {
          if (filled) g.fillRect(x, y, width, height);
          if (stroked) g.strokeRect(x, y, width, height);
        }
        break;
      }
      case "poly":
        if (filled && shape.closed) g.fillPoints(shape.points, true);
        if (stroked) g.strokePoints(shape.points, shape.closed);
        break;
    }
  }
}
