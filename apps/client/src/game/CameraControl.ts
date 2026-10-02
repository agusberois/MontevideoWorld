import * as Phaser from "phaser";
import { eventBus } from "@/lib/eventBus";

/** La cámara centra el torso del avatar propio, no sus pies. */
export const FOLLOW_OFFSET_Y = 40;
/**
 * Zoom con la rueda o pellizcando. El mínimo no puede bajar de 1/3: el velo de la noche
 * (`DayNight`) mide 3 pantallas y Phaser lo escala con el zoom aunque esté fijo a la cámara.
 */
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
/** Cuánto cambia el zoom por cada "clic" de la rueda. */
const ZOOM_STEP = 1.12;
/** Zoom inicial en pantallas chicas (celulares), si nunca se eligió otro: se ve más mapa. */
const SMALL_SCREEN_ZOOM = 0.75;
/** Suavizado del seguimiento (0–1 por frame): la cámara alcanza al avatar sin tirones. */
const FOLLOW_LERP = 0.15;

/**
 * Mover la cámara con el mouse en el borde (estilo LoL): a menos de EDGE_PX del borde de la
 * ventana, si el mouse está sobre el mapa; pegado al borde (EDGE_HARD_PX) aunque haya HUD, chat o
 * barra encima. Arranca después de EDGE_DWELL_MS (pasar por el borde camino al HUD no mueve nada)
 * y va más rápido cuanto más cerca del borde.
 */
const EDGE_PX = 28;
const EDGE_HARD_PX = 6;
const EDGE_DWELL_MS = 120;
/** Velocidad del desplazamiento por flechas (y del borde a fondo), en px de pantalla por segundo. */
const PAN_SPEED = 900;
const EDGE_MIN_SPEED = 0.45;
/** Dos dedos que se mueven juntos más que esto (px) son un arrastre de la cámara, no sólo un pellizco. */
const TWO_FINGER_PAN_SLOP = 16;
/**
 * Un dedo (o el clic apretado) que se mueve más que esto (px) arrastra el mapa en vez de ser un
 * clic. Es el mismo margen que usa la escena para decidir si un toque fue un clic (`TAP_SLOP`).
 */
export const DRAG_SLOP = 12;

/**
 * Volver al avatar con la cámara libre (al mandarlo a caminar o con "Centrar"): viaje suave, más
 * largo cuanto más lejos, y al llegar lo sigue. Velocidad en px de mundo por ms, con un mínimo y
 * un máximo de duración.
 */
const RETURN_PX_PER_MS = 2.2;
const RETURN_MIN_MS = 250;
const RETURN_MAX_MS = 900;

const ZOOM_STORAGE_KEY = "mw:zoom";
/** Si la cámara quedó libre o fija, se recuerda en este navegador. */
const MODE_STORAGE_KEY = "mw:camera";

/** Teclas de la cámara (estilo LoL): Y fija / libre, Espacio centra (y sigue mientras se mantiene). */
const PAN_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/**
 * Cámara del barrio, estilo League of Legends:
 * - **Fija** (por defecto): sigue al avatar propio.
 * - **Libre**: se queda donde la dejes para mirar (y hacer clic) en cualquier parte del mapa. Se
 *   mueve **arrastrando el mapa** (un dedo, el clic o la rueda apretados, dos dedos), con el mouse
 *   en los bordes de la pantalla o con las flechas. Mover la cámara a mano con la fija la suelta
 *   sola. Un toque / clic corto (sin arrastrar) sigue siendo caminar.
 * - **Y** alterna fija / libre; **Espacio** centra en el avatar (y lo sigue mientras se mantiene).
 * - Zoom: rueda o pellizco (se recuerda).
 * Avisa el modo a React (`camera:free`) y acepta órdenes del botón en pantalla (`camera:command`).
 */
export class CameraControl {
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private target: Phaser.GameObjects.Components.Transform | null = null;
  private free = false;
  /** Teclas de la cámara apretadas ahora (flechas, espacio). */
  private readonly held = new Set<string>();
  /** Último lugar del mouse en la ventana (null: salió de la ventana o se usa el dedo). */
  private mouse: { x: number; y: number; overMap: boolean } | null = null;
  /** Desde cuándo está el mouse en la zona del borde (para la espera antes de mover). */
  private edgeSince: number | null = null;
  /**
   * Arrastre del mapa con un dedo, el clic apretado o la rueda apretada: con qué puntero, dónde
   * empezó, el scroll de ese momento y si ya se movió lo suficiente para ser arrastre (no clic).
   */
  private drag: { pointerId: number; x: number; y: number; scrollX: number; scrollY: number; active: boolean } | null = null;
  /** Gesto de dos dedos: distancia, zoom y el punto del mundo que quedó bajo el centro de los dedos. */
  private pinch: { distance: number; zoom: number; worldX: number; worldY: number; midX: number; midY: number } | null = null;
  /** Hubo un gesto de cámara (dos dedos o rueda apretada) en este toque: al soltar no es un clic. */
  private gestured = false;
  private readonly disposers: Array<() => void> = [];

