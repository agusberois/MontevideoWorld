import * as Phaser from "phaser";
import { getStateCallbacks } from "colyseus.js";
import {
  CityMap,
  MessageType,
  MoveMessage,
  OutfitIds,
  ShopVisitMessage,
  SitMessage,
  WEEVIL_BITE_STAMINA,
  WeevilKickMessage,
  getCityMap,
  getItem,
} from "@montevideo-world/shared";
import type { Player } from "@montevideo-world/shared/schema";
import { PlayerSummary, eventBus } from "@/lib/eventBus";
import type { CityRoom } from "@/lib/network";
import { CityRenderer, FLOOR_DEPTH, LOGO_TEXTURE } from "../city/CityRenderer";
import { DayNight } from "../city/DayNight";
import { tileDiamond, tileToWorld, worldToTile } from "../iso";
import { Avatar } from "../objects/Avatar";
import { Weevil } from "../objects/Weevil";
import { lookFromAppearance } from "../objects/avatarLook";

const HOVER_DEPTH = FLOOR_DEPTH + 20;
const HOVER_COLOR = 0xffffff;
const BENCH_HOVER_COLOR = 0xffd166;
const SHOP_HOVER_COLOR = 0x9ef0c9;
const PALM_HOVER_COLOR = 0xff8a5c;
/** Por encima de avatares y edificios: los textos flotantes ("-2", "¡Plaf!") se leen siempre. */
const FLOAT_TEXT_DEPTH = 1_000_500;
/**
 * Una palmera es alta: un clic en las hojas cae en tiles "de atrás" (norte-oeste) del tronco. Se
 * buscan palmeras hasta estos pasos en diagonal hacia adelante.
 */
const PALM_CLICK_REACH = 2;
/** La cámara centra el torso del avatar propio, no sus pies. */
const FOLLOW_OFFSET_Y = 40;
/**
 * Zoom con la rueda del mouse. El mínimo no puede bajar de 1/3: el velo de la noche (`DayNight`)
 * mide 3 pantallas y Phaser lo escala con el zoom aunque esté fijo a la cámara.
 */
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
/** Cuánto cambia el zoom por cada "clic" de la rueda. */
const ZOOM_STEP = 1.12;
/** El zoom elegido se recuerda en este navegador. */
const ZOOM_STORAGE_KEY = "mw:zoom";

interface CitySceneData {
  room: CityRoom;
  cityId: string;
}

export class CityScene extends Phaser.Scene {
  static readonly KEY = "CityScene";

  private room!: CityRoom;
  private map!: CityMap;
  private city!: CityRenderer;
  private dayNight!: DayNight;
  private localAvatar: Avatar | null = null;
  private avatars = new Map<string, Avatar>();
  private weevils = new Map<string, Weevil>();
  /** Último estado de pesca avisado a React, para emitir sólo cuando cambia. */
  private fishingStatus = "";
  private lastStamina = -1;
  /** Quiénes están en el barrio, para la lista de jugadores de React (tecla Tab). */
  private roster = new Map<string, PlayerSummary>();
  private hover!: Phaser.GameObjects.Graphics;
  private disposers: Array<() => void> = [];
  private disposed = false;

  constructor() {
    super(CityScene.KEY);
  }

  init(data: CitySceneData) {
    const map = getCityMap(data.cityId);
    if (!map) throw new Error(`Barrio desconocido: ${data.cityId}`);
    this.room = data.room;
    this.map = map;
    this.localAvatar = null;
    this.avatars = new Map();
    this.weevils = new Map();
    this.roster = new Map();
    this.fishingStatus = "";
    this.lastStamina = -1;
    this.disposers = [];
    this.disposed = false;
  }

  preload() {
    // El mismo SVG que el favicon y la pantalla de ingreso, rasterizado al tamaño del cartel.
    this.load.svg(LOGO_TEXTURE, "/mw-logo.svg", { width: 128, height: 128 });
  }

  create() {
    this.city = new CityRenderer(this, this.map);
    this.city.build();
    this.dayNight = new DayNight(this, this.city.nightLights());
    this.hover = this.add.graphics().setDepth(HOVER_DEPTH);

    const camera = this.cameras.main;
    const bounds = this.city.worldBounds();
    camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    const spawn = this.map.city.spawnArea;
    const spawnCenter = tileToWorld(spawn.x + (spawn.width - 1) / 2, spawn.y + (spawn.height - 1) / 2);
    camera.centerOn(spawnCenter.x, spawnCenter.y - FOLLOW_OFFSET_Y);

    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.handleWheel, this);
    camera.setZoom(loadZoom());

    this.bindState();

