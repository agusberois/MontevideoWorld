import * as Phaser from "phaser";
import { getStateCallbacks } from "colyseus.js";
import {
  BusStop,
  CityMap,
  MapInteraction,
  MapInteractionKind,
  MessageType,
  MoveMessage,
  OutfitIds,
  ShopVisitMessage,
  DoorEnterMessage,
  SitMessage,
  TilePoint,
  WEEVIL_BITE_ENERGY,
  WEEVIL_KICK_RANGE,
  WeevilKickMessage,
  weevilModeOf,
  weevilTile,
  getPet,
  MatchMode,
  WeatherMode,
  getWeather,
  getItem,
  isCart,
  isInstrument,
  HAIR_STYLES,
  HairStyle,
  FACIAL_HAIR,
  FacialHair,
  GLASSES,
  Glasses,
  gestureInfo,
  isGestureId,
  isPairGestureId,
  walkSpeed,
} from "@montevideo-world/shared";
import type { Player } from "@montevideo-world/shared/schema";
import { PlayerActivity, PlayerSummary, eventBus } from "@/lib/eventBus";
import type { CityRoom } from "@/lib/network";
import { CameraControl, DRAG_SLOP, FOLLOW_OFFSET_Y, isTyping } from "../CameraControl";
import { AdminCoords } from "../AdminCoords";
import { LocalMover, WASD_KEYS } from "../movement";
import { CityRenderer, FLOOR_DEPTH, LOGO_TEXTURE } from "../city/CityRenderer";
import { DayNight } from "../city/DayNight";
import { SlotLights } from "../city/SlotLights";
import { JacuzziCounters } from "../city/JacuzziCounters";
import { PerfOverlay } from "../PerfOverlay";
import { QualityWatch } from "../QualityWatch";
import { loadQuality } from "@/lib/quality";
import { WeatherFx } from "../city/WeatherFx";
import { TutorialPointer } from "../objects/TutorialPointer";
import { tileDiamond, tileToWorld, worldToTile } from "../iso";
import { Avatar } from "../objects/Avatar";
import { Customers } from "../objects/Customers";
import { Audience } from "../objects/Audience";
import { Npcs } from "../objects/Npcs";
import { Pet } from "../objects/Pet";
import { Weevil } from "../objects/Weevil";
import { lookFromAppearance } from "../objects/avatarLook";
import { loadedCityMap } from "@/lib/cityMaps";

const HOVER_DEPTH = FLOOR_DEPTH + 20;
/** Color del borde al pasar el mouse, por tipo de cosa del mapa (ver `CityMap.interactionAt`). */
const HOVER_COLORS: Record<MapInteractionKind, number> = {
  floor: 0xffffff,
  door: 0xffd166,
  jacuzzi: 0x7fd6ff,
  bench: 0xffd166,
  shop: 0x9ef0c9,
  palm: 0xff8a5c,
  busStop: 0x6cb4ff,
};
/** Por encima de avatares y edificios: los textos flotantes ("-2", "¡Plaf!") se leen siempre. */
const FLOAT_TEXT_DEPTH = 1_000_500;
/** Cada cuánto se busca qué hay al lado para interactuar con F (y se actualiza el cartel). */
const INTERACT_CHECK_MS = 100;
/** Con F, qué cosa del mapa pegada al avatar se usa primero (el piso no cuenta: ya estás ahí). */
const NEARBY_PRIORITY: readonly MapInteractionKind[] = ["door", "shop", "busStop", "jacuzzi", "bench", "palm"];

/** Algo con lo que se puede interactuar con F desde donde está el avatar propio. */
interface Interaction {
  /** Identifica qué es (para avisarle a React sólo cuando cambia). */
  key: string;
  /** Lo que dice el cartel: "Sentarse", "Entrar a Ropería Sarandí"… */
  label: string;
  run: () => void;
}

/** "Acá estás": anillos que laten bajo el avatar propio al centrar la cámara en él. */
const LOCATOR_COLOR = 0x4cc9f0;
const LOCATOR_RINGS = 3;
const LOCATOR_RING_MS = 900;
/** Flecha en el borde de la pantalla que apunta al avatar propio cuando quedó afuera (cámara libre). */
const ARROW_DEPTH = 2_000_000;
const ARROW_RADIUS = 20;
/** Margen para la flecha: lejos de los bordes y de lo que tapa el HUD (arriba) y el chat / la barra (abajo). */
const ARROW_INSET = { side: 32, top: 80, bottom: 100 };
const ARROW_INSET_SMALL = { side: 28, top: 150, bottom: 200 };
/**
 * Una palmera es alta: un clic en las hojas cae en tiles "de atrás" (norte-oeste) del tronco. Se
 * buscan palmeras hasta estos pasos en diagonal hacia adelante.
 */
const PALM_CLICK_REACH = 2;
/** Un toque que se movió más que esto (px de pantalla) fue un arrastre del mapa, no un clic: no se camina. */
const TAP_SLOP = DRAG_SLOP;


interface CitySceneData {
  room: CityRoom;
  cityId: string;
}

/** Lo que flota al empezar un gesto sale por encima del nombre (px sobre los pies). */
const GESTURE_CRY_Y = 128;

export class CityScene extends Phaser.Scene {
  static readonly KEY = "CityScene";

