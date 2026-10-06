import * as Phaser from "phaser";
import { CityMap, Landmark, TILE_HEIGHT, TILE_WIDTH, TileChar, TilePoint, TileRect, getCityInfo } from "@montevideo-world/shared";
import { hexToNumber } from "@/lib/avatar/shapes";
import { shade } from "../color";
import { isoPoint, tileDiamond, tileToWorld } from "../iso";
import { InnerDoorPart, InnerWallStyle, PieceSpec, benchSpec, bigHouseSpec, boatSpec, streetLampSpec, bigTowerSpec, busStopSpec, houseSpec, innerWallSpec, jacuzziSpec, palmSpec, portalSpec, shopBuildingSpec, tileHash, towerSpec, treeSpec, wallSpec, fenceSpec } from "./buildings";
import type { NightLight } from "./DayNight";
import { IsoPainter } from "./IsoPainter";
import { PieceAtlas } from "./PieceAtlas";
import { landmarkPieces, roofSpot } from "./landmarks";
import { drawStringLights, stringLightGlows } from "./stringLights";

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
/** Lado máximo (px) de cada trozo del piso horneado: entra en cualquier GPU (mínimo habitual 4096). */
const GROUND_CHUNK = 2048;
/**
 * Cuánto se pisan los trozos del piso entre sí (px). Pegados borde con borde, con zoom o la cámara
 * entre píxeles queda una rendija de menos de un píxel y se ve el fondo como una línea oscura.
 */
const GROUND_CHUNK_OVERLAP = 2;
/** Opacidad de un edificio que tapa al avatar propio. */
const OCCLUDER_ALPHA = 0.35;
/** Culling: se dibuja lo que cae en la vista de la cámara más este margen (px de mundo)… */
const CULL_MARGIN = 320;
/** …y se recalcula recién cuando la vista se corrió esto (o cambió el zoom). */
const CULL_STEP = 96;
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
  [TileChar.Tower]: [0x8a8c90, 0x8a8c90],
  [TileChar.Jetty]: [0x8f8b83, 0x87837b],
  [TileChar.Wall]: [0x6d6a64, 0x6d6a64],
  [TileChar.Fence]: [0xd9cdb4, 0xd2c6ac],
  [TileChar.Floor]: [0xe2d6c0, 0xd6c8ae],
  [TileChar.Sidewalk]: [0xc9c3b8, 0xc1bbb0],
  [TileChar.Building]: [0x77746e, 0x77746e],
  [TileChar.InnerWall]: [0xd6c8ae, 0xd6c8ae],
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

