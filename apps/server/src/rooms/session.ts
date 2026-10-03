import type { Client, Delayed } from "@colyseus/core";
import type { Bench, NeedsMessage, Shop, TilePoint } from "@montevideo-world/shared";
import type { Player } from "@montevideo-world/shared/schema";
import type { Inventory } from "../inventory";
import type { Needs } from "../needs";
import type { Wallet } from "../wallet";

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
  /** Tiles que le quedan por caminar (vacío = quieto). */
  path: TilePoint[];
  pending: PendingAction | null;
  /** Línea en el agua: resuelve la pesca. */
  fishingTimer: Delayed | null;
  /** Vendiendo: resuelve la venta y hace salir al hincha (`CUSTOMER_LEAD_MS` antes). */
  vendingTimer: Delayed | null;
  customerTimer: Delayed | null;
  lastChatAt: number;
  /** Lo último que se le mandó de sus necesidades privadas (para mandar sólo si cambió). */
  sentNeeds: NeedsMessage | null;
  /** Cambió la mochila / la plata y falta mandársela (se manda una vez, ver `CityRoom.flushPrivate`). */
  inventoryDirty: boolean;
  walletDirty: boolean;
}

export function createSession(client: Client, player: Player, inventory: Inventory, wallet: Wallet, needs: Needs, key: string | null): PlayerSession {
  return {
    client,
    player,
    inventory,
    wallet,
    needs,
    key,
    path: [],
    pending: null,
    fishingTimer: null,
    vendingTimer: null,
    customerTimer: null,
    lastChatAt: 0,
    sentNeeds: null,
    inventoryDirty: false,
    walletDirty: false,
  };
}

/** ¿Está caminando? */
export function isWalking(session: PlayerSession): boolean {
  return session.path.length > 0;
}

/** Frena: sin camino ni nada pendiente para cuando llegue. */
export function halt(session: PlayerSession) {
  session.path = [];
  session.pending = null;
}