  private room!: CityRoom;
  private map!: CityMap;
  private city!: CityRenderer;
  private dayNight!: DayNight;
  private weatherFx!: WeatherFx;
  private tutorialPointer!: TutorialPointer;
  private localAvatar: Avatar | null = null;
  /** El avatar propio vuela (`/god`): los clics van en línea recta a cualquier tile, sin predicción ni WASD. */
  private flying = false;
  private avatars = new Map<string, Avatar>();
  private weevils = new Map<string, Weevil>();
  /** Hinchas que se acercan a los carritos del Centenario (sólo dibujo). */
  private customers!: Customers;
  /** Personajes que no son jugadores (el barman del casino). */
  private npcs!: Npcs;
  /** Lamparitas titilando sobre las tragamonedas (sólo en un interior `nightclub`: el casino). */
  private slotLights: SlotLights | null = null;
  private jacuzziCounters: JacuzziCounters | null = null;
  /** Medidor de rendimiento (sólo con `?perf=1`). */
  private perf: PerfOverlay | null = null;
  /** Ya avisó `city:ready` (en su primer frame con estado). */
  private announcedReady = false;
  /** Calidad gráfica (Opciones; en automática, según los fps). */
  private quality!: QualityWatch;
  /** A quién sigue el avatar propio ("" = a nadie), para avisarle a React sólo cuando cambia. */
  private followingId = "";
  private audience!: Audience;
  /** Mascota de cada jugador que tiene una (sessionId → mascota). */
  private pets = new Map<string, Pet>();
  /** Último estado de pesca avisado a React, para emitir sólo cuando cambia. */
  private fishingStatus = "";
  /** Último estado de venta avisado a React. */
  private vendingStatus = "";
  private buskingStatus = "";
  private lastEnergy = -1;
  /**
   * Parada a la que está caminando el avatar propio y el tile donde va a quedar: al llegar se abre
   * la lista de barrios. Es sólo del cliente (viajar lo valida el server igual, desde donde sea).
   */
  private pendingBusStop: { stop: BusStop; x: number; y: number } | null = null;
  /** Quiénes están en el barrio, para la lista de jugadores de React (tecla Tab). */
  private roster = new Map<string, PlayerSummary>();
  /** Firma barata de lo que muestra la lista por jugador (sin `x/y`): sólo se rearma si cambió. */
  private rosterKeys = new Map<string, string>();
  /** La lista cambió y falta mandársela a React (una vez por frame, no una por jugador que se movió). */
  private rosterDirty = false;
  private hover!: Phaser.GameObjects.Graphics;
  private disposers: Array<() => void> = [];
  private disposed = false;
  /** Dónde empezó cada toque (por id de puntero), para distinguir un toque de un arrastre. */
  private pressStarts = new Map<number, { x: number; y: number }>();
  /** Cámara fija / libre, zoom y gestos de cámara (ver `CameraControl`). */
  private cameraControl!: CameraControl;
  /** Anillos de "acá estás" que siguen al avatar propio mientras laten. */
  private locatorRings: Phaser.GameObjects.Ellipse[] = [];
  /** Flecha hacia el avatar propio cuando está fuera de pantalla, y dónde quedó (px de pantalla) para tocarla. */
  private offscreenArrow!: Phaser.GameObjects.Graphics;
  private arrowSpot: { x: number; y: number } | null = null;
  /** Teclas WASD apretadas ahora. */
  private wasdKeys = new Set<string>();
  /** Movimiento del avatar propio: predicción, recorrido al server y WASD (ver `movement.ts`). */
  private mover!: LocalMover;
  /** Lo que hay al lado para interactuar con F (ver `findInteraction`), y cuándo volver a buscar. */
  private interaction: Interaction | null = null;
  private nextInteractionCheck = 0;
  /** Modo coordenadas del admin (tecla G): grilla, "x,y" bajo el mouse y Shift + clic para copiar. */
  private adminCoords!: AdminCoords;

  constructor() {
    super(CityScene.KEY);
  }

  init(data: CitySceneData) {
    // `joinCity` ya lo descargó (cada barrio es un chunk aparte, ver `lib/cityMaps.ts`).
    const map = loadedCityMap(data.cityId);
    if (!map) throw new Error(`Mapa sin cargar: ${data.cityId}`);
    this.room = data.room;
    this.map = map;
    this.localAvatar = null;
    this.avatars = new Map();
    this.weevils = new Map();
    this.customers = new Customers(this, map, (id) => this.avatars.get(id));
    this.audience = new Audience(this, map, (id) => this.avatars.get(id));
    this.pets = new Map();
    this.roster = new Map();
    this.fishingStatus = "";
    this.vendingStatus = "";
    this.buskingStatus = "";
    this.lastEnergy = -1;
    this.pendingBusStop = null;
    this.disposers = [];
    this.disposed = false;
    this.pressStarts = new Map();
    this.locatorRings = [];
    this.arrowSpot = null;
    this.wasdKeys = new Set();
    this.interaction = null;
    this.nextInteractionCheck = 0;
  }

  preload() {
    // El mismo SVG que el favicon y la pantalla de ingreso, rasterizado al tamaño del cartel.
    this.load.svg(LOGO_TEXTURE, "/mw-logo.svg", { width: 128, height: 128 });
  }

  create() {
    this.city = new CityRenderer(this, this.map);
    this.city.build();
    this.npcs = new Npcs(this, this.map.city.npcs ?? []);
    this.dayNight = new DayNight(this, this.city.nightLights());
    // Interior de boliche (el casino): siempre de noche con un velo violeta y las máquinas titilando.
    if (this.map.city.interior?.nightclub) {
      this.dayNight.fix(0x14061f, 0.55);
      this.slotLights = new SlotLights(this, this.map);
    }
    if (PerfOverlay.enabled()) this.perf = new PerfOverlay(this);
    // Hotel del Donador: "x/20" arriba de cada jacuzzi.
    if (this.map.city.jacuzzis?.length) this.jacuzziCounters = new JacuzziCounters(this, this.map);
    this.weatherFx = new WeatherFx(this);
    this.quality = new QualityWatch(loadQuality(), (low) => {
      this.dayNight.setGlows(!low);
      this.weatherFx.setParticles(!low);
      eventBus.emit("quality:low", low);
    }, () => eventBus.emit("notice", { text: "🐢 El juego iba lento: bajamos la calidad gráfica (sin luces de noche ni lluvia). Cambiala en Opciones (tecla O)." }));
    this.disposers.push(eventBus.on("quality:set", (setting) => this.quality.set(setting)));
    // Guía de bienvenida: React dice adónde apuntar (sólo si es en este barrio).
    this.tutorialPointer = new TutorialPointer(this, () => this.arrowInset());
    this.disposers.push(
      eventBus.on("tutorial:target", (target) => {
        this.tutorialPointer.setTarget(target && target.cityId === this.map.city.id ? target.area : null);
      }),
    );
    eventBus.emit("tutorial:target:request", null);
    this.hover = this.add.graphics().setDepth(HOVER_DEPTH);

    const camera = this.cameras.main;
    const bounds = this.city.worldBounds();
    camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
    const spawn = this.map.city.spawnArea;
    const spawnCenter = tileToWorld(spawn.x + (spawn.width - 1) / 2, spawn.y + (spawn.height - 1) / 2);
    camera.centerOn(spawnCenter.x, spawnCenter.y - FOLLOW_OFFSET_Y);

    this.cameraControl = new CameraControl(this, () => this.showLocator());
    this.mover = new LocalMover(this.map, {
      sendMove: (target, route) => {
        const message: MoveMessage = { x: target.x, y: target.y, path: route };
        this.room.send(MessageType.Move, message);
      },
      now: () => this.time.now,
      enterDoor: (doorId) => this.enterDoor(doorId),
    });
    this.offscreenArrow = this.add.graphics().setScrollFactor(0).setDepth(ARROW_DEPTH);
    this.bindWasd();
    this.adminCoords = new AdminCoords(this, this.map, HOVER_DEPTH - 1, FLOAT_TEXT_DEPTH);
    this.bindAdminCoords();
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, this.handleWheel, this);

    this.bindState();

    // F (o tocar el cartel): interactuar con lo que hay al lado, buscado de nuevo en este momento.
    this.disposers.push(eventBus.on("interact:use", () => this.findInteraction()?.run()));

    this.disposers.push(
      eventBus.on("chat:message", (message) => {
        if (message.kind !== "player") return;
        this.avatars.get(message.sessionId)?.say(message.text);
      }),
    );