/** Algo fijo del mapa que se deja de dibujar fuera de la cámara (pieza, cartel), con su caja de mundo. */
interface Cullable {
  object: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
  rect: Phaser.Geom.Rectangle;
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
  /** Todo lo que entra en el culling (las piezas, también las que no tapan, y los carteles). */
  private readonly cullables: Cullable[] = [];
  /** Vista con la que se hizo el último culling (null = nunca). */
  private culledView: { x: number; y: number; width: number; height: number } | null = null;
  /** Última posición del foco de la oclusión y si quedó algún fundido a medias (si no, no se recorre nada). */
  private occlusionKey = "";
  private fading = false;
  /** Las piezas del barrio, horneadas juntas en pocas páginas (ver `PieceAtlas`). */
  private readonly atlas: PieceAtlas;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: CityMap,
  ) {
    this.atlas = new PieceAtlas(scene, `atlas-${map.city.id}`);
  }

  build() {
    this.drawGround();
    this.drawProps();
    const logo = this.logoPlacement();
    /** Varios landmarks con el mismo nombre (las cuatro hileras de Casas de Reus al Norte): un solo cartel. */
    const signed = new Set<string>();
    for (const landmark of this.map.city.landmarks) {
      const placed = landmarkPieces(landmark);
      for (const { tile, spec } of placed) this.placePiece(tile, spec);

      // Si lleva el cartel "MW", el nombre del edificio va por encima del cartel.
      const buildingTop = Math.max(...placed.map(({ spec }) => spec.maxZ * (spec.scale ?? 1)));
      const maxZ = logo?.landmark === landmark ? Math.max(buildingTop, logo.topZ) : buildingTop;
      // Las garitas y las plantas son decorado: sin cartel.
      if (landmark.kind !== "watchtower" && !["plant", "pottedPalm", "flowers", "lamp"].includes(landmark.kind) && !signed.has(landmark.name)) {
        signed.add(landmark.name);
        this.addSign(landmark.name, landmark.area, maxZ, "#ffd166", "rgba(18, 21, 31, 0.78)");
      }
    }
    for (const shop of this.map.city.shops) {
      // Las tiendas "none" funcionan dentro de un edificio ya dibujado: el cartel va sobre la fachada.
      let signZ = 46;
      if (shop.building !== "none") {
        const spec = shopBuildingSpec(shop.building);
        this.placePiece(shop.area, spec);
        signZ = spec.maxZ;
      }
      // Las máquinas y mesas del casino y el Registro de Barras ya tienen el cartel de su edificio: sin "Tienda".
      if (shop.casino || shop.registry) continue;
      this.addSign(`Tienda · ${shop.name}`, shop.area, signZ, "#9ef0c9", "rgba(20, 60, 48, 0.88)");
    }
    for (const stop of this.map.city.busStops) {
      const spec = busStopSpec(stop.facing);
      this.placePiece(stop, spec);
      this.addSign(`Parada · ${stop.name}`, { x: stop.x, y: stop.y, width: 1, height: 1 }, spec.maxZ, "#ffffff", "rgba(29, 95, 168, 0.88)");
    }
    this.drawPortals();
    this.drawPlaceLabels();
    if (logo) this.drawLogoSign(logo);
    // Todo horneado: recién ahora se suben las páginas del atlas a la GPU (una vez cada una).
    this.atlas.upload();
  }

  /**
   * Al irse del barrio: libera las texturas que son sólo de él (piso, guirnaldas y atlas). Las que
   * comparten todos los barrios (avatares, halos, clima) quedan para el próximo.
   */
  destroy() {
    this.atlas.destroy();
    const id = this.map.city.id;
    for (const key of this.scene.textures.getTextureKeys()) {
      if (key.startsWith(`ground-${id}-`) || key.startsWith(`garland-${id}-`)) this.scene.textures.remove(key);
    }
  }

  /**
   * El arco de las salidas por el borde (`Door.edge`, 18 de Julio entre Ciudad Vieja y el Centro):
   * pilares de piedra con farol en las puntas y el arco de hierro sobre la calle, con el cartel del
   * destino como el nomenclátor de la calle. No tapa al avatar (se camina pegado y por debajo).
   */
  private drawPortals() {
    for (const door of this.map.city.doors ?? []) {
      if (!door.edge) continue;
      const { x, y, height } = door.area;
      for (let i = 0; i < height; i++) {
        const role = i === 0 ? "start" : i === height - 1 ? "end" : "curtain";
        this.placePiece({ x, y: y + i }, portalSpec(role), { occludes: false });
      }
      const destination = getCityInfo(door.to.cityId)?.name ?? "";
      this.addSign(`18 de Julio · hacia ${destination}`, door.area, 178, "#ffffff", "rgba(29, 79, 138, 0.9)");
    }
  }


  /**
   * Dónde va el cartel "MW": el punto del techo del edificio emblemático indicado en
   * `CityDefinition.logoSign` (ver `roof` en `landmarks/`), escalado como el edificio.
   */
  private logoPlacement() {
    const id = this.map.city.logoSign?.landmarkId;
    const landmark = this.map.city.landmarks.find((candidate) => candidate.id === id);
    const spot = landmark ? roofSpot(landmark.kind) : undefined;
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
   * el cartel "MW", un farol junto a cada banco y el refugio de cada parada de ómnibus.
   */
  nightLights(): NightLight[] {
    const lights: NightLight[] = [];
    for (const landmark of this.map.city.landmarks) {
      if (landmark.kind === "lamp") {
        // Faroles del spa del hotel: luz cálida que se prende de noche.
        lights.push({ ...isoPoint(landmark.area.x, landmark.area.y, 44), radius: 80, color: 0xffd98a });
        continue;
      }
      if (landmark.kind !== "lighthouse") continue;
      const lantern = isoPoint(landmark.area.x, landmark.area.y, 70);
      lights.push({ ...lantern, radius: 90, color: 0xffd166 });
    }
    for (const shop of this.map.city.shops) {
      if (shop.building === "none") continue;
      const { x, y, width, height } = shop.area;
      const front = isoPoint(x + width - 1, y + height - 1, 16);
      lights.push({ ...front, radius: 70, color: 0xffe0a3 });
    }
    const logo = this.logoPlacement();
    if (logo) lights.push({ x: logo.roof.x, y: logo.roof.y - LOGO_POST_HEIGHT - LOGO_SIZE / 2, radius: 60, color: 0x9fd3ff });
    // Faroles de la rambla.
    for (const lamp of this.map.city.streetLamps ?? []) {
      lights.push({ ...isoPoint(lamp.x + 0.32, lamp.y + 0.32, 50), radius: 85, color: 0xffd98a });
    }
    if (this.map.city.interior?.nightclub) lights.push(...this.nightclubLights());
    // Las lamparitas de las guirnaldas (Plaza Cagancha).
    lights.push(...stringLightGlows(this.map.city.stringLights ?? []));
    for (const stop of this.map.city.busStops) {
      lights.push({ ...isoPoint(stop.x, stop.y, 30), radius: 50, color: 0xdff1ff });
    }
    // Los faroles de los pilares del arco de 18 de Julio (las salidas por el borde).
    for (const door of this.map.city.doors ?? []) {
      if (!door.edge) continue;
      for (const y of [door.area.y, door.area.y + door.area.height - 1]) lights.push({ ...isoPoint(door.area.x, y, 160), radius: 70, color: 0xffd98a });
    }
    return lights;
  }

  /** Cartel flotante sobre un edificio (emblemático o tienda), por encima de todos los volúmenes. */
  private addSign(text: string, area: TileRect, maxZ: number, color: string, background: string) {
    const top = isoPoint(area.x + (area.width - 1) / 2, area.y + (area.height - 1) / 2, maxZ + 8);
    const sign = this.scene.add
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
    this.cullables.push({ object: sign, rect: sign.getBounds() });
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
    // Quieto y sin fundidos a medias: nada cambió, no se recorren las piezas.
    const key = focus ? `${Math.round(focus.x)},${Math.round(focus.y)},${Math.round(focus.depth)}` : "";
    if (key === this.occlusionKey && !this.fading) return;
    this.occlusionKey = key;
    this.fading = false;
    const t = Math.min(1, delta / FADE_MS);
    for (const { image, silhouette, bounds } of this.pieces) {
      // Fuera de cámara (culling): no tapa a nadie que se vea; si quedó transparente, vuelve de golpe.
      if (!image.visible) {
        if (image.alpha !== 1) image.setAlpha(1);
        continue;
      }
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
      const done = Math.abs(next - target) < 0.01;
      image.setAlpha(done ? target : next);
      if (!done) this.fading = true;
    }
  }

  /**
   * Deja de dibujar las piezas y los carteles que quedan fuera de la cámara (Phaser no lo hace solo:
   * sin esto cada frame procesa los cientos de edificios del barrio aunque no se vean). Llamar en
   * cada frame: sólo recorre la lista cuando la vista se movió `CULL_STEP` o cambió de tamaño.
   */
  updateCulling(view: Phaser.Geom.Rectangle) {
    const last = this.culledView;
    if (
      last &&
      Math.abs(last.x - view.x) < CULL_STEP &&
      Math.abs(last.y - view.y) < CULL_STEP &&
      Math.abs(last.width - view.width) < 1 &&
      Math.abs(last.height - view.height) < 1
    ) {
      return;
    }
    this.culledView = { x: view.x, y: view.y, width: view.width, height: view.height };
    const area = new Phaser.Geom.Rectangle(view.x - CULL_MARGIN, view.y - CULL_MARGIN, view.width + CULL_MARGIN * 2, view.height + CULL_MARGIN * 2);
    for (const { object, rect } of this.cullables) {
      const visible = Phaser.Geom.Intersects.RectangleToRectangle(area, rect);
      if (object.visible !== visible) object.setVisible(visible);
    }
    // Lo que volvió a verse recalcula la oclusión.
    this.occlusionKey = "";
  }

  // -------------------------------------------------------------------------------------------

  /**
   * Piso del barrio horneado en trozos de `GROUND_CHUNK` px como mucho: una sola textura de un
   * mapa grande pasaría el tamaño máximo de textura de muchas GPU de celular (4096 px).
   * Cada trozo dibuja sólo los tiles que lo tocan; los rombos del borde se dibujan en los dos
   * trozos vecinos (el canvas recorta), así no quedan costuras.
   */
  private drawGround() {
    const { width, height, city } = this.map;
    const left = Math.floor(isoPoint(-0.5, height - 0.5).x);
    const top = Math.floor(isoPoint(-0.5, -0.5).y);
    const right = Math.ceil(isoPoint(width - 0.5, -0.5).x);
    const bottom = Math.ceil(isoPoint(width - 0.5, height - 0.5).y + EDGE_THICKNESS);

    const jetty: Array<[number, number]> = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) if (this.map.tileAt(x, y) === TileChar.Jetty) jetty.push([x, y]);
    }

    for (let chunkTop = top, row = 0; chunkTop < bottom; chunkTop += GROUND_CHUNK, row++) {
      for (let chunkLeft = left, col = 0; chunkLeft < right; chunkLeft += GROUND_CHUNK, col++) {
        const key = `ground-${city.id}-${col}-${row}`;
        const chunkWidth = Math.min(GROUND_CHUNK, right - chunkLeft);
        const chunkHeight = Math.min(GROUND_CHUNK, bottom - chunkTop);
        // Cada trozo se hornea con un margen de más que queda debajo del vecino (ver GROUND_CHUNK_OVERLAP).
        const pad = GROUND_CHUNK_OVERLAP;
        if (!this.scene.textures.exists(key)) {
          this.bakeGroundChunk(key, chunkLeft - pad, chunkTop - pad, chunkWidth + 2 * pad, chunkHeight + 2 * pad, jetty);
        }
        this.scene.add.image(chunkLeft - pad, chunkTop - pad, key).setOrigin(0, 0).setDepth(FLOOR_DEPTH);
      }
    }
  }

  private bakeGroundChunk(key: string, left: number, top: number, chunkWidth: number, chunkHeight: number, jetty: Array<[number, number]>) {
    const { width, height } = this.map;
    const g = this.scene.make.graphics({}, false);
    const offset = (point: { x: number; y: number }, dy = 0) => ({ x: point.x - left, y: point.y - top + dy });
    // ¿El tile (con su espesor, muros y rocas) cae dentro de este trozo?
    const touches = (x: number, y: number) => {
      const c = tileToWorld(x, y);
      return (
        c.x + TILE_WIDTH / 2 + 4 >= left &&
        c.x - TILE_WIDTH / 2 - 4 <= left + chunkWidth &&
        c.y + HALF_H + EDGE_THICKNESS + 4 >= top &&
        c.y - HALF_H - 4 <= top + chunkHeight
      );
    };

    // Interior con estilo (el casino): piso de sus colores y, si es alfombra, su dibujo encima.
    const interior = this.map.city.interior;
    const interiorFloor = interior ? ([hexToNumber(interior.floor[0]), hexToNumber(interior.floor[1])] as const) : undefined;
    const carpet = interior?.carpet ? hexToNumber(interior.carpet) : undefined;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!touches(x, y)) continue;
        const char = this.map.tileAt(x, y) ?? TileChar.Block;
        const colors = (char === TileChar.Floor ? interiorFloor : undefined) ?? GROUND_COLORS[char] ?? GROUND_COLORS[TileChar.Plaza];
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
        } else if (char === TileChar.Floor && carpet !== undefined) {
          // Alfombra: un rombo dorado en cada tile y, alternados, un punto en el medio; sin juntas.
          const c = offset(tileToWorld(x, y));
          const inset = (p: { x: number; y: number }) => ({ x: c.x + (p.x - c.x) * 0.55, y: c.y + (p.y - c.y) * 0.55 });
          g.lineStyle(1.2, carpet, 0.55);
          g.strokePoints(diamond.map(inset), true);
          if ((x + y) % 2 === 0) {
            g.fillStyle(carpet, 0.7);
            g.fillEllipse(c.x, c.y, 6, 3);
          }
        } else {
          g.lineStyle(1, 0x000000, char === TileChar.Street ? 0.12 : 0.07);
          g.strokePoints(diamond, true);
        }
      }
    }

    // Escollera: primero los muros hacia el agua (caras sur y este), después las losas encima.
    const jettyHere = jetty.filter(([x, y]) => touches(x, y));
    for (const [x, y] of jettyHere) {
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
    for (const [x, y] of jettyHere) {
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

    g.generateTexture(key, chunkWidth, chunkHeight);
    g.destroy();
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
        else if (char === TileChar.Tower) this.placePiece({ x, y }, towerSpec(x, y));
        else if (char === TileChar.Tree) this.placePiece({ x, y }, treeSpec(x, y));
        else if (char === TileChar.Palm) this.placePiece({ x, y }, palmSpec(x, y));
        else if (char === TileChar.Wall) {
          const isWall = (tx: number, ty: number) => this.map.tileAt(tx, ty) === TileChar.Wall;
          this.placePiece({ x, y }, wallSpec(isWall(x - 1, y) || isWall(x + 1, y), isWall(x, y - 1) || isWall(x, y + 1)));
        } else if (char === TileChar.InnerWall) {
          this.placePiece({ x, y }, innerWallSpec(this.doorPart(x, y), this.wallStyle()));
        } else if (char === TileChar.Fence) {
          const isBarrier = (tx: number, ty: number) => [TileChar.Fence, TileChar.Wall].includes(this.map.tileAt(tx, ty) as "F" | "W");
          this.placePiece({ x, y }, fenceSpec(isBarrier(x - 1, y) || isBarrier(x + 1, y)));
        }
      }
    }
    // Edificios de relleno grandes (2 × 2): casas en el casco viejo, en altura en el Centro.
    for (const filler of this.map.city.fillers ?? []) {
      this.placePiece(filler, filler.kind === "tower" ? bigTowerSpec(filler.x, filler.y) : bigHouseSpec(filler.x, filler.y));
    }
    for (const bench of this.map.city.benches) this.placePiece(bench, benchSpec(bench.facing, bench.pair));
    for (const lamp of this.map.city.streetLamps ?? []) this.placePiece(lamp, streetLampSpec(), { occludes: false });
    drawStringLights(this.scene, this.map.city.stringLights ?? [], `garland-${this.map.city.id}`);
    // Barcos pesqueros en la bahía: se mecen despacio (cada uno a su ritmo) y no tapan a nadie.
    for (const boat of this.map.city.boats ?? []) {
      const image = this.placePiece(boat, boatSpec(boat.variant, boat.facing), { occludes: false });
      const phase = (boat.x * 7 + boat.y * 13) % 10;
      this.scene.tweens.add({
        targets: image,
        y: image.y + 2,
        duration: 1700 + phase * 90,
        delay: phase * 120,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
    // El jacuzzi es bajo: queda detrás de todos los avatares (los de adentro se dibujan encima, con
    // el agua por delante) y no se vuelve transparente.
    for (const jacuzzi of this.map.city.jacuzzis ?? []) {
      const { x, y } = jacuzzi.area;
      this.placePiece({ x, y }, jacuzziSpec(jacuzzi.area.width), { depth: (x + y) * HALF_H - HALF_H * 2, occludes: false });
    }
  }

  /**
   * Interior de boliche (el casino): cada tragamonedas con su luz de color, las mesas con luz cálida
   * colgando, el neón de la barra, el resplandor del neón a lo largo de las paredes y el verde de la salida.
   */
  private nightclubLights(): NightLight[] {
    const lights: NightLight[] = [];
    const neon = hexToNumber(this.map.city.interior?.neon ?? "#ff3d7f");
    const slotColors = [0xff3d7f, 0xb06bff, 0x3de0ff, 0xffd166];
    let slot = 0;
    for (const { kind, area } of this.map.city.landmarks) {
      const middle = { x: area.x + (area.width - 1) / 2, y: area.y + (area.height - 1) / 2 };
      if (kind === "slotMachine") lights.push({ ...isoPoint(middle.x, middle.y, 36), radius: 48, color: slotColors[slot++ % slotColors.length] });
      else if (kind === "rouletteTable" || kind === "blackjackTable") lights.push({ ...isoPoint(middle.x, middle.y, 26), radius: 95, color: 0xffc36b });
      else if (kind === "barShelf") {
        for (let i = 0; i < area.width; i += 2) lights.push({ ...isoPoint(area.x + i + 0.5, area.y, 70), radius: 60, color: neon });
      } else if (kind === "barCounter") {
        for (let i = 0; i < area.width; i += 2) lights.push({ ...isoPoint(area.x + i + 0.5, area.y + area.height - 1, 20), radius: 45, color: 0xffb347 });
      }
    }
    // El neón de las paredes (norte y oeste).
    const { width, height } = this.map;
    for (let x = 2; x < width; x += 4) lights.push({ ...isoPoint(x, 0.4, 27), radius: 40, color: neon });
    for (let y = 2; y < height; y += 4) lights.push({ ...isoPoint(0.4, y, 27), radius: 40, color: neon });
    for (const door of this.map.city.doors ?? []) {
      lights.push({ ...isoPoint(door.area.x + 0.4, door.area.y + (door.area.height - 1) / 2, 36), radius: 45, color: 0x3dff8a });
    }
    return lights;
  }

  /** Colores de las paredes de este interior (`CityDefinition.interior`), o los de siempre. */
  private wallStyle(): InnerWallStyle | undefined {
    const style = this.map.city.interior;
    if (!style) return undefined;
    return {
      id: this.map.city.id,
      wall: hexToNumber(style.wall),
      base: hexToNumber(style.wallBase),
      trim: hexToNumber(style.wallTrim),
      neon: style.neon ? hexToNumber(style.neon) : undefined,
    };
  }

  /** Qué parte de una puerta de interior cae en (x, y): las de dos tiles se dibujan como puerta doble. */
  private doorPart(x: number, y: number): InnerDoorPart | null {
    const door = this.map.doorAt(x, y);
    if (!door) return null;
    const { area } = door;
    if (area.width === 1 && area.height === 1) return "single";
    return y === area.y && x === area.x ? "start" : "end";
  }

  private placePiece(tile: TilePoint, spec: PieceSpec, options: { depth?: number; occludes?: boolean } = {}): Phaser.GameObjects.Image {
    const scale = spec.scale ?? 1;
    const x1 = spec.width - 0.5;
    const y1 = spec.height - 0.5;
    const ox = Math.floor(isoPoint(-0.5, y1).x - TEXTURE_MARGIN);
    const oy = Math.floor(isoPoint(-0.5, -0.5, spec.maxZ).y - TEXTURE_MARGIN);
    const textureWidth = Math.ceil(isoPoint(x1, -0.5).x + TEXTURE_MARGIN) - ox;
    const textureHeight = Math.ceil(isoPoint(x1, y1).y + TEXTURE_MARGIN) - oy;

    // La escala se aplica al rasterizar (no al mostrar la imagen), así no se pixela.
    const slot = this.atlas.add(spec.key, Math.ceil(textureWidth * scale), Math.ceil(textureHeight * scale), (g) => {
      g.scaleCanvas(scale, scale);
      spec.draw(new IsoPainter(g, ox, oy));
    });

    // La esquina noroeste del dibujo (-0.5, -0.5) cae en la esquina noroeste del área en el mapa.
    const corner = isoPoint(-0.5, -0.5);
    const mapCorner = isoPoint(tile.x - 0.5, tile.y - 0.5);
    const image = this.scene.add
      .image(mapCorner.x + (ox - corner.x) * scale, mapCorner.y + (oy - corner.y) * scale, slot.texture, slot.frame)
      .setOrigin(0, 0);

    const width = spec.width * scale;
    const height = spec.height * scale;
    // Áreas cuadradas: el borde frontal (x + w - 1) + y separa lo que queda delante y detrás.
    const frontSum = tile.x + width - 1 + tile.y;
    image.setDepth(options.depth ?? frontSum * HALF_H + 1);
    // Caja con aire de más arriba y abajo (los barcos se mecen unos px).
    this.cullables.push({ object: image, rect: new Phaser.Geom.Rectangle(image.x, image.y - 4, image.displayWidth, image.displayHeight + 8) });
    if (options.occludes === false) return image;

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
    return image;
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
