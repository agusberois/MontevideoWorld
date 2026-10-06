import * as Phaser from "phaser";
import type { WeatherId } from "@montevideo-world/shared";
import { isTouchDevice } from "@/lib/viewport";
import { NIGHT_DEPTH } from "./DayNight";

/** El tinte va justo debajo del velo de la noche (se suman); la lluvia y el viento, arriba (se ven de noche). */
const TINT_DEPTH = NIGHT_DEPTH - 1;
const PARTICLE_DEPTH = NIGHT_DEPTH + 2;
/** Cuánto tarda un clima en aparecer o irse del todo. */
const FADE_MS = 2500;

/** Color y opacidad del tinte de cada clima (nublado y mojado con lluvia, frío con pampero, cálido con calor). */
const TINTS: Record<WeatherId, { color: number; alpha: number }> = {
  clear: { color: 0x000000, alpha: 0 },
  rain: { color: 0x2c3e55, alpha: 0.28 },
  pampero: { color: 0x9fb4c8, alpha: 0.1 },
  heat: { color: 0xff9a2e, alpha: 0.12 },
};

/** Gotas por cada 10.000 px² de pantalla, con tope (en celulares la pantalla es chica: salen menos). */
const RAIN_DENSITY = 0.9;
/** En celular, la mitad: se redibujan en cada frame. */
const MAX_DROPS = isTouchDevice() ? 120 : 240;
const DROP_SPEED = 950;
/** Inclinación de la lluvia: px horizontales por px que cae. */
const RAIN_SLANT = 0.18;
const SPLASH_MS = 260;
const WIND_STREAKS = 26;
const WIND_SPEED = 1300;

/** Textura con los cuadros de gotas, salpicaduras y ráfagas (todas las imágenes la comparten: un solo lote). */
const FX_TEXTURE = "weather-fx";
/** Cuántos largos de gota / ráfaga y cuántas etapas de salpicadura se hornean. */
const DROP_FRAMES = 4;
const SPLASH_FRAMES = 4;
const STREAK_FRAMES = 4;
const DROP_MIN = 10;
const DROP_MAX = 20;
const STREAK_MIN = 60;
const STREAK_MAX = 150;
/** Margen alrededor de cada cuadro (px), para el grosor de la línea. */
const FX_PAD = 2;

interface Drop {
  x: number;
  y: number;
  length: number;
  /** Cuadro de la textura (`drop-N`) que corresponde a su largo. */
  frame: number;
  /** Altura de pantalla donde "toca el piso" y salpica. */
  floor: number;
}

interface Splash {
  x: number;
  y: number;
  age: number;
}

interface Streak {
  x: number;
  y: number;
  length: number;
  speed: number;
  frame: number;
}

/** Dónde quedó cada cuadro dentro de `FX_TEXTURE` y cuánto mide (para ubicar el sprite por su punta). */
interface FxFrame {
  name: string;
  width: number;
  height: number;
}

/**
 * Clima del barrio: un tinte fijo a la cámara y, con lluvia o pampero, gotas (que salpican al
 * llegar al piso) o ráfagas de viento: imágenes de una textura horneada una vez (`FX_TEXTURE`), en
 * un contenedor (todas en un solo lote; antes era un `Graphics` re-triangulado en cada frame). No un
 * `Blitter`: Phaser no le aplica la escala, y hace falta para compensar el zoom. Todo se simula
 * en coordenadas de pantalla y se pasa a las del objeto al dibujar: Phaser escala con el zoom
 * desde el centro aunque el objeto esté fijo a la cámara (ver `CameraControl`), así que se
 * compensa para que las gotas midan lo mismo con cualquier zoom. Sólo dibujo: el clima lo decide
 * el server (`GameState.weather`).
 */
export class WeatherFx {
  private readonly tint: Phaser.GameObjects.Rectangle;
  private readonly particles: Phaser.GameObjects.Container;
  /** Las imágenes del contenedor (se reusan de un frame al otro) y cuántas se usaron en este. */
  private bobs: Phaser.GameObjects.Image[] = [];
  private used = 0;
  private readonly frames: { drops: FxFrame[]; splashes: FxFrame[]; streaks: FxFrame[] };
  /** Calidad baja: sin gotas ni ráfagas (el tinte del clima queda). */
  private particlesOn = true;
  /** El que se ve ahora (puede estar yéndose) y el que pidió el server. */
  private shown: WeatherId = "clear";
  private target: WeatherId = "clear";
  /** 0–1: cuánto se ve `shown`. */
  private intensity = 0;
  private drops: Drop[] = [];
  private splashes: Splash[] = [];
  private streaks: Streak[] = [];
  private width = 1;
  private height = 1;

