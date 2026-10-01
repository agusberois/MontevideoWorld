import * as Phaser from "phaser";
import { CityMap, Landmark, TILE_HEIGHT, TILE_WIDTH, TileChar, TilePoint, TileRect } from "@montevideo-world/shared";
import { shade } from "../color";
import { isoPoint, tileDiamond, tileToWorld } from "../iso";
import { PieceSpec, benchSpec, clothingShopSpec, houseSpec, palmSpec, tileHash, treeSpec } from "./buildings";
import type { NightLight } from "./DayNight";
import { IsoPainter } from "./IsoPainter";
import { ROOF_SPOTS, landmarkPieces } from "./landmarks";

export const FLOOR_DEPTH = -100000;
/** Textura del logo de Montevideo World (la carga la escena en `preload`). */
export const LOGO_TEXTURE = "mw-logo";
const LOGO_SIZE = 58;
const LOGO_POST_HEIGHT = 12;
const GROUND_LABEL_DEPTH = FLOOR_DEPTH + 10;
/** Por encima de todo edificio, por debajo de nombres y globos de los avatares. */
const LANDMARK_LABEL_DEPTH = 500000;

const HALF_H = TILE_HEIGHT / 2;
const EDGE_THICKNESS = 14;
const TEXTURE_MARGIN = 8;
/** Opacidad de un edificio que tapa al avatar propio. */
const OCCLUDER_ALPHA = 0.35;
const FADE_MS = 120;

const GROUND_COLORS: Record<string, readonly [number, number]> = {
  [TileChar.Water]: [0x2d6e8e, 0x2a6987],
  [TileChar.Rambla]: [0xcf9f8a, 0xc6957f],
  [TileChar.Street]: [0x74767d, 0x6e7077],
  [TileChar.Pedestrian]: [0xb8a084, 0xb0987c],
  [TileChar.Plaza]: [0xd9cdb4, 0xd2c6ac],
  [TileChar.Grass]: [0x6f9a4e, 0x689348],
  [TileChar.Tree]: [0x6f9a4e, 0x689348],
  [TileChar.Palm]: [0x6f9a4e, 0x689348],
  [TileChar.Block]: [0x55555b, 0x55555b],
  [TileChar.Jetty]: [0x8f8b83, 0x87837b],
};

/**
 * La escollera sobresale del agua: la losa queda a la altura del piso (así los avatares apoyan
 * bien) y sus bordes bajan como un muro de piedra hacia el río.
 */
const JETTY_WALL = 7;

interface Piece {
  image: Phaser.GameObjects.Image;
  silhouette: Phaser.Geom.Polygon;
  bounds: Phaser.Geom.Rectangle;
}

/** Punto de referencia del avatar propio para decidir qué edificios lo tapan. */
export interface OcclusionFocus {
  x: number;
  y: number;
  depth: number;
}

/**
 * Dibuja un barrio: piso, casas, árboles, edificios emblemáticos y carteles.
 * Cada volumen se hornea una vez a textura (Graphics → generateTexture) y se muestra como Image:
 * cientos de casas cuestan lo mismo que cientos de sprites. Las piezas con la misma `key`
 * (casas iguales, árboles) comparten textura.
 */
export class CityRenderer {
  private readonly pieces: Piece[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: CityMap,
  ) {}

  build() {
    this.drawGround();
    this.drawProps();
    const logo = this.logoPlacement();
    for (const landmark of this.map.city.landmarks) {
      const placed = landmarkPieces(landmark);
      for (const { tile, spec } of placed) this.placePiece(tile, spec);

      // Si lleva el cartel "MW", el nombre del edificio va por encima del cartel.
      const buildingTop = Math.max(...placed.map(({ spec }) => spec.maxZ * (spec.scale ?? 1)));
      const maxZ = logo?.landmark === landmark ? Math.max(buildingTop, logo.topZ) : buildingTop;
      this.addSign(landmark.name, landmark.area, maxZ, "#ffd166", "rgba(18, 21, 31, 0.78)");
    }
    for (const shop of this.map.city.shops) {
      // Las tiendas "none" funcionan dentro de un edificio ya dibujado: el cartel va sobre la fachada.
      let signZ = 46;
      if (shop.building === "clothing") {
        const spec = clothingShopSpec();
        this.placePiece(shop.area, spec);
        signZ = spec.maxZ;
      }
      this.addSign(`Tienda · ${shop.name}`, shop.area, signZ, "#9ef0c9", "rgba(20, 60, 48, 0.88)");
    }
    this.drawPlaceLabels();
    if (logo) this.drawLogoSign(logo);
  }

