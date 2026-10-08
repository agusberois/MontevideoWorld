import * as Phaser from "phaser";
import { AnyGestureId, CHAT_BUBBLE_MS, readableOn, FishingSpot, InstrumentKind, OutfitIds, PAIR_GESTURES, STEP_MS, TILE_HEIGHT, TILE_WIDTH, TIRED_STEP_TICKS, TilePoint } from "@montevideo-world/shared";
import { shade } from "../color";
import { tileToWorld } from "../iso";
import type { AvatarLook } from "./avatarLook";
import { ARM_X, HIP_Y, LEG_X, arm, hat, leg, torso, wornOutfit } from "@/lib/avatar/clothing";
import { EYE_Y, Expression, OUTLINE, OUTLINE_ALPHA, SHOULDER_Y, eyes, faceFeatures, frontHair, glasses, headBack, headFront } from "@/lib/avatar/head";
import { SHAPE_RES, ShapeSprite } from "./ShapeSprite";
import { LABEL_RES, labelImage } from "./labels";

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
/** Volando (`/god`): cuánto sube el cuerpo, cuánto se mece, su transparencia y que quede arriba de los edificios. */
const FLY_HEIGHT = 46;
const FLY_BOB = 4;
const FLY_BOB_MS = 1400;
const FLY_ALPHA = 0.7;
const FLY_DEPTH = 390000;

/** Ciclo de caminata: radianes de fase por ms y amplitud del balanceo de piernas/brazos. */
const WALK_PHASE_PER_MS = 1 / 70;
const LEG_SWING = 0.45;
const ARM_SWING = 0.4;
const BLINK_MS = 120;
/** Quieto y parado: respira (el cuerpo se estira apenas desde los pies). */
const BREATH_MS = 1600;
const BREATH_SCALE = 0.012;
/** Cuánto dura una cara (contento al patear un picudo, dolorido cuando pica uno). */
const EXPRESSION_MS = 900;
/**
 * Tiempo quieto en el tile antes de considerar que llegó al destino y girar de frente. Entre un
 * tile y el siguiente del mismo camino hay pausas mínimas (jitter de red) que no deben contar.
 */
const ARRIVE_GRACE_MS = STEP_MS * 0.6;

/** Patada: duración y cuánto sube la pierna (radianes). */
const KICK_MS = 300;
const KICK_ANGLE = 1.25;

/** Dar o recibir algo (la comida del carrito): el brazo cercano va hacia adelante y vuelve. */
const OFFER_MS = 650;
const OFFER_ANGLE = -1.35;

/** Sentado: el cuerpo baja hasta el asiento y los muslos se acortan (apuntan hacia la cámara). */
const SIT_DROP = 14;
const SIT_LEG_SCALE = 0.6;
const SIT_ARM_ANGLE = 0.3;
/**
 * En el jacuzzi (las Termas): el cuerpo se hunde hasta la cintura (las piernas no se ven), los brazos
 * apoyados en el borde, con burbujas por delante.
 */
const BATH_DROP = 22;
const BATH_ARM_ANGLE = 0.9;

/** Sentado en el banco: se dibuja apenas por delante del banco, que está en el mismo tile. */
const SIT_DEPTH_BIAS = 2;

/** Caja de clic del cuerpo (px desde los pies): un poco más ancha que el torso, hasta el pelo. */
const HIT_HALF_WIDTH = 17;
const HIT_TOP = -86;
const HIT_BOTTOM = 6;

export type SitFacing = "south" | "east";
/** Hacia dónde mira el que pesca (hacia el agua). */
export type FishFacing = FishingSpot["facing"];

/** Pescando: el brazo cercano sostiene la caña adelante. */
const FISH_ARM_ANGLE = -1.0;
const ROD_COLOR = 0x6b4a2f;
const LINE_COLOR = 0xe8eef2;
/** Punta de la caña en coordenadas del cuerpo (de ahí sale la tanza). */
const ROD_TIP = { x: 60, y: -88 };

/**
 * Sacar uno o dos peces (`fish:result.hooked`, sólo el que pesca): dura `REEL_MS`. Al principio la boya se hunde, el agua salpica y la
 * caña se dobla; después el pez salta del agua hasta la punta de la caña y queda colgando.
 */
const REEL_MS = 1300;
const REEL_LEAP_FROM = 0.22;
const REEL_LEAP_TO = 0.72;
/** Peces que se animan a la vez (la caña saca como mucho dos) y cuánto sale después cada uno. */
const MAX_HOOKED = 2;
const REEL_FISH_DELAY = 0.12;
/** Colgando de la tanza, cada pez se corre un poco al costado para que se vean los dos. */
const HANG_SPREAD_PX = 7;
/** Cuánto baja la punta de la caña doblada (px) y cuánto sube el brazo al tirar (rad). */
const ROD_BEND_PX = 16;
const REEL_ARM_ANGLE = -1.55;
const SPLASH_COLOR = 0xdff3ff;
/** Gotas de la salpicadura: ángulo de salida (rad, 0 = derecha) y velocidad relativa. */
const DROPS: ReadonlyArray<readonly [number, number]> = [
  [-2.6, 1],
  [-2.1, 0.8],
  [-1.6, 1.2],
  [-1.1, 0.9],
  [-0.6, 1],
];

/** Vendiendo: cada cuánto ofrece la mercadería levantando el brazo, y cuánto dura el gesto. */
const VEND_WAVE_EVERY_MS = 2400;
const VEND_WAVE_MS = 600;
const VEND_WAVE_ANGLE = -1.3;
const CART_METAL = 0x9aa1a9;
const CART_DARK = 0x2b2b30;

/**
 * Tocando en la calle (el Centro): un ciclo de la pose cada `BUSK_BEAT_MS` (el rasgueo, el fuelle del
 * bandoneón) y notas que suben flotando, una cada `BUSK_NOTE_EVERY_MS` y durante `BUSK_NOTE_MS`.
 */
const BUSK_BEAT_MS = 420;
/** Cuidando coches: una ida y vuelta de la franela. */
const PARK_WAVE_MS = 900;
const BUSK_NOTE_EVERY_MS = 650;
const BUSK_NOTE_MS = 1800;
/** La armónica, frente a la boca (px del cuerpo). */
const HARMONICA_AT = { x: 1, y: -60 };
/** Guitarra: el agujero (donde rasguea la mano cercana) y la punta del mango (donde va la otra). */
const GUITAR_HOLE = { x: 5, y: -36 };
const GUITAR_HEAD = { x: -22, y: -56 };
/** El estuche abierto en el piso, al costado del músico (px desde sus pies): ahí cae la propina. */
export const CASE_OFFSET = { x: -20, y: -1 };
/** Bandoneón: a la altura del pecho; cuánto se abre el fuelle (px a cada lado). */
const BANDONEON_Y = -40;
const BANDONEON_OPEN: [number, number] = [9, 16];

/** Gestos (`Player.gesture`): entrada suave a la pose y largo del brazo hasta el centro de la mano. */
const GESTURE_BLEND_MS = 200;
const ARM_LENGTH = 21;
/** Mate: cada cuánto lleva el mate a la boca, cuánto tarda en subirlo / bajarlo y cuánto chupa. */
const MATE_SIP_EVERY_MS = 2600;
const MATE_RAISE_MS = 600;
const MATE_SIP_MS = 900;
/** Brazo cercano con el mate a la altura del pecho y junto a la boca (rotación, escala del brazo). */
const MATE_REST = { rotation: -0.63, scale: 0.65 };
const MATE_MOUTH = { rotation: -2.36, scale: 0.3 };
const TERMO_COLOR = 0x2f5d46;
const GOURD_COLOR = 0x7a4a24;
const YERBA_COLOR = 0x6b8e23;
const BOMBILLA_COLOR = 0xc9ced4;
/** Candombe: un golpe de tambor cada `CANDOMBE_BEAT_MS`, con los brazos y la cadera al ritmo. */
const CANDOMBE_BEAT_MS = 360;
/** Gol: un salto cada `GOAL_JUMP_MS`, con los dos brazos arriba. */
const GOAL_JUMP_MS = 520;
const GOAL_JUMP_PX = 9;
const WAVE_MS = 220;
/** Aplauso: un ciclo (abrir y juntar las manos) cada `CLAP_MS`. */
const CLAP_MS = 380;
/** Manos abiertas y juntas frente al pecho (px desde cada hombro hasta la mano). */
const CLAP_OPEN = { near: { x: 10, y: 13 }, far: { x: 11, y: 16 } };
const CLAP_CLOSED = { near: { x: -1, y: 11 }, far: { x: 23, y: 11 } };
/** Pedir silencio: el índice frente a la boca. */
const SHUSH_ARM = { rotation: 2.8, scale: 0.3 };
/** Candombe: el tamboril colgado a un costado (centro y giro) y la mano con el palo arriba / pegando. */
const DRUM_AT = { x: 17, y: -27, rotation: -0.35 };
const DRUM_UP = { x: 10, y: -1 };
const DRUM_HIT = { x: 4, y: 11 };
const DRUM_WOOD = 0x8a5a2b;
const DRUM_HEAD = 0xf1e3c6;
/** Gol: la bandera uruguaya en la mano. */
const FLAG_BLUE = 0x4f86c6;
const FLAG_SUN = 0xf2c94c;
const SPARK_COLOR = 0xfff3b0;
const HEART_COLOR = 0xff6b8a;
const STEAM_COLOR = 0xffffff;
/** Gestos de a dos: chocar los cinco (cuándo se tocan las manos), pasar el mate (cuándo pasa de mano). */
const HIGH_FIVE_HIT = 0.42;
const SHARE_MATE_PASS_MS = 1300;
/** Abrazo: cuánto se acercan (px entre los dos cuerpos al abrazarse). */
const HUG_GAP_PX = 14;

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

