import * as Phaser from "phaser";
import { CHAT_BUBBLE_MS, ClothingItem, FishingSpot, OutfitIds, STEP_MS, TILE_HEIGHT, TILE_WIDTH, TilePoint } from "@montevideo-world/shared";
import { shade } from "../color";
import { tileToWorld } from "../iso";
import { AvatarLook, Outfit, outfitFromIds } from "./avatarLook";

/** Nombre sobre la cabeza (por encima del pelo más alto y de los gorros). */
const NAME_Y = -92;
/** El globo de chat va encima del nombre. */
const BUBBLE_OFFSET_Y = -116;
/** Distintivo de donador: entre el nombre y el globo (que sube lo mismo para no taparlo). */
const DONOR_TAG_Y = NAME_Y - 17;
const DONOR_TAG_HEIGHT = 16;
/**
 * Nombre y globo van en un Container aparte, por encima de todos los edificios
 * (que tapan al cuerpo del avatar cuando pasa por detrás, pero nunca su nombre ni lo que dice).
 */
export const OVERLAY_DEPTH = 1_000_000;
const BUBBLE_MAX_WIDTH = 180;
const BUBBLE_PADDING = 8;
/**
 * Movimiento: el avatar recorre una cola de tiles, cada uno en STEP_MS (lo mismo que tarda el
 * server en avanzar un tile), encadenados sin cortes. Si la cola se atrasa (la red trajo varios
 * tiles juntos) se apura un poco para alcanzar; si se atrasa demasiado, salta.
 */
const CATCH_UP_FROM = 2;
const CATCH_UP_PER_TILE = 0.3;
const MAX_CATCH_UP = 2.5;
const MAX_QUEUE = 8;

/** Geometría del cuerpo (px, origen en los pies). */
const HEAD_Y = -69;
const HEAD_R = 10.5;
const HIP_Y = -30;
const SHOULDER_Y = -55;

/** Ciclo de caminata: radianes de fase por ms y amplitud del balanceo de piernas/brazos. */
const WALK_PHASE_PER_MS = 1 / 70;
const LEG_SWING = 0.45;
const ARM_SWING = 0.4;
const BLINK_MS = 120;
/**
 * Tiempo quieto en el tile antes de considerar que llegó al destino y girar de frente. Entre un
 * tile y el siguiente del mismo camino hay pausas mínimas (jitter de red) que no deben contar.
 */
const ARRIVE_GRACE_MS = STEP_MS * 0.6;

/** Patada: duración y cuánto sube la pierna (radianes). */
const KICK_MS = 300;
const KICK_ANGLE = 1.25;

/** Sentado: el cuerpo baja hasta el asiento y los muslos se acortan (apuntan hacia la cámara). */
const SIT_DROP = 14;
const SIT_LEG_SCALE = 0.6;
const SIT_ARM_ANGLE = 0.3;
/** Sentado en el banco: se dibuja apenas por delante del banco, que está en el mismo tile. */
const SIT_DEPTH_BIAS = 2;

/** Caja de clic del cuerpo (px desde los pies): un poco más ancha que el torso, hasta el pelo. */
const HIT_HALF_WIDTH = 17;
const HIT_TOP = -86;
const HIT_BOTTOM = 6;

const OUTLINE = 0x000000;
const OUTLINE_ALPHA = 0.28;
const EYE_COLOR = 0x2b1d14;
const MOUTH_COLOR = 0x7a3b2e;
const LIPS_COLOR = 0xc0475a;
const BELT_COLOR = 0x2a1d14;
const UNDERWEAR_COLOR = 0xe4e1da;

export type SitFacing = "south" | "east";
/** Hacia dónde mira el que pesca (hacia el agua). */
export type FishFacing = FishingSpot["facing"];

/** Pescando: el brazo cercano sostiene la caña adelante. */
const FISH_ARM_ANGLE = -1.0;
const ROD_COLOR = 0x6b4a2f;
const LINE_COLOR = 0xe8eef2;
/** Punta de la caña en coordenadas del cuerpo (de ahí sale la tanza). */
const ROD_TIP = { x: 60, y: -88 };

/** Vendiendo: cada cuánto ofrece la mercadería levantando el brazo, y cuánto dura el gesto. */
const VEND_WAVE_EVERY_MS = 2400;
const VEND_WAVE_MS = 600;
const VEND_WAVE_ANGLE = -1.3;
const CART_METAL = 0x9aa1a9;
const CART_DARK = 0x2b2b30;

export interface AvatarConfig {
  /** Rasgos elegidos al entrar (sexo, piel, pelo), del Schema. */
  look: AvatarLook;
  /** Color del jugador (`Player.color`): el de su nombre. */
  color: string;
  name: string;
  outfit: OutfitIds;
  tileX: number;
  tileY: number;
  isLocal: boolean;
  /** Admin del servidor: el nombre se muestra con estrella y en naranja. */
  isAdmin?: boolean;
  /** Donador del proyecto: lleva un distintivo dorado arriba del nombre. */
  isDonor?: boolean;
}

function itemColor(item: ClothingItem): number {
  return Phaser.Display.Color.HexStringToColor(item.color).color;
}

/** Medio círculo superior del pelo (de oreja a oreja pasando por la coronilla). */
function hairCap(g: Phaser.GameObjects.Graphics, radius: number) {
  g.beginPath();
  g.arc(0, HEAD_Y, radius, Math.PI, Math.PI * 2, false);
}

/**
 * Avatar dibujado con primitivas (sin assets): cuerpo completo con piernas y brazos articulados,
 * cabeza con pelo y cara, y la ropa que tiene puesta. Vista 3/4 de frente o de espaldas según hacia
 * dónde camina, espejada horizontalmente para izquierda/derecha. El Container se posiciona en los
 * pies del personaje; la profundidad se ordena por Y para que los de adelante tapen a los de atrás.
 */