    // Sólo para el que lo hace (mensajes privados del server, no el Schema): así no se le dibujan a
    // todo el barrio los peces y los hinchas de todos.
    this.disposers.push(
      // Picó: la caña se dobla, salpica y sale cada pez (con doble, dos), de su color.
      eventBus.on("fishing:result", (result) => {
        if (!result.hooked?.length) return;
        const colors = result.hooked.map((id) => {
          const fish = getItem(id);
          return fish ? Phaser.Display.Color.HexStringToColor(fish.color).color : 0x9fb4c0;
        });
        this.localAvatar?.reelIn(colors);
      }),
      // El hincha que se acerca al carrito: llega, compra (le dan la comida y paga) o sigue de largo.
      eventBus.on("vending:customer", ({ state, cartId }) => {
        const self = this.room.state.players.get(this.room.sessionId);
        if (self) this.customers.update(this.room.sessionId, state, { x: self.x, y: self.y }, cartId);
      }),
      // La gente que se arrima a escuchar al músico: llega, aplaude y deja plata o se va.
      eventBus.on("busking:crowd", ({ state }) => {
        const self = this.room.state.players.get(this.room.sessionId);
        if (self) this.audience.update(this.room.sessionId, state, { x: self.x, y: self.y });
      }),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.dispose, this);
  }

  update(time: number, delta: number) {
    this.cameraControl.update(delta);
    // Sin el estado de la sala todavía (no debería pasar: `startCity` lo espera) no hay nada que mover.
    if (!this.room.state?.players) return;
    if (!this.announcedReady) {
      // Armada y con estado: al viajar, React saca la cortina recién ahora (si no, se veía el barrio de antes).
      this.announcedReady = true;
      eventBus.emit("city:ready", { cityId: this.map.city.id });
    }
    // WASD y predicción del avatar propio. Al empezar a caminar con WASD, la cámara vuelve a él.
    const wasWasd = this.mover.isWasdActive();
    if (!this.flying) this.mover.update(this.wasdKeys);
    if (!wasWasd && this.mover.isWasdActive()) {
      this.pendingBusStop = null;
      this.cameraControl.returnToTarget();
    }
    for (const avatar of this.avatars.values()) avatar.tick(delta);
    this.updateLocator();
    for (const weevil of this.weevils.values()) weevil.tick(delta);
    this.customers.tick(delta);
    this.npcs.tick(delta);
    this.audience.tick(delta);
    for (const [sessionId, pet] of this.pets) {
      const owner = this.avatars.get(sessionId);
      if (!owner) continue;
      pet.follow(owner, delta);
      pet.setHidden(!owner.visible);
    }
    this.dayNight.update(delta);
    this.slotLights?.tick(delta);
    this.jacuzziCounters?.update(this.room.state.players.values());
    this.weatherFx.update(delta);
    this.tutorialPointer.update(time);
    const self = this.localAvatar;
    this.city.updateCulling(this.cameras.main.worldView);
    this.city.updateOcclusion(self ? { x: self.x, y: self.y, depth: self.depth } : null, delta);
    this.updateOffscreenArrow();
    this.updateInteraction();
    this.flushRoster();
    this.perf?.update(delta);
    this.quality.update(delta);
  }

  /** Busca qué hay al lado (cada INTERACT_CHECK_MS) y le avisa a React si cambió, para el cartel "F · …". */
  private updateInteraction() {
    const now = this.time.now;
    if (now < this.nextInteractionCheck) return;
    this.nextInteractionCheck = now + INTERACT_CHECK_MS;
    const found = this.findInteraction();
    if ((found?.key ?? "") !== (this.interaction?.key ?? "")) {
      eventBus.emit("interact:prompt", found ? { label: found.label } : null);
    }
    this.interaction = found;
  }

  /**
   * Con qué puede interactuar el avatar propio desde su tile (el del server, que es el que valida),
   * en orden de prioridad: levantarse del banco, patear un picudo al alcance, entrar a una tienda
   * pegada, tomar el ómnibus, sentarse en un banco libre, sacudir una palmera, hablar con alguien.
   */
  private findInteraction(): Interaction | null {
    const self = this.room.state.players.get(this.room.sessionId);
    const at = this.mover.getServerTile();
    if (!self || !at) return null;

    if (self.sitting) {
      const bench = this.map.benchAt(self.x, self.y);
      const stand = bench ? this.map.benchApproach(bench) : undefined;
      return stand ? { key: "stand", label: "Levantarse", run: () => this.requestMove(stand) } : null;
    }
    if (self.bathing) {
      const out = this.map.seatApproach({ x: self.x, y: self.y }, { x: self.x, y: self.y + 1 });
      return out ? { key: "stand", label: "Salir del jacuzzi", run: () => this.requestMove(out) } : null;
    }

    let weevilId: string | null = null;
    let weevilDistance = WEEVIL_KICK_RANGE;
    this.room.state.weevils.forEach((weevil, id) => {
      const tile = weevilTile(weevil);
      const distance = Math.hypot(tile.x - at.x, tile.y - at.y);
      if (weevilModeOf(weevil.mode) !== "dead" && distance <= weevilDistance) {
        weevilDistance = distance;
        weevilId = id;
      }
    });
    if (weevilId !== null) {
      const id: string = weevilId;
      return { key: `weevil:${id}`, label: "Patear al picudo", run: () => this.kickWeevil(id) };
    }

    // Lo del mapa que está pegado (un banco ocupado no cuenta), en el orden de `NEARBY_PRIORITY`.
    const around = this.map
      .interactionsAround(at.x, at.y)
      .filter((hit) => hit.kind !== "bench" || !this.isBenchTaken(hit.target));
    for (const kind of NEARBY_PRIORITY) {
      const hit = around.find((candidate) => candidate.kind === kind);
      if (hit) return this.describe(hit);
    }

    for (const [id, other] of this.room.state.players) {
      if (id === this.room.sessionId || Math.max(Math.abs(other.x - at.x), Math.abs(other.y - at.y)) > 1) continue;
      return {
        key: `player:${id}`,
        label: `Hablar con ${other.name}`,
        run: () => {
          // El menú se abre al lado del otro avatar, como con el clic.
          const avatar = this.avatars.get(id);
          const camera = this.cameras.main;
          const x = avatar ? (avatar.x - camera.worldView.x) * camera.zoom : this.scale.width / 2;
          const y = avatar ? (avatar.y - 50 - camera.worldView.y) * camera.zoom : this.scale.height / 2;
          this.openPlayerMenu(id, x, y);
        },
      };
    }
    return null;
  }

  /**
   * Qué hace cada cosa del mapa: lo mismo con el clic que con F. El cartel de F muestra `label`; el
   * `key` identifica la cosa (para avisarle a React sólo cuando cambia).
   */
  private describe(hit: MapInteraction): Interaction {
    const { x, y } = hit.target;
    switch (hit.kind) {
      case "door": {
        const self = this.room.state.players.get(this.room.sessionId);
        const locked = hit.door.access === "donor" && !self?.donor && !self?.admin;
        return { key: `door:${hit.door.id}`, label: locked ? "♥ Sólo donadores" : hit.door.name, run: () => this.enterDoor(hit.door.id) };
      }
      case "jacuzzi":
        return { key: `jacuzzi:${hit.jacuzzi.id}`, label: "Meterte al jacuzzi", run: () => this.enterJacuzzi(hit.target) };
      case "busStop":
        return { key: `stop:${hit.busStop.name}`, label: "Tomar el ómnibus", run: () => this.goToBusStop(hit.busStop) };
      case "shop":
        return {
          key: `shop:${hit.shop.id}`,
          label: hit.shop.casino ? `Jugar: ${hit.shop.name}` : `Entrar a ${hit.shop.name}`,
          run: () => this.visitShop(hit.target),
        };
      case "palm":
        return { key: `palm:${x},${y}`, label: "Sacudir la palmera", run: () => this.shakePalm(hit.target) };
      case "bench":
        return { key: `bench:${x},${y}`, label: "Sentarse", run: () => this.sitOn(hit.target) };
      case "floor":
        return { key: `floor:${x},${y}`, label: "Caminar", run: () => this.requestMove(hit.target) };
    }
  }

  /** Si otro jugador está sentado en el banco de (x, y). */
  private isBenchTaken(tile: TilePoint): boolean {
    for (const [id, other] of this.room.state.players) {
      if (id !== this.room.sessionId && other.sitting && other.x === tile.x && other.y === tile.y) return true;
    }
    return false;
  }

  /** Sólo el admin: G (o el botón del panel de admin) prende y apaga el modo coordenadas. */
  private bindAdminCoords() {
    const isAdmin = () => this.room.state.players.get(this.room.sessionId)?.admin === true;
    const toggle = () => {
      if (!isAdmin()) return;
      this.adminCoords.setEnabled(!this.adminCoords.isEnabled());
      eventBus.emit("admin:coords", this.adminCoords.isEnabled());
      this.handlePointerMove(this.input.activePointer);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "KeyG" || event.repeat || isTyping(event) || document.querySelector(".modal-backdrop")) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      toggle();
    };
    window.addEventListener("keydown", onKeyDown);
    this.disposers.push(
      () => window.removeEventListener("keydown", onKeyDown),
      eventBus.on("admin:coords:toggle", toggle),
    );
  }

  /** Shift + clic con el modo coordenadas: copia "x,y" del tile (para pasárselo a quien edifica). */
  private copyTileCoords(tile: TilePoint) {
    const text = `${tile.x},${tile.y}`;
    const done = () => eventBus.emit("notice", { text: `📋 Copiado: ${text}` });
    navigator.clipboard?.writeText(text).then(done, () => eventBus.emit("notice", { text: `Coordenada: ${text}` })) ??
      eventBus.emit("notice", { text: `Coordenada: ${text}` });
  }

  /**
   * Teclas WASD (por posición física, `event.code`: andan igual en cualquier distribución de
   * teclado). No cuentan mientras se escribe ni con un panel abierto.
   */
  private bindWasd() {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.code in WASD_KEYS) || isTyping(event) || document.querySelector(".modal-backdrop")) return;
      this.wasdKeys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => this.wasdKeys.delete(event.code);
    // Al cambiar de ventana no llega el keyup: que no siga caminando solo.
    const onBlur = () => this.wasdKeys.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    this.disposers.push(
      () => window.removeEventListener("keydown", onKeyDown),
      () => window.removeEventListener("keyup", onKeyUp),
      () => window.removeEventListener("blur", onBlur),
    );
  }









  /** "¡Acá estás!": anillos que se agrandan y se desvanecen bajo el avatar propio (lo siguen si camina). */
  private showLocator() {
    const avatar = this.localAvatar;
    if (!avatar) return;
    for (let i = 0; i < LOCATOR_RINGS; i++) {
      const ring = this.add
        .ellipse(avatar.x, avatar.y, 64, 32)
        .setStrokeStyle(3, LOCATOR_COLOR, 1)
        .setDepth(avatar.depth - 1)
        .setScale(0.3)
        .setAlpha(0);
      this.locatorRings.push(ring);
      this.tweens.add({
        targets: ring,
        scale: 1.7,
        alpha: { from: 1, to: 0 },
        delay: i * (LOCATOR_RING_MS / 3),
        duration: LOCATOR_RING_MS,
        ease: "Sine.easeOut",
        onComplete: () => {
          ring.destroy();
          this.locatorRings = this.locatorRings.filter((other) => other !== ring);
        },
      });
    }
  }

  private updateLocator() {
    const avatar = this.localAvatar;
    if (!avatar) return;
    for (const ring of this.locatorRings) ring.setPosition(avatar.x, avatar.y).setDepth(avatar.depth - 1);
  }

  /**
   * Si el avatar propio quedó fuera de la pantalla (cámara libre), una flecha en el borde apunta
   * hacia él; tocarla lleva la cámara hasta él. Los objetos fijos a la cámara igual se escalan con
   * el zoom (desde el centro), así que se compensa posición y tamaño.
   */
  private updateOffscreenArrow() {
    const arrow = this.offscreenArrow;
    const avatar = this.localAvatar;
    arrow.clear();
    this.arrowSpot = null;
    if (!avatar || !this.cameraControl.isFree()) return;

    const camera = this.cameras.main;
    const view = camera.worldView;
    const zoom = camera.zoom;
    const screenX = (avatar.x - view.x) * zoom;
    const screenY = (avatar.y - FOLLOW_OFFSET_Y - view.y) * zoom;
    const { width, height } = camera;
    if (screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height) return;

    // Desde el centro de la pantalla hacia el avatar, hasta el borde del rectángulo permitido.
    const inset = this.arrowInset();
    const cx = width / 2;
    const cy = height / 2;
    const dx = screenX - cx;
    const dy = screenY - cy;
    const limitX = dx > 0 ? width - inset.side - cx : inset.side - cx;
    const limitY = dy > 0 ? height - inset.bottom - cy : inset.top - cy;
    const scale = Math.min(dx !== 0 ? limitX / dx : Infinity, dy !== 0 ? limitY / dy : Infinity);
    const x = cx + dx * scale;
    const y = cy + dy * scale;
    this.arrowSpot = { x, y };

    const angle = Math.atan2(dy, dx);
    arrow.setPosition(cx + (x - cx) / zoom, cy + (y - cy) / zoom).setScale(1 / zoom);
    arrow.fillStyle(0x12151f, 0.85).fillCircle(0, 0, ARROW_RADIUS);
    arrow.lineStyle(2, LOCATOR_COLOR, 1).strokeCircle(0, 0, ARROW_RADIUS);
    const tip = { x: Math.cos(angle) * 13, y: Math.sin(angle) * 13 };
    const back = (offset: number) => ({ x: Math.cos(angle + offset) * 9, y: Math.sin(angle + offset) * 9 });
    const left = back(2.5);
    const right = back(-2.5);
    arrow.fillStyle(LOCATOR_COLOR, 1).fillTriangle(tip.x, tip.y, left.x, left.y, right.x, right.y);
  }

  /** Margen de las flechas del borde (la del avatar y la de la guía): no tapan el HUD ni el dock. */
  private arrowInset() {
    return window.matchMedia("(max-width: 760px), (max-height: 500px)").matches ? ARROW_INSET_SMALL : ARROW_INSET;
  }

  /** ¿El puntero está sobre la flecha que apunta al avatar? */
  private isOnArrow(pointer: Phaser.Input.Pointer): boolean {
    const spot = this.arrowSpot;
    return spot !== null && Math.hypot(pointer.x - spot.x, pointer.y - spot.y) <= ARROW_RADIUS + 8;
  }

  /** El Schema de Colyseus es la fuente de verdad; la escena sólo refleja sus cambios. */
  private bindState() {
    const $ = getStateCallbacks(this.room);

    // Hora del juego (reloj del server): la luz del barrio la sigue. La primera vez, sin fundido.
    let firstTime = true;
    let firstWeather = true;
    this.disposers.push(
      $(this.room.state).listen("minuteOfDay", (minute) => {
        this.dayNight.setMinute(minute, firstTime);
        firstTime = false;
        eventBus.emit("city:clock", minute);
      }),
      $(this.room.state).listen("copy", (copy) => eventBus.emit("city:copy", copy)),
      // Partido en el Centenario: React lo muestra (venta, admin).
      $(this.room.state).listen("match", (match) => {
        eventBus.emit("city:match", { name: match, mode: this.room.state.matchMode as MatchMode });
      }),
      $(this.room.state).listen("matchMode", (mode) => {
        eventBus.emit("city:match", { name: this.room.state.match, mode: mode as MatchMode });
      }),
      // Clima (global, como la hora): la escena dibuja lluvia o viento; React lo muestra en el HUD.
      $(this.room.state).listen("weather", (id) => {
        const weather = getWeather(id).id;
        // Adentro (el spa del hotel) no llueve; la noche sí llega y se prenden los faroles.
        this.weatherFx.setWeather(this.map.city.indoor ? "clear" : weather, firstWeather);
        firstWeather = false;
        eventBus.emit("city:weather", { id: weather, mode: this.room.state.weatherMode as WeatherMode });
      }),
      $(this.room.state).listen("weatherMode", (mode) => {
        eventBus.emit("city:weather", { id: getWeather(this.room.state.weather).id, mode: mode as WeatherMode });
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
          isDonor: player.donor,
        });
        this.applySitting(avatar, player);
        this.applyFishing(avatar, player, isLocal);
        this.applyVending(avatar, player, isLocal);
        this.applyBusking(avatar, player, isLocal);
        avatar.setTyping(player.typing);
        this.avatars.set(sessionId, avatar);
        if (isLocal) {
          this.localAvatar = avatar;
          this.mover.setAvatar(avatar, { x: player.x, y: player.y });
          this.cameraControl.setTarget(avatar);
        }

        // Patada (a un picudo): se anima en todos los clientes, mirando al picudo más cercano.
        this.disposers.push(
          $(player).listen("kicks", (kicks, previous) => {
            if (previous === undefined || kicks <= previous) return;
            const nearest = this.nearestWeevil(avatar.x, avatar.y);
            avatar.kick(nearest ? nearest.x - avatar.x : 1);
          }),
        );

        // Gesto (tomar mate, aplaudir… o de a dos, con `gesturePartner`): lo anima el avatar y, al
        // empezar, flota lo que dice (en los de a dos, sólo sobre el que invitó: si no, sale doble).
        const applyGesture = () => {
          const id = isGestureId(player.gesture) || isPairGestureId(player.gesture) ? player.gesture : null;
          avatar.setGesture(id, player.gesturePartner ? (this.avatars.get(player.gesturePartner) ?? null) : null, player.gestureLead);
        };
        this.disposers.push(
          $(player).listen("gesture", (gesture, previous) => {
            applyGesture();
            const id = isGestureId(gesture) || isPairGestureId(gesture) ? gesture : null;
            if (!id || previous === undefined || (isPairGestureId(id) && !player.gestureLead)) return;
            this.floatText(avatar.x, avatar.y - GESTURE_CRY_Y, gestureInfo(id).cry, "#ffffff");
          }),
          $(player).listen("gesturePartner", applyGesture),
          $(player).listen("gestureLead", applyGesture),
        );

        // Volando (`/god`, sólo admin): el propio se ve en el aire; a los demás no se los dibuja.
        this.disposers.push(
          $(player).listen("flying", (flying, previous) => {
            if (!isLocal) {
              avatar.setFlying(flying, true);
              this.updateRoster(sessionId, player, isLocal);
              return;
            }
            // Al bajar, el server lo deja en la baldosa más cercana: llega planeando y la predicción
            // vuelve a arrancar desde ahí.
            if (!flying && previous) avatar.pushTile(player.x, player.y);
            this.flying = flying;
            this.mover.cancelPrediction();
            avatar.setFlying(flying, false);
            this.mover.setAvatar(avatar, { x: player.x, y: player.y });
          }),
        );

        // Donador: lo marca el admin con /donador, también con el jugador ya conectado.
        this.disposers.push(
          $(player).listen("donor", (donor) => avatar.setDonor(donor)),
        );

        // Barra: la sigla en su color al lado del nombre (la ven todos; cambia al fundarla, entrar o irse).
        const applyBarra = () => avatar.setBarra(player.barraTag, player.barraColor);
        this.disposers.push($(player).listen("barraTag", applyBarra), $(player).listen("barraColor", applyBarra));

        // Mascota: la ven todos; se adopta, se renombra o se despide en la veterinaria.
        const applyPet = () => this.applyPet(sessionId, player.pet, player.petName, avatar);
        this.disposers.push($(player).listen("pet", applyPet), $(player).listen("petName", applyPet));

        // Preso en el COMCAR: todos le ven el cartel "PRESO"; al propio, React le muestra cuánto le queda.
        this.disposers.push(
          $(player).listen("jailLeft", (left) => {
            avatar.setPrisoner(left > 0);
            if (isLocal) eventBus.emit("player:jail", left);
          }),
        );

        // Vendedor: grita lo que vende al empezar y muestra "¡Vendido!" en cada venta (lo ven todos).
        this.disposers.push(
          // El carrito se pone al empezar cada venta y se saca al terminar.
          $(player).listen("cart", (cartId, previous) => {
            if (previous === undefined || !cartId) return;
            const cart = getItem(cartId);
            if (isCart(cart)) this.floatText(avatar.x, avatar.y - 100, cart.cry, "#ffffff");
          }),
          $(player).listen("sales", (sales, previous) => {
            if (previous === undefined || sales <= previous) return;
            this.floatText(avatar.x + 30, avatar.y - 50, "¡Vendido!", "#9ef0c9");
          }),
        );

        // Músico: anuncia el tema al empezar y muestra la propina cuando le dejan (lo ven todos).
        this.disposers.push(
          $(player).listen("instrument", (instrumentId, previous) => {
            if (previous === undefined || !instrumentId) return;
            const instrument = getItem(instrumentId);
            if (isInstrument(instrument)) this.floatText(avatar.x, avatar.y - 100, instrument.song, "#ffffff");
          }),
          $(player).listen("tips", (tips, previous) => {
            if (previous === undefined || tips <= previous) return;
            this.floatText(avatar.x + 30, avatar.y - 50, "🪙 ¡Propina!", "#ffd166");
          }),
        );

        this.disposers.push(
          $(player).onChange(() => {
            // Antes del tile nuevo: el paso hacia él ya tiene que durar lo que dura cansado.
            avatar.setTired(player.tired, walkSpeed(player.shoes));
            if (isLocal && !player.flying && !this.flying) this.mover.onServerTile({ x: player.x, y: player.y });
            else avatar.pushTile(player.x, player.y);
            this.applySitting(avatar, player);
            this.applyFishing(avatar, player, isLocal);
            this.applyVending(avatar, player, isLocal);
            this.applyBusking(avatar, player, isLocal);
            avatar.setOutfit(outfitIds(player));
            avatar.setTyping(player.typing);
            if (isLocal) this.emitEnergy(player.energy);
            if (isLocal) this.emitFollowing(player.following);
            if (isLocal) eventBus.emit("player:outfit", outfitIds(player));
            if (isLocal) this.checkBusStopArrival(player);
            this.updateRoster(sessionId, player, isLocal);
          }),
        );

        if (isLocal) {
          eventBus.emit("player:admin", player.admin);
          this.emitEnergy(player.energy);
          eventBus.emit("player:self", { name: player.name, color: player.color });
          eventBus.emit("player:outfit", outfitIds(player));
          this.emitFollowing(player.following);
        }
        this.updateRoster(sessionId, player, isLocal);
      }),
    );

    // Picudos rojos: los mueve el server; acá se dibujan, se animan los mordiscos y las muertes.
    this.disposers.push(
      $(this.room.state).weevils.onAdd((state, id) => {
        const start = weevilTile(state);
        const weevil = new Weevil(this, id, start.x, start.y);
        this.weevils.set(id, weevil);
        // Las escuchas son del picudo: se sueltan cuando se va (si no, se juntan cientos por sesión).
        weevil.bind(
          $(state).onChange(() => {
            const tile = weevilTile(state);
            weevil.setTarget(tile.x, tile.y);
          }),
          $(state).listen("mode", (mode) => {
            if (weevilModeOf(mode) === "dead") {
              weevil.die();
              this.floatText(weevil.x, weevil.y - 18, "¡Plaf!", "#ffd166");
            }
          }),
          $(state).listen("bites", (bites, previous) => {
            if (previous === undefined || bites <= previous) return;
            weevil.bite();
            const victim = this.avatars.get(state.targetId);
            if (victim) {
              this.floatText(victim.x, victim.y - 70, `-${WEEVIL_BITE_ENERGY}`, "#ff6b6b");
              victim.flinch();
            }
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
          this.cameraControl.setTarget(null);
          this.mover.setAvatar(null, null);
          this.localAvatar = null;
        }
        avatar?.destroy();
        this.pets.get(sessionId)?.destroy();
        this.pets.delete(sessionId);
        this.customers.remove(sessionId);
        this.audience.remove(sessionId);
        this.avatars.delete(sessionId);
        this.roster.delete(sessionId);
        this.rosterKeys.delete(sessionId);
        this.emitRoster();
      }),
    );
  }

  /** Caña en mano mirando al agua; al avatar propio además le avisa a React si puede pescar. */
  private applyFishing(avatar: Avatar, player: Player, isLocal: boolean) {
    // La caña se ve del color de la que está usando (las mejores, más vistosas).
    const rod = player.rod ? getItem(player.rod) : undefined;
    const rodColor = rod ? Phaser.Display.Color.HexStringToColor(rod.color).color : undefined;
    avatar.setFishing(player.fishing, this.map.fishingSpot(player.x, player.y) ?? { facing: "south", distance: 2 }, rodColor);
    if (!isLocal) return;
    const status = { canFish: this.map.canFishAt(player.x, player.y), fishing: player.fishing };
    const key = `${status.canFish}|${status.fishing}`;
    if (key === this.fishingStatus) return;
    this.fishingStatus = key;
    eventBus.emit("fishing:status", status);
  }

  /** Si el avatar propio llegó a la parada que se clickeó, React abre la lista de barrios. */
  private checkBusStopArrival(player: Player) {
    const pending = this.pendingBusStop;
    if (!pending || player.x !== pending.x || player.y !== pending.y) return;
    this.pendingBusStop = null;
    eventBus.emit("bus-stop:open", { name: pending.stop.name });
  }

  /** Clic en una parada: si ya estás al lado se abre la lista de barrios; si no, se camina hasta ella. */
  private goToBusStop(stop: BusStop) {
    const self = this.room.state.players.get(this.room.sessionId);
    if (!self) return;
    if (this.map.isNextTo(stop, self.x, self.y)) {
      eventBus.emit("bus-stop:open", { name: stop.name });
      return;
    }
    const target = this.map.approachTile(stop, self);
    if (!target) return;
    this.pendingBusStop = { stop, ...target };
    this.requestMove(target);
  }

  /** Caminar hasta `target`: el movimiento propio (predicción, recorrido al server) está en `LocalMover`. */
  private requestMove(target: TilePoint) {
    this.mover.requestMove(target);
  }










  /** Crea, renombra o saca la mascota del jugador según su Schema. */
  private applyPet(sessionId: string, petId: string, petName: string, owner: Avatar) {
    if (sessionId === this.room.sessionId) eventBus.emit("player:pet", { id: petId, name: petName });
    const current = this.pets.get(sessionId);
    const definition = petId ? getPet(petId) : undefined;
    if (current && current.definition.id === definition?.id) {
      current.setPetName(petName);
      return;
    }
    current?.destroy();
    this.pets.delete(sessionId);
    if (definition) this.pets.set(sessionId, new Pet(this, definition, petName, owner));
  }

  /** Carrito al costado mientras vende; al avatar propio además le avisa a React si puede vender. */
  private applyVending(avatar: Avatar, player: Player, isLocal: boolean) {
    const cart = getItem(player.cart);
    const color = isCart(cart) ? Phaser.Display.Color.HexStringToColor(cart.color).color : undefined;
    avatar.setVending(player.vending, color, isCart(cart) ? cart.tier : undefined);
    if (!isLocal) return;
    const status = { canVend: this.map.canVendAt(player.x, player.y), vending: player.vending };
    const key = `${status.canVend}|${status.vending}`;
    if (key === this.vendingStatus) return;
    this.vendingStatus = key;
    eventBus.emit("vending:status", status);
  }

  /** Instrumento en las manos mientras toca; al avatar propio además le avisa a React si puede tocar. */
  private applyBusking(avatar: Avatar, player: Player, isLocal: boolean) {
    const instrument = getItem(player.instrument);
    const playing = player.busking && isInstrument(instrument);
    avatar.setBusking(playing ? instrument.kind : null, playing ? Phaser.Display.Color.HexStringToColor(instrument.color).color : undefined);
    if (!isLocal) return;
    const status = { canBusk: this.map.canBuskAt(player.x, player.y), busking: player.busking };
    const key = `${status.canBusk}|${status.busking}`;
    if (key === this.buskingStatus) return;
    this.buskingStatus = key;
    eventBus.emit("busking:status", status);
  }

  private emitEnergy(energy: number) {
    if (energy === this.lastEnergy) return;
    this.lastEnergy = energy;
    eventBus.emit("player:energy", energy);
  }

  /** Vuelve a armar el resumen del jugador para React y lo manda sólo si cambió (caminar no cuenta). */
  private updateRoster(sessionId: string, player: Player, isLocal: boolean) {
    // Un admin volando no sale en la lista de los demás.
    if (player.flying && !isLocal) {
      if (this.roster.delete(sessionId)) this.emitRoster();
      return;
    }
    // Cada paso de cada jugador llega acá: comparar una firma corta, no armar y serializar el resumen.
    const key = rosterKey(player, isLocal);
    if (this.rosterKeys.get(sessionId) === key && this.roster.has(sessionId)) return;
    this.rosterKeys.set(sessionId, key);
    this.roster.set(sessionId, summarize(sessionId, player, isLocal));
    this.emitRoster();
  }

  /** A quién sigue el avatar propio (sólo si cambió), con su nombre para el cartel. */
  private emitFollowing(sessionId: string) {
    if (sessionId === this.followingId) return;
    this.followingId = sessionId;
    const name = sessionId ? this.room.state.players.get(sessionId)?.name : undefined;
    eventBus.emit("player:following", sessionId ? { sessionId, name: name ?? "alguien" } : null);
  }

  private emitRoster() {
    this.rosterDirty = true;
  }

  /** Manda la lista a React si cambió (desde `update`, a lo sumo una vez por frame). */
  private flushRoster() {
    if (!this.rosterDirty) return;
    this.rosterDirty = false;
    eventBus.emit("players:list", [...this.roster.values()]);
  }

  /** La orientación al sentarse sale del banco del mapa (el Schema sólo dice si está sentado). */
  private applySitting(avatar: Avatar, player: Player) {
    const bench = player.sitting ? this.map.benchAt(player.x, player.y) : undefined;
    avatar.setSitting(Boolean(bench), bench?.facing);
    avatar.setBathing(player.bathing && this.map.isJacuzziSeat(player.x, player.y));
  }

  private pointerTile(pointer: Phaser.Input.Pointer) {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return worldToTile(world.x, world.y);
  }

  /** Jugador bajo el puntero, también el propio (el de más adelante si se superponen). */
  private playerAt(pointer: Phaser.Input.Pointer): string | null {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    let found: { sessionId: string; depth: number } | null = null;
    for (const [sessionId, avatar] of this.avatars) {
      if (!avatar.visible || !avatar.containsWorldPoint(world.x, world.y)) continue;
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

  /** Texto que sube y se desvanece ("-2" de una picadura, "¡Plaf!" de una patada). */
  private floatText(x: number, y: number, text: string, color: string) {
    const label = this.add
      .text(x, y, text, { fontFamily: "system-ui, sans-serif", fontSize: "14px", fontStyle: "bold", color, stroke: "#000000", strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(FLOAT_TEXT_DEPTH);
    this.tweens.add({ targets: label, y: y - 26, alpha: 0, duration: 900, ease: "Quad.Out", onComplete: () => label.destroy() });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    // Arrastre de la cámara (rueda apretada o dos dedos): ni hover ni caminar.
    if (this.cameraControl.pointerMove(pointer)) return;
    // Con el dedo no hay "hover": sólo se marca el tile mientras se arrastra, y no sirve de nada.
    if (pointer.wasTouch) return;
    if (this.isOnArrow(pointer)) {
      this.hover.clear();
      this.input.setDefaultCursor("pointer");
      return;
    }
    const tile = this.pointerTile(pointer);
    this.hover.clear();
    this.adminCoords.hover(tile);
    if (this.weevilAt(pointer) || this.playerAt(pointer)) {
      this.input.setDefaultCursor("pointer");
      return;
    }
    const hit = this.map.interactionAt(tile.x, tile.y, { palmReach: PALM_CLICK_REACH });
    this.input.setDefaultCursor(hit && hit.kind !== "floor" ? "pointer" : "default");
    if (!hit) return;
    // Lo que marca (toda la planta si es una tienda), con el color de su tipo.
    const { x, y, width, height } = hit.area;
    const top = tileDiamond(x, y).top;
    const right = tileDiamond(x + width - 1, y).right;
    const bottom = tileDiamond(x + width - 1, y + height - 1).bottom;
    const left = tileDiamond(x, y + height - 1).left;
    this.hover.lineStyle(2, HOVER_COLORS[hit.kind], 0.95);
    this.hover.strokePoints([top, right, bottom, left], true);
  }

  /** Empieza un toque / clic: se recuerda dónde (la cámara decide si termina siendo un arrastre del mapa). */
  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    this.pressStarts.set(pointer.id, { x: pointer.x, y: pointer.y });
    if (this.cameraControl.pointerDown(pointer)) this.hover.clear();
  }

  /**
   * Se levanta el dedo / el botón: si fue un toque corto en el lugar (no un arrastre del mapa ni un
   * pellizco) cuenta como clic. Se actúa al soltar (no al apoyar) para que arrastrar el mapa o
   * pellizcar no camine: así se lleva la cámara a la otra punta y ahí se toca adónde ir.
   */
  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    const start = this.pressStarts.get(pointer.id);
    this.pressStarts.delete(pointer.id);
    // Fue un gesto de cámara (arrastrar el mapa, pellizco, rueda apretada): no es un clic.
    if (this.cameraControl.pointerUp(this.pressStarts.size > 0)) return;
    if (!start || Math.hypot(pointer.x - start.x, pointer.y - start.y) > TAP_SLOP) return;
    this.handleTap(pointer);
    if (pointer.wasTouch) this.hover.clear();
  }


  private handleTap(pointer: Phaser.Input.Pointer) {
    // La flecha hacia el avatar (cuando quedó fuera de pantalla): la cámara vuelve a él.
    if (this.isOnArrow(pointer)) {
      this.cameraControl.returnToTarget();
      this.showLocator();
      return;
    }
    // Modo coordenadas (admin): Shift + clic copia la coordenada y no camina.
    const event = pointer.event as MouseEvent | undefined;
    if (this.adminCoords.isEnabled() && event?.shiftKey) {
      this.copyTileCoords(this.pointerTile(pointer));
      return;
    }
    // Cualquier clic nuevo cancela la ida a una parada (si es otra parada, se vuelve a poner).
    this.pendingBusStop = null;
    // Y la predicción del camino anterior: si el clic es para caminar se vuelve a predecir; si es
    // un banco, una tienda, una palmera… el camino lo decide el server y el avatar lo sigue a él.
    this.mover.cancelPrediction();

    // Clic en un picudo: patada (va primero: es chiquito y suele estar encima de alguien).
    const weevilId = this.weevilAt(pointer);
    if (weevilId) {
      this.kickWeevil(weevilId);
      return;
    }

    // Clic en un jugador: no se camina. En otro, React abre su menú (Saludar / Intercambiar /
    // Detalles…); en el propio, directo tus detalles.
    const clicked = this.playerAt(pointer);
    if (clicked === this.room.sessionId) {
      eventBus.emit("player:details", clicked);
      return;
    }
    if (clicked) {
      this.openPlayerMenu(clicked, pointer.x, pointer.y);
      return;
    }

    // Todo lo que lo hace caminar (piso, parada, tienda, palmera, banco) con la cámara libre: la
    // cámara vuelve al avatar y lo sigue, así se ve cómo va hasta ahí.
    const tile = this.pointerTile(pointer);
    // Volando: a cualquier tile del mapa, en línea recta (el server decide; no hay predicción).
    if (this.flying) {
      if (!this.map.inBounds(tile.x, tile.y)) return;
      const message: MoveMessage = { x: tile.x, y: tile.y };
      this.room.send(MessageType.Move, message);
      this.cameraControl.returnToTarget();
      this.showClickMarker(tile.x, tile.y);
      return;
    }
    const hit = this.map.interactionAt(tile.x, tile.y, { palmReach: PALM_CLICK_REACH });
    if (!hit) return;
    this.describe(hit).run();
    this.cameraControl.returnToTarget();
    this.showClickMarker(hit.target.x, hit.target.y);
  }

  // --- Acciones sobre las cosas del barrio (las usan el clic y la tecla de interactuar) ---------

  private kickWeevil(id: string) {
    const kick: WeevilKickMessage = { id };
    this.room.send(MessageType.WeevilKick, kick);
  }

  /** Menú de otro jugador (Saludar / Intercambiar), abierto en (x, y) de la pantalla del juego. */
  private openPlayerMenu(sessionId: string, x: number, y: number) {
    const player = this.room.state.players.get(sessionId);
    if (!player) return;
    const canvas = this.game.canvas.getBoundingClientRect();
    eventBus.emit("player:click", {
      sessionId,
      name: player.name,
      jailed: player.jailLeft > 0,
      screenX: canvas.left + (x * canvas.width) / this.scale.width,
      screenY: canvas.top + (y * canvas.height) / this.scale.height,
    });
  }

  private visitShop(tile: TilePoint) {
    const visit: ShopVisitMessage = { x: tile.x, y: tile.y };
    this.room.send(MessageType.ShopVisit, visit);
  }

  private shakePalm(palm: TilePoint) {
    this.room.send(MessageType.PalmShake, palm);
  }

  private enterDoor(doorId: string) {
    const enter: DoorEnterMessage = { doorId };
    this.room.send(MessageType.DoorEnter, enter);
  }

  private enterJacuzzi(tile: TilePoint) {
    const enter: SitMessage = { x: tile.x, y: tile.y };
    this.room.send(MessageType.JacuzziEnter, enter);
  }

  private sitOn(bench: TilePoint) {
    const sit: SitMessage = { x: bench.x, y: bench.y };
    this.room.send(MessageType.Sit, sit);
  }

  /** Rueda del mouse: acercar (hacia arriba) o alejar (hacia abajo). */
  private handleWheel(_pointer: Phaser.Input.Pointer, _over: unknown[], _dx: number, dy: number) {
    this.cameraControl.wheel(dy);
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
    this.pendingBusStop = null;
    this.cameraControl?.dispose();
    this.disposers.forEach((dispose) => dispose());
    this.disposers = [];
    this.dayNight.dispose();
    this.weatherFx.dispose();
    this.tutorialPointer.dispose();
    this.adminCoords?.dispose();
    this.avatars.clear();
    this.weevils.clear();
    this.customers.dispose();
    this.audience.dispose();
    this.pets.clear();
    this.roster.clear();
    this.rosterKeys.clear();
    this.localAvatar = null;
    // Las texturas que son sólo de este barrio (piso, guirnaldas, atlas): el juego sigue vivo entre viajes.
    this.city?.destroy();
    // Al destruir el juego entero (salir, se cortó la conexión) sólo llega DESTROY, y para entonces
    // el plugin de input ya soltó su manager: no hay cursor que restaurar (el canvas también se va).
    if (this.input?.manager) this.input.setDefaultCursor("default");
  }
}

function outfitIds(player: Player): OutfitIds {
  return { hat: player.hat, top: player.top, bottom: player.bottom, shoes: player.shoes };
}

/** Todo lo que usa `summarize`, en un string (para ver rápido si cambió algo de la lista). */
function rosterKey(player: Player, isSelf: boolean): string {
  return [
    player.name, player.color, isSelf, player.donor, player.admin, player.barraTag, player.barraColor, player.barraName,
    player.gender, player.skin, player.hairColor, player.hairStyle, player.eyeColor, player.facialHair, player.glasses,
    player.hat, player.top, player.bottom, player.shoes, player.pet, player.petName, player.jailLeft,
    player.fishing, player.rod, player.vending, player.cart, player.busking, player.instrument, player.sitting, player.energy,
  ].join("|");
}

/** Lo público del jugador que muestra React (lista, menú y detalles). Nada de posiciones. */
function summarize(sessionId: string, player: Player, isSelf: boolean): PlayerSummary {
  let activity: PlayerActivity | null = null;
  if (player.fishing) activity = { kind: "fishing", rod: player.rod };
  else if (player.vending) activity = { kind: "vending", cart: player.cart };
  else if (player.busking) activity = { kind: "busking", instrument: player.instrument };
  else if (player.sitting) activity = { kind: "sitting" };
  return {
    sessionId,
    name: player.name,
    color: player.color,
    isSelf,
    isDonor: player.donor,
    isAdmin: player.admin,
    barra: player.barraTag ? { tag: player.barraTag, color: player.barraColor, name: player.barraName } : null,
    look: {
      gender: player.gender === "f" ? "f" : "m",
      skin: player.skin,
      hairColor: player.hairColor,
      hairStyle: (HAIR_STYLES as readonly string[]).includes(player.hairStyle) ? (player.hairStyle as HairStyle) : "short",
      eyeColor: player.eyeColor,
      facialHair: (FACIAL_HAIR as readonly string[]).includes(player.facialHair) ? (player.facialHair as FacialHair) : "none",
      glasses: (GLASSES as readonly string[]).includes(player.glasses) ? (player.glasses as Glasses) : "none",
    },
    outfit: outfitIds(player),
    pet: player.pet ? { id: player.pet, name: player.petName } : null,
    jailLeft: player.jailLeft,
    activity,
    energy: player.energy,
  };
}
