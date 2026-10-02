import { CityMap, STEP_MS, TilePoint } from "@montevideo-world/shared";

/**
 * Movimiento del avatar propio, sin Phaser (así se puede simular y probar en Node): predicción del
 * camino, corrección contra lo que dice el server y caminar con WASD. La escena le pasa el avatar
 * (lo que se dibuja) y cómo mandar el `move` al server.
 */

/**
 * Predicción: el avatar arranca a caminar apenas se pide (sin esperar al server) por el mismo
 * camino que va a calcular el server, como mucho estos tiles por delante de lo que el server ya
 * confirmó.
 */
export const MAX_LEAD = 3;
/**
 * Si el server no confirma ningún paso en este tiempo (agotado, camino distinto…), se vuelve a su
 * posición. Holgado: con mucha latencia la primera confirmación tarda ida + paso + vuelta, y
 * cortar antes hace retroceder al avatar sin motivo. Un rechazo de verdad es raro.
 */
export const PREDICTION_STALL_MS = STEP_MS * 4 + 400;
/** WASD: hasta cuántos tiles adelante se pide ir mientras se mantiene una dirección. */
export const WASD_LOOKAHEAD = 3;

/** Teclas WASD → dirección en la PANTALLA (W = arriba). */
export const WASD_KEYS: Readonly<Record<string, readonly [number, number]>> = {
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};

/** Lo que el movimiento necesita del avatar dibujado (ver `Avatar`). */
export interface MoverAvatar {
  /** El tile al que está yendo ahora (o en el que está, si está quieto). */
  headingTile(): TilePoint;
  /** Dónde termina lo que tiene por recorrer. */
  endTile(): TilePoint;
  /** Reemplaza lo que falta recorrer (el paso en curso se termina). */
  setPath(tiles: readonly TilePoint[]): void;
  /** Suma un tile al final del recorrido. */
  pushTile(x: number, y: number): void;
}

export interface MoverHost {
  /** Mandarle al server el pedido de caminar hasta `target` por `route` (ver `MoveMessage.path`). */
  sendMove(target: TilePoint, route: TilePoint[]): void;
  /** Reloj (ms). */
  now(): number;
  /** ¿Tiene energía para caminar? (si no, el server no lo mueve y no se predice nada) */
  canWalk(): boolean;
}

interface Prediction {
  target: TilePoint;
  /** Recorrido desde el último tile que confirmó el server (sin incluirlo). */
  path: TilePoint[];
  /** Cuántos tiles del camino ya se le pasaron al avatar. */
  fed: number;
  /** Hasta qué tile del camino confirmó el server (-1: todavía en el de salida). */
  confirmed: number;
  /** Cuándo confirmó el server el último paso (o cuándo se pidió). */
  lastConfirmAt: number;
}

export function sameTile(a: TilePoint, b: TilePoint): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Dirección en tiles de las teclas WASD apretadas (null si ninguna o se anulan). */
export function wasdDirection(keys: Iterable<string>): TilePoint | null {
  let screenX = 0;
  let screenY = 0;
  for (const code of keys) {
    const direction = WASD_KEYS[code];
    if (!direction) continue;
    screenX += direction[0];
    screenY += direction[1];
  }
  // Pantalla → mapa isométrico: derecha = (+1, -1) en tiles, abajo = (+1, +1).
  const x = Math.sign(screenX + screenY);
  const y = Math.sign(screenY - screenX);
  return x !== 0 || y !== 0 ? { x, y } : null;
}

export class LocalMover {
  private avatar: MoverAvatar | null = null;
  /** Último tile del avatar propio según el server. */
  private serverTile: TilePoint | null = null;
  private prediction: Prediction | null = null;
  /** Dirección de WASD en este frame (null: ninguna). */
  private wasdDirectionNow: TilePoint | null = null;
  /** Se está caminando con WASD, y el último destino que se pidió. */
  private wasdActive = false;
  private wasdTarget: TilePoint | null = null;
  /**
   * Un clic mientras se mantenía WASD: manda el clic (la última orden gana) hasta que cambien las
   * teclas. Guarda la dirección que había, para saber cuándo cambiaron.
   */
  private wasdSuspended: TilePoint | null = null;

