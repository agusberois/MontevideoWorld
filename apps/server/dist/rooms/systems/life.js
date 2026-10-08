"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lifeRoutes = lifeRoutes;
exports.tickNeeds = tickNeeds;
const shared_1 = require("@montevideo-world/shared");
const cities_1 = require("@montevideo-world/shared/cities");
const playerStore_1 = require("../../playerStore");
const session_1 = require("../session");
const weather_1 = require("../../weather");
const activities_1 = require("./activities");
const movement_1 = require("./movement");
const trading_1 = require("./trading");
/** Necesidades (energía, hambre, salud) y el desmayo. */
function lifeRoutes(room) {
    return {
        [shared_1.MessageType.RequestNeeds]: (session) => room.sendNeeds(session),
    };
}
/**
 * Cada tick: baja el hambre (salvo preso) y, quieto (sin pescar, vender ni tocar), se recupera energía,
 * más rápido sentado y más lento con hambre (ver `Needs.tick`). La energía va al Schema; hambre y
 * salud al dueño si cambiaron, con un aviso al cruzar un umbral.
 */
function tickNeeds(room) {
    const seconds = shared_1.STEP_MS / 1000;
    const { hungerFactor } = weather_1.weather.current();
    for (const session of room.sessions.values()) {
        const { player, needs } = session;
        needs.tick(seconds, {
            resting: !(0, session_1.isWalking)(session) && !player.fishing && !player.vending && !player.busking && !player.parking,
            sitting: player.sitting,
            bathing: player.bathing,
            jailed: player.jailLeft > 0,
            hungerFactor,
        });
        if (player.energy !== needs.energy)
            player.energy = needs.energy;
        // Cansado al llegar al piso de caminar; se le pasa recién con `TIRED_RECOVERY` (ver `needs.ts` de shared).
        const tired = player.tired ? needs.energy < shared_1.TIRED_RECOVERY : needs.energy <= shared_1.WALK_ENERGY_FLOOR;
        if (tired !== player.tired) {
            player.tired = tired;
            if (tired)
                room.notice(session, "Estás cansado: caminás más despacio. Descansá un rato (sentado en un banco es mucho más rápido).");
        }
        if (needs.fainted) {
            faint(room, session);
            continue;
        }
        const sent = session.sentNeeds;
        if (sent?.hunger === needs.hunger && sent.health === needs.health)
            continue;
        room.sendNeeds(session);
        if (sent)
            noticeNeedsChange(room, session, sent);
    }
}
/** Avisos al cruzar un umbral para abajo: hambre, muerto de hambre, sin comida (daña) y débil. */
function noticeNeedsChange(room, session, before) {
    const { needs } = session;
    const hungerBefore = (0, shared_1.hungerLevel)(before.hunger);
    const hungerNow = (0, shared_1.hungerLevel)(needs.hunger);
    if (hungerNow !== hungerBefore && hungerNow !== "full" && hungerBefore !== "starving") {
        room.notice(session, hungerNow === "hungry"
            ? "🍖 Tenés hambre: comé algo. Con hambre, descansar rinde la mitad."
            : "🍖 Estás muerto de hambre: descansar casi no rinde. ¡Comé algo ya!");
    }
    if (before.hunger > 0 && needs.hunger === 0 && session.player.jailLeft === 0) {
        room.notice(session, "❤ Sin nada en la panza, empezás a perder salud. ¡Comé algo!");
    }
    if (before.health >= shared_1.LOW_HEALTH && needs.health < shared_1.LOW_HEALTH) {
        room.notice(session, `❤ Estás débil: la energía no te pasa de ${shared_1.WEAK_ENERGY_CAP}. Comé bien y descansá${(0, shared_1.isHospitalOpen)() ? ", o andá a la guardia del Sanatorio Americano (Tres Cruces)" : ", o tomate un remedio de la farmacia"}.`);
    }
}
/**
 * Desmayo (salud en 0): se corta todo, la ambulancia cobra (`faintFee`) y te despertás con poca
 * salud (`Needs.revive`). Preso, en el patio del penal; en Tres Cruces, en la puerta del
 * sanatorio; en otro barrio, la ambulancia te lleva gratis (pase de viaje a la puerta) y, sin
 * clave (no se puede viajar), te despertás en la plaza del barrio. Nunca se pierden ítems.
 */
function faint(room, session) {
    const { player, needs, wallet } = session;
    (0, activities_1.stopActivities)(session);
    (0, trading_1.cancelTrade)(room, session, "leave");
    needs.revive();
    player.energy = needs.energy;
    const fee = (0, shared_1.faintFee)(wallet.balance);
    if (fee > 0)
        wallet.debit(fee);
    room.markWallet(session);
    room.sendNeeds(session);
    const paid = fee > 0 ? `La ambulancia te cobró ${(0, shared_1.formatMoney)(fee)}.` : "La ambulancia no te cobró nada.";
    room.broadcastSystem(`🚑 ${player.name} se desmayó y se lo llevó la ambulancia`, session.client);
    const door = hospitalDoor();
    const jailed = player.jailLeft > 0 && room.map.city.id === shared_1.JAIL_CITY_ID;
    let wakeUp;
    let text;
    if (jailed) {
        wakeUp = room.randomPrisonTile();
        text = `Te desmayaste… Te despertaste en la enfermería del penal. ${paid}`;
    }
    else if (room.map.city.id === shared_1.HOSPITAL_CITY_ID && door) {
        wakeUp = door;
        text = `Te desmayaste… Te despertaste en la guardia del Sanatorio Americano. ${paid}`;
    }
    else if (session.key && door) {
        room.savePlayer(session);
        (0, playerStore_1.issueTravelTicket)(session.key, shared_1.HOSPITAL_CITY_ID, Date.now() + shared_1.TRAVEL_TICKET_MS, Date.now(), { at: door });
        room.sendTo(session, shared_1.MessageType.Faint, { text: `Te desmayaste… La ambulancia te lleva al Sanatorio Americano. ${paid}` });
        room.sendTo(session, shared_1.MessageType.TravelApproved, { cityId: shared_1.HOSPITAL_CITY_ID, ambulance: true });
        return;
    }
    else {
        wakeUp = room.randomSpawnTile();
        text = `Te desmayaste… Te despertaste en la plaza. ${paid}`;
    }
    if (wakeUp)
        (0, movement_1.teleport)(session, wakeUp);
    room.sendTo(session, shared_1.MessageType.Faint, { text });
}
/** Tile caminable pegado a la guardia del sanatorio, donde te deja la ambulancia (el mismo para todos). */
function hospitalDoor() {
    const map = (0, cities_1.getCityMap)(shared_1.HOSPITAL_CITY_ID);
    // Con Tres Cruces oculto (`CityInfo.hidden`) no hay ambulancia: te despertás en la plaza.
    if (map?.city.hidden)
        return undefined;
    const shop = map?.city.shops.find((candidate) => candidate.id === shared_1.HOSPITAL_SHOP_ID);
    if (!map || !shop)
        return undefined;
    // Del lado de la calle (sur-este del edificio), que es por donde se ve la entrada.
    return map.shopApproach(shop, { x: shop.area.x + shop.area.width, y: shop.area.y + shop.area.height + 1 });
}
//# sourceMappingURL=life.js.map