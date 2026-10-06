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
/** Textura del halo (blanco, se tiñe con el color de cada luz) y su radio en px. */
const GLOW_TEXTURE = "night-glow";
const GLOW_RADIUS = 64;
/** Anillos de la caída del halo (como los círculos concéntricos de antes) y la opacidad de cada uno. */
const GLOW_RINGS = 6;
const GLOW_RING_ALPHA = 0.07;

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
  /** Todos los halos: una `Image` teñida por luz (comparten la textura, entran en un solo lote). */
  private readonly lights: Phaser.GameObjects.Container;
  private darkness = 0;
  private target = 0;
  /** Luz fija (un interior de boliche, `InteriorStyle.nightclub`): no sigue la hora. */
  private fixed: { color: number; alpha: number } | null = null;
  private hasLights = false;

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

    ensureGlowTexture(scene);
    this.lights = scene.add.container(0, 0).setDepth(NIGHT_DEPTH + 1).setAlpha(0);
    for (const light of lights) {
      this.lights.add(
        scene.add
          .image(light.x, light.y, GLOW_TEXTURE)
          .setTint(light.color)
          .setScale(light.radius / GLOW_RADIUS)
          .setBlendMode(Phaser.BlendModes.ADD),
      );
    }
    // Sin luces (o de día, con alpha 0) Phaser ni lo recorre.
    this.hasLights = lights.length > 0;
    this.lights.setVisible(this.hasLights);

    this.resize(scene.scale.gameSize);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
  }

  /** Nueva hora del juego. `immediate` para el estado inicial (sin fundido al entrar al barrio). */
  setMinute(minuteOfDay: number, immediate = false) {
    if (this.fixed) return;
    this.target = darknessAt(minuteOfDay);
    if (immediate) {
      this.darkness = this.target;
      this.apply();
    }
  }

  /** Siempre de noche, con este velo (color y opacidad) y las luces prendidas del todo. */
  fix(color: number, alpha: number) {
    this.fixed = { color, alpha };
    this.darkness = this.target = 1;
    this.apply();
  }

  /** Llamar en cada frame: acerca la luz a la de la hora. */
  update(delta: number) {
    if (this.darkness === this.target) return;
    const step = delta / EASE_MS;
    const diff = this.target - this.darkness;
    this.darkness = Math.abs(diff) <= step ? this.target : this.darkness + Math.sign(diff) * step;
    this.apply();
  }

  /** Calidad baja: sin halos (el velo de la noche sigue). */
  setGlows(on: boolean) {
    this.lights.setVisible(on && this.hasLights);
  }

  dispose() {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
  }

  private apply() {
    if (this.fixed) {
      this.veil.setFillStyle(this.fixed.color).setAlpha(this.fixed.alpha);
      this.lights.setAlpha(1);
      return;
    }
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

/**
 * El halo, horneado una vez: lo mismo que antes se dibujaba por luz y por frame (`GLOW_RINGS`
 * círculos concéntricos de `GLOW_RING_ALPHA` cada uno), en blanco para teñirlo.
 */
function ensureGlowTexture(scene: Phaser.Scene) {
  if (scene.textures.exists(GLOW_TEXTURE)) return;
  const g = scene.make.graphics({}, false);
  for (let i = GLOW_RINGS; i >= 1; i--) {
    g.fillStyle(0xffffff, GLOW_RING_ALPHA);
    g.fillCircle(GLOW_RADIUS, GLOW_RADIUS, (GLOW_RADIUS * i) / GLOW_RINGS);
  }
  g.generateTexture(GLOW_TEXTURE, GLOW_RADIUS * 2, GLOW_RADIUS * 2);
  g.destroy();
}