/**
 * Avatar dibujado con primitivas (sin assets): cuerpo completo con piernas y brazos articulados,
 * cabeza con pelo y cara, y la ropa que tiene puesta. Vista 3/4 de frente o de espaldas según hacia
 * dónde camina, espejada horizontalmente para izquierda/derecha. El Container se posiciona en los
 * pies del personaje; la profundidad se ordena por Y para que los de adelante tapen a los de atrás.
 */
export class Avatar extends Phaser.GameObjects.Container {
  private readonly look: AvatarLook;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly body_: Phaser.GameObjects.Container;
  private readonly legs: [Phaser.GameObjects.Container, Phaser.GameObjects.Container];
  private readonly arms: [Phaser.GameObjects.Container, Phaser.GameObjects.Container];
  /** Partes que dependen de la ropa: se limpian y redibujan en `setOutfit`. */
  private readonly legGraphics: [ShapeSprite, ShapeSprite];
  private readonly armGraphics: [ShapeSprite, ShapeSprite];
  private readonly torso: ShapeSprite;
  private readonly hatFront: ShapeSprite;
  private readonly hatBack: ShapeSprite;
  private readonly headFront: Phaser.GameObjects.Container;
  private readonly headBack: Phaser.GameObjects.Container;
  private readonly eyes: ShapeSprite;
  /** Barba, boca, bigote y cejas: se redibujan al cambiar la expresión (como los ojos). */
  private readonly features: ShapeSprite;
  private expression: Expression = "neutral";
  /** Lo que le queda a la expresión del momento (ms); al llegar a 0 vuelve a la normal. */
  private expressionLeft = 0;
  /** Caña (fija) y tanza con boya (se redibuja para que se mezca). */
  private readonly rod: Phaser.GameObjects.Graphics;
  private readonly fishingLine: Phaser.GameObjects.Graphics;
  /** Carrito de vendedor (al costado del avatar, sólo mientras vende). */
  private readonly cart: Phaser.GameObjects.Graphics;
  /** Instrumento en las manos mientras toca en la calle (el tambor usa `drum`, el del candombe). */
  private readonly instrument: Phaser.GameObjects.Graphics;
  private readonly overlay: Phaser.GameObjects.Container;
  private readonly donorTag: Phaser.GameObjects.Image;
  /** "🔒 PRESO" arriba del nombre mientras está preso en el COMCAR (`Player.jailLeft`). */
  private readonly prisonerTag: Phaser.GameObjects.Image;
  /** El nombre y, pegada a su izquierda, la sigla de su barra en su color (`Player.barraTag`). */
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly barraTag: Phaser.GameObjects.Text;
  private bubble: Phaser.GameObjects.Container | null = null;
  /** 💬 sobre la cabeza mientras escribe en el chat (`Player.typing`); se mece. Con el globo a la vista, no. */
  private readonly typingIcon: Phaser.GameObjects.Image;
  private typing = false;
  private typingTime = 0;
  private bubbleTimer: Phaser.Time.TimerEvent | null = null;

  /** Tile donde está parado (o el último al que llegó). */
  private tileX: number;
  private tileY: number;
  /** Tiles por recorrer, en orden. */
  private queue: TilePoint[] = [];
  /** Paso en curso: de dónde sale (px), a qué tile va y cuánto lleva / dura (ms). */
  private segment: { fromX: number; fromY: number; to: TilePoint; elapsed: number; duration: number } | null = null;
  private walkTime = 0;
  /** Volando con `/god` (el propio; a los demás que vuelan ni se los dibuja). */
  private flying = false;
  private flyTime = 0;
  /** Lo que tarda un tile: `STEP_MS`, o `TIRED_STEP_TICKS` veces más cansado (como lo mueve el server). */
  private stepMs = STEP_MS;
  private idleTime = 0;
  private blinkIn = Phaser.Math.Between(1500, 4000);
  private outfitKey = "";
  /** La ropa puesta según el Schema (para redibujarla sin remera al meterse al jacuzzi). */
  private outfitIds: OutfitIds | null = null;
  private sitting = false;
  private sitScaleX = 1;
  private bathing = false;
  private bathTime = 0;
  /** Las burbujas del jacuzzi por delante del cuerpo (sólo metido). */
  private readonly water: Phaser.GameObjects.Graphics;
  private fishing = false;
  private fishFacing: FishFacing = "south";
  /** A cuántos tiles del avatar cae la boya, en la dirección de `fishFacing` (ver `CityMap.fishingSpot`). */
  private fishDistance = 2;
  /** Tiempo que le queda al brazo estirado de `offer` (ms). */
  private offerLeft = 0;
  /** Tiempo que le queda a la patada en curso (ms); 0 = no está pateando. */
  private kickLeft = 0;
  private rodColor = ROD_COLOR;
  private fishTime = 0;
  /** Sacando un pez: lo que le queda a la animación (ms; 0 = no) y el dibujo del pez. */
  private reelLeft = 0;
  private hooked = 0;
  /** Uno por pez que picó (con doble, dos), en el orden en que salen del agua. */
  private readonly caughtFish: Phaser.GameObjects.Graphics[];
  private vending = false;
  private cartKey = "";
  private vendTime = 0;
  /** El carrito sigue un rato después de vender, mientras se entrega la comida (`keepCart`, ms). */
  private cartHoldLeft = 0;
  /** Tocando en la calle: qué instrumento (null = no toca), su color y cuánto lleva (ms). */
  private busking: InstrumentKind | null = null;
  private buskColor = 0xb5651d;
  private buskTime = 0;
  /** Cuidando coches: hace señas con la franela (y cuánto lleva, ms). */
  private parking = false;
  private parkTime = 0;
  /** Gesto en curso (`Player.gesture`) y cuánto lleva (ms). */
  private gesture: AnyGestureId | null = null;
  private gestureTime = 0;
  /** Gesto de a dos: el otro avatar y si invitó éste (en el mate, el que convida). */
  private partner: Avatar | null = null;
  private lead = false;
  /**
   * Lo que tiene en la mano cercana durante el gesto (el mate, el índice, la bandera, el palo del
   * tambor), el termo bajo el brazo, el tamboril y los efectos de cada frame (vapor, chispas, corazones).
   */
  private readonly prop: Phaser.GameObjects.Graphics;
  private readonly termo: Phaser.GameObjects.Graphics;
  private readonly drum: Phaser.GameObjects.Graphics;
  private readonly fx: Phaser.GameObjects.Graphics;
  /** Qué está dibujado en `prop` ahora (se redibuja sólo al cambiar). */
  private propKind: "" | "mate" | "finger" | "flag" | "stick" = "";

