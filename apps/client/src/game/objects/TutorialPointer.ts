import * as Phaser from "phaser";
import type { TileRect } from "@montevideo-world/shared";
import { tileToWorld } from "../iso";

/** Dorado, como los carteles de los lugares: no se confunde con la flecha celeste del avatar propio. */
const COLOR = 0xffd166;
/** Por encima de edificios, avatares y la noche; por debajo de nombres y globos. */
const WORLD_DEPTH = 999_000;
const EDGE_DEPTH = 2_000_000;
/** La flecha sobre el lugar: cuánto sube del piso, cuánto rebota y en cuánto tiempo. */
const LIFT = 70;
const BOUNCE = 10;
const BOUNCE_MS = 900;
const EDGE_RADIUS = 20;

/** Margen de la flecha del borde (lo mismo que la del avatar: no tapa el HUD ni el dock). */
export interface EdgeInset {
  side: number;
  top: number;
  bottom: number;
}

/**
 * Flecha de la guía de bienvenida: una flecha dorada que rebota sobre el lugar al que hay que ir y,
 * si está fuera de pantalla, otra en el borde que apunta hacia él. Sólo dibujo: el paso y el lugar
 * los decide React (`TutorialCard` → `tutorial:target`), que los saca del server.
 */
export class TutorialPointer {
  private readonly world: Phaser.GameObjects.Graphics;
  private readonly edge: Phaser.GameObjects.Graphics;
  /** Punta de la flecha (coordenadas de mundo), o null sin destino en este barrio. */
  private spot: { x: number; y: number } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly inset: () => EdgeInset,
  ) {
    this.world = scene.add.graphics().setDepth(WORLD_DEPTH);
    this.edge = scene.add.graphics().setScrollFactor(0).setDepth(EDGE_DEPTH);
  }

  /** Área de tiles a señalar (en este barrio), o null para sacar la flecha. */
  setTarget(area: TileRect | null) {
    if (!area) {
      this.spot = null;
      return;
    }
    // El centro del área, sobre el piso; la flecha va arriba (los edificios son altos).
    const center = tileToWorld(area.x + (area.width - 1) / 2, area.y + (area.height - 1) / 2);
    this.spot = { x: center.x, y: center.y - LIFT };
  }

  update(time: number) {
    this.world.clear();
    this.edge.clear();
    const spot = this.spot;
    if (!spot) return;

    const bounce = Math.sin((time / BOUNCE_MS) * Math.PI * 2) * BOUNCE;
    const y = spot.y + bounce;
    // Flecha hacia abajo con borde oscuro, para que se vea sobre cualquier piso.
    this.world.fillStyle(0x12151f, 0.9).fillTriangle(spot.x - 16, y - 24, spot.x + 16, y - 24, spot.x, y + 2);
    this.world.fillStyle(COLOR, 1).fillTriangle(spot.x - 12, y - 21, spot.x + 12, y - 21, spot.x, y - 2);
    this.world.fillRect(spot.x - 5, y - 36, 10, 16);

    this.drawEdgeArrow(spot);
  }

  dispose() {
    this.world.destroy();
    this.edge.destroy();
  }

  /** Si el lugar no se ve, una flecha en el borde de la pantalla que apunta hacia él. */
  private drawEdgeArrow(spot: { x: number; y: number }) {
    const camera = this.scene.cameras.main;
    const view = camera.worldView;
    const zoom = camera.zoom;
    const screenX = (spot.x - view.x) * zoom;
    const screenY = (spot.y - view.y) * zoom;
    const { width, height } = camera;
    if (screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height) return;

    const inset = this.inset();
    const cx = width / 2;
    const cy = height / 2;
    const dx = screenX - cx;
    const dy = screenY - cy;
    const limitX = dx > 0 ? width - inset.side - cx : inset.side - cx;
    const limitY = dy > 0 ? height - inset.bottom - cy : inset.top - cy;
    const scale = Math.min(dx !== 0 ? limitX / dx : Infinity, dy !== 0 ? limitY / dy : Infinity);
    const x = cx + dx * scale;
    const y = cy + dy * scale;

    // Fija a la cámara: el zoom la escala desde el centro, así que se deshace (como la del avatar).
    const angle = Math.atan2(dy, dx);
    const g = this.edge.setPosition(cx + (x - cx) / zoom, cy + (y - cy) / zoom).setScale(1 / zoom);
    g.fillStyle(0x12151f, 0.85).fillCircle(0, 0, EDGE_RADIUS);
    g.lineStyle(2, COLOR, 1).strokeCircle(0, 0, EDGE_RADIUS);
    const tip = { x: Math.cos(angle) * 13, y: Math.sin(angle) * 13 };
    const back = (offset: number) => ({ x: Math.cos(angle + offset) * 9, y: Math.sin(angle + offset) * 9 });
    const left = back(2.5);
    const right = back(-2.5);
    g.fillStyle(COLOR, 1).fillTriangle(tip.x, tip.y, left.x, left.y, right.x, right.y);
  }
}