export class Avatar extends Phaser.GameObjects.Container {
  private readonly look: AvatarLook;
  private readonly body_: Phaser.GameObjects.Container;
  private readonly legs: [Phaser.GameObjects.Container, Phaser.GameObjects.Container];
  private readonly arms: [Phaser.GameObjects.Container, Phaser.GameObjects.Container];
  /** Partes que dependen de la ropa: se limpian y redibujan en `setOutfit`. */
  private readonly legGraphics: [Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics];
  private readonly armGraphics: [Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics];
  private readonly torso: Phaser.GameObjects.Graphics;
  private readonly hatFront: Phaser.GameObjects.Graphics;
  private readonly hatBack: Phaser.GameObjects.Graphics;
  private readonly headFront: Phaser.GameObjects.Container;
  private readonly headBack: Phaser.GameObjects.Container;
  private readonly eyes: Phaser.GameObjects.Graphics;
  /** Caña (fija) y tanza con boya (se redibuja para que se mezca). */
  private readonly rod: Phaser.GameObjects.Graphics;
  private readonly fishingLine: Phaser.GameObjects.Graphics;
  /** Carrito de vendedor (al costado del avatar, sólo mientras vende). */
  private readonly cart: Phaser.GameObjects.Graphics;
  private readonly overlay: Phaser.GameObjects.Container;
  private readonly donorTag: Phaser.GameObjects.Text;
  /** "🔒 PRESO" arriba del nombre mientras está preso en el COMCAR (`Player.jailLeft`). */
  private readonly prisonerTag: Phaser.GameObjects.Text;
  private bubble: Phaser.GameObjects.Container | null = null;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;

  /** Tile donde está parado (o el último al que llegó). */
  private tileX: number;
  private tileY: number;
  /** Tiles por recorrer, en orden. */
  private queue: TilePoint[] = [];
  /** Paso en curso: de dónde sale (px), a qué tile va y cuánto lleva / dura (ms). */
  private segment: { fromX: number; fromY: number; to: TilePoint; elapsed: number; duration: number } | null = null;
  private walkTime = 0;
  private idleTime = 0;
  private blinkIn = Phaser.Math.Between(1500, 4000);
  private outfitKey = "";
  private sitting = false;
  private sitScaleX = 1;
  private fishing = false;
  private fishFacing: FishFacing = "south";
  /** A cuántos tiles del avatar cae la boya, en la dirección de `fishFacing` (ver `CityMap.fishingSpot`). */
  private fishDistance = 2;
  /** Tiempo que le queda a la patada en curso (ms); 0 = no está pateando. */
  private kickLeft = 0;
  private rodColor = ROD_COLOR;
  private fishTime = 0;
  private vending = false;
  private cartKey = "";
  private vendTime = 0;

