"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.UNKNOWN_MESSAGE_TYPE = exports.MESSAGE_RATE_LIMITS = exports.DEFAULT_RATE_LIMIT = void 0;
const shared_1 = require("@montevideo-world/shared");
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
exports.DEFAULT_RATE_LIMIT = { perSecond: 5, burst: 10 };
const UI_RATE_LIMIT = { perSecond: 10, burst: 20 };
exports.MESSAGE_RATE_LIMITS = {
    [shared_1.MessageType.Move]: { perSecond: 20, burst: 40 },
    [shared_1.MessageType.Equip]: UI_RATE_LIMIT,
    [shared_1.MessageType.RequestInventory]: UI_RATE_LIMIT,
    [shared_1.MessageType.InventoryMove]: UI_RATE_LIMIT,
    [shared_1.MessageType.RequestWallet]: UI_RATE_LIMIT,
    [shared_1.MessageType.RequestNeeds]: UI_RATE_LIMIT,
    [shared_1.MessageType.ShopVisit]: UI_RATE_LIMIT,
    [shared_1.MessageType.ShopBuy]: UI_RATE_LIMIT,
    [shared_1.MessageType.ShopCheckout]: UI_RATE_LIMIT,
    [shared_1.MessageType.ShopSellMany]: UI_RATE_LIMIT,
    [shared_1.MessageType.ShopSell]: UI_RATE_LIMIT,
    [shared_1.MessageType.ShopHaggle]: UI_RATE_LIMIT,
    [shared_1.MessageType.FoodEat]: UI_RATE_LIMIT,
    [shared_1.MessageType.BoxOpen]: UI_RATE_LIMIT,
    [shared_1.MessageType.TradeOffer]: UI_RATE_LIMIT,
    [shared_1.MessageType.AdminGive]: UI_RATE_LIMIT,
    [shared_1.MessageType.AdminMatch]: UI_RATE_LIMIT,
    [shared_1.MessageType.AdminWeather]: UI_RATE_LIMIT,
};
/** Tipo de los mensajes que no tienen handler (se cuentan juntos, con el límite por defecto). */
exports.UNKNOWN_MESSAGE_TYPE = "*";
/** Cuánto baja por segundo el contador de abuso de cada cliente. */
const ABUSE_DECAY_PER_SECOND = 20;
/**
 * Tope del contador de abuso: al pasarlo se desconecta al cliente. Con un spam de 500 `move`/s llega
 * en ~2 s; pasándose por menos de `ABUSE_DECAY_PER_SECOND` mensajes por segundo, nunca.
 */
const ABUSE_LIMIT = 1000;
class RateLimiter {
    constructor(limits = exports.MESSAGE_RATE_LIMITS, fallback = exports.DEFAULT_RATE_LIMIT) {
        this.limits = limits;
        this.fallback = fallback;
        this.clients = new Map();
        /** Totales desde que arrancó la sala (para `/health`). */
        this.droppedTotal = 0;
        this.kickedTotal = 0;
    }
    /** ¿Se procesa este mensaje? "drop" = descartarlo; "kick" = descartarlo y desconectar al cliente. */
    check(clientId, type, now) {
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
        }
        else {
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
        if (state.abuse <= ABUSE_LIMIT)
            return "drop";
        this.kickedTotal += 1;
        return "kick";
    }
    /** Mensajes descartados de este cliente desde que entró. */
    droppedBy(clientId) {
        return this.clients.get(clientId)?.dropped ?? 0;
    }
    /** El cliente se fue: se libera su estado. */
    forget(clientId) {
        this.clients.delete(clientId);
    }
    get size() {
        return this.clients.size;
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rateLimit.js.map