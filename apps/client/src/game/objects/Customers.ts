import * as Phaser from "phaser";
import { CityMap, CustomerState, OutfitIds, STEP_MS, TilePoint, getItem, isCart, randomAppearance } from "@montevideo-world/shared";
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
/**
 * La entrega: el vendedor estira el brazo, la comida vuela del carrito a la mano del hincha
 * (`FOOD_FLIGHT_MS`) y, cuando la agarra, una moneda vuelve al vendedor (`COIN_FLIGHT_MS`).
 */
const FOOD_FLIGHT_MS = 420;
const COIN_FLIGHT_MS = 380;
const FLIGHT_ARC_PX = 22;
/** De dónde sale la comida: el carrito, a la derecha del vendedor (px desde sus pies). */
const CART_OFFSET = { x: 32, y: -30 };
/** La mano del hincha (px desde sus pies, hacia el lado del vendedor). */
const FAN_HAND = { x: 13, y: -34 };
const COIN_COLOR = 0xf2c94c;
/** El carrito del vendedor queda a la vista hasta que vuelve la moneda (y un poquito más). */
const CART_KEEP_MS = FOOD_FLIGHT_MS + COIN_FLIGHT_MS + 250;

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
 * El hincha que se acerca al carrito del vendedor del Centenario. Es sólo dibujo (no está en el
 * Schema ni choca con nadie) y **sólo lo ve el vendedor**: lo mueve `vend:customer`, que el server le
 * manda a él solo (así no se le dibujan a todo el barrio los hinchas de todos). Sale de unos tiles más
 * allá, camina hasta el carrito, compra (le dan la comida y paga) o no, y se va desvaneciéndose.
 */
export class Customers {
  /** El hincha de cada vendedor (el que está llegando o comprando). */
  private readonly fans = new Map<string, Fan>();
  /** Todos los que se dibujan, también los que ya se están yendo. */
  private readonly all = new Set<Fan>();
  /** Con qué carrito vendió cada vendedor la última vez (qué comida se entrega). */
  private readonly tiers = new Map<string, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: CityMap,
    /** El avatar del vendedor (para la entrega: estira el brazo y la comida sale de su carrito). */
    private readonly vendorAvatar: (vendorId: string) => Avatar | undefined,
  ) {}

  /** Cambió el hincha del vendedor `vendorId`, que está en `vendor`. Al comprar, `cartId` dice qué le da. */
  update(vendorId: string, state: CustomerState, vendor: TilePoint, cartId?: string) {
    const cart = cartId ? getItem(cartId) : undefined;
    if (state === CustomerState.Bought && isCart(cart)) this.tiers.set(vendorId, cart.tier);
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
    this.tiers.delete(vendorId);
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
    fan.leaving = true;
    fan.timer?.remove(false);
    if (state === CustomerState.Bought) {
      // Primero la entrega; cuando tiene la comida en la mano, agradece y se va.
      const handed = FOOD_FLIGHT_MS + COIN_FLIGHT_MS;
      this.handOver(vendorId, fan);
      fan.timer = this.scene.time.delayedCall(FOOD_FLIGHT_MS, () => {
        fan.avatar.say(pick(BOUGHT_LINES));
        fan.timer = this.scene.time.delayedCall(LINGER_MS + handed - FOOD_FLIGHT_MS, () => this.walkAway(vendorId, fan));
      });
      return;
    }
    if (state === CustomerState.Passed) fan.avatar.say(pick(PASSED_LINES));
    fan.timer = this.scene.time.delayedCall(LINGER_MS, () => this.walkAway(vendorId, fan));
  }

  /**
   * El vendedor le da la comida (la del carrito con que vendió) y el hincha le paga: la comida vuela
   * en arco del carrito a la mano del hincha, que se la queda, y una moneda vuelve al vendedor.
   */
  private handOver(vendorId: string, fan: Fan) {
    const vendor = this.vendorAvatar(vendorId);
    if (!vendor) return;
    const side = fan.avatar.x >= vendor.x ? -1 : 1; // hacia dónde mira el hincha (hacia el vendedor)
    vendor.offer();
    vendor.keepCart(CART_KEEP_MS);
    fan.avatar.offer(side);

    const from = { x: vendor.x + CART_OFFSET.x, y: vendor.y + CART_OFFSET.y };
    const to = { x: fan.avatar.x + side * FAN_HAND.x, y: fan.avatar.y + FAN_HAND.y };
    const food = drawFood(this.scene.add.graphics(), this.tiers.get(vendorId) ?? 1);
    const depth = Math.max(vendor.depth, fan.avatar.depth) + 1;
    this.fly(food, from, to, FOOD_FLIGHT_MS, depth, () => {
      // La agarró: se la lleva en la mano (se dibuja con el hincha y se va con él).
      if (!fan.avatar.active) return food.destroy();
      fan.avatar.hold(food);
      const coin = this.scene.add.graphics();
      coin.fillStyle(COIN_COLOR, 1).fillCircle(0, 0, 3.5).lineStyle(1, 0x8a6d1d, 1).strokeCircle(0, 0, 3.5);
      this.fly(coin, to, { x: vendor.x + 12, y: vendor.y - 36 }, COIN_FLIGHT_MS, depth, () => coin.destroy());
    });
  }

  /** Mueve `object` de `from` a `to` en un arco (sube y baja) en `duration`. */
  private fly(object: Phaser.GameObjects.Graphics, from: TilePoint, to: TilePoint, duration: number, depth: number, done: () => void) {
    object.setPosition(from.x, from.y).setDepth(depth);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      ease: "Sine.InOut",
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 1;
        object.setPosition(Phaser.Math.Linear(from.x, to.x, t), Phaser.Math.Linear(from.y, to.y, t) - Math.sin(t * Math.PI) * FLIGHT_ARC_PX);
      },
      onComplete: done,
    });
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

/**
 * Lo que vende cada carrito, chiquito (centrado en la mano): refresco (conservadora), garrapiñada,
 * pancho o choripán.
 */
function drawFood(g: Phaser.GameObjects.Graphics, tier: number): Phaser.GameObjects.Graphics {
  if (tier === 1) {
    // Lata de refresco.
    g.fillStyle(0xd62828, 1).fillRoundedRect(-2.5, -5, 5, 9, 1.5);
    g.fillStyle(0xdfe4e8, 1).fillRect(-2.5, -5, 5, 1.6);
    g.fillStyle(0xffffff, 0.8).fillRect(-1.5, -2, 1.2, 4);
  } else if (tier === 2) {
    // Cucurucho de papel con garrapiñada.
    g.fillStyle(0xd8c3a5, 1).fillTriangle(-4, -3, 4, -3, 0, 6);
    g.fillStyle(0x9c5a1f, 1);
    for (const [x, y] of [[-2, -4], [0.5, -5], [2.5, -3.8], [-0.8, -2.8]]) g.fillCircle(x, y, 1.5);
  } else {
    // Pan con pancho (rojizo) o con chorizo (más oscuro y más largo).
    const length = tier === 3 ? 12 : 14;
    g.fillStyle(0xe0b070, 1).fillEllipse(0, 0, length, 5);
    g.fillStyle(tier === 3 ? 0xc0533a : 0x7a2416, 1).fillEllipse(0, -1.2, length + 2, 2.6);
    if (tier === 3) g.lineStyle(1, 0xf2c94c, 1).lineBetween(-4, -1.5, 4, -1.5);
  }
  return g;
}