  constructor(private readonly scene: Phaser.Scene) {
    this.tint = scene.add.rectangle(0, 0, 1, 1, 0x000000).setOrigin(0, 0).setScrollFactor(0).setDepth(TINT_DEPTH).setAlpha(0);
    this.frames = bakeFxTexture(scene);
    this.particles = scene.add.container(0, 0).setScrollFactor(0).setDepth(PARTICLE_DEPTH);
    this.resize(scene.scale.gameSize);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize, this);
  }

  /** Nuevo clima. `immediate` para el estado inicial (al entrar al barrio ya llueve, sin fundido). */
  setWeather(id: WeatherId, immediate = false) {
    this.target = id;
    if (immediate) {
      this.show(id);
      this.intensity = id === "clear" ? 0 : 1;
      this.applyTint();
    }
  }

  /** Llamar en cada frame. */
  update(delta: number) {
    const step = delta / FADE_MS;
    if (this.shown !== this.target) {
      // Primero se va el que estaba; recién después aparece el nuevo.
      this.intensity = Math.max(0, this.intensity - step);
      if (this.intensity === 0) this.show(this.target);
    } else if (this.shown !== "clear" && this.intensity < 1) {
      this.intensity = Math.min(1, this.intensity + step);
    }
    this.applyTint();

    this.used = 0;
    if (this.intensity > 0 && this.particlesOn) {
      // El contenedor fijo a la cámara se escala al revés del zoom (que escala desde el centro): así
      // cada imagen se ubica en px de pantalla y mide lo mismo con cualquier zoom.
      const zoom = this.scene.cameras.main.zoom;
      this.particles.setScale(1 / zoom).setPosition((this.width / 2) * (1 - 1 / zoom), (this.height / 2) * (1 - 1 / zoom));
      const seconds = delta / 1000;
      if (this.shown === "rain") this.drawRain(seconds, delta);
      else if (this.shown === "pampero") this.drawWind(seconds);
    }
    for (let i = this.used; i < this.bobs.length; i++) if (this.bobs[i].visible) this.bobs[i].setVisible(false);
  }

  /** Pone un sprite (reusando los del frame anterior) con su esquina en (x, y) de pantalla. */
  private place(frame: FxFrame, x: number, y: number, alpha: number) {
    let bob = this.bobs[this.used];
    if (!bob) {
      bob = this.scene.add.image(0, 0, FX_TEXTURE, frame.name).setOrigin(0, 0).setScrollFactor(0);
      this.particles.add(bob);
      this.bobs.push(bob);
    }
    this.used++;
    if (bob.frame.name !== frame.name) bob.setFrame(frame.name);
    bob.setPosition(x, y).setAlpha(alpha).setVisible(true);
  }

  setParticles(on: boolean) {
    this.particlesOn = on;
  }

  dispose() {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize, this);
  }

  private show(id: WeatherId) {
    this.shown = id;
    this.drops = [];
    this.splashes = [];
    this.streaks = [];
    if (id === "rain") {
      const count = Math.min(MAX_DROPS, Math.round(((this.width * this.height) / 10_000) * RAIN_DENSITY));
      for (let i = 0; i < count; i++) this.drops.push(this.newDrop(Math.random() * this.height));
    } else if (id === "pampero") {
      for (let i = 0; i < WIND_STREAKS; i++) this.streaks.push(this.newStreak(Math.random() * this.width));
    }
  }

  private applyTint() {
    const { color, alpha } = TINTS[this.shown];
    this.tint.setFillStyle(color).setAlpha(alpha * this.intensity);
  }

  private drawRain(seconds: number, delta: number) {
    const alpha = 0.55 * this.intensity;
    for (const drop of this.drops) {
      drop.y += DROP_SPEED * seconds;
      drop.x += DROP_SPEED * RAIN_SLANT * seconds;
      if (drop.y >= drop.floor) {
        if (this.splashes.length < MAX_DROPS) this.splashes.push({ x: drop.x, y: drop.floor, age: 0 });
        Object.assign(drop, this.newDrop(-drop.length));
        continue;
      }
      // El cuadro va de la cola (arriba a la izquierda) a la punta (abajo a la derecha, en `drop`).
      const frame = this.frames.drops[drop.frame];
      this.place(frame, drop.x - frame.width + FX_PAD, drop.y - frame.height + FX_PAD, alpha);
    }
    // Salpicaduras: un anillito aplastado (isométrico) que se agranda y se apaga: el piso se ve mojado.
    this.splashes = this.splashes.filter((splash) => (splash.age += delta) < SPLASH_MS);
    for (const splash of this.splashes) {
      const t = splash.age / SPLASH_MS;
      const frame = this.frames.splashes[Math.min(SPLASH_FRAMES - 1, Math.floor(t * SPLASH_FRAMES))];
      this.place(frame, splash.x - frame.width / 2, splash.y - frame.height / 2, (1 - t) * this.intensity);
    }
  }

  private drawWind(seconds: number) {
    for (const streak of this.streaks) {
      streak.x += streak.speed * seconds;
      // Las ráfagas bajan un poco al avanzar (el pampero viene del sudoeste).
      streak.y += streak.speed * 0.12 * seconds;
      if (streak.x - streak.length > this.width) Object.assign(streak, this.newStreak(-Math.random() * this.width * 0.5));
      const frame = this.frames.streaks[streak.frame];
      this.place(frame, streak.x - frame.width + FX_PAD, streak.y - frame.height + FX_PAD, this.intensity);
    }
  }

  private newDrop(y: number): Drop {
    // Arranca un poco más a la izquierda: con la inclinación, así también se llena el borde izquierdo.
    const x = Math.random() * (this.width + this.height * RAIN_SLANT) - this.height * RAIN_SLANT;
    const frame = Math.floor(Math.random() * DROP_FRAMES);
    return { x, y, length: dropLength(frame), frame, floor: this.height * (0.15 + Math.random() * 0.85) };
  }

  private newStreak(x: number): Streak {
    const frame = Math.floor(Math.random() * STREAK_FRAMES);
    return { x, y: Math.random() * this.height, length: streakLength(frame), frame, speed: WIND_SPEED * (0.7 + Math.random() * 0.6) };
  }

  /** Como el velo de la noche: 3 pantallas, para que el zoom (mínimo 1/2) no deje bordes sin tinte. */
  private resize(size: Phaser.Structs.Size) {
    this.width = size.width;
    this.height = size.height;
    this.tint.setPosition(-size.width, -size.height).setSize(size.width * 3, size.height * 3);
    // Cambió el tamaño: se rearma la lluvia para la pantalla nueva.
    if (this.shown !== "clear") this.show(this.shown);
  }
}

