import { MessageType, MessageTypeName } from "@montevideo-world/shared";

/**
 * Límite de frecuencia de los mensajes que manda cada cliente (_token bucket_ por cliente y por tipo).
 * No depende de Colyseus: se prueba con un `now` cualquiera.
 *
 * Cada tipo tiene un balde de `burst` fichas que se recarga a `perSecond` fichas por segundo; cada
 * mensaje gasta una. Sin fichas, el mensaje se descarta en silencio. Los descartes suman a un
 * contador de abuso por cliente que baja solo (`ABUSE_DECAY_PER_SECOND`): un cliente que se pasa un
 * poco de vez en cuando nunca llega al tope, uno que spamea de forma sostenida sí y se lo desconecta.
 */

export interface RateLimit {
  /** Mensajes por segundo sostenidos. */
  perSecond: number;
  /** Cuántos se pueden mandar de golpe (tamaño del balde). */
  burst: number;
}

/**
 * Límites por tipo de mensaje (cliente → servidor), en un solo lugar. Los que no están usan
 * `DEFAULT_RATE_LIMIT`. Son holgados a propósito: el juego normal no se tiene que acercar.
 *
 * - `move`: WASD manda un pedido por tile que avanza (4/s) más uno por cada cambio de dirección, y
 *   los clics se pueden encadenar rápido (5–8/s). 20/s con ráfaga de 40 deja mucho margen.
 * - Tienda, mochila, comer, cajas, ropa, oferta del intercambio: son clics sobre la UI (comprar o
 *   vender varias unidades seguidas, armar la oferta con +/−). Cada uno manda la mochila de vuelta.
 * - Lo demás (sentarse, pescar, vender, palmeras, intercambio, admin…): acciones sueltas.
 *   El chat y el saludo además tienen su propio cooldown (`CHAT_COOLDOWN_MS`), que no cambia.
 */
export const DEFAULT_RATE_LIMIT: RateLimit = { perSecond: 5, burst: 10 };

const UI_RATE_LIMIT: RateLimit = { perSecond: 10, burst: 20 };

export const MESSAGE_RATE_LIMITS: Partial<Record<MessageTypeName, RateLimit>> = {
  [MessageType.Move]: { perSecond: 20, burst: 40 },
  [MessageType.Equip]: UI_RATE_LIMIT,
  [MessageType.RequestInventory]: UI_RATE_LIMIT,
  [MessageType.InventoryMove]: UI_RATE_LIMIT,
  [MessageType.RequestWallet]: UI_RATE_LIMIT,
  [MessageType.RequestNeeds]: UI_RATE_LIMIT,
  [MessageType.ShopVisit]: UI_RATE_LIMIT,
  [MessageType.ShopBuy]: UI_RATE_LIMIT,
  [MessageType.ShopCheckout]: UI_RATE_LIMIT,
  [MessageType.ShopSell]: UI_RATE_LIMIT,
  [MessageType.ShopHaggle]: UI_RATE_LIMIT,
  [MessageType.FoodEat]: UI_RATE_LIMIT,
  [MessageType.BoxOpen]: UI_RATE_LIMIT,
  [MessageType.TradeOffer]: UI_RATE_LIMIT,
  [MessageType.AdminGive]: UI_RATE_LIMIT,
  [MessageType.AdminMatch]: UI_RATE_LIMIT,
  [MessageType.AdminWeather]: UI_RATE_LIMIT,
};

/** Tipo de los mensajes que no tienen handler (se cuentan juntos, con el límite por defecto). */
export const UNKNOWN_MESSAGE_TYPE = "*";

/** Cuánto baja por segundo el contador de abuso de cada cliente. */
const ABUSE_DECAY_PER_SECOND = 20;
/**
 * Tope del contador de abuso: al pasarlo se desconecta al cliente. Con un spam de 500 `move`/s llega
 * en ~2 s; pasándose por menos de `ABUSE_DECAY_PER_SECOND` mensajes por segundo, nunca.
 */
const ABUSE_LIMIT = 1000;

export type RateDecision = "ok" | "drop" | "kick";

interface Bucket {
  tokens: number;
  updatedAt: number;
}

interface ClientRate {
  buckets: Map<string, Bucket>;
  abuse: number;
  abuseAt: number;
  /** Descartes desde que entró (para el log al desconectarlo). */
  dropped: number;
}

export class RateLimiter {
  private readonly clients = new Map<string, ClientRate>();
  /** Totales desde que arrancó la sala (para `/health`). */
  droppedTotal = 0;
  kickedTotal = 0;

  constructor(
    private readonly limits: Partial<Record<string, RateLimit>> = MESSAGE_RATE_LIMITS,
    private readonly fallback: RateLimit = DEFAULT_RATE_LIMIT,
  ) {}

  /** ¿Se procesa este mensaje? "drop" = descartarlo; "kick" = descartarlo y desconectar al cliente. */
  check(clientId: string, type: string, now: number): RateDecision {
    let state = this.clients.get(clientId);
    if (!state) {
      state = { buckets: new Map(), abuse: 0, abuseAt: now, dropped: 0 };
      this.clients.set(clientId, state);
    }

    const limit = this.limits[type] ?? this.fallback;
    let bucket = state.buckets.get(type);
    if (!bucket) {
      bucket = { tokens: limit.burst, updatedAt: now };
      state.buckets.set(type, bucket);
    } else {
      bucket.tokens = Math.min(limit.burst, bucket.tokens + ((now - bucket.updatedAt) / 1000) * limit.perSecond);
      bucket.updatedAt = now;
    }
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return "ok";
    }

    state.dropped += 1;
    this.droppedTotal += 1;
    state.abuse = Math.max(0, state.abuse - ((now - state.abuseAt) / 1000) * ABUSE_DECAY_PER_SECOND) + 1;
    state.abuseAt = now;
    if (state.abuse <= ABUSE_LIMIT) return "drop";
    this.kickedTotal += 1;
    return "kick";
  }

  /** Mensajes descartados de este cliente desde que entró. */
  droppedBy(clientId: string): number {
    return this.clients.get(clientId)?.dropped ?? 0;
  }

  /** El cliente se fue: se libera su estado. */
  forget(clientId: string) {
    this.clients.delete(clientId);
  }

  get size() {
    return this.clients.size;
  }
}