  constructor(scene: Phaser.Scene, config: AvatarConfig) {
    const start = tileToWorld(config.tileX, config.tileY);
    super(scene, start.x, start.y);
    this.tileX = config.tileX;
    this.tileY = config.tileY;
    this.look = config.look;

    const shadow = scene.add.ellipse(0, 0, 34, 14, 0x000000, 0.3);

    // Las partes hechas con formas (`lib/avatar`) se hornean a texturas (`ShapeSprite`): no son `Graphics`.
    this.legGraphics = [new ShapeSprite(scene), new ShapeSprite(scene)];
    this.armGraphics = [new ShapeSprite(scene), new ShapeSprite(scene)];
    this.legs = [
      scene.add.container(-LEG_X, HIP_Y, [this.legGraphics[0]]),
      scene.add.container(LEG_X, HIP_Y, [this.legGraphics[1]]),
    ];
    this.arms = [
      scene.add.container(-ARM_X, SHOULDER_Y, [this.armGraphics[0]]),
      scene.add.container(ARM_X, SHOULDER_Y, [this.armGraphics[1]]),
    ];
    this.torso = new ShapeSprite(scene);

    // Cabeza: las formas salen de `lib/avatar/head.ts` (las mismas que dibuja la vista previa en SVG).
    const back = new ShapeSprite(scene).paint(headBack(this.look));
    this.hatBack = new ShapeSprite(scene);
    this.headBack = scene.add.container(0, 0, [back, this.hatBack]).setVisible(false);

    const face = new ShapeSprite(scene).paint(headFront(this.look));
    this.features = new ShapeSprite(scene);
    this.eyes = new ShapeSprite(scene, 0, EYE_Y);
    this.drawFace();
    const lenses = new ShapeSprite(scene).paint(glasses(this.look));
    const hairFront = new ShapeSprite(scene).paint(frontHair(this.look));
    this.hatFront = new ShapeSprite(scene);
    this.headFront = scene.add.container(0, 0, [face, this.features, this.eyes, lenses, hairFront, this.hatFront]);

    this.rod = scene.add.graphics().setVisible(false);
    this.drawRod(ROD_COLOR);
    this.fishingLine = scene.add.graphics().setVisible(false);
    // Un poco más grandes que de verdad: si no, con el zoom normal casi no se ven.
    this.caughtFish = Array.from({ length: MAX_HOOKED }, () => scene.add.graphics().setVisible(false).setScale(1.5));
    this.cart = scene.add.graphics().setVisible(false);
    this.instrument = scene.add.graphics().setVisible(false);
    this.termo = scene.add.graphics().setVisible(false);
    this.drawTermo();
    this.prop = scene.add.graphics().setVisible(false);
    this.drum = scene.add.graphics().setVisible(false).setPosition(DRUM_AT.x, DRUM_AT.y).setRotation(DRUM_AT.rotation);
    this.drawDrum();
    this.fx = scene.add.graphics();

    this.body_ = scene.add.container(0, 0, [
      ...this.legs,
      // Vista 3/4: el brazo del lado lejano (-x) pasa por detrás del torso al balancearse.
      this.arms[0],
      this.torso,
      this.headBack,
      this.headFront,
      this.fishingLine,
      ...this.caughtFish,
      this.rod,
      this.termo,
      this.drum,
      this.instrument,
      this.arms[1],
      this.prop,
      this.cart,
      this.fx,
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

    // Distintivos iguales para todos: una textura compartida (`labelImage`), no un `Text` por avatar.
    this.donorTag = labelImage(scene, "tag-donor", "♥ DONADOR", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "9px",
      fontStyle: "bold",
      color: "#3a2600",
      backgroundColor: "#ffd166",
      padding: { x: 5, y: 2 },
    })
      .setPosition(0, DONOR_TAG_Y)
      .setOrigin(0.5, 1)
      .setVisible(Boolean(config.isDonor));

    this.prisonerTag = labelImage(scene, "tag-prisoner", "🔒 PRESO", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "9px",
      fontStyle: "bold",
      color: "#ffffff",
      backgroundColor: "#e63946",
      padding: { x: 5, y: 2 },
    })
      .setPosition(0, DONOR_TAG_Y)
      .setOrigin(0.5, 1)
      .setVisible(false);

    this.barraTag = scene.add
      .text(0, NAME_Y - 1, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "9px",
        fontStyle: "bold",
        color: "#ffffff",
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0, 1)
      .setVisible(false);
    this.nameLabel = label;

    this.water = scene.add.graphics().setVisible(false);
    this.shadow = shadow;
    this.add([shadow, this.body_, this.water]);
    // Igual para todos: una textura compartida (`labelImage`).
    this.typingIcon = labelImage(scene, "tag-typing", "💬", { fontFamily: "system-ui, sans-serif", fontSize: "26px" })
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.overlay = scene.add.container(this.x, this.y, [this.donorTag, this.prisonerTag, this.barraTag, label, this.typingIcon]);
    this.syncDepth();
    scene.add.existing(this);
  }

  /** Cansado (`Player.tired`): camina más lento, con el mismo ritmo que el server. */
  setTired(tired: boolean, speed = 1) {
    // Con calzado rápido (`walkSpeed`) cada tile dura menos, igual que en el server.
    this.stepMs = tired ? STEP_MS * TIRED_STEP_TICKS : STEP_MS / speed;
  }

  /**
   * `/god`: el propio se ve volando (más arriba, translúcido, meciéndose, por encima de los
   * edificios); a otro que vuela directamente no se lo dibuja (`hidden`), ni su nombre ni su globo.
   */
  setFlying(flying: boolean, hidden: boolean) {
    this.flying = flying && !hidden;
    this.setVisible(!(flying && hidden));
    this.overlay.setVisible(!(flying && hidden));
    if (!this.flying) {
      this.shadow.setScale(1);
      this.setFade(1);
    }
  }

  /** Donador o no (lo marca el admin; puede cambiar estando conectado). */
  setDonor(donor: boolean) {
    this.donorTag.setVisible(donor);
    this.layoutTags();
  }

  /**
   * Su barra: la sigla (`""` = ninguna) en una pastillita del color de la barra, a la izquierda del
   * nombre; los dos quedan centrados juntos sobre la cabeza.
   */
  setBarra(tag: string, color: string) {
    if (!tag) {
      this.barraTag.setVisible(false);
      this.nameLabel.setX(0);
      return;
    }
    this.barraTag.setText(tag).setBackgroundColor(color).setColor(readableOn(color)).setVisible(true);
    const gap = 4;
    const total = this.barraTag.width + gap + this.nameLabel.width;
    this.barraTag.setX(-total / 2);
    this.nameLabel.setX(-total / 2 + this.barraTag.width + gap + this.nameLabel.width / 2);
  }

  /** Preso en el COMCAR o no (cambia estando conectado: lo banean, cumple). */
  /** Escribiendo en el chat (o dejó): 💬 sobre la cabeza. */
  setTyping(typing: boolean) {
    if (typing === this.typing) return;
    this.typing = typing;
    this.typingTime = 0;
    if (!typing) this.typingIcon.setVisible(false);
  }

  /** El 💬 se mece arriba del nombre (y de los distintivos); si está el globo del chat, se esconde. */
  private updateTyping(delta: number) {
    if (!this.typing) return;
    const show = this.bubble === null;
    if (this.typingIcon.visible !== show) this.typingIcon.setVisible(show);
    if (!show) return;
    this.typingTime += delta;
    const t = this.typingTime;
    this.typingIcon.setY(this.bubbleY() - 2 + Math.sin(t / 220) * 2.5);
    this.typingIcon.setScale((1 + Math.sin(t / 330) * 0.06) / LABEL_RES);
  }

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
    // Volando el server avanza varios tiles por tick en línea recta: se planea hasta ahí, sin saltar.
    if (this.flying && this.queue.length < MAX_QUEUE) {
      this.queue.push({ x: tileX, y: tileY });
      return;
    }
    // Con calzado rápido el server puede avanzar dos tiles en un tick: se camina por el del medio.
    const gap = Math.max(Math.abs(end.x - tileX), Math.abs(end.y - tileY));
    if (gap === 2 && this.queue.length < MAX_QUEUE - 1) {
      this.queue.push({ x: Math.round((end.x + tileX) / 2), y: Math.round((end.y + tileY) / 2) });
    }
    if (Math.max(Math.abs(this.endTile().x - tileX), Math.abs(this.endTile().y - tileY)) > 1 || this.queue.length >= MAX_QUEUE) {
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
    this.segment = { fromX: this.x, fromY: this.y, to, elapsed: carry, duration: this.stepMs / factor };
    const target = tileToWorld(to.x, to.y);
    this.face(target.x - this.x, target.y - this.y);
  }

  /** Llamado cuando el Schema cambia la ropa puesta. Sólo redibuja si algo cambió. */
  setOutfit(ids: OutfitIds) {
    this.outfitIds = ids;
    // En el jacuzzi, sin remera (la ropa puesta no cambia: al salir vuelve a aparecer).
    const shown = this.bathing ? { ...ids, top: "" } : ids;
    const key = `${shown.hat}|${shown.top}|${shown.bottom}|${shown.shoes}`;
    if (key === this.outfitKey) return;
    this.outfitKey = key;

    // Cuerpo y ropa: las formas salen de `lib/avatar/clothing.ts` (las mismas que la vista previa en SVG).
    const outfit = wornOutfit(shown);
    const { skin, gender } = this.look;
    this.legGraphics.forEach((g) => g.paint(leg(skin, outfit)));
    this.armGraphics.forEach((g) => g.paint(arm(skin, outfit)));
    this.torso.paint(torso(skin, gender, outfit));
    this.hatFront.paint(hat(outfit.hat, false));
    this.hatBack.paint(hat(outfit.hat, true));
  }

  /** Metido en el jacuzzi (las Termas) o no: se hunde hasta la cintura, sin remera, con burbujas por delante. */
  setBathing(bathing: boolean) {
    if (bathing === this.bathing) return;
    this.bathing = bathing;
    this.bathTime = 0;
    for (const leg of this.legs) leg.setVisible(!bathing);
    this.shadow.setVisible(!bathing);
    this.water.setVisible(bathing);
    if (!bathing) this.water.clear();
    if (this.outfitIds) this.setOutfit(this.outfitIds);
  }

  /** Burbujas por delante del cuerpo hundido, que suben y revientan. */
  private drawWater(delta: number) {
    this.bathTime += delta;
    const t = this.bathTime;
    const g = this.water.clear();
    const surface = -6 + Math.sin(t / 500) * 1;
    for (let i = 0; i < 5; i++) {
      const life = (t / 900 + i * 0.21) % 1;
      const x = Math.sin(i * 2.7) * 16;
      g.fillStyle(0xffffff, 0.7 * (1 - life));
      g.fillCircle(x + Math.sin(life * 8 + i) * 1.5, surface + 6 - life * 9, 1.2 + life * 1.3);
    }
  }

  /** Sentado en un banco (`facing` = hacia dónde mira) o parado. */
  setSitting(sitting: boolean, facing?: SitFacing) {
    this.sitting = sitting;
    // El sur de la grilla queda abajo a la izquierda en pantalla: el cuerpo se espeja.
    if (sitting && facing) this.sitScaleX = facing === "east" ? 1 : -1;
  }