  /**
   * Dónde va el cartel "MW": el punto del techo del edificio emblemático indicado en
   * `CityDefinition.logoSign` (ver `ROOF_SPOTS`), escalado como el edificio.
   */
  private logoPlacement() {
    const id = this.map.city.logoSign?.landmarkId;
    const landmark = this.map.city.landmarks.find((candidate) => candidate.id === id);
    const spot = landmark ? ROOF_SPOTS[landmark.kind] : undefined;
    if (!landmark || !spot || !this.scene.textures.exists(LOGO_TEXTURE)) return null;

    const scale = landmarkPieces(landmark)[0]?.spec.scale ?? 1;
    const { area } = landmark;
    const x = area.x - 0.5 + (spot.u + 0.5) * scale;
    const y = area.y - 0.5 + (spot.v + 0.5) * scale;
    const z = spot.z * scale;
    return {
      landmark,
      roof: isoPoint(x, y, z),
      // Altura (en px) del borde de arriba del logo, para subir el nombre del edificio.
      topZ: z + LOGO_POST_HEIGHT + LOGO_SIZE + 6,
      // Un pelo por delante del edificio que lo sostiene, así lo tapa lo mismo que a él.
      depth: (area.x + area.width - 1 + area.y) * HALF_H + 1.5,
    };
  }

  /** Cartel publicitario con el logo "MW": dos parantes sobre el techo y el logo mirando a la cámara. */
  private drawLogoSign({ roof, depth }: { landmark: Landmark; roof: { x: number; y: number }; depth: number }) {
    const panelBottom = roof.y - LOGO_POST_HEIGHT;

    const posts = this.scene.add.graphics().setDepth(depth);
    posts.lineStyle(3, 0x2b2b30, 1);
    for (const dx of [-LOGO_SIZE * 0.3, LOGO_SIZE * 0.3]) posts.lineBetween(roof.x + dx, roof.y, roof.x + dx, panelBottom);
    posts.fillStyle(0x000000, 0.25);
    posts.fillEllipse(roof.x, roof.y, LOGO_SIZE * 0.9, 8);

    this.scene.add
      .image(roof.x, panelBottom, LOGO_TEXTURE)
      .setOrigin(0.5, 1)
      .setDisplaySize(LOGO_SIZE, LOGO_SIZE)
      .setDepth(depth);
  }

  /**
   * Luces que se prenden de noche: la farola de la escollera, las vidrieras de las tiendas,
   * el cartel "MW" y un farol junto a cada banco.
   */
  nightLights(): NightLight[] {
    const lights: NightLight[] = [];
    for (const landmark of this.map.city.landmarks) {
      if (landmark.kind !== "lighthouse") continue;
      const lantern = isoPoint(landmark.area.x, landmark.area.y, 70);
      lights.push({ ...lantern, radius: 90, color: 0xffd166 });
    }
    for (const shop of this.map.city.shops) {
      if (shop.building !== "clothing") continue;
      const { x, y, width, height } = shop.area;
      const front = isoPoint(x + width - 1, y + height - 1, 16);
      lights.push({ ...front, radius: 70, color: 0xffe0a3 });
    }
    const logo = this.logoPlacement();
    if (logo) lights.push({ x: logo.roof.x, y: logo.roof.y - LOGO_POST_HEIGHT - LOGO_SIZE / 2, radius: 60, color: 0x9fd3ff });
    for (const bench of this.map.city.benches) {
      lights.push({ ...isoPoint(bench.x, bench.y, 34), radius: 55, color: 0xffcf7a });
    }
    return lights;
  }

