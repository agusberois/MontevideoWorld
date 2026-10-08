"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeManager = void 0;
exports.partnerOf = partnerOf;
exports.checkOffer = checkOffer;
exports.clampOffer = clampOffer;
exports.executeTrade = executeTrade;
const shared_1 = require("@montevideo-world/shared");
/**
 * Invitaciones e intercambios de una sala. Sólo estado: no manda mensajes ni toca mochilas
 * (eso lo hacen `CityRoom` y `executeTrade`). Cada jugador está en un intercambio a la vez.
 */
class TradeManager {
    constructor() {
        /** `from>to` → cuándo vence la invitación (ms). */
        this.invites = new Map();
        this.trades = new Map();
    }
    get(sessionId) {
        return this.trades.get(sessionId);
    }
    /** Invita `from` → `to`. Si `to` ya había invitado a `from`, se toma como aceptada. */
    invite(from, to, now) {
        if (this.takeInvite(to, from, now))
            return "mutual";
        const key = inviteKey(from, to);
        if ((this.invites.get(key) ?? 0) > now)
            return "pending";
        this.invites.set(key, now + shared_1.TRADE_INVITE_MS);
        return "invited";
    }
    /** Consume la invitación `from` → `to`: true si existía y no había vencido. */
    takeInvite(from, to, now) {
        const key = inviteKey(from, to);
        const expiresAt = this.invites.get(key);
        this.invites.delete(key);
        return expiresAt !== undefined && expiresAt > now;
    }
    start(a, b) {
        const trade = {
            a,
            b,
            offers: new Map([
                [a, shared_1.EMPTY_TRADE_OFFER],
                [b, shared_1.EMPTY_TRADE_OFFER],
            ]),
            accepted: new Set(),
        };
        this.trades.set(a, trade);
        this.trades.set(b, trade);
        return trade;
    }
    /** Reemplaza la oferta de `sessionId`: cualquier cambio anula las dos aceptaciones. */
    setOffer(trade, sessionId, offer) {
        trade.offers.set(sessionId, offer);
        trade.accepted.clear();
    }
    /** Marca la aceptación de `sessionId`; true si ya aceptaron los dos. */
    accept(trade, sessionId) {
        trade.accepted.add(sessionId);
        return trade.accepted.size === 2;
    }
    end(trade) {
        this.trades.delete(trade.a);
        this.trades.delete(trade.b);
    }
    /** El jugador se fue: borra sus invitaciones y devuelve su intercambio (ya terminado), si tenía. */
    removePlayer(sessionId) {
        for (const key of this.invites.keys()) {
            const [from, to] = key.split(">");
            if (from === sessionId || to === sessionId)
                this.invites.delete(key);
        }
        const trade = this.trades.get(sessionId);
        if (trade)
            this.end(trade);
        return trade;
    }
}
exports.TradeManager = TradeManager;
function partnerOf(trade, sessionId) {
    return trade.a === sessionId ? trade.b : trade.a;
}
function inviteKey(from, to) {
    return `${from}>${to}`;
}
/** ¿Tiene en la mochila y en la billetera todo lo que ofrece? Si no, el motivo. */
function checkOffer(party, subject = "No tenés") {
    for (const { itemId, quantity } of party.offer.items) {
        if (!(0, shared_1.isTradable)((0, shared_1.getItem)(itemId)))
            return `${(0, shared_1.getItem)(itemId)?.name ?? itemId} no se puede intercambiar.`;
        if (party.inventory.count(itemId) < quantity) {
            return `${subject} ${quantity > 1 ? `${quantity} × ` : ""}${(0, shared_1.getItem)(itemId)?.name ?? itemId} en la mochila.`;
        }
    }
    if (party.offer.money > party.wallet.balance)
        return `${subject} ${(0, shared_1.formatMoney)(party.offer.money)}.`;
    return null;
}
/**
 * Recorta la oferta a lo que de verdad hay (p. ej. se puso una prenda ofrecida o vendió un pescado
 * con el intercambio abierto). Devuelve null si la oferta ya era válida.
 */
function clampOffer(party) {
    if (!checkOffer(party))
        return null;
    const items = party.offer.items
        .map(({ itemId, quantity }) => ({ itemId, quantity: Math.min(quantity, party.inventory.count(itemId)) }))
        .filter((stack) => stack.quantity > 0);
    return { items, money: Math.min(party.offer.money, party.wallet.balance) };
}
/**
 * Hace el intercambio si todo cierra: cada uno tiene lo que ofreció, a los dos les entra lo que
 * reciben y nadie pasa el tope de plata. Primero se simula con copias de las mochilas; si algo
 * falla no se toca nada y se devuelve el motivo. Devuelve null si se hizo. Las herramientas pasan
 * con el desgaste que tienen (las más usadas primero, como muestra `uses` en el estado).
 */
function executeTrade(a, b) {
    const missing = checkOffer(a, `${a.name} ya no tiene`) ?? checkOffer(b, `${b.name} ya no tiene`);
    if (missing)
        return missing;
    // Simulación: lo que da cada uno (con sus usos) sale de una copia de su mochila…
    const afterA = a.inventory.clone();
    const afterB = b.inventory.clone();
    const fromA = takeOffer(afterA, a.offer);
    const fromB = takeOffer(afterB, b.offer);
    // …y tiene que entrar en la copia de la del otro.
    for (const [self, after, received] of [
        [a, afterA, fromB],
        [b, afterB, fromA],
    ]) {
        if (!received.every((unit) => after.add(unit.itemId, unit.uses)))
            return `${self.name} no tiene lugar en la mochila.`;
    }
    for (const [self, other] of [
        [a, b],
        [b, a],
    ]) {
        if (self.wallet.balance - self.offer.money + other.offer.money > shared_1.MAX_MONEY) {
            return `${self.name} no puede tener tanta plata.`;
        }
    }
    // Todo cierra: se aplica de verdad, en el mismo orden que la simulación.
    const givenA = takeOffer(a.inventory, a.offer);
    const givenB = takeOffer(b.inventory, b.offer);
    for (const unit of givenB)
        a.inventory.add(unit.itemId, unit.uses);
    for (const unit of givenA)
        b.inventory.add(unit.itemId, unit.uses);
    if (a.offer.money > 0)
        a.wallet.debit(a.offer.money);
    if (b.offer.money > 0)
        b.wallet.debit(b.offer.money);
    if (b.offer.money > 0)
        a.wallet.credit(b.offer.money);
    if (a.offer.money > 0)
        b.wallet.credit(a.offer.money);
    return null;
}
/** Saca de la mochila lo ofrecido, unidad por unidad, y devuelve esas unidades (con sus usos). */
function takeOffer(inventory, offer) {
    const units = [];
    for (const { itemId, quantity } of offer.items) {
        for (let i = 0; i < quantity; i += 1) {
            const unit = inventory.remove(itemId);
            if (unit)
                units.push(unit);
        }
    }
    return units;
}
//# sourceMappingURL=trades.js.map