    this.disposers.push(
      eventBus.on("chat:message", (message) => {
        if (message.kind !== "player") return;
        this.avatars.get(message.sessionId)?.say(message.text);
      }),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
  }

  update(_time: number, delta: number) {
    for (const avatar of this.avatars.values()) avatar.tick(delta);
    for (const weevil of this.weevils.values()) weevil.tick(delta);
    this.dayNight.update(delta);
    const self = this.localAvatar;
    this.city.updateOcclusion(self ? { x: self.x, y: self.y, depth: self.depth } : null, delta);
  }

  /** El Schema de Colyseus es la fuente de verdad; la escena sólo refleja sus cambios. */
  private bindState() {
    const $ = getStateCallbacks(this.room);

    // Hora del juego (reloj del server): la luz del barrio la sigue. La primera vez, sin fundido.
    let firstTime = true;
    this.disposers.push(
      $(this.room.state).listen("minuteOfDay", (minute) => {
        this.dayNight.setMinute(minute, firstTime);
        firstTime = false;
        eventBus.emit("city:clock", minute);
      }),
    );

    this.disposers.push(
      $(this.room.state).players.onAdd((player, sessionId) => {
        const isLocal = sessionId === this.room.sessionId;
        const avatar = new Avatar(this, {
          look: lookFromAppearance(player),
          color: player.color,
          name: player.name,
          outfit: outfitIds(player),
          tileX: player.x,
          tileY: player.y,
          isLocal,
          isAdmin: player.admin,
        });
        this.applySitting(avatar, player);
        this.applyFishing(avatar, player, isLocal);
        this.avatars.set(sessionId, avatar);
        if (isLocal) {
          this.localAvatar = avatar;
          this.cameras.main.startFollow(avatar, true, 0.15, 0.15).setFollowOffset(0, FOLLOW_OFFSET_Y);
        }

        // Patada (a un picudo): se anima en todos los clientes, mirando al picudo más cercano.
        this.disposers.push(
          $(player).listen("kicks", (kicks, previous) => {
            if (previous === undefined || kicks <= previous) return;
            const nearest = this.nearestWeevil(avatar.x, avatar.y);
            avatar.kick(nearest ? nearest.x - avatar.x : 1);
          }),
        );

        this.disposers.push(
          $(player).onChange(() => {
            avatar.setTargetTile(player.x, player.y);
            this.applySitting(avatar, player);
            this.applyFishing(avatar, player, isLocal);
            avatar.setOutfit(outfitIds(player));
            if (isLocal) this.emitStamina(player.stamina);
            if (isLocal) eventBus.emit("player:outfit", outfitIds(player));
          }),
        );

        if (isLocal) {
          eventBus.emit("player:admin", player.admin);
          this.emitStamina(player.stamina);
          eventBus.emit("player:self", { name: player.name, color: player.color });
          eventBus.emit("player:outfit", outfitIds(player));
        }
        this.roster.set(sessionId, { sessionId, name: player.name, color: player.color, isSelf: isLocal });
        this.emitRoster();
      }),
    );

    // Picudos rojos: los mueve el server; acá se dibujan, se animan los mordiscos y las muertes.
    this.disposers.push(
      $(this.room.state).weevils.onAdd((state, id) => {
        const weevil = new Weevil(this, id, state.x, state.y);
        this.weevils.set(id, weevil);
        this.disposers.push(
          $(state).onChange(() => weevil.setTarget(state.x, state.y)),
          $(state).listen("mode", (mode) => {
            if (mode === "dead") {
              weevil.die();
              this.floatText(weevil.x, weevil.y - 18, "¡Plaf!", "#ffd166");
            }
          }),
          $(state).listen("bites", (bites, previous) => {
            if (previous === undefined || bites <= previous) return;
            weevil.bite();
            const victim = this.avatars.get(state.targetId);
            if (victim) this.floatText(victim.x, victim.y - 70, `-${WEEVIL_BITE_STAMINA}`, "#ff6b6b");
          }),
        );
      }),
    );
    this.disposers.push(
      $(this.room.state).weevils.onRemove((_state, id) => {
        this.weevils.get(id)?.destroy();
        this.weevils.delete(id);
      }),
    );

    this.disposers.push(
      $(this.room.state).players.onRemove((_player, sessionId) => {
        const avatar = this.avatars.get(sessionId);
        if (avatar === this.localAvatar) {
          this.cameras.main.stopFollow();
          this.localAvatar = null;
        }
        avatar?.destroy();
        this.avatars.delete(sessionId);
        this.roster.delete(sessionId);
        this.emitRoster();
      }),
    );
  }

