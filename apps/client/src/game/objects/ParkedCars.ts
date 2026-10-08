import * as Phaser from "phaser";
import { CarState, CityMap, TilePoint } from "@montevideo-world/shared";
import { isoPoint, tileToWorld } from "../iso";
import type { Avatar } from "./Avatar";

/** Colores de los autos (uno al azar cada vez). */
const CAR_COLORS = [0xd62828, 0x1d4fa0, 0xf1f1f1, 0x26262b, 0x7a828c, 0x2a9d8f, 0xe9b10a, 0x6b3e1e];
/** De cuántos tiles llega y hasta cuántos se va, y cuánto tarda. */
const DRIVE_TILES = 6;
const DRIVE_IN_MS = 900;
const DRIVE_OUT_MS = 800;
/** Después de pagar (o no) se queda un momento antes de arrancar. */
const LINGER_MS = 700;
const COIN_FLIGHT_MS = 420;
const FLIGHT_ARC_PX = 24;
const COIN_COLOR = 0xf2c94c;

const ARRIVE_LINES = ["¡Dale, dale, dale!", "¡Ahí está, jefe!", "¡Tirá, tirá… ahí!", "¡Venga, venga!"];
const TIPPED_LINES = ["¡Gracias, jefe!", "¡Tomá, maestro!", "¡Ta, gracias!"];
const LEFT_LINES = ["Hoy no tengo cambio…", "La próxima, ¿eh?", "Disculpá, no tengo."];

/** Hacia dónde está estacionado: a lo largo de x o de y (según la calle). */
type Axis = "x" | "y";

interface Car {
  graphics: Phaser.GameObjects.Graphics;
  /** Tile donde estaciona y desde dónde se mueve. */
  spot: TilePoint;
  axis: Axis;
  /** Ya se está yendo: no se le hace más caso a lo que cambie el cuidacoches. */
  leaving: boolean;
  /** Lo que pasó mientras llegaba: se hace al estacionar. */
  pending: CarState | null;
  arriving: boolean;
  timer: Phaser.Time.TimerEvent | null;
}

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/**
 * El auto que estaciona al lado del cuidacoches (frente a un edificio con nombre). Es sólo
 * dibujo y **sólo lo ve el cuidacoches**: lo mueve `park:car`, que el server le manda a él solo (como
 * el hincha del carrito). Llega por la calle, estaciona en un tile pegado, y cuando vuelve el dueño
 * una moneda vuela hasta el cuidacoches (`Tipped`) o no (`Left`); después arranca y se va.
 */