  /**
   * @param onCenter se llama cada vez que se pide centrar en el avatar (botón "Centrar personaje",
   *   Espacio): la escena lo marca para que se encuentre de un vistazo.
   */
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onCenter: () => void = () => {},
  ) {
    this.camera = scene.cameras.main;
    this.camera.setZoom(loadZoom(window.matchMedia("(max-width: 760px), (max-height: 500px)").matches ? SMALL_SCREEN_ZOOM : 1));
    this.free = loadFree();

    // Dos dedos a la vez (pellizco y arrastre de la cámara): Phaser trae uno solo de fábrica.
    scene.input.addPointer(1);

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event)) return;
      if (event.code === "KeyY" && !event.repeat) {
        this.setFree(!this.free);
      } else if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) {
          this.centerOnTarget();
          this.onCenter();
        }
        this.held.add(event.code);
      } else if (event.code in PAN_KEYS) {
        event.preventDefault();
        this.held.add(event.code);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => this.held.delete(event.code);
    // Al cambiar de ventana no llega el keyup: que no quede una flecha "apretada" (ni el mouse en el borde).
    const onBlur = () => {
      this.held.clear();
      this.mouse = null;
    };
    // El mouse se sigue en toda la ventana (también sobre el HUD o el chat): el borde es de la pantalla.
    // Sólo mouse: con el dedo no hay bordes (y el navegador inventa movimientos de mouse al tocar).
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        this.mouse = null;
        return;
      }
      this.mouse = { x: event.clientX, y: event.clientY, overMap: event.target === scene.game.canvas };
    };
    const onMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget) this.mouse = null;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pointermove", onPointerMove);
    document.addEventListener("mouseout", onMouseOut);
    this.disposers.push(
      () => window.removeEventListener("keydown", onKeyDown),
      () => window.removeEventListener("keyup", onKeyUp),
      () => window.removeEventListener("blur", onBlur),
      () => window.removeEventListener("pointermove", onPointerMove),
      () => document.removeEventListener("mouseout", onMouseOut),
      eventBus.on("camera:command", () => {
        this.returnToTarget();
        this.onCenter();
      }),
    );
    eventBus.emit("camera:free", this.free);
  }

  /** El avatar propio (o null si se fue): la cámara fija lo sigue. */
  setTarget(target: Phaser.GameObjects.Components.Transform | null) {
    this.target = target;
    if (!target) {
      this.camera.stopFollow();
      return;
    }
    if (this.free) this.centerOnTarget();
    else this.follow();
  }

  isFree(): boolean {
    return this.free;
  }

  /** Fija (sigue al avatar) o libre. Se recuerda y se le avisa a React. */
  setFree(free: boolean) {
    if (free === this.free) {
      if (!free) this.follow();
      return;
    }
    this.free = free;
    saveFree(free);
    if (free) {
      // Si estaba volviendo al avatar y se agarra la cámara, el viaje se corta ahí.
      this.camera.panEffect.reset();
      this.camera.stopFollow();
    } else {
      this.follow();
    }
    eventBus.emit("camera:free", free);
  }

  /**
   * Con la cámara libre: vuelve al avatar con un viaje suave y queda fija, siguiéndolo (así se ve
   * cómo camina hasta donde lo mandaste). Con la fija no hace nada: ya lo está siguiendo.
   */
  returnToTarget() {
    const target = this.target;
    if (!this.free || !target) return;
    this.free = false;
    saveFree(false);
    eventBus.emit("camera:free", false);

    const camera = this.camera;
    const x = target.x;
    const y = target.y - FOLLOW_OFFSET_Y;
    const distance = Phaser.Math.Distance.Between(camera.midPoint.x, camera.midPoint.y, x, y);
    const duration = Phaser.Math.Clamp(distance / RETURN_PX_PER_MS, RETURN_MIN_MS, RETURN_MAX_MS);
    // Viaja hasta donde estaba el avatar al salir; como sigue caminando, al llegar lo engancha el
    // seguimiento suave (sin salto). Si en el medio se vuelve a soltar la cámara, no se engancha.
    camera.pan(x, y, duration, "Sine.easeInOut", true, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1 && !this.free) this.follow();
    });
  }

  /** Cada frame: bordes de la pantalla, flechas y Espacio (seguir mientras se mantiene). */
  update(delta: number) {
    if (this.held.has("Space")) {
      this.centerOnTarget();
      return;
    }
    let dx = 0;
    let dy = 0;
    for (const code of this.held) {
      const direction = PAN_KEYS[code];
      if (direction) {
        dx += direction[0];
        dy += direction[1];
      }
    }
    const edge = this.edgePan();
    dx += edge.x;
    dy += edge.y;
    if (dx === 0 && dy === 0) return;
    // Mover la cámara a mano la suelta (deja de seguir al avatar), como en LoL.
    this.setFree(true);
    const step = (PAN_SPEED * delta) / 1000 / this.camera.zoom;
    this.camera.scrollX += dx * step;
    this.camera.scrollY += dy * step;
  }

  /**
   * Cuánto empuja el mouse en el borde de la ventana (-1…1 por eje; más cerca del borde, más
   * rápido). 0 si no está en un borde, todavía no pasó la espera, hay un panel abierto, se está
   * arrastrando o la ventana no tiene el foco.
   */
  private edgePan(): { x: number; y: number } {
    const mouse = this.mouse;
    const none = { x: 0, y: 0 };
    if (!mouse || !document.hasFocus() || this.drag || document.querySelector(".modal-backdrop")) {
      this.edgeSince = null;
      return none;
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const band = (distance: number) => {
      // Sobre el mapa: toda la franja; sobre el HUD / chat / barra: sólo pegado al borde.
      if (distance > (mouse.overMap ? EDGE_PX : EDGE_HARD_PX)) return 0;
      return EDGE_MIN_SPEED + (1 - EDGE_MIN_SPEED) * (1 - Math.max(0, distance) / EDGE_PX);
    };
    const x = band(mouse.x) > 0 ? -band(mouse.x) : band(width - 1 - mouse.x);
    const y = band(mouse.y) > 0 ? -band(mouse.y) : band(height - 1 - mouse.y);
    if (x === 0 && y === 0) {
      this.edgeSince = null;
      return none;
    }
    const now = this.scene.time.now;
    this.edgeSince ??= now;
    return now - this.edgeSince < EDGE_DWELL_MS ? none : { x, y };
  }

  /** Rueda: zoom. */
  wheel(dy: number) {
    if (dy === 0) return;
    const zoom = Phaser.Math.Clamp(dy < 0 ? this.camera.zoom * ZOOM_STEP : this.camera.zoom / ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
    this.camera.setZoom(zoom);
    saveZoom(zoom);
  }

  /**
   * Empieza un toque / clic. Devuelve true si es un gesto de cámara (rueda apretada o segundo
   * dedo): la escena no tiene que tratarlo como clic ni como caminar.
   */
  pointerDown(pointer: Phaser.Input.Pointer): boolean {
    // Segundo dedo: pellizco / arrastre con dos dedos (reemplaza al arrastre de uno).
    if (this.updatePinch()) {
      this.drag = null;
      return true;
    }
    const middle = !pointer.wasTouch && pointer.middleButtonDown();
    if (pointer.wasTouch || pointer.leftButtonDown() || middle) {
      const { scrollX, scrollY } = this.camera;
      // Con la rueda apretada siempre es arrastre; con el dedo o el clic, recién al moverse (si no, es un clic).
      this.drag = { pointerId: pointer.id, x: pointer.x, y: pointer.y, scrollX, scrollY, active: middle };
      if (middle) this.gestured = true;
    }
    return middle;
  }

  /** Se mueve el puntero. Devuelve true si lo usó la cámara (arrastre con la rueda o con dos dedos). */
  pointerMove(pointer: Phaser.Input.Pointer): boolean {
    if (this.updatePinch()) return true;
    const drag = this.drag;
    if (!drag || drag.pointerId !== pointer.id || !pointer.isDown) return false;
    if (!drag.active) {
      if (Math.hypot(pointer.x - drag.x, pointer.y - drag.y) <= DRAG_SLOP) return false;
      // Se movió: es arrastre del mapa. Suelta la cámara (deja de seguir al avatar) y no será un clic.
      drag.active = true;
      this.gestured = true;
      this.setFree(true);
      // El arrastre arranca desde donde está la cámara ahora (si venía siguiendo, ya se movió).
      drag.scrollX = this.camera.scrollX;
      drag.scrollY = this.camera.scrollY;
      drag.x = pointer.x;
      drag.y = pointer.y;
    }
    // El punto del mapa que se agarró queda bajo el dedo / el mouse.
    this.camera.scrollX = drag.scrollX - (pointer.x - drag.x) / this.camera.zoom;
    this.camera.scrollY = drag.scrollY - (pointer.y - drag.y) / this.camera.zoom;
    return true;
  }

  /**
   * Se suelta. Devuelve true si este toque fue (o terminó) un gesto de cámara: no es un clic. El
   * gesto termina cuando no queda ningún dedo / botón apretado; ahí se recuerda el zoom.
   */
  pointerUp(anyStillDown: boolean): boolean {
    this.drag = null;
    if (!this.gestured) return false;
    if (!anyStillDown) {
      this.gestured = false;
      this.pinch = null;
      saveZoom(this.camera.zoom);
    }
    return true;
  }

  dispose() {
    this.disposers.forEach((dispose) => dispose());
    this.disposers.length = 0;
    this.held.clear();
  }

  private follow() {
    if (!this.target) return;
    this.camera.startFollow(this.target, true, FOLLOW_LERP, FOLLOW_LERP).setFollowOffset(0, FOLLOW_OFFSET_Y);
  }

  private centerOnTarget() {
    if (!this.target) return;
    this.camera.panEffect.reset();
    this.camera.centerOn(this.target.x, this.target.y - FOLLOW_OFFSET_Y);
  }

  /**
   * Dos dedos: el zoom sigue la distancia entre ellos y, si se mueven juntos, arrastran la cámara
   * (el punto del mapa que quedó entre los dedos los acompaña). Arrastrar suelta la cámara; un
   * pellizco quieto con la cámara fija sólo hace zoom sobre el avatar.
   */
  private updatePinch(): boolean {
    const { pointer1, pointer2 } = this.scene.input;
    if (!pointer1?.isDown || !pointer2?.isDown) {
      this.pinch = null;
      return false;
    }
    const camera = this.camera;
    const distance = Math.max(1, Phaser.Math.Distance.Between(pointer1.x, pointer1.y, pointer2.x, pointer2.y));
    const midX = (pointer1.x + pointer2.x) / 2;
    const midY = (pointer1.y + pointer2.y) / 2;
    if (!this.pinch) {
      const world = screenToWorld(camera, midX, midY, camera.zoom, camera.scrollX, camera.scrollY);
      this.pinch = { distance, zoom: camera.zoom, worldX: world.x, worldY: world.y, midX, midY };
      this.gestured = true;
      return true;
    }
    const zoom = Phaser.Math.Clamp((this.pinch.zoom * distance) / this.pinch.distance, MIN_ZOOM, MAX_ZOOM);
    camera.setZoom(zoom);
    if (Math.hypot(midX - this.pinch.midX, midY - this.pinch.midY) > TWO_FINGER_PAN_SLOP) this.setFree(true);
    if (this.free) {
      // Scroll tal que el punto del mundo que estaba entre los dedos siga entre los dedos.
      camera.scrollX = this.pinch.worldX - camera.width / 2 - (midX - camera.width / 2) / zoom;
      camera.scrollY = this.pinch.worldY - camera.height / 2 - (midY - camera.height / 2) / zoom;
    }
    return true;
  }
}

/** Punto del mundo bajo un punto de la pantalla, para un zoom y scroll dados (cámara con origen al centro). */
function screenToWorld(camera: Phaser.Cameras.Scene2D.Camera, x: number, y: number, zoom: number, scrollX: number, scrollY: number) {
  return {
    x: scrollX + camera.width / 2 + (x - camera.width / 2) / zoom,
    y: scrollY + camera.height / 2 + (y - camera.height / 2) / zoom,
  };
}

/** ¿Está escribiendo? (chat, buscador…) o con Ctrl / Cmd / Alt: las teclas no son para el juego. */
export function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  return Boolean(target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) || event.ctrlKey || event.metaKey || event.altKey;
}

/** El zoom que se eligió la última vez (rueda o pellizco), o `fallback` si nunca se eligió. */
function loadZoom(fallback: number): number {
  try {
    const saved = Number(window.localStorage.getItem(ZOOM_STORAGE_KEY));
    return Number.isFinite(saved) && saved > 0 ? Phaser.Math.Clamp(saved, MIN_ZOOM, MAX_ZOOM) : fallback;
  } catch {
    return fallback;
  }
}

function saveZoom(zoom: number) {
  try {
    window.localStorage.setItem(ZOOM_STORAGE_KEY, String(zoom));
  } catch {
    // Sin almacenamiento: el zoom funciona igual, sólo no se recuerda.
  }
}

function loadFree(): boolean {
  try {
    return window.localStorage.getItem(MODE_STORAGE_KEY) === "free";
  } catch {
    return false;
  }
}

function saveFree(free: boolean) {
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, free ? "free" : "locked");
  } catch {
    // Sin almacenamiento: funciona igual, sólo no se recuerda.
  }
}
