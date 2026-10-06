import * as Phaser from "phaser";

/** Lado de cada página del atlas (px): entra en la textura máxima de cualquier GPU de celular. */
const PAGE_SIZE = 2048;
/** Separación entre cuadros (px), para que el filtrado lineal no mezcle una pieza con la vecina. */
const GUTTER = 2;

interface Page {
  key: string;
  texture: Phaser.Textures.CanvasTexture;
  /** Estante actual (empaquetado por filas): dónde sigue y lo alto de la fila. */
  x: number;
  y: number;
  shelf: number;
}

/** Dónde quedó una pieza: textura y cuadro para `scene.add.image`. */
export interface AtlasSlot {
  texture: string;
  frame?: string;
}

/**
 * Atlas de las piezas de un barrio (casas, torres, árboles, edificios, bancos…): en vez de una
 * textura por variante (cientos en el Centro), se hornean juntas en pocas páginas de `PAGE_SIZE`.
 * Así Phaser dibuja el mapa entero con muy pocos cambios de textura (cada uno corta el lote).
 *
 * Se dibuja en el canvas de la página con `generateTexture` (sin subirla a la GPU cada vez) y
 * `upload` sube cada página una sola vez al terminar de armar el barrio. Las páginas son del barrio
 * (`prefix`): `destroy` las libera al irse.
 */
export class PieceAtlas {
  private readonly pages: Page[] = [];
  private readonly slots = new Map<string, AtlasSlot>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly prefix: string,
  ) {}

  /**
   * La pieza `key` (de `width` × `height` px): si ya está, su lugar; si no, la dibuja (`draw`
   * recibe un `Graphics` con el (0, 0) en la esquina de su cuadro). Lo que no entra en una página
   * va a una textura suelta, como antes.
   */
  add(key: string, width: number, height: number, draw: (g: Phaser.GameObjects.Graphics) => void): AtlasSlot {
    const known = this.slots.get(key);
    if (known) return known;
    if (this.scene.textures.exists(key) || width + GUTTER * 2 > PAGE_SIZE || height + GUTTER * 2 > PAGE_SIZE) {
      const slot = { texture: key };
      if (!this.scene.textures.exists(key)) {
        const g = this.scene.make.graphics({}, false);
        draw(g);
        g.generateTexture(key, width, height);
        g.destroy();
      }
      this.slots.set(key, slot);
      return slot;
    }

    const { page, x, y } = this.place(width, height);
    const g = this.scene.make.graphics({}, false);
    g.translateCanvas(x, y);
    draw(g);
    g.generateTexture(page.texture.getSourceImage() as HTMLCanvasElement);
    g.destroy();
    page.texture.add(key, 0, x, y, width, height);
    const slot = { texture: page.key, frame: key };
    this.slots.set(key, slot);
    return slot;
  }

  /** Sube las páginas a la GPU (una vez, al terminar de armar el barrio). */
  upload() {
    for (const page of this.pages) page.texture.refresh();
  }

  /** Libera las páginas (al irse del barrio). */
  destroy() {
    for (const page of this.pages) if (this.scene.textures.exists(page.key)) this.scene.textures.remove(page.key);
    this.pages.length = 0;
    this.slots.clear();
  }

  /** Lugar libre de `width` × `height` (estantes de izquierda a derecha y de arriba abajo; si no hay, página nueva). */
  private place(width: number, height: number): { page: Page; x: number; y: number } {
    let page = this.pages[this.pages.length - 1];
    if (page && page.x + width + GUTTER > PAGE_SIZE) {
      page.x = GUTTER;
      page.y += page.shelf + GUTTER;
      page.shelf = 0;
    }
    if (!page || page.y + height + GUTTER > PAGE_SIZE) {
      const key = `${this.prefix}-${this.pages.length}`;
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
      const texture = this.scene.textures.createCanvas(key, PAGE_SIZE, PAGE_SIZE);
      if (!texture) throw new Error(`No se pudo crear la página del atlas ${key}`);
      page = { key, texture, x: GUTTER, y: GUTTER, shelf: 0 };
      this.pages.push(page);
    }
    const spot = { page, x: page.x, y: page.y };
    page.x += width + GUTTER;
    page.shelf = Math.max(page.shelf, height);
    return spot;
  }
}