  constructor(
    private readonly map: CityMap,
    private readonly host: MoverHost,
  ) {}

  /** El avatar propio apareció (o se fue: null) en `tile`. */
  setAvatar(avatar: MoverAvatar | null, tile: TilePoint | null) {
    this.avatar = avatar;
    this.serverTile = tile;
    this.prediction = null;
  }

  getServerTile(): TilePoint | null {
    return this.serverTile;
  }

  /**
   * Caminar hasta `target` (clic, parada…). Se planea desde donde el avatar realmente va a estar
   * (ver `planningBase`) y se le manda al server ese mismo recorrido, así los dos caminan lo mismo.
   */
  requestMove(target: TilePoint) {
    if (this.wasdActive && this.wasdDirectionNow) this.wasdSuspended = this.wasdDirectionNow;
    const { base } = this.planningBase();
    const steps = sameTile(base, target) ? [] : this.map.findPath(base, target);
    this.go(target, steps);
  }

  /**
   * Desde dónde planear un recorrido nuevo, sin volver para atrás: el tile al que el avatar ya está
   * yendo, si es parte de lo predicho (`keep`: los tiles predichos hasta ahí, que el server todavía
   * tiene que caminar). Si no hay predicción, el último tile del server (el avatar termina ahí).
   * Planear desde el tile del server cuando el avatar ya va adelantado lo hacía retroceder.
   */
  private planningBase(): { base: TilePoint; keep: TilePoint[] } {
    const avatar = this.avatar;
    const server = this.serverTile;
    const prediction = this.prediction;
    if (!avatar || !server) return { base: server ?? { x: 0, y: 0 }, keep: [] };
    if (prediction) {
      const heading = avatar.headingTile();
      const index = prediction.path.findIndex(
        (tile, i) => i > prediction.confirmed && i < prediction.fed && sameTile(tile, heading),
      );
      if (index >= 0) return { base: heading, keep: prediction.path.slice(prediction.confirmed + 1, index + 1) };
    }
    return { base: server, keep: [] };
  }

  /**
   * Manda el recorrido (lo que falta hasta la base + `steps`) y lo empieza a mostrar: el avatar
   * termina el paso en curso y sigue por ahí, como mucho MAX_LEAD tiles por delante del server.
   */
  private go(target: TilePoint, steps: TilePoint[]) {
    const avatar = this.avatar;
    const server = this.serverTile;
    const { base, keep } = this.planningBase();
    const route = [...keep, ...steps];
    const end = route[route.length - 1] ?? base;
    // Al server se le manda también el tile donde se cree que está: si por la latencia dio un paso
    // de más por el recorrido anterior, queda al lado y vuelve por ahí (`followRoute`).
    this.host.sendMove(steps.length > 0 ? target : end, server ? [server, ...route] : route);
    if (!avatar || !server) return;
    // Sin energía el server no lo va a mover: no se adelanta nada.
    if (!this.host.canWalk()) return;

    const previous = this.prediction;
    const heading = avatar.headingTile();
    if (route.length === 0) {
      // Quedarse donde está (o frenar): vuelve / se queda en el tile del server.
      this.prediction = null;
      if (previous) this.walkBackTo(server);
      return;
    }
    this.prediction = {
      target: end,
      path: route,
      fed: keep.length,
      confirmed: -1,
      // Seguir pidiendo no cuenta como que el server confirmó algo (si no, nunca se detectaría que
      // dejó de mover al avatar mientras se mantiene una tecla).
      lastConfirmAt: previous ? previous.lastConfirmAt : this.host.now(),
    };
    if (keep.length > 0) {
      // Va adelantado hacia `base`: se descarta lo que tenía después y sigue por el recorrido nuevo.
      avatar.setPath([]);
    } else if (previous) {
      // Había predicción pero el avatar no va hacia un tile predicho: arranca desde el tile del server.
      this.walkBackTo(server);
    }
    // Sin predicción previa el avatar termina en el tile del server y se suma a continuación (si
    // por algo no terminara ahí, primero camina hasta él).
    else if (!sameTile(avatar.endTile(), server)) this.walkBackTo(server);
    this.feed();
  }