  constructor(scene: Phaser.Scene, config: AvatarConfig) {
    const start = tileToWorld(config.tileX, config.tileY);
    super(scene, start.x, start.y);
    this.tileX = config.tileX;
    this.tileY = config.tileY;
    this.look = config.look;

    const shadow = scene.add.ellipse(0, 0, 34, 14, 0x000000, 0.3);

    this.legGraphics = [scene.add.graphics(), scene.add.graphics()];
    this.armGraphics = [scene.add.graphics(), scene.add.graphics()];
    this.legs = [
      scene.add.container(-4.5, HIP_Y, [this.legGraphics[0]]),
      scene.add.container(4.5, HIP_Y, [this.legGraphics[1]]),
    ];
    this.arms = [
      scene.add.container(-12, SHOULDER_Y, [this.armGraphics[0]]),
      scene.add.container(12, SHOULDER_Y, [this.armGraphics[1]]),
    ];
    this.torso = scene.add.graphics();

    const back = scene.add.graphics();
    this.drawHeadBack(back, this.look);
    this.hatBack = scene.add.graphics();
    this.headBack = scene.add.container(0, 0, [back, this.hatBack]).setVisible(false);

    this.eyes = scene.add.graphics({ x: 0, y: HEAD_Y - 0.5 });
    this.eyes.fillStyle(0xffffff, 1);
    this.eyes.fillEllipse(-2, 0, 4.2, 4.6);
    this.eyes.fillEllipse(6, 0, 4.2, 4.6);
    this.eyes.fillStyle(EYE_COLOR, 1);
    this.eyes.fillCircle(-1.3, 0.3, 1.5);
    this.eyes.fillCircle(6.7, 0.3, 1.5);
    if (this.look.gender === "f") {
      // Pestañas: dos trazos hacia afuera en cada ojo (se cierran con el parpadeo).
      this.eyes.lineStyle(1.2, EYE_COLOR, 1);
      this.eyes.lineBetween(-4, -1.6, -5.6, -3);
      this.eyes.lineBetween(-3.2, -2.3, -4.2, -3.9);
      this.eyes.lineBetween(8, -1.6, 9.6, -3);
      this.eyes.lineBetween(7.2, -2.3, 8.2, -3.9);
    }
    const face = scene.add.graphics();
    this.drawHeadFront(face, this.look);
    const frontHair = scene.add.graphics();
    this.drawFrontHair(frontHair, this.look);
    this.hatFront = scene.add.graphics();
    this.headFront = scene.add.container(0, 0, [face, this.eyes, frontHair, this.hatFront]);

    this.rod = scene.add.graphics().setVisible(false);
    this.drawRod(ROD_COLOR);
    this.fishingLine = scene.add.graphics().setVisible(false);
    this.cart = scene.add.graphics().setVisible(false);

    this.body_ = scene.add.container(0, 0, [
      ...this.legs,
      // Vista 3/4: el brazo del lado lejano (-x) pasa por detrás del torso al balancearse.
      this.arms[0],
      this.torso,
      this.headBack,
      this.headFront,
      this.fishingLine,
      this.rod,
      this.arms[1],
      this.cart,
    ]);
    this.setOutfit(config.outfit);

    const label = scene.add
      .text(0, NAME_Y, config.isAdmin ? `★ ${config.name}` : config.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: config.isAdmin ? "#ff9f1c" : config.color,
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);

    this.donorTag = scene.add
      .text(0, DONOR_TAG_Y, "♥ DONADOR", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
        color: "#3a2600",
        backgroundColor: "#ffd166",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setVisible(Boolean(config.isDonor));

    this.prisonerTag = scene.add
      .text(0, DONOR_TAG_Y, "🔒 PRESO", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#e63946",
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false);

    this.add([shadow, this.body_]);
    this.overlay = scene.add.container(this.x, this.y, [this.donorTag, this.prisonerTag, label]);
    this.syncDepth();
    scene.add.existing(this);
  }

  /** Donador o no (lo marca el admin; puede cambiar estando conectado). */
  setDonor(donor: boolean) {
    this.donorTag.setVisible(donor);
    this.layoutTags();
  }

  /** Preso en el COMCAR o no (cambia estando conectado: lo banean, cumple). */
  setPrisoner(prisoner: boolean) {
    if (this.prisonerTag.visible === prisoner) return;
    this.prisonerTag.setVisible(prisoner);
    this.layoutTags();
  }

  /** Distintivos arriba del nombre, apilados: primero "PRESO", arriba "DONADOR". */
  private layoutTags() {
    let y = DONOR_TAG_Y;
    for (const tag of [this.prisonerTag, this.donorTag]) {
      if (!tag.visible) continue;
      tag.setY(y);
      y -= DONOR_TAG_HEIGHT;
    }
  }

  /** Altura del globo de chat: más arriba por cada distintivo (donador, preso). */
  private bubbleY(): number {
    const tags = Number(this.donorTag.visible) + Number(this.prisonerTag.visible);
    return BUBBLE_OFFSET_Y - tags * DONOR_TAG_HEIGHT;
  }

  /**
   * Suma un tile al final del recorrido (lo que llega del Schema, paso a paso). Si no es vecino del
   * último (un salto: entró, viajó, el server lo corrigió lejos) se teletransporta.
   */
  pushTile(tileX: number, tileY: number) {
    const end = this.endTile();
    if (end.x === tileX && end.y === tileY) return;
    if (Math.max(Math.abs(end.x - tileX), Math.abs(end.y - tileY)) > 1 || this.queue.length >= MAX_QUEUE) {
      this.snapTo(tileX, tileY);
      return;
    }
    this.queue.push({ x: tileX, y: tileY });
  }

  /**
   * Reemplaza lo que falta recorrer por `tiles` (el paso en curso se termina igual, para no cortar
   * el movimiento a mitad de camino). Lo usa la predicción del avatar propio.
   */
  setPath(tiles: readonly TilePoint[]) {
    this.queue = [];
    for (const tile of tiles) this.pushTile(tile.x, tile.y);
  }

  /** ¿Todavía tiene tiles por recorrer (o un paso en curso)? */
  isWalking(): boolean {
    return this.segment !== null || this.queue.length > 0;
  }

  /** Transparencia del avatar, con su nombre y globo (para que aparezca o se vaya de a poco). */
  setFade(alpha: number) {
    this.setAlpha(alpha);
    this.overlay.setAlpha(alpha);
  }

  /** Aparece directamente en el tile, sin caminar. */
  snapTo(tileX: number, tileY: number) {
    const world = tileToWorld(tileX, tileY);
    this.queue = [];
    this.segment = null;
    this.tileX = tileX;
    this.tileY = tileY;
    this.setPosition(world.x, world.y);
  }

  /** El tile al que está yendo ahora (o en el que está, si está quieto). */
  headingTile(): TilePoint {
    return this.segment ? this.segment.to : { x: this.tileX, y: this.tileY };
  }

  /** Dónde termina el recorrido pendiente. */
  endTile(): TilePoint {
    return this.queue[this.queue.length - 1] ?? this.headingTile();
  }

  /** Arranca el paso hacia el próximo tile de la cola. `carry` = ms que sobraron del paso anterior. */
  private startSegment(carry: number) {
    const to = this.queue.shift();
    if (!to) return;
    // Atrasado (varios tiles en cola): se apura, así alcanza al server sin saltos.
    const behind = Math.max(0, this.queue.length + 1 - CATCH_UP_FROM);
    const factor = Math.min(MAX_CATCH_UP, 1 + behind * CATCH_UP_PER_TILE);
    this.segment = { fromX: this.x, fromY: this.y, to, elapsed: carry, duration: STEP_MS / factor };
    const target = tileToWorld(to.x, to.y);
    this.face(target.x - this.x, target.y - this.y);
  }

  /** Llamado cuando el Schema cambia la ropa puesta. Sólo redibuja si algo cambió. */
  setOutfit(ids: OutfitIds) {
    const key = `${ids.hat}|${ids.top}|${ids.bottom}|${ids.shoes}`;
    if (key === this.outfitKey) return;
    this.outfitKey = key;

    const outfit = outfitFromIds(ids);
    this.legGraphics.forEach((g) => this.drawLeg(g.clear(), outfit));
    this.armGraphics.forEach((g) => this.drawArm(g.clear(), outfit));
    this.drawTorso(this.torso.clear(), outfit);
    this.drawHat(this.hatFront.clear(), outfit.hat, false);
    this.drawHat(this.hatBack.clear(), outfit.hat, true);
  }

  /** Sentado en un banco (`facing` = hacia dónde mira) o parado. */
  setSitting(sitting: boolean, facing?: SitFacing) {
    this.sitting = sitting;
    // El sur de la grilla queda abajo a la izquierda en pantalla: el cuerpo se espeja.
    if (sitting && facing) this.sitScaleX = facing === "east" ? 1 : -1;
  }

  /** Pescando desde la escollera (`facing` = hacia el agua) o no, con una caña de `rodColor`. */
  setFishing(fishing: boolean, spot: FishingSpot = { facing: "south", distance: 2 }, rodColor = ROD_COLOR) {
    if (fishing && rodColor !== this.rodColor) this.drawRod(rodColor);
    this.fishing = fishing;
    this.fishFacing = spot.facing;
    this.fishDistance = spot.distance;
    this.rod.setVisible(fishing);
    this.fishingLine.setVisible(fishing);
    if (!fishing) this.fishingLine.clear();
  }

  /**
   * Vendiendo en la explanada (o no), con un carrito de `color` y nivel `tier`: conservadora (1),
   * carrito con ruedas y olla (2), con vitrina y sombrilla (3) o parrillita humeante (4).
   */
  setVending(vending: boolean, color = 0x2a7bd1, tier = 1) {
    const key = `${color}|${tier}`;
    if (vending && key !== this.cartKey) {
      this.cartKey = key;
      this.drawCart(color, tier);
    }
    if (vending && !this.vending) this.vendTime = 0;
    this.vending = vending;
    this.cart.setVisible(vending);
  }

  private drawCart(color: number, tier: number) {
    const g = this.cart.clear();
    const dark = shade(color, -35);
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(33, 1, 34, 8);

    if (tier === 1) {
      // Conservadora: caja de color con tapa blanca y manija.
      g.fillStyle(color, 1);
      g.fillRoundedRect(21, -18, 22, 18, 3);
      g.fillStyle(0xf4f4f4, 1);
      g.fillRoundedRect(20, -22, 24, 5, 2);
      g.lineStyle(2, CART_DARK, 1);
      g.strokeRoundedRect(27, -27, 10, 6, 2);
      g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
      g.strokeRoundedRect(21, -18, 22, 18, 3);
      return;
    }

    // Carrito: caja sobre dos ruedas, con manija atrás y una franja clara al frente.
    g.lineStyle(2.5, CART_METAL, 1);
    g.lineBetween(46, -24, 52, -32);
    g.fillStyle(color, 1);
    g.fillRoundedRect(18, -28, 28, 20, 3);
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(20, -20, 24, 3);
    g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
    g.strokeRoundedRect(18, -28, 28, 20, 3);
    for (const x of [24, 40]) {
      g.fillStyle(CART_DARK, 1);
      g.fillCircle(x, -4, 4.5);
      g.fillStyle(CART_METAL, 1);
      g.fillCircle(x, -4, 1.6);
    }

    if (tier === 2) {
      // Olla de cobre con la garrapiñada.
      g.fillStyle(0xb87333, 1);
      g.fillEllipse(32, -29, 18, 7);
      g.fillStyle(0x8a4f1d, 1);
      g.fillEllipse(32, -30, 13, 4);
      return;
    }

    // Sombrilla a rayas sobre un parante (niveles 3 y 4).
    g.lineStyle(2, CART_METAL, 1);
    g.lineBetween(32, -28, 32, -64);
    const stripes = 6;
    for (let i = 0; i < stripes; i++) {
      const x0 = 12 + (i * 40) / stripes;
      const x1 = x0 + 40 / stripes;
      g.fillStyle(i % 2 === 0 ? color : 0xffffff, 1);
      g.fillTriangle(32, -72, x0, -60, x1, -60);
    }

    if (tier === 3) {
      // Vitrina con los panchos.
      g.fillStyle(0xbfe3ee, 0.75);
      g.fillRect(20, -38, 24, 10);
      g.fillStyle(0xd98b4a, 1);
      for (const x of [24, 31, 38]) g.fillRoundedRect(x, -33, 5, 3, 1.5);
      g.lineStyle(1, OUTLINE, OUTLINE_ALPHA);
      g.strokeRect(20, -38, 24, 10);
      return;
    }

    // Parrilla con chorizos y humo.
    g.fillStyle(dark, 1);
    g.fillRect(17, -31, 30, 3);
    g.lineStyle(1, 0x777777, 1);
    for (let x = 19; x <= 45; x += 4) g.lineBetween(x, -31, x, -28);
    g.fillStyle(0x8c2f1f, 1);
    for (const x of [21, 29, 37]) g.fillRoundedRect(x, -34, 7, 3, 1.5);
    g.fillStyle(0xdddddd, 0.45);
    g.fillCircle(26, -42, 4);
    g.fillCircle(30, -48, 5);
    g.fillCircle(36, -53, 4);
  }

  /** Caña en la mano: vara del color de la caña, puntera y reel oscuros. */
  private drawRod(color: number) {
    this.rodColor = color;
    this.rod.clear();
    this.rod.lineStyle(2.5, color, 1);
    this.rod.lineBetween(26, -42, 60, -88);
    this.rod.lineStyle(1.5, 0x2b2b30, 1);
    this.rod.lineBetween(52, -77, 60, -88);
    this.rod.fillStyle(0x2b2b30, 1);
    this.rod.fillCircle(30, -47, 2.5);
  }

  /** Avanza el recorrido: interpola cada paso (lerp) y encadena el siguiente con el tiempo que sobró. */
  private advance(delta: number) {
    if (!this.segment && this.queue.length > 0) this.startSegment(0);
    while (this.segment) {
      const segment = this.segment;
      segment.elapsed += delta;
      delta = 0;
      const target = tileToWorld(segment.to.x, segment.to.y);
      const t = Math.min(1, segment.elapsed / segment.duration);
      this.setPosition(Phaser.Math.Linear(segment.fromX, target.x, t), Phaser.Math.Linear(segment.fromY, target.y, t));
      if (t < 1) return;
      // Llegó a ese tile: el tiempo que sobró ya cuenta para el próximo, sin frenar entre tiles.
      this.tileX = segment.to.x;
      this.tileY = segment.to.y;
      this.segment = null;
      if (this.queue.length > 0) this.startSegment(segment.elapsed - segment.duration);
    }
  }

  /** Movimiento y poses de cada frame. */
  tick(delta: number) {
    this.advance(delta);

    if (!this.segment) {
      this.walkTime = 0;
      this.idleTime += delta;
      if (this.sitting) {
        this.setBackView(false);
        this.body_.scaleX = this.sitScaleX;
        this.poseLimbs(delta, SIT_DROP, SIT_LEG_SCALE, SIT_ARM_ANGLE);
      } else if (this.fishing) {
        this.poseFishing(delta);
      } else if (this.vending) {
        this.poseVending(delta);
      } else {
        if (this.idleTime >= ARRIVE_GRACE_MS) this.setBackView(false);
        this.poseLimbs(delta, 0, 1, 0);
      }
    } else {
      this.walkTime += delta;
      this.idleTime = 0;
      this.animateWalk();
    }

    this.poseKick(delta);
    this.updateBlink(delta);
    this.syncDepth();
  }

  /** Patada (a un picudo): la pierna cercana va para adelante y vuelve. `dirX` = hacia dónde (+ derecha). */
  kick(dirX: number) {
    if (this.sitting) return;
    if (Math.abs(dirX) > 0.01) this.body_.scaleX = dirX >= 0 ? 1 : -1;
    this.setBackView(false);
    this.kickLeft = KICK_MS;
  }

  /** Pisa la pose de la pierna mientras dura la patada (sirve igual caminando o quieto). */
  private poseKick(delta: number) {
    if (this.kickLeft <= 0) return;
    this.kickLeft = Math.max(0, this.kickLeft - delta);
    const progress = 1 - this.kickLeft / KICK_MS;
    this.legs[1].rotation = -Math.sin(progress * Math.PI) * KICK_ANGLE;
    this.legs[1].scaleY = 1;
  }

  /** ¿El punto del mundo cae sobre el cuerpo? (caja de pies a cabeza, para clics y hover) */
  containsWorldPoint(worldX: number, worldY: number): boolean {
    const dx = worldX - this.x;
    const dy = worldY - (this.y + this.body_.y);
    return Math.abs(dx) <= HIT_HALF_WIDTH && dy >= HIT_TOP && dy <= HIT_BOTTOM;
  }

  /** Profundidad por Y (los de adelante tapan a los de atrás) y overlay pegado a la cabeza. */
  private syncDepth() {
    this.setDepth(this.y + (this.sitting ? SIT_DEPTH_BIAS : 0));
    this.overlay.setPosition(this.x, this.y + this.body_.y).setDepth(OVERLAY_DEPTH + this.y);
  }

  /** Orienta el cuerpo: espejado según dx, frente/espalda según dy (hacia arriba = de espaldas). */
  private face(dx: number, dy: number) {
    if (Math.abs(dx) > 0.01) this.body_.scaleX = dx >= 0 ? 1 : -1;
    if (Math.abs(dy) > 0.01) this.setBackView(dy < 0);
  }

  /** Al llegar a destino el avatar siempre queda de frente; de espaldas sólo mientras camina. */
  private setBackView(back: boolean) {
    this.headBack.setVisible(back);
    this.headFront.setVisible(!back);
  }

  private animateWalk() {
    const phase = this.walkTime * WALK_PHASE_PER_MS;
    const swing = Math.sin(phase);
    this.legs[0].rotation = swing * LEG_SWING;
    this.legs[1].rotation = -swing * LEG_SWING;
    this.arms[0].rotation = -swing * ARM_SWING;
    this.arms[1].rotation = swing * ARM_SWING;
    for (const leg of this.legs) leg.scaleY = 1;
    // El cuerpo sube cuando las piernas pasan juntas y baja con el paso abierto.
    this.body_.y = -(1 - Math.abs(swing)) * 2.5;
  }

  /**
   * Lleva suavemente el cuerpo a una pose quieta: parado (drop 0, piernas enteras, brazos colgando)
   * o sentado (cuerpo abajo, muslos acortados, manos hacia el regazo).
   */
  private poseLimbs(delta: number, drop: number, legScale: number, armAngle: number) {
    const t = Math.min(1, delta / 80);
    for (const leg of this.legs) {
      leg.rotation = Phaser.Math.Linear(leg.rotation, 0, t);
      leg.scaleY = Phaser.Math.Linear(leg.scaleY, legScale, t);
    }
    // Brazo lejano (-x) hacia +x y brazo cercano hacia -x: ambos van al centro.
    this.arms[0].rotation = Phaser.Math.Linear(this.arms[0].rotation, -armAngle, t);
    this.arms[1].rotation = Phaser.Math.Linear(this.arms[1].rotation, armAngle, t);
    this.body_.y = Phaser.Math.Linear(this.body_.y, drop, t);
  }

  /**
   * De cara al agua con la caña en la mano cercana. Sur y este quedan de frente a la cámara;
   * oeste y norte, de espaldas. La tanza y la boya se mecen con el agua.
   */
  private poseFishing(delta: number) {
    const facing = this.fishFacing;
    this.setBackView(facing === "north" || facing === "west");
    this.body_.scaleX = facing === "east" || facing === "north" ? 1 : -1;
    this.poseLimbs(delta, 0, 1, 0);
    const t = Math.min(1, delta / 80);
    this.arms[1].rotation = Phaser.Math.Linear(this.arms[1].rotation, FISH_ARM_ANGLE, t);

    this.fishTime += delta;
    const sway = Math.sin(this.fishTime / 450) * 3;
    const bob = Math.sin(this.fishTime / 300) * 1.5;
    // La boya cae en el centro del tile de agua (`fishDistance` tiles hacia `facing`). El cuerpo ya
    // está espejado según la dirección, así que en x siempre es hacia +x; en y, un tile hacia el sur
    // o el este baja en pantalla y uno hacia el norte o el oeste sube.
    const front = facing === "south" || facing === "east";
    const bx = this.fishDistance * (TILE_WIDTH / 2) + sway;
    const by = this.fishDistance * (TILE_HEIGHT / 2) * (front ? 1 : -1) + bob;
    const g = this.fishingLine.clear();
    g.lineStyle(1, LINE_COLOR, 0.9);
    g.beginPath();
    g.moveTo(ROD_TIP.x, ROD_TIP.y);
    // La tanza cuelga: el punto del medio queda más abajo que la recta entre la punta y la boya.
    g.lineTo((ROD_TIP.x + bx) / 2 + sway * 0.5, (ROD_TIP.y + by) / 2 + 14);
    g.lineTo(bx, by);
    g.strokePath();
    g.fillStyle(0xe63946, 1);
    g.fillCircle(bx, by, 2.5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(bx, by - 2, 1.4);
  }

  /** De frente con el carrito a la derecha; cada tanto levanta el brazo para ofrecer. */
  private poseVending(delta: number) {
    this.setBackView(false);
    this.body_.scaleX = 1;
    this.poseLimbs(delta, 0, 1, 0);
    this.vendTime += delta;
    const phase = this.vendTime % VEND_WAVE_EVERY_MS;
    if (phase < VEND_WAVE_MS) this.arms[1].rotation = Math.sin((phase / VEND_WAVE_MS) * Math.PI) * VEND_WAVE_ANGLE;
  }

  private updateBlink(delta: number) {
    this.blinkIn -= delta;
    if (this.blinkIn > 0) return;
    this.eyes.scaleY = 0.15;
    if (this.blinkIn <= -BLINK_MS) {
      this.eyes.scaleY = 1;
      this.blinkIn = Phaser.Math.Between(2500, 5500);
    }
  }

  // --- Ropa ------------------------------------------------------------------------------------

  /** Pierna desde la cadera: piel, pantalón/short/ropa interior y calzado (la punta mira a +x). */
  private drawLeg(g: Phaser.GameObjects.Graphics, outfit: Outfit) {
    const skin = this.look.skin;
    g.fillStyle(shade(skin, -6), 1);
    g.fillRoundedRect(-3, -2, 6, 28, 3);

    const bottom = outfit.bottom;
    if (bottom) {
      const color = itemColor(bottom);
      const length = bottom.style === "shorts" ? 15 : 28;
      g.fillStyle(color, 1);
      g.fillRoundedRect(-3.5, -2, 7, length, 3);
      g.fillStyle(shade(color, -15), 1);
      if (bottom.style === "shorts") g.fillRect(-3.5, length - 4, 7, 2);
      else g.fillRect(-3.5, 12, 7, 1.5);
      if (bottom.style === "jeans") {
        g.lineStyle(1, shade(color, 25), 0.7);
        g.lineBetween(1.5, 0, 1.5, 24);
      }
      g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
      g.strokeRoundedRect(-3.5, -2, 7, length, 3);
    } else {
      g.fillStyle(UNDERWEAR_COLOR, 1);
      g.fillRoundedRect(-3.5, -2, 7, 8, 3);
    }

    const shoes = outfit.shoes;
    if (shoes?.style === "flipflops") {
      // Pie a la vista sobre una suela finita, con la tira en V.
      const color = itemColor(shoes);
      g.fillStyle(shade(color, -20), 1);
      g.fillEllipse(1.5, 29, 11, 3.5);
      g.fillStyle(skin, 1);
      g.fillEllipse(1, 27, 9, 4.5);
      g.lineStyle(1.5, color, 1);
      g.lineBetween(-2, 25.5, 2, 27.5);
      g.lineBetween(2, 27.5, 5, 25.5);
    } else if (shoes) {
      const color = itemColor(shoes);
      const top = shoes.style === "boots" ? 18 : 24;
      g.fillStyle(color, 1);
      g.fillRoundedRect(-4, top, 10, 30 - top, 3);
      g.fillStyle(shoes.style === "sneakers" ? (color > 0xe0e0e0 ? 0xbdbdbd : 0xf4f4f4) : 0x2a1d14, 1);
      g.fillRect(-4, 28.5, 10, 1.5);
      g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
      g.strokeRoundedRect(-4, top, 10, 30 - top, 3);
    } else {
      // Descalzo.
      g.fillStyle(skin, 1);
      g.fillEllipse(1, 27.5, 9, 5);
      g.lineStyle(1, OUTLINE, OUTLINE_ALPHA);
      g.strokeEllipse(1, 27.5, 9, 5);
    }
  }

  /** Brazo desde el hombro: piel, manga corta/larga según la prenda de arriba, y mano. */
  private drawArm(g: Phaser.GameObjects.Graphics, outfit: Outfit) {
    const skin = this.look.skin;
    g.fillStyle(shade(skin, -6), 1);
    g.fillRoundedRect(-2.5, -1, 5, 21, 2.5);
    g.fillStyle(skin, 1);
    g.fillCircle(0, 21, 3.3);
    g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
    g.strokeCircle(0, 21, 3.3);

    const top = outfit.top;
    if (!top || top.style === "tank") return;
    const color = shade(itemColor(top), -10);
    const sleeve = top.style === "hoodie" ? 19 : 11;
    g.fillStyle(color, 1);
    g.fillRoundedRect(-3.2, -1, 6.4, sleeve, 3);
    if (top.style === "hoodie") {
      g.fillStyle(shade(color, -15), 1);
      g.fillRect(-3.2, sleeve - 4, 6.4, 3);
    }
    g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
    g.strokeRoundedRect(-3.2, -1, 6.4, sleeve, 3);
  }

  /** Cuello, prenda de arriba (o torso desnudo), cadera y cinturón. */
  private drawTorso(g: Phaser.GameObjects.Graphics, outfit: Outfit) {
    const skin = this.look.skin;
    g.fillStyle(shade(skin, -12), 1);
    g.fillRect(-3, HEAD_Y + 8, 6, 7);

    const bottom = outfit.bottom;
    g.fillStyle(bottom ? itemColor(bottom) : UNDERWEAR_COLOR, 1);
    g.fillRoundedRect(-9.5, HIP_Y - 4, 19, 8, 3);

    const top = outfit.top;
    if (top?.style === "hoodie") {
      // Capucha caída detrás del cuello.
      g.fillStyle(shade(itemColor(top), -25), 1);
      g.fillEllipse(-1, SHOULDER_Y - 2, 18, 8);
    }

    // Base: sombra lateral + cuerpo + brillo. Sin remera (o con musculosa) la base es la piel.
    const base = top && top.style !== "tank" ? itemColor(top) : skin;
    g.fillStyle(shade(base, -18), 1);
    g.fillRoundedRect(-11, SHOULDER_Y - 3, 22, 27, 6);
    g.fillStyle(base, 1);
    g.fillRoundedRect(-7.5, SHOULDER_Y - 3, 18.5, 27, 6);

    if (!top && this.look.gender === "f") {
      // Sin remera, el avatar de mujer queda con una bikini.
      g.fillStyle(UNDERWEAR_COLOR, 1);
      g.fillRoundedRect(-9, SHOULDER_Y + 3, 19, 8, 3);
      g.lineStyle(1, shade(UNDERWEAR_COLOR, -30), 0.8);
      g.strokeRoundedRect(-9, SHOULDER_Y + 3, 19, 8, 3);
    } else if (!top) {
      g.lineStyle(1.2, shade(skin, -22), 0.8);
      g.beginPath();
      g.arc(-2.5, SHOULDER_Y + 6, 5, Math.PI * 0.15, Math.PI * 0.85, false);
      g.strokePath();
      g.beginPath();
      g.arc(5.5, SHOULDER_Y + 6, 5, Math.PI * 0.15, Math.PI * 0.85, false);
      g.strokePath();
      g.fillStyle(shade(skin, -25), 1);
      g.fillCircle(2, SHOULDER_Y + 18, 1);
    } else if (top.style === "tank") {
      const color = itemColor(top);
      g.fillStyle(shade(color, -12), 1);
      g.fillRoundedRect(-9, SHOULDER_Y + 1, 18, 23, 5);
      g.fillStyle(color, 1);
      g.fillRoundedRect(-6.5, SHOULDER_Y + 1, 15.5, 23, 5);
      g.fillRect(-6.5, SHOULDER_Y - 3, 3, 6);
      g.fillRect(4, SHOULDER_Y - 3, 3, 6);
    } else {
      const color = itemColor(top);
      g.fillStyle(shade(color, 12), 1);
      g.fillRoundedRect(2, SHOULDER_Y + 1, 6, 12, 3);
      if (top.style === "jersey") {
        // Cuello blanco (el escote en V de la cara queda encima) y escudo con el sol.
        g.fillStyle(0xffffff, 1);
        g.fillTriangle(-5, SHOULDER_Y - 3, 5, SHOULDER_Y - 3, 0, SHOULDER_Y + 4);
        g.fillStyle(0xf2b705, 1);
        g.fillCircle(5.5, SHOULDER_Y + 6, 2);
      } else if (top.style === "hoodie") {
        g.fillStyle(shade(color, -15), 1);
        g.fillRoundedRect(-6, SHOULDER_Y + 13, 13, 7, 3);
        g.lineStyle(1, 0xf4f4f4, 0.9);
        g.lineBetween(-2, SHOULDER_Y - 1, -2, SHOULDER_Y + 7);
        g.lineBetween(2, SHOULDER_Y - 1, 2, SHOULDER_Y + 7);
      }
    }
    g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
    g.strokeRoundedRect(-11, SHOULDER_Y - 3, 22, 27, 6);

    if (bottom && bottom.style !== "shorts") {
      g.fillStyle(BELT_COLOR, 1);
      g.fillRect(-10, HIP_Y - 5, 20, 3);
      g.fillStyle(0xc9a227, 1);
      g.fillRect(2, HIP_Y - 5, 3, 3);
    }
  }

  /** Gorro sobre el pelo. `back` = vista de espaldas (sin visera ni detalles de frente). */
  private drawHat(g: Phaser.GameObjects.Graphics, hat: ClothingItem | undefined, back: boolean) {
    if (!hat) return;
    const R = HEAD_R;
    const color = itemColor(hat);

    switch (hat.style) {
      case "cap":
        g.fillStyle(color, 1);
        hairCap(g, R + 1.8);
        g.lineTo(R + 1.8, HEAD_Y - 1);
        g.lineTo(-R - 1.8, HEAD_Y - 1);
        g.closePath();
        g.fillPath();
        if (!back) {
          g.fillStyle(shade(color, -20), 1);
          g.fillEllipse(R + 3, HEAD_Y - 2, 13, 4.5);
        } else {
          g.fillStyle(shade(color, -30), 1);
          g.fillRect(-3, HEAD_Y - 4, 6, 2.5);
        }
        g.fillStyle(shade(color, 20), 1);
        g.fillCircle(0, HEAD_Y - R - 1.5, 1.6);
        return;
      case "beanie":
        g.fillStyle(color, 1);
        hairCap(g, R + 2.5);
        g.lineTo(R + 2.5, HEAD_Y - 1);
        g.lineTo(-R - 2.5, HEAD_Y - 1);
        g.closePath();
        g.fillPath();
        g.fillStyle(shade(color, -18), 1);
        g.fillRoundedRect(-R - 2.5, HEAD_Y - 5, R * 2 + 5, 5, 2);
        g.fillStyle(shade(color, 25), 1);
        g.fillCircle(0, HEAD_Y - R - 4, 3.5);
        return;
      case "beret":
        g.fillStyle(color, 1);
        g.fillEllipse(-1, HEAD_Y - R + 1, R * 2 + 8, 9);
        g.fillStyle(shade(color, 18), 1);
        g.fillEllipse(-3, HEAD_Y - R - 0.5, R, 3);
        g.fillStyle(color, 1);
        g.fillRect(-0.75, HEAD_Y - R - 5, 1.5, 3);
        return;
      default:
        return;
    }
  }

  // --- Cabeza ----------------------------------------------------------------------------------

  /** Cabeza de frente (3/4 hacia +x): pelo de atrás, cara, oreja, nariz, boca y cejas. */
  private drawHeadFront(g: Phaser.GameObjects.Graphics, look: AvatarLook) {
    // Pelo que queda detrás de la cabeza.
    g.fillStyle(look.hair, 1);
    if (look.hairStyle === "long") g.fillRoundedRect(-HEAD_R - 2, HEAD_Y - 4, HEAD_R * 2 + 3, 25, 5);
    if (look.hairStyle === "afro") g.fillCircle(-1, HEAD_Y - 3, HEAD_R + 6);
    if (look.hairStyle === "ponytail") {
      g.fillEllipse(-HEAD_R - 3, HEAD_Y + 4, 7, 16);
    }

    // Escote en V de la remera.
    g.fillStyle(look.skin, 1);
    g.fillTriangle(-3.5, SHOULDER_Y - 3, 3.5, SHOULDER_Y - 3, 0, SHOULDER_Y + 2);

    g.fillStyle(look.skin, 1);
    g.fillEllipse(0, HEAD_Y, HEAD_R * 2, HEAD_R * 2 + 2);
    g.fillEllipse(-HEAD_R + 0.5, HEAD_Y + 1, 5, 7);
    g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
    g.strokeEllipse(0, HEAD_Y, HEAD_R * 2, HEAD_R * 2 + 2);

    g.fillStyle(shade(look.skin, -15), 1);
    g.fillEllipse(-HEAD_R + 0.5, HEAD_Y + 1, 2, 4);
    g.fillEllipse(4.5, HEAD_Y + 3.5, 3, 2.5);

    const female = look.gender === "f";
    g.lineStyle(female ? 2 : 1.5, female ? LIPS_COLOR : MOUTH_COLOR, 1);
    g.beginPath();
    g.arc(3, HEAD_Y + 5, female ? 2.6 : 3, Math.PI * 0.2, Math.PI * 0.8, false);
    g.strokePath();

    // Cejas: más finas y arqueadas en el avatar de mujer.
    g.lineStyle(female ? 1.2 : 1.8, shade(look.hair, -10), 1);
    g.lineBetween(-4, HEAD_Y - 4, 0, HEAD_Y - 4.6);
    g.lineBetween(4, HEAD_Y - 4.6, 8, HEAD_Y - 4);
  }

  /** Pelo que va por delante de la cara (flequillo / casco). */
  private drawFrontHair(g: Phaser.GameObjects.Graphics, look: AvatarLook) {
    const R = HEAD_R;
    g.fillStyle(look.hair, 1);

    switch (look.hairStyle) {
      case "buzz":
        hairCap(g, R + 0.5);
        g.lineTo(R + 0.5, HEAD_Y - 2);
        g.lineTo(-R - 0.5, HEAD_Y + 1);
        g.closePath();
        g.fillPath();
        return;
      case "afro":
        for (let a = Math.PI * 0.9; a <= Math.PI * 2.1; a += Math.PI / 6) {
          g.fillCircle(Math.cos(a) * (R + 1), HEAD_Y - 2 + Math.sin(a) * (R + 1), 5.5);
        }
        hairCap(g, R + 1);
        g.lineTo(R + 1, HEAD_Y - 3);
        g.lineTo(-R - 1, HEAD_Y + 2);
        g.closePath();
        g.fillPath();
        return;
      default:
        // short, long y ponytail comparten casco con flequillo.
        hairCap(g, R + 1.5);
        g.lineTo(R + 1.5, HEAD_Y + 1);
        g.lineTo(7, HEAD_Y - 5);
        g.lineTo(2, HEAD_Y - 6);
        g.lineTo(-4, HEAD_Y - 4.5);
        g.lineTo(-R + 2, HEAD_Y - 2);
        g.lineTo(-R - 1.5, HEAD_Y + (look.hairStyle === "long" ? 12 : 4));
        g.closePath();
        g.fillPath();
        g.fillStyle(shade(look.hair, 18), 1);
        g.fillEllipse(3, HEAD_Y - 8.5, 7, 2.5);
    }
  }

  /** Cabeza de espaldas: sólo nuca, orejas y pelo. */
  private drawHeadBack(g: Phaser.GameObjects.Graphics, look: AvatarLook) {
    const R = HEAD_R;
    g.fillStyle(look.skin, 1);
    g.fillEllipse(0, HEAD_Y, R * 2, R * 2 + 2);
    g.fillEllipse(-R, HEAD_Y + 1, 5, 7);
    g.fillEllipse(R, HEAD_Y + 1, 5, 7);
    g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
    g.strokeEllipse(0, HEAD_Y, R * 2, R * 2 + 2);

    g.fillStyle(look.hair, 1);
    switch (look.hairStyle) {
      case "afro":
        g.fillCircle(0, HEAD_Y - 3, R + 6);
        return;
      case "long":
        g.fillRoundedRect(-R - 2, HEAD_Y - 4, R * 2 + 4, 25, 5);
        hairCap(g, R + 2);
        g.closePath();
        g.fillPath();
        return;
      default: {
        const radius = look.hairStyle === "buzz" ? R + 0.5 : R + 1.5;
        hairCap(g, radius);
        g.lineTo(R - 1, HEAD_Y + 6);
        g.lineTo(-R + 1, HEAD_Y + 6);
        g.closePath();
        g.fillPath();
        if (look.hairStyle === "ponytail") {
          g.fillEllipse(0, HEAD_Y + 11, 7, 16);
          g.fillStyle(0xe63946, 1);
          g.fillRect(-3, HEAD_Y + 4, 6, 2.5);
        }
      }
    }
  }

  /** Muestra un globo de texto sobre la cabeza durante CHAT_BUBBLE_MS. */
  say(text: string) {
    this.clearBubble();

    const scene = this.scene;
    const label = scene.add
      .text(0, 0, text, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#111111",
        align: "center",
        wordWrap: { width: BUBBLE_MAX_WIDTH, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 1);

    const width = label.width + BUBBLE_PADDING * 2;
    const height = label.height + BUBBLE_PADDING * 2;

    const background = scene.add.graphics();
    background.fillStyle(0xffffff, 0.96);
    background.lineStyle(2, 0x222222, 1);
    background.fillRoundedRect(-width / 2, -height, width, height, 8);
    background.strokeRoundedRect(-width / 2, -height, width, height, 8);
    background.fillTriangle(-6, 0, 6, 0, 0, 8);
    background.lineBetween(-6, 0, 0, 8);
    background.lineBetween(6, 0, 0, 8);

    label.setPosition(0, -BUBBLE_PADDING);

    const bubbleY = this.bubbleY();
    const bubble = scene.add.container(0, bubbleY, [background, label]);
    bubble.setAlpha(0);
    this.overlay.add(bubble);
    this.bubble = bubble;

    scene.tweens.add({ targets: bubble, alpha: 1, y: bubbleY - 4, duration: 150 });

    this.bubbleTimer = scene.time.delayedCall(CHAT_BUBBLE_MS, () => {
      scene.tweens.add({
        targets: bubble,
        alpha: 0,
        y: bubbleY - 16,
        duration: 300,
        onComplete: () => {
          if (this.bubble === bubble) this.bubble = null;
          bubble.destroy();
        },
      });
    });
  }

  private clearBubble() {
    this.bubbleTimer?.remove(false);
    this.bubbleTimer = null;
    if (this.bubble) {
      this.scene.tweens.killTweensOf(this.bubble);
      this.bubble.destroy();
      this.bubble = null;
    }
  }

  destroy(fromScene?: boolean) {
    this.bubbleTimer?.remove(false);
    this.bubbleTimer = null;
    this.overlay.destroy();
    super.destroy(fromScene);
  }
}
