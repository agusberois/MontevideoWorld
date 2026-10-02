import * as Phaser from "phaser";
import { CityMap, CustomerState, OutfitIds, STEP_MS, TilePoint, randomAppearance } from "@montevideo-world/shared";
import { Avatar } from "./Avatar";
import { lookFromAppearance } from "./avatarLook";

/** Dónde se para el hincha, en orden de preferencia: al lado del carrito (que va a la derecha del vendedor). */
const SPOTS: readonly TilePoint[] = [
  { x: 1, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: 1 },
];
/** De cuántos tiles de distancia llega (y hasta cuántos se va) y cuánto puede desviarse el camino. */
const WALK_MIN = 4;
const WALK_MAX = 6;
const MAX_PATH = 10;
const FADE_MS = 300;
/** Después de comprar (o no) se queda un momento antes de irse. */
const LINGER_MS = 900;

const TOPS = ["camiseta-celeste", "camiseta-celeste", "camiseta-celeste", "remera-blanca", "remera-negra", "buzo-gris"];
const BOTTOMS = ["jean", "short-azul", "pantalon-beige", "short-verde"];
const SHOES = ["championes-blancos", "championes-rojos", "botas-marrones"];
const HATS = ["", "", "gorra-azul", "gorro-lana"];
const ARRIVE_LINES = ["¡Uno, bo!", "¿A cuánto?", "¡Dame uno!", "Ta, dame uno."];
const BOUGHT_LINES = ["¡Gracias, crack!", "¡Buenísimo!", "¡Vamo arriba!", "¡De primera!"];
const PASSED_LINES = ["Mmm… hoy no.", "Ta caro, bo.", "Después vuelvo.", "Paso, gracias."];

interface Fan {
  avatar: Avatar;
  /** Ya se está yendo: no se le hace más caso a lo que cambie el vendedor. */
  leaving: boolean;
  /** Lo que pasó mientras llegaba (compró o no): se hace al llegar. */
  pending: CustomerState | null;
  timer: Phaser.Time.TimerEvent | null;
}

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/**
 * Hinchas que se acercan al carrito de cada vendedor del Centenario. Son sólo dibujo (no están en el
 * Schema ni chocan con nadie): los mueve `Player.customer` del vendedor, igual en todos los clientes.
 * Salen de unos tiles más allá, caminan hasta el carrito, compran (o no) y se van desvaneciéndose.
 */
