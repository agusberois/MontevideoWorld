import * as Phaser from "phaser";

/** Cada cuánto se actualiza el texto (ms). */
const REFRESH_MS = 500;

/**
 * Medidor de rendimiento para comparar antes y después de optimizar (sólo con `?perf=1` en la URL):
 * fps, ms del último frame y cuántos objetos hay en la escena (y cuántos se dibujan), contando los
 * de adentro de los contenedores, con los `Graphics` y los `Text` aparte (los caros).
 */
export class PerfOverlay {
  private readonly text: Phaser.GameObjects.Text;
  private elapsed = REFRESH_MS;

  static enabled(): boolean {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perf") === "1";
  }

  constructor(private readonly scene: Phaser.Scene) {
    this.text = scene.add
      .text(8, 300, "", { fontFamily: "monospace", fontSize: "12px", color: "#9ef0c9", backgroundColor: "rgba(0,0,0,0.7)", padding: { x: 6, y: 4 } })
      .setScrollFactor(0)
      .setDepth(3_000_000);
  }

  update(delta: number) {
    this.elapsed += delta;
    if (this.elapsed < REFRESH_MS) return;
    this.elapsed = 0;
    const counts = { all: 0, drawn: 0, graphics: 0, graphicsDrawn: 0, text: 0 };
    const visit = (list: readonly Phaser.GameObjects.GameObject[], parentVisible: boolean) => {
      for (const object of list) {
        if (object === this.text) continue;
        const visible = parentVisible && (object as unknown as { visible?: boolean }).visible !== false;
        counts.all++;
        if (visible) counts.drawn++;
        if (object instanceof Phaser.GameObjects.Graphics) {
          counts.graphics++;
          if (visible) counts.graphicsDrawn++;
        } else if (object instanceof Phaser.GameObjects.Text) counts.text++;
        if (object instanceof Phaser.GameObjects.Container) visit(object.list, visible);
      }
    };
    visit(this.scene.children.list, true);
    const loop = this.scene.game.loop;
    this.text.setText(
      [
        `${loop.actualFps.toFixed(0)} fps · ${loop.delta.toFixed(1)} ms`,
        `objetos ${counts.drawn}/${counts.all}`,
        `graphics ${counts.graphicsDrawn}/${counts.graphics} · text ${counts.text}`,
        `texturas ${this.scene.textures.getTextureKeys().length}`,
      ].join("\n"),
    );
  }
}