  /**
   * El server movió al avatar propio. Si es un paso del camino predicho, lo confirma; si no (el
   * server calculó desde otro tile, o lo llevó a un banco / tienda), se vuelve a predecir desde ahí
   * o se sigue al server sin predicción.
   */
  onServerTile(tile: TilePoint) {
    const avatar = this.avatar;
    if (!avatar || (this.serverTile && sameTile(this.serverTile, tile))) return;
    const previousTile = this.serverTile;
    this.serverTile = tile;

    // Un salto (el admin se teletransportó con `/trace`): aparece ahí, sin caminar ni predecir.
    if (previousTile && Math.max(Math.abs(previousTile.x - tile.x), Math.abs(previousTile.y - tile.y)) > 2) {
      this.prediction = null;
      avatar.setPath([tile]);
      return;
    }

    const prediction = this.prediction;
    if (!prediction) {
      avatar.pushTile(tile.x, tile.y);
      return;
    }
    // El server avanza de a un tile: sólo cuenta como confirmación el próximo del recorrido (o el de
    // después, si se perdió un parche). Más lejos sería un atajo por otro lado, no lo predicho.
    const index = prediction.path.findIndex(
      (step, i) => i > prediction.confirmed && i <= prediction.confirmed + 2 && sameTile(step, tile),
    );
    if (index >= 0) {
      prediction.confirmed = index;
      prediction.lastConfirmAt = this.host.now();
      if (index === prediction.path.length - 1) this.prediction = null;
      else this.feed();
      return;
    }
    // Un tile de más al lado del recorrido (el server siguió un paso por el recorrido anterior antes
    // de recibir el nuevo): vuelve solo (`followRoute`), así que no se toca nada. Si no vuelve, lo
    // detecta PREDICTION_STALL_MS.
    if (previousTile && (this.map.isStep(previousTile, tile) || this.touchesPath(tile, prediction))) return;

    // El server va por otro lado: se predice de nuevo desde donde está él, hacia el mismo destino, y
    // el avatar camina hasta ahí (sin saltar).
    const path = this.map.findPath(tile, prediction.target);
    this.walkBackTo(tile);
    if (path.length === 0) {
      this.prediction = null;
      return;
    }
    this.prediction = { ...prediction, path, fed: 0, confirmed: -1, lastConfirmAt: this.host.now() };
    this.feed();
  }

  /** ¿El tile queda pegado a lo que falta del recorrido predicho? */
  private touchesPath(tile: TilePoint, prediction: Prediction): boolean {
    return prediction.path.some((step, i) => i > prediction.confirmed && this.map.isStep(tile, step));
  }

  /** El avatar vuelve caminando hasta `tile` (si no hay camino, aparece ahí). */
  private walkBackTo(tile: TilePoint) {
    const avatar = this.avatar;
    if (!avatar) return;
    const heading = avatar.headingTile();
    if (sameTile(heading, tile)) {
      avatar.setPath([]);
      return;
    }
    const path = this.map.findPath(heading, tile);
    avatar.setPath(path.length > 0 ? path : [tile]);
  }

  /** Deja de predecir y el avatar vuelve al tile que dice el server (lo que siga llega de él). */
  cancelPrediction() {
    if (!this.prediction) return;
    this.prediction = null;
    if (this.serverTile) this.walkBackTo(this.serverTile);
  }

