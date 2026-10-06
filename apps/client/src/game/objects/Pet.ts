import * as Phaser from "phaser";
import type { PetDefinition } from "@montevideo-world/shared";
import { shade } from "../color";
import { OVERLAY_DEPTH } from "./Avatar";
import { bakeGraphics, bakingGraphics } from "./ShapeSprite";

/** Qué tan atrás del dueño camina (px a lo largo de su recorrido): más o menos un tile. */
const FOLLOW_DISTANCE = 44;
/** Velocidad máxima (px/ms; el avatar va a ~0,29) y cuánto acelera si quedó lejos. */
const MAX_SPEED = 0.34;
const CATCH_UP = 0.004;
/** Más lejos que esto (viajó, se teletransportó) aparece directamente al lado. */
const SNAP_DISTANCE = 320;
/** Puntos del recorrido del dueño que se recuerdan (cada uno a ≥ 3 px del anterior). */
const TRAIL_POINTS = 80;
const NAME_Y = -40;
/** Las piezas de la mascota se hornean en texturas de 2 × esto de lado (con el pivote en el medio). */
const PET_RADIUS = 40;

const OUTLINE = 0x1b1414;

interface Point {
  x: number;
  y: number;
}

/**
 * Mascota que sigue a su dueño (perro, gato o carpincho), dibujada con primitivas de perfil y con
 * su nombre arriba. Es sólo del cliente: camina por el mismo recorrido que hizo el avatar (un tile
 * atrás), así no corta por edificios, y quieta mueve la cola. No está en el Schema más que por
 * `Player.pet` / `Player.petName`.
 */
export class Pet extends Phaser.GameObjects.Container {
  private readonly body_: Phaser.GameObjects.Container;
  /** Patas y cola horneadas a textura (como el avatar): sólo se mueven y rotan. */
  private readonly legs: Phaser.GameObjects.Image[];
  private readonly tail: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly trail: Point[] = [];
  private time = Math.random() * 1000;
  private walking = 0;

  constructor(
    scene: Phaser.Scene,
    readonly definition: PetDefinition,
    name: string,
    owner: Point,
  ) {
    super(scene, owner.x - 24, owner.y + 4);
    const color = Phaser.Display.Color.HexStringToColor(definition.color).color;
    const accent = Phaser.Display.Color.HexStringToColor(definition.accent).color;

    const shadow = scene.add.ellipse(0, 0, 30, 9, 0x000000, 0.28);
    // Se dibuja una vez en `Graphics` sueltos y se hornea cada pieza (una textura por tipo, colores y pieza).
    const prefix = `pet-${definition.kind}-${definition.color}-${definition.accent}`;
    const drawn = { torso: bakingGraphics(scene, PET_RADIUS), tail: bakingGraphics(scene, PET_RADIUS), legs: [0, 1, 2, 3].map(() => bakingGraphics(scene, PET_RADIUS)) };
    drawPet(definition.kind, drawn.torso, drawn.legs, drawn.tail, color, accent);
    const torso = bakeGraphics(drawn.torso, `${prefix}-torso`, PET_RADIUS);
    this.tail = bakeGraphics(drawn.tail, `${prefix}-tail`, PET_RADIUS);
    this.legs = drawn.legs.map((g, i) => bakeGraphics(g, `${prefix}-leg${i}`, PET_RADIUS));
    this.body_ = scene.add.container(0, 0, [this.tail, this.legs[1], this.legs[3], torso, this.legs[0], this.legs[2]]);
    this.body_.setScale(definition.size);
    this.add([shadow, this.body_]);

    this.label = scene.add
      .text(0, 0, name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#ffe8a3",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);
    scene.add.existing(this);
    this.syncDepth();
  }

  setPetName(name: string) {
    this.label.setText(name);
  }

  /** Cada frame: anota por dónde va el dueño y camina detrás, por el mismo recorrido. */
  follow(owner: Point, delta: number) {
    const last = this.trail[this.trail.length - 1];
    if (!last || Phaser.Math.Distance.BetweenPoints(last, owner) > 3) {
      this.trail.push({ x: owner.x, y: owner.y });
      if (this.trail.length > TRAIL_POINTS) this.trail.shift();
    }
    const target = this.pointBehind(owner);
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (Phaser.Math.Distance.BetweenPoints(this, owner) > SNAP_DISTANCE) {
      // Viajó o se teletransportó: aparece al lado y el recorrido viejo no sirve más.
      this.trail.length = 0;
      this.setPosition(owner.x - 24, owner.y + 4);
    } else if (distance > 1) {
      const step = Math.min(distance, (MAX_SPEED + distance * CATCH_UP) * delta);
      this.x += (dx / distance) * step;
      this.y += (dy / distance) * step;
      if (Math.abs(dx) > 0.5) this.body_.scaleX = (dx >= 0 ? 1 : -1) * this.definition.size;
    }
    this.walking = distance > 2 ? Math.min(1, this.walking + delta / 120) : Math.max(0, this.walking - delta / 200);
    this.animate(delta);
    this.syncDepth();
  }

  /** El punto `FOLLOW_DISTANCE` px atrás del dueño, recorriendo su camino hacia atrás. */
  private pointBehind(owner: Point): Point {
    let remaining = FOLLOW_DISTANCE;
    let from: Point = owner;
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const to = this.trail[i];
      const length = Phaser.Math.Distance.BetweenPoints(from, to);
      if (length >= remaining) {
        const t = remaining / length;
        return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      }
      remaining -= length;
      from = to;
    }
    // El dueño no caminó lo suficiente (recién llega): se queda donde está.
    return this.trail.length > 0 ? from : { x: this.x, y: this.y };
  }

