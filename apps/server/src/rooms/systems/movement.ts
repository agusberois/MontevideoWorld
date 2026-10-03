import { Bench, EXHAUSTED_RECOVERY, MAX_ROUTE_LENGTH, MessageType, TilePoint, WALK_ENERGY_COST, WALK_HUNGER_COST, WEEVIL_REWARD } from "@montevideo-world/shared";
import type { CityRoom } from "../CityRoom";
import { PlayerSession, halt, isWalking, oncePerTick } from "../session";
import { stopActivities } from "./activities";
import { openShop } from "./shops";
import type { MessageRoutes } from "./types";

/** Caminar, sentarse, sacudir palmeras y patear picudos; el paso de cada tick (`stepPlayers`). */
export function movementRoutes(room: CityRoom) {
  return {
    [MessageType.Move]: oncePerTick(MessageType.Move, (session, message) => {
      const { player } = session;
      if (!room.map.isWalkable(message.x, message.y)) return;
      if (!session.needs.hasEnergy(WALK_ENERGY_COST)) return notifyExhausted(room, session);
      // Cualquier otra acción recoge la línea (o deja de vender).
      stopActivities(session);

      // El recorrido que propone el cliente (el que ya está mostrando), si arranca desde acá y es
      // válido paso a paso; si no, el camino más corto. Igual se avanza un tile por tick: no da ventaja.
      const from = { x: player.x, y: player.y };
      const target = { x: message.x, y: message.y };
      const route = message.path ? room.map.followRoute(from, message.path.slice(0, MAX_ROUTE_LENGTH)) : null;
      let path = route ?? room.map.findPath(from, target);
      // Si el recorrido no llega al destino (se cortó o se invalidó a mitad), el resto lo completa el server.
      const end = path[path.length - 1] ?? from;
      if (route && (end.x !== target.x || end.y !== target.y)) path = [...path, ...room.map.findPath(end, target)];
      // Caminar a otro lado cancela sentarse, ir a una tienda o a una palmera. Clic en el propio tile
      // o destino inalcanzable: frena donde está.
      halt(session);
      if (path.length === 0) return;
      player.sitting = false;
      session.path = path;
    }),

    /** Clic en un banco: caminar hasta enfrente y sentarse al llegar (si sigue libre). */
    [MessageType.Sit]: oncePerTick(MessageType.Sit, (session, message) => {
      const { player } = session;
      const bench = room.map.benchAt(message.x, message.y);
      if (!bench || isBenchTaken(room, bench, session)) return;
      stopActivities(session);
      if (player.sitting && player.x === bench.x && player.y === bench.y) return;

      const approach = room.map.benchApproach(bench);
      if (!approach) return;
      const path = room.map.findPath({ x: player.x, y: player.y }, approach);
      const alreadyThere = player.x === approach.x && player.y === approach.y;
      if (path.length === 0 && !alreadyThere) return;

      player.sitting = false;
      session.path = path;
      session.pending = { kind: "bench", bench };
    }),

    /** Clic en una palmera: si está al lado la sacude; si no, camina hasta ella y la sacude al llegar. */
    [MessageType.PalmShake]: oncePerTick(MessageType.PalmShake, (session, message) => {
      const { player } = session;
      if (!room.map.isPalm(message.x, message.y)) return;
      const palm = { x: message.x, y: message.y };
      stopActivities(session);
      if (room.map.isNextTo(palm, player.x, player.y)) {
        halt(session);
        return shakePalm(room, session, palm);
      }
      const approach = room.map.approachTile(palm, { x: player.x, y: player.y });
      const path = approach ? room.map.findPath({ x: player.x, y: player.y }, approach) : [];
      if (path.length === 0) return;
      player.sitting = false;
      session.path = path;
      session.pending = { kind: "palm", palm };
    }),

    /** Patada a un picudo: hay que estar cerca. Aplastarlo paga `WEEVIL_REWARD`. */
    [MessageType.WeevilKick]: (session, message) => {
      const { player } = session;
      const result = room.weevils.kick(message.id, { x: player.x, y: player.y }, Date.now());
      if (result === "far") return room.notice(session, "Está lejos: acercate para patearlo.");
      if (result !== "killed") return;
      player.kicks += 1;
      if (session.wallet.credit(WEEVIL_REWARD)) room.markWallet(session);
    },
  } satisfies Partial<MessageRoutes>;
}

function shakePalm(room: CityRoom, session: PlayerSession, palm: TilePoint) {
  if (room.weevils.shake(palm, Date.now()) === 0) {
    room.notice(session, "La palmera está tranquila por ahora: probá en un rato.");
  }
}

export function isBenchTaken(room: CityRoom, bench: Bench, except: PlayerSession) {
  for (const other of room.sessions.values()) {
    if (other !== except && other.player.sitting && other.player.x === bench.x && other.player.y === bench.y) return true;
  }
  return false;
}

export function notifyExhausted(room: CityRoom, session: PlayerSession) {
  room.notice(session, `Estás agotado: descansá hasta recuperar ${EXHAUSTED_RECOVERY} de energía (sentado en un banco es mucho más rápido).`);
}

/** Lleva al jugador a `tile` de golpe: corta lo que estaba haciendo (caminar, sentarse, pescar…). */
export function teleport(session: PlayerSession, tile: TilePoint) {
  stopActivities(session);
  halt(session);
  session.player.sitting = false;
  session.player.x = tile.x;
  session.player.y = tile.y;
}

/**
 * Cada `STEP_MS`: primero los pedidos de camino que quedaron en cola (`oncePerTick`), después los que ya llegaron (sin camino) hacen lo que tenían pendiente (sentarse
 * un tick después de llegar, así el avatar no salta dos tiles de golpe; sacudir la palmera; abrir la
 * tienda) y después cada uno con camino avanza un tile.
 */
export function stepPlayers(room: CityRoom) {
  // Tick nuevo: cada uno puede volver a buscar camino; el pedido que quedó en cola va primero.
  for (const session of room.sessions.values()) {
    session.searchedThisTick = false;
    const queued = session.queuedSearch;
    if (!queued || session.closed) continue;
    session.queuedSearch = null;
    session.searchedThisTick = true;
    queued();
  }

  for (const session of room.sessions.values()) {
    const { pending, player } = session;
    if (!pending || isWalking(session)) continue;
    session.pending = null;
    if (pending.kind === "bench") {
      if (isBenchTaken(room, pending.bench, session)) continue;
      player.x = pending.bench.x;
      player.y = pending.bench.y;
      player.sitting = true;
    } else if (pending.kind === "palm") {
      if (room.map.isNextTo(pending.palm, player.x, player.y)) shakePalm(room, session, pending.palm);
    } else if (room.map.isNearShop(pending.shop, player.x, player.y)) {
      openShop(room, session, pending.shop);
    }
  }

  for (const session of room.sessions.values()) {
    if (!isWalking(session)) continue;
    // Cada paso gasta energía: agotado, se frena donde está (y no llega a banco ni tienda).
    if (!session.needs.spendEnergy(WALK_ENERGY_COST)) {
      halt(session);
      notifyExhausted(room, session);
      continue;
    }
    session.needs.drainHunger(WALK_HUNGER_COST);
    const next = session.path.shift()!;
    session.player.x = next.x;
    session.player.y = next.y;
  }
}
