import * as Phaser from "phaser";
import { CHAT_BUBBLE_MS, ClothingItem, OutfitIds, STEP_MS, TILE_WIDTH } from "@montevideo-world/shared";
import { shade } from "../color";
import { tileToWorld } from "../iso";
import { AvatarLook, Outfit, lookFor, outfitFromIds } from "./avatarLook";

/** Nombre sobre la cabeza (por encima del pelo más alto y de los gorros). */
const NAME_Y = -92;
/** El globo de chat va encima del nombre. */
const BUBBLE_OFFSET_Y = -116;
/**
 * Nombre y globo van en un Container aparte, por encima de todos los edificios
 * (que tapan al cuerpo del avatar cuando pasa por detrás, pero nunca su nombre ni lo que dice).
 */
const OVERLAY_DEPTH = 1_000_000;
const BUBBLE_MAX_WIDTH = 180;
const BUBBLE_PADDING = 8;
/** Si el objetivo está más lejos que esto, se teletransporta en lugar de interpolar. */
const SNAP_DISTANCE = TILE_WIDTH * 3;

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

/** Sentado: el cuerpo baja hasta el asiento y los muslos se acortan (apuntan hacia la cámara). */
const SIT_DROP = 14;
const SIT_LEG_SCALE = 0.6;
const SIT_ARM_ANGLE = 0.3;
/** Sentado en el banco: se dibuja apenas por delante del banco, que está en el mismo tile. */
const SIT_DEPTH_BIAS = 2;

const OUTLINE = 0x000000;
const OUTLINE_ALPHA = 0.28;
const EYE_COLOR = 0x2b1d14;
const MOUTH_COLOR = 0x7a3b2e;
const BELT_COLOR = 0x2a1d14;
const UNDERWEAR_COLOR = 0xe4e1da;

export type SitFacing = "south" | "east";
/** Hacia dónde mira el que pesca (hacia el agua). */
export type FishFacing = "south" | "east" | "west" | "north";

/** Pescando: el brazo cercano sostiene la caña adelante. */
const FISH_ARM_ANGLE = -1.0;
const ROD_COLOR = 0x6b4a2f;
const LINE_COLOR = 0xe8eef2;

export interface AvatarConfig {
  /** Semilla de los rasgos (piel, pelo): el sessionId, igual en todos los clientes. */
  seed: string;
  name: string;
  outfit: OutfitIds;
  tileX: number;
  tileY: number;
  isLocal: boolean;
  /** Admin del servidor: el nombre se muestra con estrella y en naranja. */
  isAdmin?: boolean;
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
  private readonly overlay: Phaser.GameObjects.Container;
  private bubble: Phaser.GameObjects.Container | null = null;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;

  private targetX: number;
  private targetY: number;
  /** Píxeles por ms, recalculado en cada paso para llegar justo en STEP_MS. */
  private speed = 0;
  private walkTime = 0;
  private idleTime = 0;
  private blinkIn = Phaser.Math.Between(1500, 4000);
  private outfitKey = "";
  private sitting = false;
  private sitScaleX = 1;
  private fishing = false;
  private fishFacing: FishFacing = "south";
  private fishTime = 0;

