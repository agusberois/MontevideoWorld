import * as Phaser from "phaser";
import { getStateCallbacks } from "colyseus.js";
import {
  CityMap,
  MessageType,
  MoveMessage,
  OutfitIds,
  ShopVisitMessage,
  SitMessage,
  getCityMap,
} from "@montevideo-world/shared";
import type { Player } from "@montevideo-world/shared/schema";
import { PlayerSummary, eventBus } from "@/lib/eventBus";
import type { CityRoom } from "@/lib/network";
import { CityRenderer, FLOOR_DEPTH, LOGO_TEXTURE } from "../city/CityRenderer";
import { DayNight } from "../city/DayNight";
import { tileDiamond, tileToWorld, worldToTile } from "../iso";
import { Avatar } from "../objects/Avatar";

const HOVER_DEPTH = FLOOR_DEPTH + 20;
const HOVER_COLOR = 0xffffff;
const BENCH_HOVER_COLOR = 0xffd166;
const SHOP_HOVER_COLOR = 0x9ef0c9;
/** La cámara centra el torso del avatar propio, no sus pies. */
const FOLLOW_OFFSET_Y = 40;

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
          seed: sessionId,
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
    avatar.setFishing(player.fishing, this.map.waterDirection(player.x, player.y) ?? "south");
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

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    const tile = this.pointerTile(pointer);
    this.hover.clear();
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
    const tile = this.pointerTile(pointer);
    if (this.map.shopAt(tile.x, tile.y)) {
      const visit: ShopVisitMessage = { x: tile.x, y: tile.y };
      this.room.send(MessageType.ShopVisit, visit);
      this.showClickMarker(tile.x, tile.y);
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
    this.roster.clear();
    this.localAvatar = null;
    this.input.setDefaultCursor("default");
  }
}

function outfitIds(player: Player): OutfitIds {
  return { hat: player.hat, top: player.top, bottom: player.bottom, shoes: player.shoes };
}
