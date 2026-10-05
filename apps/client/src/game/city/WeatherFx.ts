import * as Phaser from "phaser";
import type { WeatherId } from "@montevideo-world/shared";
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
const MAX_DROPS = 240;
const DROP_SPEED = 950;
/** Inclinación de la lluvia: px horizontales por px que cae. */
const RAIN_SLANT = 0.18;
const SPLASH_MS = 260;
const WIND_STREAKS = 26;
const WIND_SPEED = 1300;

interface Drop {
  x: number;
  y: number;
  length: number;
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
}

/**
 * Clima del barrio: un tinte fijo a la cámara y, con lluvia o pampero, gotas (que salpican al
 * llegar al piso) o ráfagas de viento dibujadas cada frame en un solo `Graphics`. Todo se simula
 * en coordenadas de pantalla y se pasa a las del objeto al dibujar: Phaser escala con el zoom
 * desde el centro aunque el objeto esté fijo a la cámara (ver `CameraControl`), así que se
 * compensa para que las gotas midan lo mismo con cualquier zoom. Sólo dibujo: el clima lo decide
 * el server (`GameState.weather`).
 */
export class WeatherFx {
  private readonly tint: Phaser.GameObjects.Rectangle;
  private readonly particles: Phaser.GameObjects.Graphics;
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
    this.particles = scene.add.graphics().setScrollFactor(0).setDepth(PARTICLE_DEPTH);
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

    this.particles.clear();
    if (this.intensity === 0) return;
    const seconds = delta / 1000;
    if (this.shown === "rain") this.drawRain(seconds, delta);
    else if (this.shown === "pampero") this.drawWind(seconds);
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
    const g = this.particles;
    g.lineStyle(this.px(1.2), 0xcfe3ff, 0.55 * this.intensity);
    for (const drop of this.drops) {
      drop.y += DROP_SPEED * seconds;
      drop.x += DROP_SPEED * RAIN_SLANT * seconds;
      if (drop.y >= drop.floor) {
        if (this.splashes.length < MAX_DROPS) this.splashes.push({ x: drop.x, y: drop.floor, age: 0 });
        Object.assign(drop, this.newDrop(-drop.length));
        continue;
      }
      const [x1, y1] = this.toObject(drop.x, drop.y);
      const [x2, y2] = this.toObject(drop.x - drop.length * RAIN_SLANT, drop.y - drop.length);
      g.lineBetween(x1, y1, x2, y2);
    }
    // Salpicaduras: un anillito aplastado (isométrico) que se agranda y se apaga: el piso se ve mojado.
    this.splashes = this.splashes.filter((splash) => (splash.age += delta) < SPLASH_MS);
    for (const splash of this.splashes) {
      const t = splash.age / SPLASH_MS;
      const [x, y] = this.toObject(splash.x, splash.y);
      g.lineStyle(this.px(1), 0xdbeaff, 0.5 * (1 - t) * this.intensity);
      g.strokeEllipse(x, y, this.px(4 + 10 * t), this.px(2 + 4 * t));
    }
  }

  private drawWind(seconds: number) {
    const g = this.particles;
    for (const streak of this.streaks) {
      streak.x += streak.speed * seconds;
      // Las ráfagas bajan un poco al avanzar (el pampero viene del sudoeste).
      streak.y += streak.speed * 0.12 * seconds;
      if (streak.x - streak.length > this.width) Object.assign(streak, this.newStreak(-Math.random() * this.width * 0.5));
      const [x1, y1] = this.toObject(streak.x, streak.y);
      const [x2, y2] = this.toObject(streak.x - streak.length, streak.y - streak.length * 0.12);
      g.lineStyle(this.px(1.5), 0xffffff, 0.3 * this.intensity);
      g.lineBetween(x1, y1, x2, y2);
    }
  }

  private newDrop(y: number): Drop {
    // Arranca un poco más a la izquierda: con la inclinación, así también se llena el borde izquierdo.
    const x = Math.random() * (this.width + this.height * RAIN_SLANT) - this.height * RAIN_SLANT;
    return { x, y, length: 10 + Math.random() * 10, floor: this.height * (0.15 + Math.random() * 0.85) };
  }

  private newStreak(x: number): Streak {
    return { x, y: Math.random() * this.height, length: 60 + Math.random() * 90, speed: WIND_SPEED * (0.7 + Math.random() * 0.6) };
  }

  /** Punto de pantalla → coordenadas del objeto fijo a la cámara (deshace el zoom, que escala desde el centro). */
  private toObject(x: number, y: number): [number, number] {
    const zoom = this.scene.cameras.main.zoom;
    const cx = this.width / 2;
    const cy = this.height / 2;
    return [cx + (x - cx) / zoom, cy + (y - cy) / zoom];
  }

  /** Un largo en px de pantalla, en unidades del objeto. */
  private px(length: number): number {
    return length / this.scene.cameras.main.zoom;
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