  /** Cartel flotante sobre un edificio (emblemático o tienda), por encima de todos los volúmenes. */
  private addSign(text: string, area: TileRect, maxZ: number, color: string, background: string) {
    const top = isoPoint(area.x + (area.width - 1) / 2, area.y + (area.height - 1) / 2, maxZ + 8);
    this.scene.add
      .text(top.x, top.y, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "11px",
        fontStyle: "bold",
        color,
        backgroundColor: background,
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(LANDMARK_LABEL_DEPTH);
  }

  /** Rectángulo del mundo para los límites de la cámara (con aire arriba para los edificios altos). */
  worldBounds(): Phaser.Geom.Rectangle {
    const { width, height } = this.map;
    const left = isoPoint(-0.5, height - 0.5).x;
    const right = isoPoint(width - 0.5, -0.5).x;
    const top = isoPoint(-0.5, -0.5).y - 480;
    const bottom = isoPoint(width - 0.5, height - 0.5).y + EDGE_THICKNESS + 120;
    return new Phaser.Geom.Rectangle(left - 160, top, right - left + 320, bottom - top);
  }

  /** Atenúa los edificios que están delante del avatar propio y lo tapan. */
  updateOcclusion(focus: OcclusionFocus | null, delta: number) {
    const t = Math.min(1, delta / FADE_MS);
    for (const { image, silhouette, bounds } of this.pieces) {
      let target = 1;
      if (focus && image.depth > focus.depth) {
        const feetY = focus.y - 8;
        const headY = focus.y - 45;
        const hit =
          (bounds.contains(focus.x, feetY) && Phaser.Geom.Polygon.Contains(silhouette, focus.x, feetY)) ||
          (bounds.contains(focus.x, headY) && Phaser.Geom.Polygon.Contains(silhouette, focus.x, headY));
        if (hit) target = OCCLUDER_ALPHA;
      }
      if (image.alpha === target) continue;
      const next = Phaser.Math.Linear(image.alpha, target, t);
      image.setAlpha(Math.abs(next - target) < 0.01 ? target : next);
    }
  }

  // -------------------------------------------------------------------------------------------

  private drawGround() {
    const { width, height, city } = this.map;
    const key = `ground-${city.id}`;
    const left = Math.floor(isoPoint(-0.5, height - 0.5).x);
    const top = Math.floor(isoPoint(-0.5, -0.5).y);
    const right = Math.ceil(isoPoint(width - 0.5, -0.5).x);
    const bottom = Math.ceil(isoPoint(width - 0.5, height - 0.5).y + EDGE_THICKNESS);

    if (!this.scene.textures.exists(key)) {
      const g = this.scene.make.graphics({}, false);
      const offset = (point: { x: number; y: number }, dy = 0) => ({ x: point.x - left, y: point.y - top + dy });

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const char = this.map.tileAt(x, y) ?? TileChar.Block;
          const colors = GROUND_COLORS[char] ?? GROUND_COLORS[TileChar.Plaza];
          const color = colors[(x + y) % 2];
          const d = tileDiamond(x, y);
          const diamond = [offset(d.top), offset(d.right), offset(d.bottom), offset(d.left)];

          // Borde del mapa: espesor del "tablero".
          if (y === height - 1) {
            g.fillStyle(shade(color, -35), 1);
            g.fillPoints([offset(d.left), offset(d.bottom), offset(d.bottom, EDGE_THICKNESS), offset(d.left, EDGE_THICKNESS)], true);
          }
          if (x === width - 1) {
            g.fillStyle(shade(color, -45), 1);
            g.fillPoints([offset(d.bottom), offset(d.right), offset(d.right, EDGE_THICKNESS), offset(d.bottom, EDGE_THICKNESS)], true);
          }

          // La escollera se pinta al final (ver abajo): el agua de adelante taparía sus muros.
          if (char === TileChar.Jetty) continue;

          g.fillStyle(color, 1);
          g.fillPoints(diamond, true);

          if (char === TileChar.Water && this.isNextToJetty(x, y)) {
            // Rocas de la escollera asomando del agua.
            const c = offset(tileToWorld(x, y));
            for (let i = 0; i < 3; i++) {
              const h = tileHash(x, y, 20 + i);
              const rx = c.x + ((h % 30) - 15);
              const ry = c.y + (((h >>> 5) % 14) - 7);
              const size = 6 + ((h >>> 9) % 6);
              g.fillStyle(i % 2 === 0 ? 0x77746d : 0x66635d, 1);
              g.fillEllipse(rx, ry, size * 1.6, size);
              g.fillStyle(0x8f8b83, 1);
              g.fillEllipse(rx - 1, ry - 2, size * 0.9, size * 0.45);
            }
          } else if (char === TileChar.Water) {
            if (tileHash(x, y, 7) % 3 === 0) {
              const c = offset(tileToWorld(x, y));
              g.lineStyle(1.5, 0x8cc3da, 0.45);
              g.lineBetween(c.x - 10, c.y, c.x + 6, c.y - 3);
            }
          } else {
            g.lineStyle(1, 0x000000, char === TileChar.Street ? 0.12 : 0.07);
            g.strokePoints(diamond, true);
          }
        }
      }

      // Escollera: primero los muros hacia el agua (caras sur y este), después las losas encima.
      const jetty: Array<[number, number]> = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) if (this.map.tileAt(x, y) === TileChar.Jetty) jetty.push([x, y]);
      }
      for (const [x, y] of jetty) {
        const d = tileDiamond(x, y);
        if (this.map.tileAt(x, y + 1) === TileChar.Water) {
          g.fillStyle(0x6b6862, 1);
          g.fillPoints([offset(d.left), offset(d.bottom), offset(d.bottom, JETTY_WALL), offset(d.left, JETTY_WALL)], true);
        }
        if (this.map.tileAt(x + 1, y) === TileChar.Water) {
          g.fillStyle(0x5b5853, 1);
          g.fillPoints([offset(d.bottom), offset(d.right), offset(d.right, JETTY_WALL), offset(d.bottom, JETTY_WALL)], true);
        }
      }
      for (const [x, y] of jetty) {
        const d = tileDiamond(x, y);
        const slab = [offset(d.top), offset(d.right), offset(d.bottom), offset(d.left)];
        g.fillStyle(GROUND_COLORS[TileChar.Jetty][(x + y) % 2], 1);
        g.fillPoints(slab, true);
        g.lineStyle(1, 0x000000, 0.14);
        g.strokePoints(slab, true);
        // Junta entre las losas de piedra.
        const c = offset(tileToWorld(x, y));
        g.lineStyle(1, 0x000000, 0.1);
        g.lineBetween(c.x - 16, c.y - 8, c.x + 16, c.y + 8);
      }

      g.generateTexture(key, right - left, bottom - top);
      g.destroy();
    }

    this.scene.add.image(left, top, key).setOrigin(0, 0).setDepth(FLOOR_DEPTH);
  }

  private isNextToJetty(x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) if (this.map.tileAt(x + dx, y + dy) === TileChar.Jetty) return true;
    }
    return false;
  }

  /** Casas de las manzanas, árboles, palmeras y bancos: una pieza por tile. */
  private drawProps() {
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const char = this.map.tileAt(x, y);
        if (char === TileChar.Block) this.placePiece({ x, y }, houseSpec(x, y));
        else if (char === TileChar.Tree) this.placePiece({ x, y }, treeSpec(x, y));
        else if (char === TileChar.Palm) this.placePiece({ x, y }, palmSpec(x, y));
      }
    }
    for (const bench of this.map.city.benches) this.placePiece(bench, benchSpec(bench.facing));
  }

  private placePiece(tile: TilePoint, spec: PieceSpec) {
    const scale = spec.scale ?? 1;
    const x1 = spec.width - 0.5;
    const y1 = spec.height - 0.5;
    const ox = Math.floor(isoPoint(-0.5, y1).x - TEXTURE_MARGIN);
    const oy = Math.floor(isoPoint(-0.5, -0.5, spec.maxZ).y - TEXTURE_MARGIN);
    const textureWidth = Math.ceil(isoPoint(x1, -0.5).x + TEXTURE_MARGIN) - ox;
    const textureHeight = Math.ceil(isoPoint(x1, y1).y + TEXTURE_MARGIN) - oy;

    if (!this.scene.textures.exists(spec.key)) {
      // La escala se aplica al rasterizar (no al mostrar la imagen), así no se pixela.
      const g = this.scene.make.graphics({}, false).setScale(scale);
      spec.draw(new IsoPainter(g, ox, oy));
      g.generateTexture(spec.key, Math.ceil(textureWidth * scale), Math.ceil(textureHeight * scale));
      g.destroy();
    }

    // La esquina noroeste del dibujo (-0.5, -0.5) cae en la esquina noroeste del área en el mapa.
    const corner = isoPoint(-0.5, -0.5);
    const mapCorner = isoPoint(tile.x - 0.5, tile.y - 0.5);
    const image = this.scene.add
      .image(mapCorner.x + (ox - corner.x) * scale, mapCorner.y + (oy - corner.y) * scale, spec.key)
      .setOrigin(0, 0);

    const width = spec.width * scale;
    const height = spec.height * scale;
    // Áreas cuadradas: el borde frontal (x + w - 1) + y separa lo que queda delante y detrás.
    const frontSum = tile.x + width - 1 + tile.y;
    image.setDepth(frontSum * HALF_H + 1);

    const maxZ = spec.maxZ * scale;
    const corners: Array<[number, number, number]> = [
      [-0.5, height - 0.5, 0],
      [width - 0.5, height - 0.5, 0],
      [width - 0.5, -0.5, 0],
      [width - 0.5, -0.5, maxZ],
      [-0.5, -0.5, maxZ],
      [-0.5, height - 0.5, maxZ],
    ];
    const silhouette = new Phaser.Geom.Polygon(
      corners.map(([cx, cy, cz]) => {
        const point = isoPoint(tile.x + cx, tile.y + cy, cz);
        return new Phaser.Geom.Point(point.x, point.y);
      }),
    );
    this.pieces.push({ image, silhouette, bounds: Phaser.Geom.Polygon.GetAABB(silhouette) });
  }

  /** Nombres pintados sobre el piso, alineados con el eje este-oeste. */
  private drawPlaceLabels() {
    const angle = Math.atan2(HALF_H, TILE_WIDTH / 2);
    for (const label of this.map.city.placeLabels) {
      const point = isoPoint(label.x, label.y);
      const overWater = this.map.tileAt(Math.round(label.x), Math.round(label.y)) === TileChar.Water;
      this.scene.add
        .text(point.x, point.y, label.name.toUpperCase(), {
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: overWater ? "#cfe9f5" : "#ffffff",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(0.5)
        .setRotation(angle)
        .setAlpha(0.6)
        .setDepth(GROUND_LABEL_DEPTH);
    }
  }
}
