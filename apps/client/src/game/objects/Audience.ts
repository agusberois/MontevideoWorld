import * as Phaser from "phaser";
import { CityMap, CrowdState, OutfitIds, STEP_MS, TilePoint, randomAppearance } from "@montevideo-world/shared";
import { Avatar, CASE_OFFSET } from "./Avatar";
import { lookFromAppearance } from "./avatarLook";

/**
 * Dónde se para la gente a escuchar, en orden de preferencia: delante del músico (al sur y al este,
 * del lado de la cámara, así no lo tapan), a dos tiles para dejarle lugar al estuche.
 */
const SPOTS: readonly TilePoint[] = [
  { x: 2, y: 1 },
  { x: 1, y: 2 },
  { x: 2, y: -1 },
  { x: -1, y: 2 },
  { x: 2, y: 2 },
  { x: 2, y: 0 },
  { x: 0, y: 2 },
];
/** Cuántos se arriman por tema (al azar entre los dos). */
const MIN_PEOPLE = 1;
const MAX_PEOPLE = 3;
/** De cuántos tiles de distancia llegan (y hasta cuántos se van) y cuánto puede desviarse el camino. */
const WALK_MIN = 4;
const WALK_MAX = 7;
const MAX_PATH = 11;
const FADE_MS = 300;
/** Llegan un poco escalonados, no todos a la vez. */
const STAGGER_MS = 350;
/** Lo que aplauden antes de irse (cuando dejaron plata) y lo que se quedan si no dejaron nada. */
const CLAP_MS = 1700;
const LINGER_MS = 900;
/** La moneda: de la mano del que paga al estuche, a los pies del músico (px desde sus pies). */
const COIN_FLIGHT_MS = 450;
const FLIGHT_ARC_PX = 26;
const HAND = { x: 13, y: -34 };
const COIN_COLOR = 0xf2c94c;

const TOPS = ["remera-blanca", "remera-negra", "buzo-gris", "remera-azul-marino", "buzo-bordo", "camiseta-celeste"];
const BOTTOMS = ["jean", "pantalon-beige", "pantalon-vestir-gris", "pantalon-vestir-negro"];
const SHOES = ["championes-blancos", "botas-marrones", "botas-negras", "championes-rojos"];
const HATS = ["", "", "", "boina-negra", "gorra-azul"];
const ARRIVE_LINES = ["¡Qué lindo!", "¡Mirá, música!", "Uh, ta bueno.", "♪", "Me quedo un rato."];
const TIPPED_LINES = ["¡Bravo!", "¡Otra, otra!", "¡Grande, maestro!", "¡Qué nivel!", "¡Divino!"];
const LEFT_LINES = ["Bueno, sigo.", "Ta, me voy.", "Mmm…", "Otro día."];

interface Listener {
  avatar: Avatar;
  /** Ya se está yendo: no se le hace más caso a lo que pase con el tema. */
  leaving: boolean;
  timer: Phaser.Time.TimerEvent | null;
}

interface Crowd {
  people: Listener[];
  /** Lo que pasó con el tema mientras todavía llegaban: se hace cuando llegan todos. */
  pending: CrowdState | null;
}

const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/**
 * La gente que se arrima a escuchar al músico de 18 de Julio. Es sólo dibujo (no está en el Schema ni
 * choca con nadie) y **sólo la ve el músico**: la mueve `busk:crowd`, que el server le manda a él solo.
 * Llegan de unos tiles más allá, escuchan el tema y, si dejaron plata, aplauden y uno tira la moneda
 * al estuche; si no, se van. Como `Customers` (los hinchas del Centenario).
 */