  private animate(delta: number) {
    this.time += delta;
    const swing = Math.sin(this.time * 0.025) * 3 * this.walking;
    this.legs.forEach((leg, i) => (leg.x = (i % 2 === 0 ? swing : -swing) * (i < 2 ? 1 : -1)));
    this.body_.y = -Math.abs(Math.sin(this.time * 0.025)) * 1.5 * this.walking;
    // Quieto mueve la cola (el carpincho no tiene).
    this.tail.rotation = Math.sin(this.time * (this.walking > 0.5 ? 0.01 : 0.02)) * 0.25;
  }

  /** Escondida con su nombre (su dueño vuela con `/god` y no se lo ve). */
  setHidden(hidden: boolean) {
    if (this.visible === !hidden) return;
    this.setVisible(!hidden);
    this.label.setVisible(!hidden);
  }

  private syncDepth() {
    this.setDepth(this.y);
    this.label.setPosition(this.x, this.y + NAME_Y * this.definition.size).setDepth(OVERLAY_DEPTH + this.y);
  }

  destroy(fromScene?: boolean) {
    this.label.destroy();
    super.destroy(fromScene);
  }
}

/**
 * Dibuja la mascota de perfil mirando a la derecha, con los pies en (0, 0). Las patas van en su
 * propio Graphics (se balancean al caminar) y la cola también (se mueve, con el pivote en la cadera).
 */
function drawPet(
  kind: PetDefinition["kind"],
  torso: Phaser.GameObjects.Graphics,
  legs: Phaser.GameObjects.Graphics[],
  tail: Phaser.GameObjects.Graphics,
  color: number,
  accent: number,
) {
  const dark = shade(color, -30);
  const leg = (g: Phaser.GameObjects.Graphics, x: number, top: number, width: number, legColor: number) => {
    g.fillStyle(legColor, 1);
    g.fillRoundedRect(x - width / 2, top, width, -top, 1.5);
  };

  if (kind === "capybara") {
    // Barril marrón, cabeza cuadrada con hocico romo, orejitas y patas cortas.
    [-8, 9, -5, 12].forEach((x, i) => leg(legs[i], x, -6, 4, i < 2 ? dark : shade(dark, -10)));
    torso.fillStyle(color, 1);
    torso.fillEllipse(0, -13, 34, 18);
    torso.fillStyle(shade(color, 8), 1);
    torso.fillRoundedRect(10, -24, 15, 13, 5);
    torso.fillStyle(accent, 1);
    torso.fillRoundedRect(20, -20, 6, 8, 3);
    torso.fillCircle(12, -24, 2.2);
    torso.fillStyle(OUTLINE, 1);
    torso.fillCircle(17, -20, 1.3);
    torso.lineStyle(1, OUTLINE, 0.35);
    torso.strokeEllipse(0, -13, 34, 18);
    return;
  }

  if (kind === "cat") {
    [-6, 8, -3, 11].forEach((x, i) => leg(legs[i], x, -8, 3, i < 2 ? color : dark));
    torso.fillStyle(color, 1);
    torso.fillEllipse(1, -12, 24, 11);
    torso.fillCircle(13, -19, 6);
    // Orejas en punta.
    torso.fillTriangle(8.5, -22, 11, -29, 13, -23);
    torso.fillTriangle(13, -23, 16, -29, 17.5, -21);
    torso.fillStyle(accent, 1);
    for (const x of [-6, -1, 4]) torso.fillRect(x, -17, 2, 6);
    torso.fillStyle(OUTLINE, 1);
    torso.fillCircle(16, -20, 1.1);
    // Cola parada en curva.
    tail.setPosition(-10, -13);
    tail.lineStyle(3, color, 1);
    tail.beginPath();
    tail.moveTo(0, 0);
    tail.lineTo(-5, -4);
    tail.lineTo(-6, -12);
    tail.lineTo(-3, -17);
    tail.strokePath();
    return;
  }

  // Perro: cuerpo, cabeza con hocico, oreja caída, manchas y cola.
  [-7, 8, -4, 11].forEach((x, i) => leg(legs[i], x, -9, 4, i < 2 ? color : dark));
  torso.fillStyle(color, 1);
  torso.fillEllipse(1, -14, 26, 13);
  torso.fillCircle(14, -22, 7);
  torso.fillRoundedRect(17, -22, 8, 6, 2);
  torso.fillStyle(accent, 1);
  torso.fillEllipse(10, -21, 5, 10);
  torso.fillEllipse(-4, -16, 8, 6);
  torso.fillStyle(OUTLINE, 1);
  torso.fillCircle(24.5, -20.5, 1.6);
  torso.fillCircle(16.5, -24, 1.2);
  tail.setPosition(-11, -17);
  tail.lineStyle(3, color, 1);
  tail.lineBetween(0, 0, -7, -7);
}