const dropLength = (frame: number) => DROP_MIN + ((DROP_MAX - DROP_MIN) * frame) / (DROP_FRAMES - 1);
const streakLength = (frame: number) => STREAK_MIN + ((STREAK_MAX - STREAK_MIN) * frame) / (STREAK_FRAMES - 1);

/**
 * Hornea (una vez por juego) los cuadros del clima en una sola textura, uno al lado del otro: gotas
 * de cada largo (cola arriba a la izquierda, punta abajo a la derecha), las etapas de la salpicadura
 * y las ráfagas. Blancos/celestes con su opacidad: cada imagen sólo cambia el alpha.
 */
function bakeFxTexture(scene: Phaser.Scene): { drops: FxFrame[]; splashes: FxFrame[]; streaks: FxFrame[] } {
  const frames = { drops: [] as FxFrame[], splashes: [] as FxFrame[], streaks: [] as FxFrame[] };
  const layout: Array<{ list: FxFrame[]; frame: FxFrame; draw: (g: Phaser.GameObjects.Graphics, x: number, y: number) => void }> = [];
  for (let i = 0; i < DROP_FRAMES; i++) {
    const length = dropLength(i);
    const dx = length * RAIN_SLANT;
    layout.push({
      list: frames.drops,
      frame: { name: `drop-${i}`, width: Math.ceil(dx + FX_PAD * 2), height: Math.ceil(length + FX_PAD * 2) },
      draw: (g, x, y) => g.lineStyle(1.2, 0xcfe3ff, 1).lineBetween(x + FX_PAD, y + FX_PAD, x + FX_PAD + dx, y + FX_PAD + length),
    });
  }
  for (let i = 0; i < SPLASH_FRAMES; i++) {
    const t = i / (SPLASH_FRAMES - 1);
    const w = 4 + 10 * t;
    const h = 2 + 4 * t;
    layout.push({
      list: frames.splashes,
      frame: { name: `splash-${i}`, width: Math.ceil(w + FX_PAD * 2), height: Math.ceil(h + FX_PAD * 2) },
      draw: (g, x, y) => g.lineStyle(1, 0xdbeaff, 0.5).strokeEllipse(x + FX_PAD + w / 2, y + FX_PAD + h / 2, w, h),
    });
  }
  for (let i = 0; i < STREAK_FRAMES; i++) {
    const length = streakLength(i);
    const dy = length * 0.12;
    layout.push({
      list: frames.streaks,
      frame: { name: `streak-${i}`, width: Math.ceil(length + FX_PAD * 2), height: Math.ceil(dy + FX_PAD * 2) },
      draw: (g, x, y) => g.lineStyle(1.5, 0xffffff, 0.3).lineBetween(x + FX_PAD, y + FX_PAD, x + FX_PAD + length, y + FX_PAD + dy),
    });
  }
  // Todo en una fila.
  let x = 0;
  const placed = layout.map((item) => {
    const at = x;
    x += item.frame.width + 2;
    return { ...item, at };
  });
  const height = Math.max(...layout.map(({ frame }) => frame.height));
  if (!scene.textures.exists(FX_TEXTURE)) {
    const g = scene.make.graphics({}, false);
    for (const { draw, at } of placed) draw(g, at, 0);
    g.generateTexture(FX_TEXTURE, x, height);
    g.destroy();
    const texture = scene.textures.get(FX_TEXTURE);
    for (const { frame, at } of placed) texture.add(frame.name, 0, at, 0, frame.width, frame.height);
  }
  for (const { list, frame } of placed) list.push(frame);
  return frames;
}