  /** Pescando desde la escollera (`facing` = hacia el agua) o no, con una caña de `rodColor`. */
  setFishing(fishing: boolean, spot: FishingSpot = { facing: "south", distance: 2 }, rodColor = ROD_COLOR) {
    // Volvió a tirar antes de que termine la animación del pez anterior.
    if (fishing && this.reelLeft > 0) this.endReel();
    if (fishing && rodColor !== this.rodColor) this.drawRod(rodColor);
    this.fishing = fishing;
    this.fishFacing = spot.facing;
    this.fishDistance = spot.distance;
    // Sacando un pez, la caña sigue en la mano hasta que termina la animación (`endReel`).
    if (this.reelLeft > 0 && !fishing) return;
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
    if (vending) this.cartHoldLeft = 0;
    // Terminó la venta pero se está entregando la comida: el carrito se va al terminar (`keepCart`).
    this.cart.setVisible(vending || this.cartHoldLeft > 0);
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
      } else if (this.bathing) {
        this.setBackView(false);
        this.poseLimbs(delta, BATH_DROP, 1, BATH_ARM_ANGLE);
        this.drawWater(delta);
      } else if (this.fishing) {
        this.poseFishing(delta);
      } else if (this.reelLeft > 0) {
        this.poseReel(delta);
      } else if (this.busking) {
        this.poseBusking(this.busking, delta);
      } else if (this.vending) {
        this.poseVending(delta);
      } else if (this.parking) {
        this.poseParking(delta);
      } else {
        if (this.idleTime >= ARRIVE_GRACE_MS) this.setBackView(false);
        this.poseLimbs(delta, 0, 1, 0);
      }
      // El gesto pisa los brazos (y, parado, el resto del cuerpo) de la pose de base.
      if (this.gesture) this.poseGesture(this.gesture, delta);
      // Respira sólo parado sin hacer nada (sentado, pescando, vendiendo o con un gesto ya se mueve otra cosa).
      const idle = !this.sitting && !this.bathing && !this.fishing && !this.vending && !this.busking && !this.parking && !this.gesture && this.reelLeft <= 0;
      this.body_.scaleY = idle ? 1 + Math.sin((this.idleTime / BREATH_MS) * Math.PI * 2) * BREATH_SCALE : 1;
    } else {
      // Se fue caminando mientras sacaba el pez: se corta la animación.
      if (this.reelLeft > 0) this.endReel();
      this.body_.scaleY = 1;
      this.walkTime += delta;
      this.idleTime = 0;
      this.animateWalk();
    }

    // Caminando no hay gesto (el server lo corta): sin accesorios ni efectos. (Con gesto, cada frame
    // `poseGesture` dice qué se ve.)
    // Tocando quieto, el tambor, el palo y las notas los maneja `poseBusking` (y la franela, `poseParking`).
    if ((!this.gesture || this.segment) && !((this.busking || this.parking) && !this.segment)) this.hideGestureProps();
    this.poseKick(delta);
    this.poseOffer(delta);
    this.updateCartHold(delta);
    this.updateBlink(delta);
    this.updateExpression(delta);
    this.updateTyping(delta);
    if (this.flying) this.poseFlying(delta);
    this.syncDepth();
  }

  /** Arriba, meciéndose, con la sombra chiquita en el piso. */
  private poseFlying(delta: number) {
    this.flyTime += delta;
    this.body_.y = -FLY_HEIGHT + Math.sin((this.flyTime / FLY_BOB_MS) * Math.PI * 2) * FLY_BOB;
    this.shadow.setScale(0.55);
    this.setFade(FLY_ALPHA);
  }

  /**
   * Empieza o termina un gesto (`Player.gesture`; null = ninguno). En los de a dos, `partner` es el
   * avatar del otro (los dos se miran y se acercan) y `lead` si invitó éste.
   */
  setGesture(gesture: AnyGestureId | null, partner: Avatar | null = null, lead = false) {
    this.partner = partner;
    this.lead = lead;
    if (gesture === this.gesture) return;
    this.gesture = gesture;
    this.gestureTime = 0;
    if (!gesture) this.hideGestureProps();
  }

  private hideGestureProps() {
    this.prop.setVisible(false);
    this.termo.setVisible(false);
    this.drum.setVisible(false);
    this.fx.clear();
  }

  /** Dibuja en `prop` lo que va en la mano (sólo si cambió). */
  private holdProp(kind: "mate" | "finger" | "flag" | "stick") {
    if (this.propKind !== kind) {
      this.propKind = kind;
      if (kind === "mate") this.drawMate();
      else if (kind === "finger") this.drawFinger();
      else if (kind === "flag") this.drawFlag();
      else this.drawStick();
    }
    this.prop.setVisible(true);
  }

  /** Le picó un picudo: cara de dolor un ratito. */
  flinch() {
    this.showExpression("ouch");
  }

  /** Cambia la cara (boca, cejas y ojos) por `EXPRESSION_MS`; después vuelve a la normal. */
  private showExpression(expression: Expression) {
    this.expressionLeft = EXPRESSION_MS;
    if (expression === this.expression) return;
    this.expression = expression;
    this.drawFace();
  }

  private drawFace() {
    this.features.paint(faceFeatures(this.look, this.expression));
    this.eyes.paint(eyes(this.look, this.expression));
  }

  private updateExpression(delta: number) {
    if (this.expressionLeft <= 0) return;
    this.expressionLeft -= delta;
    if (this.expressionLeft > 0) return;
    this.expression = "neutral";
    this.drawFace();
  }

  /** Patada (a un picudo): la pierna cercana va para adelante y vuelve. `dirX` = hacia dónde (+ derecha). */
  kick(dirX: number) {
    if (this.sitting) return;
    this.showExpression("happy");
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

  /**
   * Estira el brazo para dar o recibir algo (la comida del carrito). Con `dirX` se da vuelta hacia
   * ese lado (+ derecha); sin él (el vendedor, con el carrito a la derecha) queda como está.
   */
  offer(dirX?: number) {
    if (dirX !== undefined && Math.abs(dirX) > 0.01) this.body_.scaleX = dirX >= 0 ? 1 : -1;
    this.setBackView(false);
    this.offerLeft = OFFER_MS;
  }

  /** Deja el carrito a la vista `ms` más aunque ya terminó la venta (la comida sale de ahí). */
  keepCart(ms: number) {
    if (!this.cartKey) return;
    this.cartHoldLeft = ms;
    this.cart.setVisible(true);
  }

  /** Algo en la mano cercana (la comida que compró el hincha): se dibuja y se va con el avatar. */
  hold(object: Phaser.GameObjects.Graphics) {
    object.setPosition(ARM_X + 1, SHOULDER_Y + ARM_LENGTH - 2);
    this.body_.add(object);
  }

  /** Se acaba el rato del carrito de `keepCart` (o se fue caminando): se esconde. */
  private updateCartHold(delta: number) {
    if (this.cartHoldLeft <= 0) return;
    this.cartHoldLeft = this.segment ? 0 : Math.max(0, this.cartHoldLeft - delta);
    if (this.cartHoldLeft === 0 && !this.vending) this.cart.setVisible(false);
  }

  /** Pisa la pose del brazo cercano mientras lo tiene estirado (`offer`). */
  private poseOffer(delta: number) {
    if (this.offerLeft <= 0) return;
    this.offerLeft = Math.max(0, this.offerLeft - delta);
    const progress = 1 - this.offerLeft / OFFER_MS;
    this.arms[1].rotation = Math.sin(progress * Math.PI) * OFFER_ANGLE;
  }

  /** ¿El punto del mundo cae sobre el cuerpo? (caja de pies a cabeza, para clics y hover) */
  containsWorldPoint(worldX: number, worldY: number): boolean {
    const dx = worldX - this.x;
    const dy = worldY - (this.y + this.body_.y);
    return Math.abs(dx) <= HIT_HALF_WIDTH && dy >= HIT_TOP && dy <= HIT_BOTTOM;
  }

  /** Profundidad por Y (los de adelante tapan a los de atrás) y overlay pegado a la cabeza. */
  private syncDepth() {
    this.setDepth(this.flying ? FLY_DEPTH + this.y : this.y + (this.sitting || this.bathing ? SIT_DEPTH_BIAS : 0));
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
    // Cansado, las piernas también van más lento (si no, parece que patina).
    const phase = this.walkTime * WALK_PHASE_PER_MS * (STEP_MS / this.stepMs);
    const swing = Math.sin(phase);
    this.legs[0].rotation = swing * LEG_SWING;
    this.legs[1].rotation = -swing * LEG_SWING;
    this.arms[0].rotation = -swing * ARM_SWING;
    this.arms[1].rotation = swing * ARM_SWING;
    for (const leg of this.legs) leg.scaleY = 1;
    for (const arm of this.arms) arm.scaleY = 1;
    this.body_.rotation = 0;
    this.body_.x = 0;
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
    // Lo que pueden haber cambiado los gestos (brazos acortados, cadera de costado) vuelve a lo normal.
    for (const arm of this.arms) arm.scaleY = Phaser.Math.Linear(arm.scaleY, 1, t);
    this.body_.rotation = Phaser.Math.Linear(this.body_.rotation, 0, t);
    this.body_.x = Phaser.Math.Linear(this.body_.x, 0, t);
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

  /**
   * Picó (sólo lo ve el que pesca, `fish:result.hooked`): con la caña y la tanza todavía en la mano,
   * se hunde la boya, salpica, la caña se dobla y salta cada pez (de su color; con doble, dos, uno
   * detrás del otro) hasta la punta. Llega cuando el server ya terminó la pesca (`fishing` en false),
   * así que la caña se muestra hasta que termina.
   */
  reelIn(fishColors: readonly number[]) {
    if (this.sitting || fishColors.length === 0) return;
    this.reelLeft = REEL_MS;
    this.rod.setVisible(true);
    this.fishingLine.setVisible(true);
    this.hooked = Math.min(MAX_HOOKED, fishColors.length);
    this.caughtFish.forEach((fish, i) => {
      fish.setVisible(false);
      if (i < this.hooked) this.drawCaughtFish(fish, fishColors[i]);
    });
  }

  private endReel() {
    this.reelLeft = 0;
    this.drawRod(this.rodColor);
    for (const fish of this.caughtFish) fish.setVisible(false);
    this.fishingLine.clear();
    if (!this.fishing) {
      this.rod.setVisible(false);
      this.fishingLine.setVisible(false);
    }
  }

  private poseReel(delta: number) {
    this.reelLeft = Math.max(0, this.reelLeft - delta);
    const t = 1 - this.reelLeft / REEL_MS;
    const facing = this.fishFacing;
    this.setBackView(facing === "north" || facing === "west");
    this.body_.scaleX = facing === "east" || facing === "north" ? 1 : -1;
    this.poseLimbs(delta, 0, 1, 0);
    // El brazo tira para arriba y después vuelve un poco con el pez colgando.
    const pull = t < 0.35 ? t / 0.35 : 1 - Math.max(0, t - 0.75) * 1.6;
    this.arms[1].rotation = Phaser.Math.Linear(FISH_ARM_ANGLE, REEL_ARM_ANGLE, Math.max(0, pull));

    // La caña se dobla mientras el pez tira (hasta que sale del agua) y se endereza con él colgando.
    const bend = t < REEL_LEAP_FROM ? t / REEL_LEAP_FROM : Math.max(0.25, 1 - (t - REEL_LEAP_FROM) * 1.5);
    const tip = this.drawBentRod(bend);

    // La boya, donde estaba (ver `poseFishing`).
    const front = facing === "south" || facing === "east";
    const bx = this.fishDistance * (TILE_WIDTH / 2);
    const by = this.fishDistance * (TILE_HEIGHT / 2) * (front ? 1 : -1);
    const g = this.fishingLine.clear();
    this.drawSplash(g, bx, by, t);

    // Cada pez: tironea bajo el agua, salta en arco hasta la punta y queda colgando de la tanza (el
    // segundo sale un poco después y cuelga al lado del primero).
    g.lineStyle(1, LINE_COLOR, 0.95);
    let anyOut = false;
    for (let i = 0; i < this.hooked; i++) {
      const start = REEL_LEAP_FROM + i * REEL_FISH_DELAY;
      const leap = Phaser.Math.Clamp((t - start) / (REEL_LEAP_TO - REEL_LEAP_FROM), 0, 1);
      const spread = this.hooked > 1 ? (i === 0 ? -1 : 1) * HANG_SPREAD_PX : 0;
      const fx = Phaser.Math.Linear(bx + spread, tip.x + spread, leap);
      const fy = Phaser.Math.Linear(by, tip.y + 16, leap) - Math.sin(leap * Math.PI) * 26;
      // Cabeza para arriba (colgado de la boca), arqueándose en el salto y coleteando.
      const wiggle = Math.sin(t * 60 + i * 2) * 0.35;
      this.caughtFish[i]
        .setVisible(leap > 0)
        .setPosition(fx, fy)
        .setRotation(-Math.PI / 2 + Math.sin(leap * Math.PI) * 0.9 + wiggle)
        .setAlpha(t > 0.9 ? (1 - t) * 10 : 1);
      if (leap > 0) {
        anyOut = true;
        // Tanza tirante de la punta a la boca del pez.
        g.lineBetween(tip.x, tip.y, fx, fy - 6);
      }
    }
    // Antes de que salga ninguno, la tanza va hasta la boya hundida.
    if (!anyOut) g.lineBetween(tip.x, tip.y, bx, by);
    if (!anyOut) {
      g.fillStyle(0xe63946, 1);
      g.fillCircle(bx, by + 2 + Math.sin(t * 70) * 1.5, 2.5);
    }

    if (this.reelLeft === 0) this.endReel();
  }

  /** Caña doblada hacia el agua (`bend` 0–1); devuelve dónde queda la punta (de ahí sale la tanza). */
  private drawBentRod(bend: number): { x: number; y: number } {
    const base = { x: 26, y: -42 };
    const tip = { x: ROD_TIP.x + bend * 4, y: ROD_TIP.y + bend * ROD_BEND_PX };
    // Curva: el punto de control queda sobre la recta de la caña recta, así se arquea hacia abajo.
    const control = { x: (base.x + ROD_TIP.x) / 2 + 4, y: (base.y + ROD_TIP.y) / 2 - 6 };
    const g = this.rod.clear();
    g.lineStyle(2.5, this.rodColor, 1);
    const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(base.x, base.y), new Phaser.Math.Vector2(control.x, control.y), new Phaser.Math.Vector2(tip.x, tip.y));
    curve.draw(g, 12);
    g.fillStyle(0x2b2b30, 1);
    g.fillCircle(30, -47, 2.5);
    return tip;
  }

  /** Salpicadura en (x, y): ondas que se abren en el agua y gotas que saltan y caen. */
  private drawSplash(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number) {
    for (const delay of [0, 0.18, REEL_LEAP_FROM]) {
      const ring = (t - delay) / 0.55;
      if (ring <= 0 || ring >= 1) continue;
      g.lineStyle(2, SPLASH_COLOR, (1 - ring) * 0.9);
      g.strokeEllipse(x, y + 2, 8 + ring * 34, 4 + ring * 16);
    }
    // Gotas: al empezar y cuando el pez sale del agua.
    for (const start of [0, REEL_LEAP_FROM]) {
      const life = (t - start) / 0.35;
      if (life <= 0 || life >= 1) continue;
      g.fillStyle(SPLASH_COLOR, 1 - life);
      for (const [angle, speed] of DROPS) {
        const distance = life * 20 * speed;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance + life * life * 24;
        g.fillCircle(x + dx, y + dy, 2.2);
      }
    }
  }

  /** Pez (de costado, mirando hacia +x en su dibujo): cuerpo, cola, aleta y ojo. */
  private drawCaughtFish(fish: Phaser.GameObjects.Graphics, color: number) {
    const g = fish.clear();
    g.fillStyle(shade(color, -25), 1);
    g.fillTriangle(-7, 0, -12, -4.5, -12, 4.5);
    g.fillStyle(color, 1);
    g.fillEllipse(0, 0, 16, 7);
    g.fillStyle(shade(color, 30), 1);
    g.fillEllipse(1, 1.4, 10, 2.6);
    g.fillStyle(shade(color, -25), 1);
    g.fillTriangle(-1, -3, 3, -3, 0, -6);
    g.fillStyle(0x111111, 1);
    g.fillCircle(5, -0.8, 1);
    g.lineStyle(1, OUTLINE, OUTLINE_ALPHA);
    g.strokeEllipse(0, 0, 16, 7);
  }

  /**
   * Tocando en la calle (o no) con un instrumento de `kind` y `color`: armónica, guitarra criolla,
   * bandoneón o tambor de candombe (el tamboril del gesto).
   */
  setBusking(kind: InstrumentKind | null, color = 0xb5651d) {
    if (kind === this.busking && color === this.buskColor) return;
    if (kind && !this.busking) this.buskTime = 0;
    this.busking = kind;
    this.buskColor = color;
    this.instrument.clear().setVisible(kind !== null && kind !== "drum");
    if (kind === "harmonica") this.drawHarmonica(color);
    else if (kind === "guitar") this.drawGuitar(color);
    if (!kind) {
      this.hideGestureProps();
      this.instrument.setPosition(0, 0);
    }
  }

  /**
   * De frente tocando: los brazos según el instrumento (al ritmo de `BUSK_BEAT_MS`), el cuerpo que se
   * mece y las notas que suben. El bandoneón se redibuja cada frame (el fuelle se abre y se cierra).
   */
  private poseBusking(kind: InstrumentKind, delta: number) {
    this.setBackView(false);
    this.body_.scaleX = 1;
    this.poseLimbs(delta, 0, 1, 0);
    this.buskTime += delta;
    const time = this.buskTime;
    const beat = (time % BUSK_BEAT_MS) / BUSK_BEAT_MS;
    const swing = Math.sin(beat * Math.PI * 2);
    const [far, near] = this.arms;
    const aimAt = (arm: Phaser.GameObjects.Container, shoulderX: number, hand: { x: number; y: number }) => {
      const target = reach({ x: hand.x - shoulderX, y: hand.y - SHOULDER_Y });
      arm.rotation = target.rotation;
      arm.scaleY = target.scale;
    };
    this.body_.rotation = Math.sin((time / BUSK_BEAT_MS) * Math.PI * 0.5) * 0.04;
    this.drum.setVisible(false);
    this.prop.setVisible(false);
    const g = this.fx.clear();

    switch (kind) {
      case "harmonica": {
        // Las dos manos en la boca; la armónica va y viene un poco.
        const slide = swing * 2;
        this.instrument.setPosition(slide, 0);
        aimAt(near, ARM_X, { x: HARMONICA_AT.x + 5 + slide, y: HARMONICA_AT.y + 2 });
        aimAt(far, -ARM_X, { x: HARMONICA_AT.x - 5 + slide, y: HARMONICA_AT.y + 2 });
        break;
      }
      case "guitar":
        // La mano cercana rasguea en el agujero; la otra arma los acordes en el mango.
        aimAt(near, ARM_X, { x: GUITAR_HOLE.x + 3, y: GUITAR_HOLE.y + swing * 4 });
        aimAt(far, -ARM_X, { x: GUITAR_HEAD.x + 6, y: GUITAR_HEAD.y + 4 + Math.sin(time / 700) * 1.5 });
        break;
      case "bandoneon": {
        // El fuelle se abre y se cierra entre las dos manos.
        const open = Phaser.Math.Linear(BANDONEON_OPEN[0], BANDONEON_OPEN[1], (swing + 1) / 2);
        this.drawBandoneon(this.buskColor, open);
        aimAt(near, ARM_X, { x: open, y: BANDONEON_Y + 2 });
        aimAt(far, -ARM_X, { x: -open, y: BANDONEON_Y + 2 });
        break;
      }
      case "drum": {
        // Como el gesto de candombe: el tamboril colgado y la mano con el palo pegando en el parche.
        const down = beat < 0.35 ? smooth(beat / 0.35) : 1 - smooth((beat - 0.35) / 0.65);
        const hand = { x: Phaser.Math.Linear(DRUM_UP.x, DRUM_HIT.x, down), y: Phaser.Math.Linear(DRUM_UP.y, DRUM_HIT.y, down) };
        const target = reach(hand);
        near.rotation = target.rotation;
        near.scaleY = target.scale;
        far.rotation = -0.45 + Math.sin(time / 180) * 0.15;
        far.scaleY = 0.9;
        this.drum.setVisible(true);
        this.holdProp("stick");
        const at = this.handOf(near, ARM_X);
        this.prop.setPosition(at.x, at.y);
        break;
      }
    }
    this.drawCase(g);
    this.drawNotes(g, time);
  }

  /** Cuidando coches (o no): hace señas con la franela roja, el brazo arriba ("¡dale, dale, dale!"). */
  setParking(parking: boolean) {
    if (parking === this.parking) return;
    if (parking) this.parkTime = 0;
    this.parking = parking;
    if (!parking) this.hideGestureProps();
  }

  /**
   * De frente cuidando coches: el brazo cercano arriba, moviendo la franela de lado a lado como quien
   * le indica al auto hasta dónde puede ir; el otro, quieto al costado.
   */
  private poseParking(delta: number) {
    this.setBackView(false);
    this.body_.scaleX = 1;
    this.poseLimbs(delta, 0, 1, 0);
    this.parkTime += delta;
    const wave = Math.sin((this.parkTime / PARK_WAVE_MS) * Math.PI * 2);
    const [, near] = this.arms;
    const hand = { x: ARM_X + 7 + wave * 7, y: SHOULDER_Y - 20 + Math.abs(wave) * 3 };
    const target = reach({ x: hand.x - ARM_X, y: hand.y - SHOULDER_Y });
    near.rotation = target.rotation;
    near.scaleY = target.scale;
    this.body_.rotation = wave * 0.025;
    this.drum.setVisible(false);
    this.prop.setVisible(false);
    // La franela cuelga de la mano y flamea para el lado contrario al que va el brazo.
    const at = this.handOf(near, ARM_X);
    const flap = -wave * 5;
    const g = this.fx.clear();
    g.fillStyle(0xc62828, 1);
    g.fillPoints(
      [
        { x: at.x - 3, y: at.y - 1 },
        { x: at.x + 3, y: at.y - 1 },
        { x: at.x + 5 + flap, y: at.y + 10 },
        { x: at.x - 1 + flap * 1.3, y: at.y + 12 },
      ],
      true,
    );
    g.lineStyle(1, 0x7f1515, 0.9).lineBetween(at.x, at.y, at.x + 2 + flap, at.y + 11);
  }

  /** El estuche abierto en el piso, al costado, con unas monedas (ahí cae la propina). */
  private drawCase(g: Phaser.GameObjects.Graphics) {
    const { x, y } = CASE_OFFSET;
    g.fillStyle(0x000000, 0.25).fillEllipse(x, y + 1, 20, 6);
    g.fillStyle(0x3d2414, 1).fillRoundedRect(x - 9, y - 5, 18, 6, 2);
    g.fillStyle(0x7b1e2b, 1).fillRoundedRect(x - 7.5, y - 4, 15, 3.5, 1.5);
    g.fillStyle(0xf2c94c, 1);
    for (const [cx, cy] of [[-3, -2.5], [1, -2], [4, -3]]) g.fillCircle(x + cx, y + cy, 1.3);
    g.fillStyle(0x3d2414, 1).fillRoundedRect(x - 9, y - 12, 18, 6, 2);
  }

  /** Notas musicales que suben desde arriba del hombro, se mecen y se desvanecen. */
  private drawNotes(g: Phaser.GameObjects.Graphics, time: number) {
    const color = shade(this.buskColor, 45);
    const count = Math.ceil(BUSK_NOTE_MS / BUSK_NOTE_EVERY_MS);
    const newest = Math.floor(time / BUSK_NOTE_EVERY_MS);
    for (let i = 0; i < count; i++) {
      const index = newest - i;
      if (index < 0) break;
      const age = (time - index * BUSK_NOTE_EVERY_MS) / BUSK_NOTE_MS;
      if (age < 0 || age > 1) continue;
      const side = index % 2 === 0 ? 1 : -1;
      const x = side * (10 + age * 10) + Math.sin(age * Math.PI * 3 + index) * 4;
      const y = -66 - age * 34;
      const alpha = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;
      g.fillStyle(color, alpha);
      g.fillEllipse(x, y, 5, 3.6);
      g.lineStyle(1.3, color, alpha);
      g.lineBetween(x + 2.2, y, x + 2.2, y - 8);
      if (index % 3 === 0) g.lineBetween(x + 2.2, y - 8, x + 5.5, y - 6);
    }
  }

  /** Armónica frente a la boca: metal con la tapa de color y los agujeritos. */
  private drawHarmonica(color: number) {
    const g = this.instrument;
    const { x, y } = HARMONICA_AT;
    g.fillStyle(0xd9dde2, 1);
    g.fillRoundedRect(x - 7, y - 2.2, 14, 4.4, 1);
    g.fillStyle(color, 1);
    g.fillRect(x - 7, y - 0.6, 14, 1.2);
    g.fillStyle(0x2b2b30, 1);
    for (let i = 0; i < 6; i++) g.fillRect(x - 5.5 + i * 2.2, y + 1, 1, 0.9);
  }

  /** Guitarra criolla cruzada sobre el cuerpo: caja de color, boca, mango y clavijero. */
  private drawGuitar(color: number) {
    const g = this.instrument;
    const dark = shade(color, -35);
    g.lineStyle(3.2, 0x5a3b1e, 1);
    g.lineBetween(GUITAR_HOLE.x - 2, GUITAR_HOLE.y - 2, GUITAR_HEAD.x, GUITAR_HEAD.y);
    g.fillStyle(0x3d2414, 1);
    g.fillRoundedRect(GUITAR_HEAD.x - 3, GUITAR_HEAD.y - 3, 6, 5, 1.5);
    g.fillStyle(color, 1);
    g.fillEllipse(GUITAR_HOLE.x + 4, GUITAR_HOLE.y + 5, 17, 13);
    g.fillEllipse(GUITAR_HOLE.x - 1, GUITAR_HOLE.y - 1, 12, 10);
    g.lineStyle(1, dark, 0.8);
    g.strokeEllipse(GUITAR_HOLE.x + 4, GUITAR_HOLE.y + 5, 17, 13);
    g.fillStyle(0x2b1a10, 1);
    g.fillCircle(GUITAR_HOLE.x + 1, GUITAR_HOLE.y + 1, 2.4);
    g.lineStyle(0.6, 0xf4efe3, 0.8);
    g.lineBetween(GUITAR_HOLE.x + 6, GUITAR_HOLE.y + 7, GUITAR_HEAD.x + 1, GUITAR_HEAD.y);
  }

  /** Bandoneón: las dos cajas con botones en las manos y el fuelle plegado en el medio. */
  private drawBandoneon(color: number, open: number) {
    const g = this.instrument.clear();
    const y = BANDONEON_Y;
    const folds = 5;
    g.fillStyle(0xf4efe3, 1);
    g.fillRect(-open + 3, y - 6, open * 2 - 6, 12);
    g.lineStyle(1, 0x2b2b30, 0.9);
    for (let i = 0; i <= folds; i++) {
      const x = -open + 3 + ((open * 2 - 6) * i) / folds;
      g.lineBetween(x, y - 6, x, y + 6);
    }
    for (const side of [-1, 1]) {
      const cx = side * open;
      g.fillStyle(color, 1);
      g.fillRoundedRect(cx - 4, y - 8, 8, 16, 2);
      g.fillStyle(0xf4efe3, 1);
      for (const dy of [-4, 0, 4]) g.fillCircle(cx, y + dy, 0.9);
    }
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

  /**
   * Pose del gesto: los brazos (rotación y escala, que acorta el brazo como si se doblara hacia la
   * cámara), lo que tiene en la mano y los efectos y, en los de parado, piernas, cadera y saltos.
   * Entra suave en `GESTURE_BLEND_MS`; al terminar, `poseLimbs` lo devuelve a la pose normal.
   */
  private poseGesture(gesture: AnyGestureId, delta: number) {
    this.gestureTime += delta;
    const time = this.gestureTime;
    const blend = Math.min(1, time / GESTURE_BLEND_MS);
    const [far, near] = this.arms;
    const aim = (arm: Phaser.GameObjects.Container, rotation: number, scale: number) => {
      arm.rotation = Phaser.Math.Linear(arm.rotation, rotation, blend);
      arm.scaleY = Phaser.Math.Linear(arm.scaleY, scale, blend);
    };
    const aimAt = (arm: Phaser.GameObjects.Container, hand: { x: number; y: number }) => {
      const target = reach(hand);
      aim(arm, target.rotation, target.scale);
    };
    this.setBackView(false);
    this.prop.setVisible(false);
    this.termo.setVisible(false);
    this.drum.setVisible(false);
    const g = this.fx.clear();

    switch (gesture) {
      case "mate": {
        const up = mateLift(time);
        aim(near, Phaser.Math.Linear(MATE_REST.rotation, MATE_MOUTH.rotation, up), Phaser.Math.Linear(MATE_REST.scale, MATE_MOUTH.scale, up));
        this.holdProp("mate");
        this.termo.setVisible(true);
        break;
      }
      case "candombe": {
        // Con el tamboril colgado: la mano con el palo sube y pega en el parche a cada golpe; el
        // cuerpo marca el paso y la cadera se mece.
        const beat = (time % CANDOMBE_BEAT_MS) / CANDOMBE_BEAT_MS;
        const down = beat < 0.35 ? smooth(beat / 0.35) : 1 - smooth((beat - 0.35) / 0.65);
        aimAt(near, { x: Phaser.Math.Linear(DRUM_UP.x, DRUM_HIT.x, down), y: Phaser.Math.Linear(DRUM_UP.y, DRUM_HIT.y, down) });
        aim(far, -0.45 + Math.sin(time / 180) * 0.15, 0.9);
        const step = Math.sin((time / CANDOMBE_BEAT_MS) * Math.PI);
        this.legs[0].rotation = step * 0.22 * blend;
        this.legs[1].rotation = -step * 0.22 * blend;
        this.body_.y = -Math.abs(step) * 2.5 * blend;
        this.body_.rotation = Math.sin((time / CANDOMBE_BEAT_MS) * Math.PI * 0.5) * 0.07 * blend;
        this.drum.setVisible(true);
        this.holdProp("stick");
        // El golpe en el parche: unas rayitas que saltan.
        if (beat > 0.3 && beat < 0.55) {
          const head = { x: DRUM_AT.x - 4, y: DRUM_AT.y - 11 };
          g.lineStyle(1.5, SPARK_COLOR, 1 - (beat - 0.3) / 0.25);
          for (const angle of [-2.4, -1.6, -0.8]) {
            g.lineBetween(head.x + Math.cos(angle) * 5, head.y + Math.sin(angle) * 5, head.x + Math.cos(angle) * 9, head.y + Math.sin(angle) * 9);
          }
        }
        this.showExpression("happy");
        break;
      }
      case "goal": {
        // Salta con los dos brazos arriba, revoleando la bandera.
        const shake = Math.sin(time / 90) * 0.15;
        aim(near, -2.75 + shake, 1);
        aim(far, 2.75 - shake, 1);
        this.body_.y = -Math.abs(Math.sin((time / GOAL_JUMP_MS) * Math.PI)) * GOAL_JUMP_PX * blend;
        this.holdProp("flag");
        this.prop.setRotation(Math.sin(time / 140) * 0.35);
        this.showExpression("happy");
        break;
      }
      case "wave": {
        const swing = Math.sin((time / WAVE_MS) * Math.PI);
        aim(near, -2.6 + swing * 0.35, 0.95);
        // Rayitas de movimiento a los costados de la mano.
        const hand = this.handOf(near, ARM_X);
        g.lineStyle(1.2, 0xffffff, 0.6);
        const side = swing > 0 ? 1 : -1;
        g.beginPath();
        g.arc(hand.x - side * 2, hand.y, 8, side > 0 ? Math.PI * 0.75 : -Math.PI * 0.25, side > 0 ? Math.PI * 1.25 : Math.PI * 0.25);
        g.strokePath();
        this.showExpression("happy");
        break;
      }
      case "clap": {
        // Abre y junta las manos frente al pecho (el golpe, rápido; abrir, más lento) y saltan chispitas.
        const closed = Math.pow((1 - Math.cos(((time % CLAP_MS) / CLAP_MS) * Math.PI * 2)) / 2, 0.6);
        const hand = (side: "near" | "far") => ({
          x: Phaser.Math.Linear(CLAP_OPEN[side].x, CLAP_CLOSED[side].x, closed),
          y: Phaser.Math.Linear(CLAP_OPEN[side].y, CLAP_CLOSED[side].y, closed),
        });
        aimAt(near, hand("near"));
        aimAt(far, hand("far"));
        if (closed > 0.9) this.drawSparks(g, this.handOf(near, ARM_X), (closed - 0.9) * 10);
        this.showExpression("happy");
        break;
      }
      case "shush":
        aim(near, SHUSH_ARM.rotation, SHUSH_ARM.scale);
        this.holdProp("finger");
        break;
      case "highFive":
      case "hug":
      case "shareMate":
        this.posePair(gesture, time, blend, aim, aimAt, g);
        break;
    }

    // Lo que tiene en la mano va donde está la mano del brazo cercano.
    const hand = this.handOf(near, ARM_X);
    this.prop.setPosition(hand.x, hand.y);
    if (gesture === "mate" || (gesture === "shareMate" && this.prop.visible)) this.drawSteam(g, hand, time);
  }

  /**
   * Gestos de a dos: los dos se miran (cada uno con el brazo cercano hacia el otro), se acercan y
   * hacen lo suyo. `dx` es hacia dónde está el otro en el mundo; los efectos que están entre los dos
   * (chispas, corazones) los dibuja sólo el que invitó, para que no salgan dobles.
   */
  private posePair(
    gesture: "highFive" | "hug" | "shareMate",
    time: number,
    blend: number,
    aim: (arm: Phaser.GameObjects.Container, rotation: number, scale: number) => void,
    aimAt: (arm: Phaser.GameObjects.Container, hand: { x: number; y: number }) => void,
    g: Phaser.GameObjects.Graphics,
  ) {
    const [far, near] = this.arms;
    const partner = this.partner;
    const dx = partner ? partner.x - this.x : this.lead ? 40 : -40;
    const dy = partner ? partner.y - this.y : 0;
    // Uno arriba del otro en pantalla: igual se miran (el que invitó, a la derecha).
    const side = Math.abs(dx) > 4 ? Math.sign(dx) : this.lead ? 1 : -1;
    this.body_.scaleX = side;
    const distance = Math.max(Math.abs(dx), 1);
    /** Se acerca hasta que entre los dos queden `gap` px (cada uno hace la mitad del camino). */
    const lean = (gap: number) => {
      const move = Math.max(0, (distance - gap) / 2) * blend;
      this.body_.x = side * move;
      this.body_.y = dy * 0.25 * blend;
      return distance - 2 * Math.max(0, (distance - gap) / 2);
    };

    if (gesture === "highFive") {
      // Levanta la mano hacia atrás, la tira hacia el otro y las manos chocan arriba, entre los dos.
      const gap = lean(46);
      const t = time / PAIR_GESTURES.highFive.durationMs;
      const meet = { x: gap / 2 - ARM_X, y: -22 };
      const wind = { x: meet.x - 8, y: -24 };
      const swing = t < 0.3 ? 0 : t < HIGH_FIVE_HIT ? smooth((t - 0.3) / (HIGH_FIVE_HIT - 0.3)) : 1;
      const lower = t > 0.7 ? smooth((t - 0.7) / 0.3) : 0;
      aimAt(near, {
        x: Phaser.Math.Linear(Phaser.Math.Linear(wind.x, meet.x, swing), 6, lower),
        y: Phaser.Math.Linear(Phaser.Math.Linear(wind.y, meet.y, swing), 18, lower),
      });
      if (this.lead && t >= HIGH_FIVE_HIT && t < HIGH_FIVE_HIT + 0.15) {
        this.drawSparks(g, { x: ARM_X + meet.x, y: SHOULDER_Y + meet.y - 4 }, (t - HIGH_FIVE_HIT) / 0.15, 1.8);
      }
      this.showExpression("happy");
      return;
    }

    if (gesture === "hug") {
      // Se juntan, se rodean con los dos brazos y se mecen; arriba, unos corazones.
      const gap = lean(HUG_GAP_PX);
      aimAt(near, { x: gap + 2 - ARM_X, y: 8 });
      aimAt(far, { x: gap + 6 + ARM_X, y: 10 });
      this.body_.rotation = Math.sin(time / 320) * 0.05 * blend * side;
      if (this.lead) {
        for (let i = 0; i < 2; i++) {
          const life = ((time / 1400 + i * 0.5) % 1);
          g.fillStyle(HEART_COLOR, 1 - life);
          drawHeart(g, gap / 2 + (i === 0 ? -6 : 7), -110 - life * 18, 4.5);
        }
      }
      this.showExpression("happy");
      return;
    }

    // Pasar el mate: el que convida tiene el termo y estira el mate hasta el medio; el otro lo agarra
    // y se lo toma. Cuando pasa de mano, se ve en la del que lo recibió.
    const gap = lean(34);
    const middle = { x: gap / 2 - ARM_X + 2, y: 12 };
    const passed = time >= SHARE_MATE_PASS_MS;
    if (this.lead) {
      this.termo.setVisible(true);
      const out = smooth(Math.min(1, time / (SHARE_MATE_PASS_MS * 0.8)));
      const back = passed ? smooth(Math.min(1, (time - SHARE_MATE_PASS_MS) / 500)) : 0;
      aimAt(near, { x: Phaser.Math.Linear(Phaser.Math.Linear(8, middle.x, out), 4, back), y: Phaser.Math.Linear(Phaser.Math.Linear(14, middle.y, out), 18, back) });
      if (!passed) this.holdProp("mate");
    } else if (!passed) {
      const out = smooth(Math.max(0, Math.min(1, (time - SHARE_MATE_PASS_MS * 0.45) / (SHARE_MATE_PASS_MS * 0.5))));
      aimAt(near, { x: Phaser.Math.Linear(4, middle.x, out), y: Phaser.Math.Linear(18, middle.y, out) });
    } else {
      // Lo trae y se lo toma (como el mate solo, desde que lo recibió).
      const up = mateLift(time - SHARE_MATE_PASS_MS + MATE_SIP_EVERY_MS - MATE_RAISE_MS * 0.2);
      aim(near, Phaser.Math.Linear(MATE_REST.rotation, MATE_MOUTH.rotation, up), Phaser.Math.Linear(MATE_REST.scale, MATE_MOUTH.scale, up));
      this.holdProp("mate");
    }
  }

  /** Dónde queda la mano de `arm` (que sale de `shoulderX`), en coordenadas del cuerpo. */
  private handOf(arm: Phaser.GameObjects.Container, shoulderX: number): { x: number; y: number } {
    const length = ARM_LENGTH * arm.scaleY;
    return { x: shoulderX - Math.sin(arm.rotation) * length, y: SHOULDER_Y + Math.cos(arm.rotation) * length };
  }

  /** Chispitas que salen de `at` (`life` 0 → 1: se abren y se apagan). */
  private drawSparks(g: Phaser.GameObjects.Graphics, at: { x: number; y: number }, life: number, size = 1) {
    g.lineStyle(1.4, SPARK_COLOR, 1 - life);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.3;
      const r0 = (3 + life * 4) * size;
      const r1 = r0 + 3 * size;
      g.lineBetween(at.x + Math.cos(angle) * r0, at.y + Math.sin(angle) * r0, at.x + Math.cos(angle) * r1, at.y + Math.sin(angle) * r1);
    }
  }

  /** Vapor del mate: dos o tres volutas que suben de la calabaza y se desvanecen. */
  private drawSteam(g: Phaser.GameObjects.Graphics, hand: { x: number; y: number }, time: number) {
    for (let i = 0; i < 3; i++) {
      const life = (time / 1100 + i / 3) % 1;
      g.fillStyle(STEAM_COLOR, 0.45 * (1 - life));
      g.fillCircle(hand.x + Math.sin(life * 6 + i) * 2, hand.y - 9 - life * 12, 1.6 + life * 1.6);
    }
  }

  /** Mate (en la mano, con la bombilla hacia la boca): calabaza, yerba y bombilla. */
  private drawMate() {
    const g = this.prop.clear().setRotation(0);
    g.lineStyle(1.6, BOMBILLA_COLOR, 1);
    g.lineBetween(-0.5, -6, -7, -9.5);
    g.fillStyle(GOURD_COLOR, 1);
    g.fillEllipse(0, -2.5, 8, 9);
    g.fillStyle(shade(GOURD_COLOR, -30), 1);
    g.fillEllipse(0, -6.5, 6.5, 2.4);
    g.fillStyle(YERBA_COLOR, 1);
    g.fillEllipse(0, -6.7, 5, 1.6);
    g.lineStyle(1, OUTLINE, OUTLINE_ALPHA);
    g.strokeEllipse(0, -2.5, 8, 9);
  }

  /** Índice levantado (pedir silencio), del color de la piel. */
  private drawFinger() {
    const g = this.prop.clear().setRotation(0);
    g.fillStyle(this.look.skin, 1);
    g.fillRoundedRect(-1.4, -9, 2.8, 8, 1.4);
    g.lineStyle(1, OUTLINE, OUTLINE_ALPHA);
    g.strokeRoundedRect(-1.4, -9, 2.8, 8, 1.4);
  }

  /** Bandera uruguaya chiquita en un palito: franjas blancas y celestes y el sol en la esquina. */
  private drawFlag() {
    const g = this.prop.clear();
    g.lineStyle(2.2, 0x5a3b1e, 1);
    g.lineBetween(0, 4, 0, -24);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(i % 2 === 0 ? 0xffffff : FLAG_BLUE, 1);
      g.fillRect(0.8, -24 + i * 2, 15, 2);
    }
    g.fillStyle(0xffffff, 1);
    g.fillRect(0.8, -24, 5, 6);
    g.fillStyle(FLAG_SUN, 1);
    g.fillCircle(3.3, -21, 1.8);
    g.lineStyle(1, OUTLINE, OUTLINE_ALPHA);
    g.strokeRect(0.8, -24, 15, 10);
  }

  /** Palo del tamboril en la mano, apuntando al parche. */
  private drawStick() {
    const g = this.prop.clear().setRotation(0);
    g.lineStyle(2, 0x5a3b1e, 1);
    g.lineBetween(1, -2, -4, 8);
  }

  /** Tamboril de candombe (de costado, colgado): barril de madera con flejes y el parche arriba. */
  private drawDrum() {
    const g = this.drum;
    g.fillStyle(DRUM_WOOD, 1);
    g.fillRoundedRect(-5, -11, 10, 22, 3);
    g.fillStyle(shade(DRUM_WOOD, -25), 1);
    g.fillRect(-5, -4, 10, 1.6);
    g.fillRect(-5, 4, 10, 1.6);
    g.fillStyle(shade(DRUM_WOOD, 20), 1);
    g.fillRect(-3.5, -9, 1.6, 18);
    g.fillStyle(DRUM_HEAD, 1);
    g.fillEllipse(0, -11, 10, 3.6);
    g.lineStyle(1, OUTLINE, OUTLINE_ALPHA);
    g.strokeRoundedRect(-5, -11, 10, 22, 3);
    // La correa que lo cuelga del hombro.
    g.lineStyle(1.4, 0x3a2a1a, 0.8);
    g.lineBetween(-4, -8, -14, -28);
  }

  /** Termo bajo el brazo cercano (sólo con el mate): cuerpo de color, tapa y pico metálicos. */
  private drawTermo() {
    const g = this.termo;
    g.fillStyle(TERMO_COLOR, 1);
    g.fillRoundedRect(9, -50, 8, 20, 2.5);
    g.fillStyle(shade(TERMO_COLOR, 25), 1);
    g.fillRect(10, -47, 2, 14);
    g.fillStyle(BOMBILLA_COLOR, 1);
    g.fillRoundedRect(9.5, -54, 7, 4.5, 1.5);
    g.fillRect(15.5, -53, 3, 2);
    g.lineStyle(1, OUTLINE, OUTLINE_ALPHA);
    g.strokeRoundedRect(9, -50, 8, 20, 2.5);
  }

  private updateBlink(delta: number) {
    this.blinkIn -= delta;
    if (this.blinkIn > 0) return;
    // La escala base de un `ShapeSprite` es 1 / SHAPE_RES.
    this.eyes.scaleY = 0.15 / SHAPE_RES;
    if (this.blinkIn <= -BLINK_MS) {
      this.eyes.scaleY = 1 / SHAPE_RES;
      this.blinkIn = Phaser.Math.Between(2500, 5500);
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

/** 0 → 1 con arranque y llegada suaves. */
function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Rotación y escala de un brazo para que la mano quede en `hand` (px desde el hombro). */
function reach(hand: { x: number; y: number }): { rotation: number; scale: number } {
  return { rotation: Math.atan2(-hand.x, hand.y), scale: Math.min(1.25, Math.max(0.3, Math.hypot(hand.x, hand.y) / ARM_LENGTH)) };
}

/**
 * Cuánto tiene el mate levantado (0 = a la altura del pecho, 1 = en la boca) a los `time` ms: lo sube,
 * chupa la bombilla y lo baja, una vez cada `MATE_SIP_EVERY_MS`.
 */
function mateLift(time: number): number {
  const phase = ((time % MATE_SIP_EVERY_MS) + MATE_SIP_EVERY_MS) % MATE_SIP_EVERY_MS;
  if (phase < MATE_RAISE_MS) return smooth(phase / MATE_RAISE_MS);
  if (phase < MATE_RAISE_MS + MATE_SIP_MS) return 1;
  return smooth(1 - (phase - MATE_RAISE_MS - MATE_SIP_MS) / MATE_RAISE_MS);
}

/** Corazoncito (dos círculos y un triángulo) centrado en (x, y). */
function drawHeart(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number) {
  g.fillCircle(x - size * 0.5, y, size * 0.6);
  g.fillCircle(x + size * 0.5, y, size * 0.6);
  g.fillTriangle(x - size * 1.1, y + size * 0.15, x + size * 1.1, y + size * 0.15, x, y + size * 1.4);
}