export class Audience {
  /** El público de cada músico (el del tema de ahora). */
  private readonly crowds = new Map<string, Crowd>();
  /** Todos los que se dibujan, también los que ya se están yendo. */
  private readonly all = new Set<Listener>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: CityMap,
    /** El avatar del músico (para tirarle la moneda al estuche). */
    private readonly musicianAvatar: (musicianId: string) => Avatar | undefined,
  ) {}

  /** Cambió el público del músico `musicianId`, que está en `musician`. */
  update(musicianId: string, state: CrowdState, musician: TilePoint) {
    const crowd = this.crowds.get(musicianId);
    if (state === CrowdState.Arriving) {
      // Tema nuevo: los del anterior que sigan ahí se van, y se arrima gente nueva.
      if (crowd) this.disperse(musicianId, crowd);
      this.arrive(musicianId, musician);
      return;
    }
    if (!crowd) return;
    if (state === CrowdState.None) return this.disperse(musicianId, crowd);
    if (crowd.people.some((listener) => listener.avatar.isWalking())) crowd.pending = state;
    else this.react(musicianId, crowd, state);
  }

  /** El músico se fue del barrio: su público también. */
  remove(musicianId: string) {
    const crowd = this.crowds.get(musicianId);
    if (crowd) this.disperse(musicianId, crowd);
  }

  tick(delta: number) {
    for (const listener of this.all) listener.avatar.tick(delta);
    for (const [musicianId, crowd] of this.crowds) {
      if (crowd.pending === null || crowd.people.some((listener) => listener.avatar.isWalking())) continue;
      const state = crowd.pending;
      crowd.pending = null;
      this.react(musicianId, crowd, state);
    }
  }

  dispose() {
    for (const listener of this.all) this.destroy(listener);
    this.all.clear();
    this.crowds.clear();
  }

  private arrive(musicianId: string, musician: TilePoint) {
    const spots = SPOTS.map((d) => ({ x: musician.x + d.x, y: musician.y + d.y })).filter((tile) => this.map.isWalkable(tile.x, tile.y));
    const count = Math.min(spots.length, MIN_PEOPLE + Math.floor(Math.random() * (MAX_PEOPLE - MIN_PEOPLE + 1)));
    const crowd: Crowd = { people: [], pending: null };
    for (let i = 0; i < count; i++) {
      const spot = spots[i];
      const route = this.walkFrom(spot);
      if (!route) continue;
      const avatar = new Avatar(this.scene, {
        look: lookFromAppearance(randomAppearance()),
        color: "#cfd8dc",
        name: "Transeúnte",
        outfit: { hat: pick(HATS), top: pick(TOPS), bottom: pick(BOTTOMS), shoes: pick(SHOES) } satisfies OutfitIds,
        tileX: route.start.x,
        tileY: route.start.y,
        isLocal: false,
      });
      avatar.setFade(0);
      const listener: Listener = { avatar, leaving: false, timer: null };
      crowd.people.push(listener);
      this.all.add(listener);
      // Escalonados: cada uno sale un poco después que el anterior.
      listener.timer = this.scene.time.delayedCall(i * STAGGER_MS, () => {
        this.scene.tweens.addCounter({ from: 0, to: 1, duration: FADE_MS, onUpdate: (tween) => avatar.setFade(tween.getValue() ?? 1) });
        avatar.setPath([...route.path.slice(0, -1).reverse(), spot]);
        listener.timer = this.scene.time.delayedCall(route.path.length * STEP_MS, () => {
          // Al llegar, alguno comenta (no todos: sería mucho globo).
          if (!listener.leaving && crowd.pending === null && i === 0) avatar.say(pick(ARRIVE_LINES));
        });
      });
    }
    if (crowd.people.length > 0) this.crowds.set(musicianId, crowd);
  }

  /** Terminó el tema: si dejaron plata, aplauden y uno tira la moneda al estuche; si no, se van. */
  private react(musicianId: string, crowd: Crowd, state: CrowdState) {
    if (this.crowds.get(musicianId) === crowd) this.crowds.delete(musicianId);
    const people = crowd.people.filter((listener) => !listener.leaving);
    if (state !== CrowdState.Tipped) {
      if (people[0]) people[0].avatar.say(pick(LEFT_LINES));
      for (const listener of people) this.later(listener, LINGER_MS, () => this.walkAway(listener));
      return;
    }
    const payer = pick(people);
    for (const listener of people) {
      listener.avatar.setGesture("clap");
      if (listener === payer) {
        listener.avatar.say(pick(TIPPED_LINES));
        this.tossCoin(musicianId, listener);
      }
      this.later(listener, CLAP_MS + Math.random() * 300, () => {
        listener.avatar.setGesture(null);
        this.walkAway(listener);
      });
    }
  }

  /** El que paga estira el brazo y la moneda vuela en arco hasta el estuche del músico. */
  private tossCoin(musicianId: string, payer: Listener) {
    const musician = this.musicianAvatar(musicianId);
    if (!musician) return;
    const side = payer.avatar.x >= musician.x ? -1 : 1;
    payer.avatar.offer(side);
    const from = { x: payer.avatar.x + side * HAND.x, y: payer.avatar.y + HAND.y };
    const to = { x: musician.x + CASE_OFFSET.x, y: musician.y + CASE_OFFSET.y - 3 };
    const coin = this.scene.add.graphics();
    coin.fillStyle(COIN_COLOR, 1).fillCircle(0, 0, 3.5).lineStyle(1, 0x8a6d1d, 1).strokeCircle(0, 0, 3.5);
    coin.setPosition(from.x, from.y).setDepth(Math.max(musician.depth, payer.avatar.depth) + 1);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: COIN_FLIGHT_MS,
      ease: "Sine.InOut",
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 1;
        coin.setPosition(Phaser.Math.Linear(from.x, to.x, t), Phaser.Math.Linear(from.y, to.y, t) - Math.sin(t * Math.PI) * FLIGHT_ARC_PX);
      },
      onComplete: () => coin.destroy(),
    });
  }

  /** Se van todos (tema cortado, otro tema o el músico se fue). */
  private disperse(musicianId: string, crowd: Crowd) {
    if (this.crowds.get(musicianId) === crowd) this.crowds.delete(musicianId);
    for (const listener of crowd.people) {
      listener.avatar.setGesture(null);
      this.walkAway(listener);
    }
  }

  private later(listener: Listener, ms: number, run: () => void) {
    listener.timer?.remove(false);
    listener.timer = this.scene.time.delayedCall(ms, run);
  }

  /** Se aleja unos tiles y desaparece de a poco (si no encuentra adónde ir, desaparece ahí). */
  private walkAway(listener: Listener) {
    if (listener.leaving) return;
    listener.leaving = true;
    listener.timer?.remove(false);
    const avatar = listener.avatar;
    const route = this.walkFrom(avatar.endTile());
    avatar.setPath(route?.path ?? []);
    const walkMs = (route?.path.length ?? 0) * STEP_MS;
    listener.timer = this.scene.time.delayedCall(Math.max(0, walkMs - FADE_MS), () => {
      this.scene.tweens.addCounter({
        from: 1,
        to: 0,
        duration: FADE_MS,
        onUpdate: (tween) => avatar.setFade(tween.getValue() ?? 0),
        onComplete: () => {
          this.all.delete(listener);
          this.destroy(listener);
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

  private destroy(listener: Listener) {
    listener.timer?.remove(false);
    if (listener.avatar.active) listener.avatar.destroy();
  }
}