  /** Caña en mano mirando al agua; al avatar propio además le avisa a React si puede pescar. */
  private applyFishing(avatar: Avatar, player: Player, isLocal: boolean) {
    // La caña se ve del color de la que está usando (las mejores, más vistosas).
    const rod = player.rod ? getItem(player.rod) : undefined;
    const rodColor = rod ? Phaser.Display.Color.HexStringToColor(rod.color).color : undefined;
    avatar.setFishing(player.fishing, this.map.waterDirection(player.x, player.y) ?? "south", rodColor);
    if (!isLocal) return;
    const status = { canFish: this.map.canFishAt(player.x, player.y), fishing: player.fishing };
    const key = `${status.canFish}|${status.fishing}`;
    if (key === this.fishingStatus) return;
    this.fishingStatus = key;
    eventBus.emit("fishing:status", status);
  }

  private emitStamina(stamina: number) {
    if (stamina === this.lastStamina) return;
    this.lastStamina = stamina;
    eventBus.emit("player:stamina", stamina);
  }

  private emitRoster() {
    eventBus.emit("players:list", [...this.roster.values()]);
  }

  /** La orientación al sentarse sale del banco del mapa (el Schema sólo dice si está sentado). */
  private applySitting(avatar: Avatar, player: Player) {
    const bench = player.sitting ? this.map.benchAt(player.x, player.y) : undefined;
    avatar.setSitting(Boolean(bench), bench?.facing);
  }

  private pointerTile(pointer: Phaser.Input.Pointer) {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return worldToTile(world.x, world.y);
  }

  /** Otro jugador bajo el puntero (el de más adelante si se superponen); el propio no cuenta. */
  private otherPlayerAt(pointer: Phaser.Input.Pointer): string | null {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    let found: { sessionId: string; depth: number } | null = null;
    for (const [sessionId, avatar] of this.avatars) {
      if (avatar === this.localAvatar || !avatar.containsWorldPoint(world.x, world.y)) continue;
      if (!found || avatar.depth > found.depth) found = { sessionId, depth: avatar.depth };
    }
    return found?.sessionId ?? null;
  }

  /** Picudo vivo bajo el puntero (el de más adelante si se superponen). */
  private weevilAt(pointer: Phaser.Input.Pointer): string | null {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    let found: { id: string; depth: number } | null = null;
    for (const [id, weevil] of this.weevils) {
      if (!weevil.containsWorldPoint(world.x, world.y)) continue;
      if (!found || weevil.depth > found.depth) found = { id, depth: weevil.depth };
    }
    return found?.id ?? null;
  }

  private nearestWeevil(x: number, y: number): Weevil | undefined {
    let best: Weevil | undefined;
    for (const weevil of this.weevils.values()) {
      if (!best || Math.hypot(weevil.x - x, weevil.y - y) < Math.hypot(best.x - x, best.y - y)) best = weevil;
    }
    return best;
  }

  /** Palmera en el tile o un poco "detrás" (clic en las hojas), si hay. */
  private palmAt(tile: { x: number; y: number }): { x: number; y: number } | undefined {
    for (let k = 0; k <= PALM_CLICK_REACH; k++) {
      if (this.map.isPalm(tile.x + k, tile.y + k)) return { x: tile.x + k, y: tile.y + k };
    }
    return undefined;
  }

