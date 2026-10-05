import * as Phaser from "phaser";
import { darknessAt } from "@montevideo-world/shared";

/** Por encima de edificios y avatares, por debajo de carteles, nombres y globos. */
export const NIGHT_DEPTH = 400000;
/** El velo pasa de un tono cálido (atardecer/amanecer) al azul de la noche cerrada. */
const DUSK_COLOR = { r: 0x7a, g: 0x3b, b: 0x12 };
const NIGHT_COLOR = { r: 0x0a, g: 0x15, b: 0x30 };
const NIGHT_ALPHA = 0.55;
/** Cuánto tarda la luz en alcanzar la de la hora (suaviza saltos, p. ej. si un admin mueve el reloj). */
const EASE_MS = 1200;

/** Fuente de luz que se enciende al oscurecer (coordenadas de mundo). */
export interface NightLight {
  x: number;
  y: number;
  radius: number;
  color: number;
}

/**
 * Luz del barrio según la hora del juego: un velo fijo a la cámara que se va oscureciendo al
 * atardecer y aclarando al amanecer (`darknessAt`), y halos de luz (farola, vidrieras, carteles,
 * faroles) con mezcla aditiva que se prenden a medida que oscurece.
 */
export class DayNight {
  private readonly veil: Phaser.GameObjects.Rectangle;
  private readonly lights: Phaser.GameObjects.Graphics;
  private darkness = 0;
  private target = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    lights: NightLight[],
  ) {
    this.veil = scene.add
      .rectangle(0, 0, 1, 1, 0x000000)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(NIGHT_DEPTH)
      .setAlpha(0);

    this.lights = scene.add.graphics().setDepth(NIGHT_DEPTH + 1).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    for (const light of lights) {
      // Halo con caída suave: círculos concéntricos cada vez más transparentes.
      for (let i = 6; i >= 1; i--) {
        this.lights.fillStyle(light.color, 0.07);
        this.lights.fillCircle(light.x, light.y, (light.radius * i) / 6);
      }
    }

    this.resize(scene.scale.gameSize);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
  }

  /** Nueva hora del juego. `immediate` para el estado inicial (sin fundido al entrar al barrio). */
  setMinute(minuteOfDay: number, immediate = false) {
    this.target = darknessAt(minuteOfDay);
    if (immediate) {
      this.darkness = this.target;
      this.apply();
    }
  }

  /** Llamar en cada frame: acerca la luz a la de la hora. */
  update(delta: number) {
    if (this.darkness === this.target) return;
    const step = delta / EASE_MS;
    const diff = this.target - this.darkness;
    this.darkness = Math.abs(diff) <= step ? this.target : this.darkness + Math.sign(diff) * step;
    this.apply();
  }

  dispose() {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
  }

  private apply() {
    const d = this.darkness;
    const mix = (from: number, to: number) => Math.round(from + (to - from) * d);
    const color = (mix(DUSK_COLOR.r, NIGHT_COLOR.r) << 16) | (mix(DUSK_COLOR.g, NIGHT_COLOR.g) << 8) | mix(DUSK_COLOR.b, NIGHT_COLOR.b);
    this.veil.setFillStyle(color).setAlpha(d * NIGHT_ALPHA);
    this.lights.setAlpha(d);
  }

  /**
   * El velo es fijo a la cámara pero el zoom igual lo escala desde el centro: se lo hace bastante
   * más grande que la pantalla para que la cubra entera con cualquier zoom.
   */
  private resize(size: Phaser.Structs.Size) {
    this.veil.setPosition(-size.width, -size.height).setSize(size.width * 3, size.height * 3);
  }
}