  constructor(scene: Phaser.Scene, config: AvatarConfig) {
    const start = tileToWorld(config.tileX, config.tileY);
    super(scene, start.x, start.y);
    this.targetX = start.x;
    this.targetY = start.y;
    this.look = lookFor(config.seed);

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
    const face = scene.add.graphics();
    this.drawHeadFront(face, this.look);
    const frontHair = scene.add.graphics();
    this.drawFrontHair(frontHair, this.look);
    this.hatFront = scene.add.graphics();
    this.headFront = scene.add.container(0, 0, [face, this.eyes, frontHair, this.hatFront]);

    this.rod = scene.add.graphics().setVisible(false);
    this.rod.lineStyle(2.5, ROD_COLOR, 1);
    this.rod.lineBetween(26, -42, 60, -88);
    this.rod.lineStyle(1.5, 0x2b2b30, 1);
    this.rod.lineBetween(52, -77, 60, -88);
    this.rod.fillStyle(0x2b2b30, 1);
    this.rod.fillCircle(30, -47, 2.5);
    this.fishingLine = scene.add.graphics().setVisible(false);

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
    ]);
    this.setOutfit(config.outfit);

    const label = scene.add
      .text(0, NAME_Y, config.isAdmin ? `★ ${config.name}` : config.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: config.isAdmin ? "#ff9f1c" : config.isLocal ? "#ffd166" : "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);

    this.add([shadow, this.body_]);
    this.overlay = scene.add.container(this.x, this.y, [label]);
    this.syncDepth();
    scene.add.existing(this);
  }

  /** Llamado cuando el Schema cambia x/y. */
  setTargetTile(tileX: number, tileY: number) {
    const target = tileToWorld(tileX, tileY);
    if (target.x === this.targetX && target.y === this.targetY) return;
    this.targetX = target.x;
    this.targetY = target.y;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    if (distance > SNAP_DISTANCE) {
      this.setPosition(target.x, target.y);
      this.speed = 0;
    } else {
      this.speed = distance / STEP_MS;
      this.face(target.x - this.x, target.y - this.y);
    }
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

  /** Pescando desde la escollera (`facing` = hacia el agua) o no. */
  setFishing(fishing: boolean, facing: FishFacing = "south") {
    this.fishing = fishing;
    this.fishFacing = facing;
    this.rod.setVisible(fishing);
    this.fishingLine.setVisible(fishing);
    if (!fishing) this.fishingLine.clear();
  }

  /** Interpolación a velocidad constante hacia el último tile recibido del servidor. */
  tick(delta: number) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 0.5 || this.speed === 0) {
      this.setPosition(this.targetX, this.targetY);
      this.walkTime = 0;
      this.idleTime += delta;
      if (this.sitting) {
        this.setBackView(false);
        this.body_.scaleX = this.sitScaleX;
        this.poseLimbs(delta, SIT_DROP, SIT_LEG_SCALE, SIT_ARM_ANGLE);
      } else if (this.fishing) {
        this.poseFishing(delta);
      } else {
        if (this.idleTime >= ARRIVE_GRACE_MS) this.setBackView(false);
        this.poseLimbs(delta, 0, 1, 0);
      }
    } else {
      const step = Math.min(distance, this.speed * delta);
      this.x += (dx / distance) * step;
      this.y += (dy / distance) * step;
      this.walkTime += delta;
      this.idleTime = 0;
      this.animateWalk();
    }

    this.updateBlink(delta);
    this.syncDepth();
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
    const g = this.fishingLine.clear();
    g.lineStyle(1, LINE_COLOR, 0.9);
    g.beginPath();
    g.moveTo(60, -88);
    g.lineTo(68 + sway * 0.5, -40);
    g.lineTo(72 + sway, 10 + bob);
    g.strokePath();
    g.fillStyle(0xe63946, 1);
    g.fillCircle(72 + sway, 10 + bob, 2.5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(72 + sway, 8 + bob, 1.4);
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

    if (!top) {
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

    g.lineStyle(1.5, MOUTH_COLOR, 1);
    g.beginPath();
    g.arc(3, HEAD_Y + 5, 3, Math.PI * 0.2, Math.PI * 0.8, false);
    g.strokePath();

    g.lineStyle(1.8, shade(look.hair, -10), 1);
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

    const bubble = scene.add.container(0, BUBBLE_OFFSET_Y, [background, label]);
    bubble.setAlpha(0);
    this.overlay.add(bubble);
    this.bubble = bubble;

    scene.tweens.add({ targets: bubble, alpha: 1, y: BUBBLE_OFFSET_Y - 4, duration: 150 });

    this.bubbleTimer = scene.time.delayedCall(CHAT_BUBBLE_MS, () => {
      scene.tweens.add({
        targets: bubble,
        alpha: 0,
        y: BUBBLE_OFFSET_Y - 16,
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