export class Customers {
  /** El hincha de cada vendedor (el que está llegando o comprando). */
  private readonly fans = new Map<string, Fan>();
  /** Todos los que se dibujan, también los que ya se están yendo. */
  private readonly all = new Set<Fan>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: CityMap,
  ) {}

  /** Cambió el hincha del vendedor `vendorId`, que está en `vendor`. */
  update(vendorId: string, state: CustomerState, vendor: TilePoint) {
    const fan = this.fans.get(vendorId);
    if (state === CustomerState.Arriving) {
      // Uno nuevo: si el anterior seguía ahí, se va.
      if (fan) this.leave(vendorId, fan);
      this.arrive(vendorId, vendor);
      return;
    }
    if (!fan || fan.leaving) return;
    if (state === CustomerState.None) return this.leave(vendorId, fan);
    if (fan.avatar.isWalking()) fan.pending = state;
    else this.react(vendorId, fan, state);
  }

  /** El vendedor se fue del barrio: su hincha también. */
  remove(vendorId: string) {
    const fan = this.fans.get(vendorId);
    if (fan) this.leave(vendorId, fan);
  }

  tick(delta: number) {
    for (const fan of this.all) fan.avatar.tick(delta);
    for (const [vendorId, fan] of this.fans) {
      if (fan.leaving || fan.pending === null || fan.avatar.isWalking()) continue;
      const state = fan.pending;
      fan.pending = null;
      this.react(vendorId, fan, state);
    }
  }

  dispose() {
    for (const fan of this.all) this.destroy(fan);
    this.all.clear();
    this.fans.clear();
  }

  private arrive(vendorId: string, vendor: TilePoint) {
    const spot = SPOTS.map((d) => ({ x: vendor.x + d.x, y: vendor.y + d.y })).find((tile) => this.map.isWalkable(tile.x, tile.y));
    if (!spot) return;
    const route = this.walkFrom(spot);
    if (!route) return;

    const look = randomAppearance();
    const outfit: OutfitIds = { hat: pick(HATS), top: pick(TOPS), bottom: pick(BOTTOMS), shoes: pick(SHOES) };
    const avatar = new Avatar(this.scene, {
      look: lookFromAppearance(look),
      color: "#cfd8dc",
      name: "Hincha",
      outfit,
      tileX: route.start.x,
      tileY: route.start.y,
      isLocal: false,
    });
    avatar.setFade(0);
    this.scene.tweens.addCounter({ from: 0, to: 1, duration: FADE_MS, onUpdate: (tween) => avatar.setFade(tween.getValue() ?? 1) });
    // Camina del borde hasta el carrito: el recorrido se dio vuelta (sale del tile del carrito).
    avatar.setPath([...route.path.slice(0, -1).reverse(), spot]);
    const fan: Fan = { avatar, leaving: false, pending: null, timer: null };
    this.fans.set(vendorId, fan);
    this.all.add(fan);
    fan.timer = this.scene.time.delayedCall(route.path.length * STEP_MS, () => {
      if (!fan.leaving && fan.pending === null) avatar.say(pick(ARRIVE_LINES));
    });
  }

  /** Compró o siguió de largo: lo dice, espera un momento y se va. */
  private react(vendorId: string, fan: Fan, state: CustomerState) {
    if (state === CustomerState.Bought) fan.avatar.say(pick(BOUGHT_LINES));
    else if (state === CustomerState.Passed) fan.avatar.say(pick(PASSED_LINES));
    fan.leaving = true;
    fan.timer?.remove(false);
    fan.timer = this.scene.time.delayedCall(LINGER_MS, () => this.walkAway(vendorId, fan));
  }

  private leave(vendorId: string, fan: Fan) {
    if (fan.leaving) return;
    fan.leaving = true;
    fan.timer?.remove(false);
    this.walkAway(vendorId, fan);
  }

  /** Se aleja unos tiles y desaparece de a poco (si no encuentra adónde ir, desaparece ahí). */
  private walkAway(vendorId: string, fan: Fan) {
    const avatar = fan.avatar;
    const route = this.walkFrom(avatar.endTile());
    avatar.setPath(route?.path ?? []);
    const walkMs = (route?.path.length ?? 0) * STEP_MS;
    // El vendedor puede tener otro hincha mientras éste se va: éste queda sólo para terminar de irse.
    if (this.fans.get(vendorId) === fan) this.fans.delete(vendorId);
    fan.timer = this.scene.time.delayedCall(Math.max(0, walkMs - FADE_MS), () => {
      this.scene.tweens.addCounter({
        from: 1,
        to: 0,
        duration: FADE_MS,
        onUpdate: (tween) => avatar.setFade(tween.getValue() ?? 0),
        onComplete: () => {
          this.all.delete(fan);
          this.destroy(fan);
        },
      });
    });
  }

  /** Un tile caminable a unos pasos de `from` y el camino hasta él (desde `from`, sin incluirlo). */
  private walkFrom(from: TilePoint): { start: TilePoint; path: TilePoint[] } | null {
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = WALK_MIN + Math.random() * (WALK_MAX - WALK_MIN);
      const tile = { x: Math.round(from.x + Math.cos(angle) * distance), y: Math.round(from.y + Math.sin(angle) * distance) };
      if (!this.map.isWalkable(tile.x, tile.y)) continue;
      const path = this.map.findPath(from, tile);
      if (path.length > 0 && path.length <= MAX_PATH) return { start: tile, path };
    }
    return null;
  }

  private destroy(fan: Fan) {
    fan.timer?.remove(false);
    if (fan.avatar.active) fan.avatar.destroy();
  }
}
