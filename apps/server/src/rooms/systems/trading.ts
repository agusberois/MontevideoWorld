import { MessageType, TRADE_INVITE_MS, TradeOffer, normalizeTradeOffer } from "@montevideo-world/shared";
import { Trade, TradeParty, checkOffer, clampOffer, executeTrade, partnerOf } from "../../trades";
import type { CityRoom } from "../CityRoom";
import type { PlayerSession } from "../session";
import type { MessageRoutes } from "./types";

/** Intercambio entre jugadores de la sala (invitar, ofertas, aceptar). Ver `trades.ts`. */
export function tradeRoutes(room: CityRoom) {
  return {
    /**
     * Invitar a intercambiar. Al invitado le llega `trade:invite`; si él ya te había invitado, el
     * intercambio arranca directo.
     */
    [MessageType.TradeRequest]: (session, message) => {
      const target = room.sessions.get(message.targetId);
      const id = session.client.sessionId;
      // Con una sesión que se está cerrando no se intercambia (ver `CityRoom.closeSession`).
      if (!target || target === session || target.closed) return;
      if (room.trades.get(id)) return room.notice(session, "Ya estás en un intercambio.");
      if (room.trades.get(message.targetId)) return room.notice(session, `${target.player.name} está en otro intercambio.`);

      const result = room.trades.invite(id, message.targetId, Date.now());
      if (result === "mutual") return startTrade(room, message.targetId, id);
      if (result === "pending") return room.notice(session, `Ya invitaste a ${target.player.name}: esperá que responda.`);

      room.sendTo(target, MessageType.TradeInvite, { fromId: id, fromName: session.player.name, expiresInMs: TRADE_INVITE_MS });
      room.notice(session, `Invitaste a ${target.player.name} a intercambiar.`);
    },

    [MessageType.TradeRespond]: (session, message) => {
      const inviter = room.sessions.get(message.fromId);
      const id = session.client.sessionId;
      if (!room.trades.takeInvite(message.fromId, id, Date.now()) || !inviter || inviter.closed) {
        return room.notice(session, "Esa invitación ya venció.");
      }
      if (!message.accept) return room.notice(inviter, `${session.player.name} no quiso intercambiar.`);
      if (room.trades.get(id)) return room.notice(session, "Ya estás en un intercambio.");
      if (room.trades.get(message.fromId)) return room.notice(session, `${inviter.player.name} está en otro intercambio.`);
      startTrade(room, message.fromId, id);
    },

    /** Reemplazar la oferta propia: sólo con lo que hay en la mochila y en la billetera. */
    [MessageType.TradeOffer]: (session, message) => {
      const id = session.client.sessionId;
      const trade = room.trades.get(id);
      const offer = normalizeTradeOffer(message);
      if (!trade || !offer) return;
      const problem = checkOffer({ ...tradeParty(room, session), offer });
      if (problem) {
        room.notice(session, problem);
        return sendTradeState(room, trade);
      }
      room.trades.setOffer(trade, id, offer);
      sendTradeState(room, trade);
    },

    /** Aceptar; cuando aceptan los dos se hace el intercambio (o se avisa por qué no se pudo). */
    [MessageType.TradeAccept]: (session) => {
      const trade = room.trades.get(session.client.sessionId);
      if (!trade || !room.trades.accept(trade, session.client.sessionId)) {
        if (trade) sendTradeState(room, trade);
        return;
      }

      const a = room.sessions.get(trade.a);
      const b = room.sessions.get(trade.b);
      const problem = a && b && !a.closed && !b.closed ? executeTrade(tradeParty(room, a, trade), tradeParty(room, b, trade)) : "El intercambio ya no es válido.";
      if (problem || !a || !b) {
        trade.accepted.clear();
        sendTradeState(room, trade);
        for (const side of [a, b]) if (side) room.notice(side, `No se pudo intercambiar: ${problem}`);
        return;
      }

      room.trades.end(trade);
      for (const [side, partner] of [
        [a, b],
        [b, a],
      ]) {
        room.markInventory(side);
        room.markWallet(side);
        // Se guardan los dos en el acto: si el server se cayera antes del guardado periódico, no
        // puede quedar uno guardado con lo recibido y el otro sin lo que dio.
        room.savePlayer(side);
        room.sendTo(side, MessageType.TradeClosed, { ok: true, text: `¡Listo! Intercambiaste con ${partner.player.name}.` });
      }
    },

    [MessageType.TradeCancel]: (session) => cancelTrade(room, session, "cancel"),
  } satisfies Partial<MessageRoutes>;
}

function startTrade(room: CityRoom, a: string, b: string) {
  sendTradeState(room, room.trades.start(a, b));
}

/** Cancelar (a mano o porque alguien se fue): les avisa a los dos y no se toca nada. */
export function cancelTrade(room: CityRoom, session: PlayerSession, reason: "cancel" | "leave") {
  const id = session.client.sessionId;
  const trade = reason === "leave" ? room.trades.removePlayer(id) : room.trades.get(id);
  if (!trade) return;
  room.trades.end(trade);
  const name = session.player.name;
  const partner = room.sessions.get(partnerOf(trade, id));
  if (partner) {
    const text = reason === "leave" ? `${name} se fue: se canceló el intercambio.` : `${name} canceló el intercambio.`;
    room.sendTo(partner, MessageType.TradeClosed, { ok: false, text });
  }
  if (reason === "cancel") room.sendTo(session, MessageType.TradeClosed, { ok: false, text: "Cancelaste el intercambio." });
}

/**
 * Si con el intercambio abierto cambió la mochila o la plata (se puso algo, vendió, pescó…) y la
 * oferta ya no alcanza, se recorta a lo que hay. Eso anula las aceptaciones.
 */
export function revalidateTrade(room: CityRoom, session: PlayerSession) {
  const trade = room.trades.get(session.client.sessionId);
  if (!trade) return;
  const clamped = clampOffer(tradeParty(room, session, trade));
  if (!clamped) return;
  room.trades.setOffer(trade, session.client.sessionId, clamped);
  sendTradeState(room, trade);
}

function tradeParty(room: CityRoom, session: PlayerSession, trade?: Trade): TradeParty {
  const offer = trade?.offers.get(session.client.sessionId) ?? { items: [], money: 0 };
  return { name: session.player.name, inventory: session.inventory, wallet: session.wallet, offer };
}

/** A cada uno le llega el intercambio desde su lado (`mine` / `theirs`). */
function sendTradeState(room: CityRoom, trade: Trade) {
  for (const id of [trade.a, trade.b]) {
    const session = room.sessions.get(id);
    const partnerId = partnerOf(trade, id);
    const partner = room.sessions.get(partnerId);
    if (!session) continue;
    const mine = trade.offers.get(id)!;
    const theirs = trade.offers.get(partnerId)!;
    room.sendTo(session, MessageType.TradeState, {
      partnerId,
      partnerName: partner?.player.name ?? "",
      mine: { offer: mine, accepted: trade.accepted.has(id), uses: offerUses(session, mine) },
      theirs: { offer: theirs, accepted: trade.accepted.has(partnerId), uses: partner ? offerUses(partner, theirs) : {} },
    });
  }
}

/** Usos de cada herramienta ofrecida (las que se pasarían: las más gastadas primero). */
function offerUses(session: PlayerSession, offer: TradeOffer): Record<string, number[]> {
  const uses: Record<string, number[]> = {};
  for (const { itemId, quantity } of offer.items) {
    const list = session.inventory.nextUses(itemId, quantity);
    if (list.length > 0) uses[itemId] = list;
  }
  return uses;
}