  /**
   * Cada frame: WASD (con las teclas apretadas ahora) y, si el server dejó de confirmar pasos (se
   * agotó, no le dio el camino…), el avatar vuelve a donde está de verdad.
   */
  update(wasdKeys: Iterable<string>) {
    const direction = wasdDirection(wasdKeys);
    this.wasdDirectionNow = direction;
    // Después de un clic, WASD vuelve a mandar recién cuando cambian las teclas.
    if (this.wasdSuspended) {
      if (direction && sameTile(direction, this.wasdSuspended)) return this.checkStall();
      this.wasdSuspended = null;
      this.wasdActive = false;
      this.wasdTarget = null;
      if (!direction) return this.checkStall();
    }
    this.updateWasd(direction);
    this.checkStall();
  }

  /** El server dejó de confirmar pasos: el avatar vuelve a donde está de verdad. */
  private checkStall() {
    const prediction = this.prediction;
    if (prediction && this.host.now() - prediction.lastConfirmAt >= PREDICTION_STALL_MS) this.cancelPrediction();
  }

  /** ¿Se está caminando con WASD? (al empezar, la escena vuelve la cámara al avatar) */
  isWasdActive(): boolean {
    return this.wasdActive;
  }

  /** Le pasa al avatar los tiles predichos que puede caminar (hasta MAX_LEAD por delante del server). */
  private feed() {
    const prediction = this.prediction;
    const avatar = this.avatar;
    if (!prediction || !avatar) return;
    const limit = Math.min(prediction.path.length, prediction.confirmed + 1 + MAX_LEAD);
    while (prediction.fed < limit) {
      const tile = prediction.path[prediction.fed++];
      avatar.pushTile(tile.x, tile.y);
    }
  }

  /**
   * Caminar con WASD: mientras haya una dirección apretada se pide ir unos tiles adelante desde el
   * tile al que el avatar ya va (un pedido nuevo cada vez que avanza o cambia la dirección), con el
   * recorrido exacto, así no hay idas y vueltas al girar. Al soltar, frena en el tile al que ya iba.
   */
  private updateWasd(direction: TilePoint | null) {
    const avatar = this.avatar;
    const from = this.serverTile;
    if (!direction || !avatar || !from) {
      if (this.wasdActive) {
        // Soltó: frena en el tile al que ya iba (lo predicho hasta ahí y nada más).
        this.wasdActive = false;
        this.wasdTarget = null;
        if (avatar && from) this.go(this.planningBase().base, []);
      }
      return;
    }
    this.wasdActive = true;
    const { base } = this.planningBase();
    const steps = this.wasdSteps(base, direction);
    const target = steps[steps.length - 1];
    if (!target || (this.wasdTarget && sameTile(this.wasdTarget, target))) return;
    this.wasdTarget = target;
    this.go(target, steps);
  }

  /**
   * Los tiles en línea recta en esa dirección (WASD_LOOKAHEAD como mucho). Si choca de entrada,
   * prueba las dos direcciones vecinas para deslizarse por el costado de la pared.
   */
  private wasdSteps(from: TilePoint, direction: TilePoint): TilePoint[] {
    const slides =
      direction.x !== 0 && direction.y !== 0
        ? [{ x: direction.x, y: 0 }, { x: 0, y: direction.y }]
        : direction.x !== 0
          ? [{ x: direction.x, y: -1 }, { x: direction.x, y: 1 }]
          : [{ x: -1, y: direction.y }, { x: 1, y: direction.y }];
    for (const candidate of [direction, ...slides]) {
      const steps: TilePoint[] = [];
      let tile = from;
      while (steps.length < WASD_LOOKAHEAD) {
        const next = { x: tile.x + candidate.x, y: tile.y + candidate.y };
        if (!this.map.isStep(tile, next)) break;
        steps.push(next);
        tile = next;
      }
      if (steps.length > 0) return steps;
    }
    return [];
  }
}
