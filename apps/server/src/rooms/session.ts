import type { Client, Delayed } from "@colyseus/core";
import { type Bench, type NeedsMessage, type Shop, type TilePoint, type TutorialState, NEW_TUTORIAL } from "@montevideo-world/shared";
import type { Player } from "@montevideo-world/shared/schema";
import type { Inventory } from "../inventory";
import type { Needs } from "../needs";
import type { Wallet } from "../wallet";
import type { MessageRoutes } from "./systems/types";

/**
 * Lo que el jugador va a hacer al llegar al final de su camino. Es uno solo: pedir otra cosa lo
 * reemplaza y caminar a otro lado lo borra. El `kind` es el mismo de `CityMap.interactionAt`.
 */
export type PendingAction =
  | { kind: "bench"; bench: Bench }
  | { kind: "shop"; shop: Shop }
  | { kind: "palm"; palm: TilePoint };

/**
 * Todo el estado de un jugador en la sala que no va en el Schema (mochila, plata, necesidades,
 * camino, timers…). Un solo objeto por jugador: `onLeave` borra una entrada y no se puede olvidar nada.
 */
export interface PlayerSession {
  readonly client: Client;
  readonly player: Player;
  readonly inventory: Inventory;
  readonly wallet: Wallet;
  readonly needs: Needs;
  /** Clave secreta (con ella se guarda el progreso, `playerStore`); null sin clave o después de cerrarla por duplicada. */
  key: string | null;
  /** Guía de bienvenida (se guarda con el progreso; ver `systems/tutorial.ts`). */
  tutorial: TutorialState;
  /** Tiles que le quedan por caminar (vacío = quieto). */
  path: TilePoint[];
  /** Cansado (`player.tired`): ticks que faltan para el próximo paso. */
  stepWait: number;
  pending: PendingAction | null;
  /** Línea en el agua: resuelve la pesca. */
  fishingTimer: Delayed | null;
  /** Vendiendo: resuelve la venta y hace salir al hincha (`CUSTOMER_LEAD_MS` antes). */
  vendingTimer: Delayed | null;
  customerTimer: Delayed | null;
  lastChatAt: number;
  /** Último mensaje de chat (o `/mensaje`) y cuándo: repetirlo enseguida no sale (`REPEAT_CHAT_MS`). */
  lastChatText: string;
  /** Lo último que se le mandó de sus necesidades privadas (para mandar sólo si cambió). */
  sentNeeds: NeedsMessage | null;
  /** Cambió la mochila / la plata y falta mandársela (se manda una vez, ver `CityRoom.flushPrivate`). */
  inventoryDirty: boolean;
  walletDirty: boolean;
  /**
   * Se la está cerrando (duplicada, spam, cárcel, error): ya no se procesa nada suyo ni se la puede
   * elegir para intercambiar. El socket tarda en cerrarse (hasta 30 s si el cliente no contesta):
   * sin esto, en ese rato podría seguir mandando mensajes (ver `CityRoom.closeSession`).
   */
  closed: boolean;
  /** IP desde la que entró (para el tope de conexiones por IP, `connectionLimits.ts`). */
  ip: string;
  /** Ya buscó camino en este tick (caminar, banco, palmera, tienda): ver `oncePerTick`. */
  searchedThisTick: boolean;
  /** El último de esos pedidos que llegó con el tick ya usado: se resuelve al empezar el próximo. */
  queuedSearch: (() => void) | null;
}

export function createSession(client: Client, player: Player, inventory: Inventory, wallet: Wallet, needs: Needs, key: string | null): PlayerSession {
  return {
    client,
    player,
    inventory,
    wallet,
    needs,
    key,
    tutorial: { ...NEW_TUTORIAL },
    path: [],
    stepWait: 0,
    pending: null,
    fishingTimer: null,
    vendingTimer: null,
    customerTimer: null,
    lastChatAt: 0,
    lastChatText: "",
    sentNeeds: null,
    inventoryDirty: false,
    walletDirty: false,
    closed: false,
    ip: "?",
    searchedThisTick: false,
    queuedSearch: null,
  };
}

/** ¿Está caminando? */
export function isWalking(session: PlayerSession): boolean {
  return session.path.length > 0;
}

/** Frena: sin camino ni nada pendiente para cuando llegue. */
export function halt(session: PlayerSession) {
  session.path = [];
  session.stepWait = 0;
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
export function oncePerTick<K extends keyof MessageRoutes>(_type: K, run: MessageRoutes[K]): MessageRoutes[K] {
  const handler = run as (session: PlayerSession, message: unknown) => void;
  return ((session: PlayerSession, message: unknown) => {
    if (!session.searchedThisTick) {
      session.searchedThisTick = true;
      session.queuedSearch = null;
      return handler(session, message);
    }
    session.queuedSearch = () => handler(session, message);
  }) as MessageRoutes[K];
}
