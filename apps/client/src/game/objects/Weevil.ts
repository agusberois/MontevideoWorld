import * as Phaser from "phaser";
import { tileToWorld } from "../iso";

/** Picudo rojo: cuerpo rojo anaranjado con manchas negras, cabeza y trompa (rostro) largas y negras. */
const BODY = 0xc8351f;
const BODY_DARK = 0x8f2414;
const BLACK = 0x1b1414;
/** Qué tan rápido la figura alcanza la posición del server (los picudos se arrastran, sin saltos). */
const FOLLOW_PER_MS = 0.012;
/**
 * Desparramo visual alrededor de la posición real: si no, todos los que persiguen al mismo jugador
 * se dibujarían uno encima del otro.
 */
const SPREAD_PX = 18;
/** Radio de clic (px de mundo) alrededor del picudo: un poco más grande que el dibujo, es chiquito. */
const HIT_RADIUS = 15;

/**
 * Picudo dibujado con primitivas (visto de costado, mirando a la derecha) que sigue la posición que
 * manda el server. Mueve las patitas al caminar, salta al picar y queda patas arriba al morir.
 */
export class Weevil extends Phaser.GameObjects.Container {
  private readonly body_: Phaser.GameObjects.Container;
  private readonly legs: Phaser.GameObjects.Graphics;
  private readonly offset: { x: number; y: number };
  private targetX: number;
  private targetY: number;
  private walkTime = Math.random() * 1000;
  private dead = false;

  constructor(scene: Phaser.Scene, id: string, tileX: number, tileY: number) {
    const start = tileToWorld(tileX, tileY);
    super(scene, start.x, start.y);
    // Desparramo fijo por picudo (sale del id: igual en todos los clientes).
    const angle = (hashId(id) % 360) * (Math.PI / 180);
    this.offset = { x: Math.cos(angle) * SPREAD_PX, y: Math.sin(angle) * SPREAD_PX * 0.5 };
    this.targetX = start.x + this.offset.x;
    this.targetY = start.y + this.offset.y;
    this.setPosition(this.targetX, this.targetY);

    const shadow = scene.add.ellipse(0, 0, 16, 5, 0x000000, 0.28);
    this.legs = scene.add.graphics();
    const shell = scene.add.graphics();
    // Élitros (caparazón) con brillo y manchas negras.
    shell.fillStyle(BODY_DARK, 1);
    shell.fillEllipse(0, -5.5, 15, 8.5);
    shell.fillStyle(BODY, 1);
    shell.fillEllipse(-0.5, -6.2, 13.5, 7);
    shell.fillStyle(0xff8a5c, 0.7);
    shell.fillEllipse(-2.5, -8, 5, 1.8);
    shell.fillStyle(BLACK, 1);
    shell.fillCircle(-2, -5, 1.1);
    shell.fillCircle(1.8, -6.6, 0.9);
    shell.fillCircle(-4.4, -7, 0.7);
    shell.lineStyle(0.8, BODY_DARK, 1);
    shell.lineBetween(-6, -6, 5.6, -6);
    // Cabeza y trompa larga curvada hacia abajo, con antenas acodadas.
    shell.fillStyle(BLACK, 1);
    shell.fillCircle(7, -5.5, 2.4);
    shell.lineStyle(1.6, BLACK, 1);
    shell.beginPath();
    shell.moveTo(8.5, -5.5);
    shell.lineTo(12, -4);
    shell.lineTo(13.5, -1.8);
    shell.strokePath();
    shell.lineStyle(0.7, BLACK, 1);
    shell.lineBetween(10, -4.8, 11, -8.5);
    shell.lineBetween(11, -8.5, 13, -9);
    this.body_ = scene.add.container(0, 0, [this.legs, shell]);

    this.add([shadow, this.body_]);
    this.drawLegs(0);
    this.setScale(0.2);
    scene.add.existing(this);
    // Sale de la palmera creciendo.
    scene.tweens.add({ targets: this, scale: 1, duration: 300, ease: "Back.Out" });
  }

  /** Nueva posición del server (tiles con decimales). */
  setTarget(tileX: number, tileY: number) {
    const target = tileToWorld(tileX, tileY);
    this.targetX = target.x + this.offset.x;
    this.targetY = target.y + this.offset.y;
  }

  containsWorldPoint(worldX: number, worldY: number): boolean {
    return !this.dead && Math.hypot(worldX - this.x, worldY - (this.y - 5)) <= HIT_RADIUS;
  }

  /** Mordisco: un saltito hacia adelante. */
  bite() {
    if (this.dead) return;
    this.scene.tweens.add({ targets: this.body_, y: -6, duration: 90, yoyo: true, ease: "Quad.Out" });
  }

  /** Aplastado: queda patas arriba y se desvanece (el server lo saca un rato después). */
  die() {
    if (this.dead) return;
    this.dead = true;
    this.body_.setScale(this.body_.scaleX, -1).setY(-10);
    this.scene.tweens.add({ targets: this, alpha: 0, delay: 250, duration: 400 });
  }

  tick(delta: number) {
    if (this.dead) return;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const moving = Math.hypot(dx, dy) > 0.6;
    const t = Math.min(1, delta * FOLLOW_PER_MS);
    this.x += dx * t;
    this.y += dy * t;
    if (Math.abs(dx) > 0.3) this.body_.scaleX = dx >= 0 ? 1 : -1;
    if (moving) {
      this.walkTime += delta;
      this.drawLegs(this.walkTime);
    }
    this.setDepth(this.y);
  }

  /** Tres pares de patitas que se mueven alternadas al caminar. */
  private drawLegs(time: number) {
    const g = this.legs.clear();
    g.lineStyle(1, BLACK, 1);
    [-4, 0, 4].forEach((x, i) => {
      const swing = Math.sin(time / 45 + i * 2.1) * 1.6;
      g.lineBetween(x, -4, x - 1.5 + swing, 0);
      g.lineBetween(x + 0.6, -4, x + 1.5 - swing, 0);
    });
  }
}

function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash;
}
