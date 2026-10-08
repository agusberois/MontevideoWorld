"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.standUp = standUp;
exports.isWalking = isWalking;
exports.halt = halt;
exports.oncePerTick = oncePerTick;
const shared_1 = require("@montevideo-world/shared");
function createSession(client, player, inventory, wallet, needs, key) {
    return {
        client,
        player,
        inventory,
        wallet,
        needs,
        key,
        path: [],
        stepWait: 0,
        stepCredit: 0,
        pending: null,
        welcome: { ...shared_1.NEW_WELCOME },
        fishingTimer: null,
        vendingTimer: null,
        customerTimer: null,
        customerOut: false,
        buskingTimer: null,
        crowdTimer: null,
        crowdOut: false,
        parkingTimer: null,
        carTimer: null,
        carOut: false,
        typingUntil: 0,
        gestureUntil: 0,
        pairRequest: null,
        blackjack: null,
        lastChatAt: 0,
        lastChatText: "",
        sentNeeds: null,
        inventoryDirty: false,
        walletDirty: false,
        closed: false,
        ip: "?",
        searchedThisTick: false,
        queuedSearch: null,
        follow: null,
    };
}
/** Se levanta del banco o sale del jacuzzi (cualquier otra cosa que haga lo saca de ahí). */
function standUp(player) {
    player.sitting = false;
    player.bathing = false;
}
/** ¿Está caminando? */
function isWalking(session) {
    return session.path.length > 0;
}
/** Frena: sin camino ni nada pendiente para cuando llegue (y deja de seguir a quien seguía). */
function halt(session) {
    session.follow = null;
    session.player.following = "";
    session.path = [];
    session.stepWait = 0;
    session.stepCredit = 0;
    session.pending = null;
    session.queuedSearch = null;
}
/**
 * Para los pedidos que buscan camino (`findPath`: un BFS por el mapa, hasta ~1 ms en los grandes):
 * a lo sumo uno por jugador por tick. El primero se resuelve en el acto (al jugar no se nota); los
 * que llegan después en el mismo tick no se calculan: queda el **último** y se resuelve al empezar el
 * próximo tick (`stepPlayers` en `systems/movement.ts`), igual que si hubiera llegado ahí. Sin esto, mandar `move` a 20/s con
 * destinos lejanos le costaba CPU a todas las salas (un solo hilo). Cualquier `halt` lo descarta
 * (otra acción más nueva manda).
 */
function oncePerTick(_type, run) {
    const handler = run;
    return ((session, message) => {
        if (!session.searchedThisTick) {
            session.searchedThisTick = true;
            session.queuedSearch = null;
            return handler(session, message);
        }
        session.queuedSearch = () => handler(session, message);
    });
}
//# sourceMappingURL=session.js.map