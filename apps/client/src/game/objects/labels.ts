import * as Phaser from "phaser";

/** Resolución a la que se hornean los carteles (nítidos con el zoom máximo, 2×). */
export const LABEL_RES = 2;

/**
 * Cartel de texto fijo e igual para muchos (los distintivos "♥ DONADOR" y "🔒 PRESO" de los
 * avatares): se rasteriza una sola vez y todos comparten la textura. Un `Text` por avatar tenía su
 * propio canvas y su propia textura, y cortaba el lote de dibujo en cada uno.
 */
export function labelImage(scene: Phaser.Scene, key: string, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Image {
  if (!scene.textures.exists(key)) {
    const source = scene.make.text({ text, style: { ...style, resolution: LABEL_RES } }, false);
    const canvas = document.createElement("canvas");
    canvas.width = source.canvas.width;
    canvas.height = source.canvas.height;
    canvas.getContext("2d")?.drawImage(source.canvas, 0, 0);
    scene.textures.addCanvas(key, canvas);
    source.destroy();
  }
  return new Phaser.GameObjects.Image(scene, 0, 0, key).setScale(1 / LABEL_RES);
}