export class ParkedCars {
  private readonly cars = new Map<string, Car>();
  private readonly all = new Set<Car>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: CityMap,
    /** El avatar del cuidacoches (para la moneda y lo que dice). */
    private readonly keeperAvatar: (keeperId: string) => Avatar | undefined,
  ) {}

  update(keeperId: string, state: CarState, keeper: TilePoint) {
    const car = this.cars.get(keeperId);
    if (state === CarState.Arriving) {
      if (car) this.leave(keeperId, car);
      this.arrive(keeperId, keeper);
      return;
    }
    if (!car || car.leaving) return;
    if (state === CarState.None) return this.leave(keeperId, car);
    if (car.arriving) car.pending = state;
    else this.react(keeperId, car, state);
  }

  /** El cuidacoches se fue del barrio: su auto también. */
  remove(keeperId: string) {
    const car = this.cars.get(keeperId);
    if (car) this.leave(keeperId, car);
  }

  dispose() {
    for (const car of this.all) this.destroy(car);
    this.all.clear();
    this.cars.clear();
  }

  private arrive(keeperId: string, keeper: TilePoint) {
    const spot = this.parkingSpot(keeper);
    if (!spot) return;
    const axis: Axis = spot.x !== keeper.x && spot.y === keeper.y ? "y" : spot.y !== keeper.y && spot.x === keeper.x ? "x" : this.streetAxis(spot);
    const graphics = this.scene.add.graphics();
    drawCar(graphics, axis, pick(CAR_COLORS));
    const car: Car = { graphics, spot, axis, leaving: false, pending: null, arriving: true, timer: null };
    this.cars.set(keeperId, car);
    this.all.add(car);
    this.keeperAvatar(keeperId)?.say(pick(ARRIVE_LINES));

    // Entra por la calle: viene de unos tiles más atrás, frenando.
    this.place(car, -DRIVE_TILES);
    graphics.setAlpha(0);
    this.scene.tweens.addCounter({
      from: -DRIVE_TILES,
      to: 0,
      duration: DRIVE_IN_MS,
      ease: "Cubic.Out",
      onUpdate: (tween) => {
        const offset = tween.getValue() ?? 0;
        this.place(car, offset);
        graphics.setAlpha(Math.min(1, 1 + offset / (DRIVE_TILES * 0.5)));
      },
      onComplete: () => {
        car.arriving = false;
        if (car.pending !== null && !car.leaving) {
          const state = car.pending;
          car.pending = null;
          this.react(keeperId, car, state);
        }
      },
    });
  }

  /** Volvió el dueño: deja una moneda (o no), espera un momento y arranca. */
  private react(keeperId: string, car: Car, state: CarState) {
    car.leaving = true;
    const keeper = this.keeperAvatar(keeperId);
    const from = this.worldOf(car.spot, 0);
    if (state === CarState.Tipped && keeper) {
      this.floatLine(from.x, from.y - 34, pick(TIPPED_LINES));
      const coin = this.scene.add.graphics();
      coin.fillStyle(COIN_COLOR, 1).fillCircle(0, 0, 3.5).lineStyle(1, 0x8a6d1d, 1).strokeCircle(0, 0, 3.5);
      this.fly(coin, { x: from.x, y: from.y - 20 }, { x: keeper.x + 10, y: keeper.y - 46 }, Math.max(car.graphics.depth, keeper.depth) + 1, () => coin.destroy());
    } else if (state === CarState.Left) {
      this.floatLine(from.x, from.y - 34, pick(LEFT_LINES));
    }
    car.timer = this.scene.time.delayedCall(LINGER_MS, () => this.driveAway(keeperId, car));
  }

  private leave(keeperId: string, car: Car) {
    if (car.leaving && car.timer) return;
    car.leaving = true;
    car.timer?.remove(false);
    this.driveAway(keeperId, car);
  }

  /** Arranca y sigue por la calle hasta desaparecer. */
  private driveAway(keeperId: string, car: Car) {
    if (this.cars.get(keeperId) === car) this.cars.delete(keeperId);
    car.timer = null;
    this.scene.tweens.addCounter({
      from: 0,
      to: DRIVE_TILES,
      duration: DRIVE_OUT_MS,
      ease: "Cubic.In",
      onUpdate: (tween) => {
        const offset = tween.getValue() ?? 0;
        this.place(car, offset);
        car.graphics.setAlpha(Math.max(0, 1 - offset / DRIVE_TILES));
      },
      onComplete: () => {
        this.all.delete(car);
        this.destroy(car);
      },
    });
  }

  /** Pone el auto `offset` tiles corrido de su lugar, a lo largo de la calle. */
  private place(car: Car, offset: number) {
    const at = this.worldOf(car.spot, offset, car.axis);
    car.graphics.setPosition(at.x, at.y).setDepth(at.y + 1);
  }

  private worldOf(spot: TilePoint, offset: number, axis: Axis = "x") {
    return tileToWorld(spot.x + (axis === "x" ? offset : 0), spot.y + (axis === "y" ? offset : 0));
  }

  /** Un tile de calle pegado al cuidacoches (en la zona, si se puede) donde estacionar. */
  private parkingSpot(keeper: TilePoint): TilePoint | undefined {
    const sides = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ].map((d) => ({ x: keeper.x + d.x, y: keeper.y + d.y }));
    return sides.find((tile) => this.map.canParkAt(tile.x, tile.y)) ?? sides.find((tile) => this.map.isWalkable(tile.x, tile.y));
  }

  /** Para dónde corre la calle en ese tile: hacia donde hay más tiles caminables seguidos. */
  private streetAxis(tile: TilePoint): Axis {
    const run = (dx: number, dy: number) => {
      let count = 0;
      for (let step = 1; step <= 3; step++) if (this.map.isWalkable(tile.x + dx * step, tile.y + dy * step)) count += 1;
      return count;
    };
    return run(1, 0) + run(-1, 0) >= run(0, 1) + run(0, -1) ? "x" : "y";
  }

  private fly(object: Phaser.GameObjects.Graphics, from: TilePoint, to: TilePoint, depth: number, done: () => void) {
    object.setPosition(from.x, from.y).setDepth(depth);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: COIN_FLIGHT_MS,
      ease: "Sine.InOut",
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 1;
        object.setPosition(Phaser.Math.Linear(from.x, to.x, t), Phaser.Math.Linear(from.y, to.y, t) - Math.sin(t * Math.PI) * FLIGHT_ARC_PX);
      },
      onComplete: done,
    });
  }

  /** Lo que dice el dueño, flotando arriba del auto. */
  private floatLine(x: number, y: number, text: string) {
    const label = this.scene.add
      .text(x, y, text, { fontFamily: "system-ui, sans-serif", fontSize: "12px", fontStyle: "bold", color: "#ffffff", stroke: "#000000", strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(y + 10_000);
    this.scene.tweens.add({ targets: label, y: y - 18, alpha: 0, delay: 900, duration: 700, onComplete: () => label.destroy() });
  }

  private destroy(car: Car) {
    car.timer?.remove(false);
    car.graphics.destroy();
  }
}

/**
 * Un auto chico en isométrico, centrado en (0, 0) del tile y largo a lo largo de `axis`: carrocería,
 * cabina con vidrios, ruedas y faros. Se dibujan sólo las caras que se ven (arriba, la que mira a +x
 * y la que mira a +y), cada una con su sombra.
 */
function drawCar(g: Phaser.GameObjects.Graphics, axis: Axis, color: number) {
  // Medidas en tiles (largo y ancho) y en píxeles (alto).
  const along = (a: number, b: number) => (axis === "x" ? { x: a, y: b } : { x: b, y: a });
  const darker = Phaser.Display.Color.ValueToColor(color).darken(25).color;
  const darkest = Phaser.Display.Color.ValueToColor(color).darken(40).color;
  const glass = 0x9fc6dc;

  // Sombra en el piso.
  const shadow = [along(-0.9, -0.42), along(0.9, -0.42), along(0.9, 0.42), along(-0.9, 0.42)].map((p) => isoPoint(p.x, p.y, 0));
  g.fillStyle(0x000000, 0.28).fillPoints(shadow, true);

  // Ruedas: las cuatro esquinas de abajo (las de atrás quedan medio tapadas por la carrocería).
  for (const [a, b] of [[-0.55, -0.36], [0.55, -0.36], [-0.55, 0.36], [0.55, 0.36]]) {
    const p = along(a, b);
    const at = isoPoint(p.x, p.y, 3);
    g.fillStyle(0x1b1b1b, 1).fillEllipse(at.x, at.y, 9, 7);
  }

  box(g, along, [-0.85, 0.85], [-0.38, 0.38], [3, 12], color, darker, darkest);
  box(g, along, [-0.42, 0.4], [-0.32, 0.32], [12, 21], glass, Phaser.Display.Color.ValueToColor(glass).darken(15).color, Phaser.Display.Color.ValueToColor(glass).darken(28).color);
  // Techo del color del auto.
  const roof = [along(-0.38, -0.29), along(0.36, -0.29), along(0.36, 0.29), along(-0.38, 0.29)].map((p) => isoPoint(p.x, p.y, 21.5));
  g.fillStyle(color, 1).fillPoints(roof, true);

  // Faros adelante (+ del eje) y luces de atrás.
  for (const b of [-0.24, 0.24]) {
    const front = along(0.86, b);
    const back = along(-0.86, b);
    const f = isoPoint(front.x, front.y, 8);
    const r = isoPoint(back.x, back.y, 8);
    g.fillStyle(0xfff3b0, 1).fillCircle(f.x, f.y, 2);
    g.fillStyle(0xb3261e, 1).fillCircle(r.x, r.y, 1.6);
  }
}

/** Una caja entre [a0, a1] (a lo largo), [b0, b1] (a lo ancho) y [z0, z1] (alto en px): arriba y las dos caras que se ven. */
function box(
  g: Phaser.GameObjects.Graphics,
  along: (a: number, b: number) => TilePoint,
  [a0, a1]: [number, number],
  [b0, b1]: [number, number],
  [z0, z1]: [number, number],
  top: number,
  sideA: number,
  sideB: number,
) {
  // Las esquinas en coordenadas del mapa (x, y) para saber qué caras miran a +x y a +y.
  const corners = [along(a0, b0), along(a1, b0), along(a1, b1), along(a0, b1)];
  const maxX = Math.max(...corners.map((c) => c.x));
  const maxY = Math.max(...corners.map((c) => c.y));
  const minX = Math.min(...corners.map((c) => c.x));
  const minY = Math.min(...corners.map((c) => c.y));
  const face = (points: TilePoint[], color: number) => {
    g.fillStyle(color, 1).fillPoints(points, true);
    g.lineStyle(1, 0x000000, 0.25).strokePoints(points, true);
  };
  // Cara que mira a +y (abajo a la izquierda en pantalla).
  face([isoPoint(minX, maxY, z0), isoPoint(maxX, maxY, z0), isoPoint(maxX, maxY, z1), isoPoint(minX, maxY, z1)], sideA);
  // Cara que mira a +x (abajo a la derecha).
  face([isoPoint(maxX, minY, z0), isoPoint(maxX, maxY, z0), isoPoint(maxX, maxY, z1), isoPoint(maxX, minY, z1)], sideB);
  // Arriba.
  face([isoPoint(minX, minY, z1), isoPoint(maxX, minY, z1), isoPoint(maxX, maxY, z1), isoPoint(minX, maxY, z1)], top);
}
