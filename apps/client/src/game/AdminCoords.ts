import * as Phaser from "phaser";
import { CityMap, TileChar, TileRect } from "@montevideo-world/shared";
import { tileDiamond, tileToWorld } from "./iso";

/**
 * Modo coordenadas (sólo admin, tecla G): grilla sobre el piso con un rótulo "x,y" cada
 * `LABEL_STEP` tiles y una etiqueta junto al mouse con la coordenada del tile y lo que hay ahí. Sirve
 * para planear dónde edificar: Shift + clic copia la coordenada (lo maneja `CityScene`). Es sólo
 * visual y del cliente: no cambia nada del juego.
 */

/** Cada cuántos tiles va un rótulo fijo (y una línea más marcada). */
const LABEL_STEP = 5;

/** Nombre de cada tipo de piso del layout. */
const TILE_NAMES: Record<string, string> = {
  [TileChar.Water]: "agua",
  [TileChar.Rambla]: "rambla",
  [TileChar.Street]: "calle",
  [TileChar.Pedestrian]: "peatonal",
  [TileChar.Plaza]: "plaza",
  [TileChar.Grass]: "pasto",
  [TileChar.Block]: "casas",
  [TileChar.Tower]: "edificio en altura",
  [TileChar.Tree]: "árbol",
  [TileChar.Palm]: "palmera",
  [TileChar.Jetty]: "escollera",
  [TileChar.Wall]: "muro",
  [TileChar.Fence]: "reja",
};

function inRect(rect: TileRect, x: number, y: number): boolean {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}

/** "plaza · Monumento a Artigas · no caminable": qué hay en el tile, para la etiqueta. */
export function describeTile(map: CityMap, x: number, y: number): string {
  const { city } = map;
  const parts: string[] = [TILE_NAMES[map.tileAt(x, y) ?? ""] ?? "fuera del mapa"];
  const landmark = city.landmarks.find((candidate) => inRect(candidate.area, x, y));
  if (landmark) parts.push(landmark.name);
  const shop = map.shopAt(x, y);
  if (shop) parts.push(`tienda ${shop.name}`);
  const bench = map.benchAt(x, y);
  if (bench) parts.push(`banco (mira al ${bench.facing === "south" ? "sur" : "este"})`);
  const stop = map.busStopAt(x, y);
  if (stop) parts.push(`parada ${stop.name}`);
  if (inRect(city.spawnArea, x, y)) parts.push("spawn");
  if (map.canVendAt(x, y)) parts.push("zona de venta");
  if (map.canBuskAt(x, y)) parts.push("se toca música");
  if (map.canFishAt(x, y)) parts.push("se pesca");
  parts.push(map.isWalkable(x, y) ? "caminable" : "no caminable");
  return parts.join(" · ");
}

export class AdminCoords {
  private enabled = false;
  private grid: Phaser.GameObjects.Graphics | null = null;
  private labels: Phaser.GameObjects.Text[] = [];
  private readonly hoverLabel: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: CityMap,
    /** Profundidad de la grilla (sobre el piso, debajo de edificios y avatares). */
    private readonly gridDepth: number,
    /** Profundidad de la etiqueta del mouse (encima de todo). */
    hoverDepth: number,
  ) {
    this.hoverLabel = scene.add
      .text(0, 0, "", {
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: "12px",
        color: "#ffe08a",
        backgroundColor: "#141820dd",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(hoverDepth)
      .setVisible(false);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (enabled && !this.grid) this.build();
    this.grid?.setVisible(enabled);
    for (const label of this.labels) label.setVisible(enabled);
    if (!enabled) this.hoverLabel.setVisible(false);
  }

  /** Etiqueta junto al tile bajo el mouse (o nada si el modo está apagado / fuera del mapa). */
  hover(tile: { x: number; y: number } | null) {
    if (!this.enabled || !tile || !this.map.inBounds(tile.x, tile.y)) {
      this.hoverLabel.setVisible(false);
      return;
    }
    const { top } = tileDiamond(tile.x, tile.y);
    this.hoverLabel
      .setText(`(${tile.x}, ${tile.y})  ${describeTile(this.map, tile.x, tile.y)}`)
      .setPosition(top.x, top.y - 4)
      .setVisible(true);
  }

  /** La grilla y los rótulos se dibujan una sola vez, la primera vez que se prende. */
  private build() {
    const grid = this.scene.add.graphics().setDepth(this.gridDepth);
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const { top, right, bottom, left } = tileDiamond(x, y);
        const marked = x % LABEL_STEP === 0 && y % LABEL_STEP === 0;
        grid.lineStyle(1, marked ? 0xffe08a : 0xffffff, marked ? 0.6 : 0.14);
        grid.strokePoints([top, right, bottom, left], true);
        if (!marked) continue;
        const center = tileToWorld(x, y);
        this.labels.push(
          this.scene.add
            .text(center.x, center.y, `${x},${y}`, {
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: "10px",
              color: "#ffe08a",
              stroke: "#000000",
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(this.gridDepth + 1),
        );
      }
    }
    this.grid = grid;
  }

  dispose() {
    this.grid?.destroy();
    for (const label of this.labels) label.destroy();
    this.labels = [];
    this.hoverLabel.destroy();
  }
}
