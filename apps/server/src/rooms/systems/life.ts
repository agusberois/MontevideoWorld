import {
  HOSPITAL_CITY_ID,
  HOSPITAL_SHOP_ID,
  JAIL_CITY_ID,
  LOW_HEALTH,
  MessageType,
  NeedsMessage,
  STEP_MS,
  TIRED_RECOVERY,
  TRAVEL_TICKET_MS,
  TilePoint,
  WALK_ENERGY_FLOOR,
  WEAK_ENERGY_CAP,
  faintFee,
  formatMoney,
  hungerLevel,
} from "@montevideo-world/shared";
import { getCityMap } from "@montevideo-world/shared/cities";
import { issueTravelTicket } from "../../playerStore";
import type { CityRoom } from "../CityRoom";
import { PlayerSession, isWalking } from "../session";
import { weather } from "../../weather";
import { stopActivities } from "./activities";
import { teleport } from "./movement";
import { cancelTrade } from "./trading";
import type { MessageRoutes } from "./types";

/** Necesidades (energía, hambre, salud) y el desmayo. */
export function lifeRoutes(room: CityRoom) {
  return {
    [MessageType.RequestNeeds]: (session) => room.sendNeeds(session),
  } satisfies Partial<MessageRoutes>;
}

/**
 * Cada tick: baja el hambre (salvo preso) y, quieto (sin pescar, vender ni tocar), se recupera energía,
 * más rápido sentado y más lento con hambre (ver `Needs.tick`). La energía va al Schema; hambre y
 * salud al dueño si cambiaron, con un aviso al cruzar un umbral.
 */
export function tickNeeds(room: CityRoom) {
  const seconds = STEP_MS / 1000;
  const { hungerFactor } = weather.current();
  for (const session of room.sessions.values()) {
    const { player, needs } = session;
    needs.tick(seconds, {
      resting: !isWalking(session) && !player.fishing && !player.vending && !player.busking,
      sitting: player.sitting,
      bathing: player.bathing,
      jailed: player.jailLeft > 0,
      hungerFactor,
    });
    if (player.energy !== needs.energy) player.energy = needs.energy;
    // Cansado al llegar al piso de caminar; se le pasa recién con `TIRED_RECOVERY` (ver `needs.ts` de shared).
    const tired = player.tired ? needs.energy < TIRED_RECOVERY : needs.energy <= WALK_ENERGY_FLOOR;
    if (tired !== player.tired) {
      player.tired = tired;
      if (tired) room.notice(session, "Estás cansado: caminás más despacio. Descansá un rato (sentado en un banco es mucho más rápido).");
    }
    if (needs.fainted) {
      faint(room, session);
      continue;
    }
    const sent = session.sentNeeds;
    if (sent?.hunger === needs.hunger && sent.health === needs.health) continue;
    room.sendNeeds(session);
    if (sent) noticeNeedsChange(room, session, sent);
  }
}

/** Avisos al cruzar un umbral para abajo: hambre, muerto de hambre, sin comida (daña) y débil. */
function noticeNeedsChange(room: CityRoom, session: PlayerSession, before: NeedsMessage) {
  const { needs } = session;
  const hungerBefore = hungerLevel(before.hunger);
  const hungerNow = hungerLevel(needs.hunger);
  if (hungerNow !== hungerBefore && hungerNow !== "full" && hungerBefore !== "starving") {
    room.notice(
      session,
      hungerNow === "hungry"
        ? "🍖 Tenés hambre: comé algo. Con hambre, descansar rinde la mitad."
        : "🍖 Estás muerto de hambre: descansar casi no rinde. ¡Comé algo ya!",
    );
  }
  if (before.hunger > 0 && needs.hunger === 0 && session.player.jailLeft === 0) {
    room.notice(session, "❤ Sin nada en la panza, empezás a perder salud. ¡Comé algo!");
  }
  if (before.health >= LOW_HEALTH && needs.health < LOW_HEALTH) {
    room.notice(
      session,
      `❤ Estás débil: la energía no te pasa de ${WEAK_ENERGY_CAP}. Comé bien y descansá, o andá a la guardia del Sanatorio Americano (Tres Cruces).`,
    );
  }
}

/**
 * Desmayo (salud en 0): se corta todo, la ambulancia cobra (`faintFee`) y te despertás con poca
 * salud (`Needs.revive`). Preso, en el patio del penal; en Tres Cruces, en la puerta del
 * sanatorio; en otro barrio, la ambulancia te lleva gratis (pase de viaje a la puerta) y, sin
 * clave (no se puede viajar), te despertás en la plaza del barrio. Nunca se pierden ítems.
 */
function faint(room: CityRoom, session: PlayerSession) {
  const { player, needs, wallet } = session;
  stopActivities(session);
  cancelTrade(room, session, "leave");
  needs.revive();
  player.energy = needs.energy;
  const fee = faintFee(wallet.balance);
  if (fee > 0) wallet.debit(fee);
  room.markWallet(session);
  room.sendNeeds(session);
  const paid = fee > 0 ? `La ambulancia te cobró ${formatMoney(fee)}.` : "La ambulancia no te cobró nada.";
  room.broadcastSystem(`🚑 ${player.name} se desmayó y se lo llevó la ambulancia`, session.client);

  const door = hospitalDoor();
  const jailed = player.jailLeft > 0 && room.map.city.id === JAIL_CITY_ID;
  let wakeUp: TilePoint | undefined;
  let text: string;
  if (jailed) {
    wakeUp = room.randomPrisonTile();
    text = `Te desmayaste… Te despertaste en la enfermería del penal. ${paid}`;
  } else if (room.map.city.id === HOSPITAL_CITY_ID && door) {
    wakeUp = door;
    text = `Te desmayaste… Te despertaste en la guardia del Sanatorio Americano. ${paid}`;
  } else if (session.key && door) {
    room.savePlayer(session);
    issueTravelTicket(session.key, HOSPITAL_CITY_ID, Date.now() + TRAVEL_TICKET_MS, Date.now(), { at: door });
    room.sendTo(session, MessageType.Faint, { text: `Te desmayaste… La ambulancia te lleva al Sanatorio Americano. ${paid}` });
    room.sendTo(session, MessageType.TravelApproved, { cityId: HOSPITAL_CITY_ID, ambulance: true });
    return;
  } else {
    wakeUp = room.randomSpawnTile();
    text = `Te desmayaste… Te despertaste en la plaza. ${paid}`;
  }
  if (wakeUp) teleport(session, wakeUp);
  room.sendTo(session, MessageType.Faint, { text });
}

/** Tile caminable pegado a la guardia del sanatorio, donde te deja la ambulancia (el mismo para todos). */
function hospitalDoor(): TilePoint | undefined {
  const map = getCityMap(HOSPITAL_CITY_ID);
  // Con Tres Cruces oculto (`CityInfo.hidden`) no hay ambulancia: te despertás en la plaza.
  if (map?.city.hidden) return undefined;
  const shop = map?.city.shops.find((candidate) => candidate.id === HOSPITAL_SHOP_ID);
  if (!map || !shop) return undefined;
  // Del lado de la calle (sur-este del edificio), que es por donde se ve la entrada.
  return map.shopApproach(shop, { x: shop.area.x + shop.area.width, y: shop.area.y + shop.area.height + 1 });
}