  /** Texto que sube y se desvanece ("-2" de una picadura, "¡Plaf!" de una patada). */
  private floatText(x: number, y: number, text: string, color: string) {
    const label = this.add
      .text(x, y, text, { fontFamily: "system-ui, sans-serif", fontSize: "14px", fontStyle: "bold", color, stroke: "#000000", strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(FLOAT_TEXT_DEPTH);
    this.tweens.add({ targets: label, y: y - 26, alpha: 0, duration: 900, ease: "Quad.Out", onComplete: () => label.destroy() });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    const tile = this.pointerTile(pointer);
    this.hover.clear();
    if (this.weevilAt(pointer) || this.otherPlayerAt(pointer)) {
      this.input.setDefaultCursor("pointer");
      return;
    }
    const palm = this.palmAt(tile);
    if (palm) {
      const { top, right, bottom, left } = tileDiamond(palm.x, palm.y);
      this.input.setDefaultCursor("pointer");
      this.hover.lineStyle(2, PALM_HOVER_COLOR, 0.95);
      this.hover.strokePoints([top, right, bottom, left], true);
      return;
    }
    const shop = this.map.shopAt(tile.x, tile.y);
    const isBench = Boolean(this.map.benchAt(tile.x, tile.y));
    this.input.setDefaultCursor(isBench || shop ? "pointer" : "default");

    if (shop) {
      // Toda la planta de la tienda.
      const { x, y, width, height } = shop.area;
      const top = tileDiamond(x, y).top;
      const right = tileDiamond(x + width - 1, y).right;
      const bottom = tileDiamond(x + width - 1, y + height - 1).bottom;
      const left = tileDiamond(x, y + height - 1).left;
      this.hover.lineStyle(2, SHOP_HOVER_COLOR, 0.95);
      this.hover.strokePoints([top, right, bottom, left], true);
      return;
    }
    if (!isBench && !this.map.isWalkable(tile.x, tile.y)) return;

    const { top, right, bottom, left } = tileDiamond(tile.x, tile.y);
    this.hover.lineStyle(2, isBench ? BENCH_HOVER_COLOR : HOVER_COLOR, 0.9);
    this.hover.strokePoints([top, right, bottom, left], true);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    // Clic en un picudo: patada (va primero: es chiquito y suele estar encima de alguien).
    const weevilId = this.weevilAt(pointer);
    if (weevilId) {
      const kick: WeevilKickMessage = { id: weevilId };
      this.room.send(MessageType.WeevilKick, kick);
      return;
    }

    // Clic en otro jugador: React abre su menú (Saludar / Intercambiar) y no se camina.
    const clicked = this.otherPlayerAt(pointer);
    const player = clicked ? this.room.state.players.get(clicked) : undefined;
    if (clicked && player) {
      const canvas = this.game.canvas.getBoundingClientRect();
      eventBus.emit("player:click", {
        sessionId: clicked,
        name: player.name,
        screenX: canvas.left + (pointer.x * canvas.width) / this.scale.width,
        screenY: canvas.top + (pointer.y * canvas.height) / this.scale.height,
      });
      return;
    }

    const tile = this.pointerTile(pointer);
    if (this.map.shopAt(tile.x, tile.y)) {
      const visit: ShopVisitMessage = { x: tile.x, y: tile.y };
      this.room.send(MessageType.ShopVisit, visit);
      this.showClickMarker(tile.x, tile.y);
      return;
    }
    const palm = this.palmAt(tile);
    if (palm) {
      this.room.send(MessageType.PalmShake, palm);
      this.showClickMarker(palm.x, palm.y);
      return;
    }
    if (this.map.benchAt(tile.x, tile.y)) {
      const sit: SitMessage = { x: tile.x, y: tile.y };
      this.room.send(MessageType.Sit, sit);
      this.showClickMarker(tile.x, tile.y);
      return;
    }
    if (!this.map.isWalkable(tile.x, tile.y)) return;

    const message: MoveMessage = { x: tile.x, y: tile.y };
    this.room.send(MessageType.Move, message);
    this.showClickMarker(tile.x, tile.y);
  }

  /** Rueda del mouse: acercar (hacia arriba) o alejar (hacia abajo), centrado en el avatar propio. */
  private handleWheel(_pointer: Phaser.Input.Pointer, _over: unknown[], _dx: number, dy: number) {
    if (dy === 0) return;
    const camera = this.cameras.main;
    const zoom = Phaser.Math.Clamp(dy < 0 ? camera.zoom * ZOOM_STEP : camera.zoom / ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
    camera.setZoom(zoom);
    saveZoom(zoom);
    // El hover quedó dibujado donde estaba el puntero antes del zoom: se recalcula.
    this.handlePointerMove(this.input.activePointer);
  }

  private showClickMarker(tileX: number, tileY: number) {
    const { x, y } = tileToWorld(tileX, tileY);
    const marker = this.add.ellipse(x, y, 40, 20).setStrokeStyle(2, 0x4cc9f0).setDepth(HOVER_DEPTH);
    this.tweens.add({
      targets: marker,
      scale: 0.3,
      alpha: 0,
      duration: 400,
      onComplete: () => marker.destroy(),
    });
  }

  private dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
    this.dayNight.dispose();
    this.avatars.clear();
    this.weevils.clear();
    this.roster.clear();
    this.localAvatar = null;
    // Al destruir el juego entero (salir, se cortó la conexión) sólo llega DESTROY, y para entonces
    // el plugin de input ya soltó su manager: no hay cursor que restaurar (el canvas también se va).
    if (this.input?.manager) this.input.setDefaultCursor("default");
  }
}

function outfitIds(player: Player): OutfitIds {
  return { hat: player.hat, top: player.top, bottom: player.bottom, shoes: player.shoes };
}

function loadZoom(): number {
  try {
    const saved = Number(window.localStorage.getItem(ZOOM_STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? Phaser.Math.Clamp(saved, MIN_ZOOM, MAX_ZOOM) : 1;
  } catch {
    return 1;
  }
}

function saveZoom(zoom: number) {
  try {
    window.localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom));
  } catch {
    // Sin almacenamiento: el zoom funciona igual, sólo no se recuerda.
  }
}
