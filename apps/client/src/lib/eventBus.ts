import type {
  AnnouncementMessage,
  BoxOpenedMessage,
  TravelMessage,
  ChatBroadcastMessage,
  FishResultMessage,
  FishStartedMessage,
  InventoryMessage,
  NoticeMessage,
  OutfitIds,
  ShopOpenMessage,
  ShopResultMessage,
  TradeClosedMessage,
  TradeInviteMessage,
  TradeStateMessage,
  WalletMessage,
} from "@montevideo-world/shared";

/**
 * Eventos que cruzan la frontera React ↔ Phaser.
 * Nada de estado del mundo pasa por acá: eso vive en el Schema de Colyseus.
 */
export interface GameEvents {
  /** Red → React (historial) y Phaser (globo sobre la cabeza). */
  "chat:message": ChatBroadcastMessage;
  /** Phaser → React: jugadores conectados en el barrio (cada vez que alguien entra o sale). */
  "players:list": PlayerSummary[];
  /** Phaser → React: el avatar propio ya fue sincronizado desde el Schema. */
  "player:self": { name: string; color: string };
  /** Phaser → React: ropa puesta del avatar propio (para la mochila). */
  "player:outfit": OutfitIds;
  /** Red → React: contenido de la mochila propia (mensaje privado del server). */
  "inventory:update": InventoryMessage;
  /** Red → React: saldo propio (mensaje privado del server). */
  "wallet:update": WalletMessage;
  /** Red → React: llegaste a una tienda, abrir su panel. */
  "shop:open": ShopOpenMessage;
  /** Red → React: resultado de una compra/venta. */
  "shop:result": ShopResultMessage;
  /** Phaser → React: si el avatar propio está en la escollera y si tiene la línea en el agua. */
  "fishing:status": { canFish: boolean; fishing: boolean };
  /** Red → React: la línea está en el agua; el resultado llega en `durationMs`. */
  "fishing:started": FishStartedMessage;
  /** Red → React: cómo terminó la pesca. */
  "fishing:result": FishResultMessage;
  /** Phaser → React: energía del avatar propio (0–100), cada vez que cambia. */
  "player:stamina": number;
  /** Red → React: aviso breve del server para este jugador. */
  notice: NoticeMessage;
  /** Phaser → React: el avatar propio es admin (entró con `ADMIN_NAME`). */
  "player:admin": boolean;
  /** Red → React: anuncio del admin (/post) para mostrar en el medio de la pantalla. */
  announcement: AnnouncementMessage;
  /** Phaser → React: hora del juego, minuto del día 0–1439 (Schema). */
  "city:clock": number;
  /** Red → React: se abrió una caja sorpresa y salió `prizeId`. */
  "box:opened": BoxOpenedMessage;
  /** Red → React: boleto pagado, ya se puede viajar al barrio. */
  "travel:approved": TravelMessage;
  /** Phaser → React: clic sobre otro jugador (posición en pantalla para abrir su menú). */
  "player:click": PlayerClick;
  /** Red → React: alguien te invita a intercambiar. */
  "trade:invite": TradeInviteMessage;
  /** Red → React: estado del intercambio en curso (abre o actualiza el panel). */
  "trade:state": TradeStateMessage;
  /** Red → React: terminó el intercambio (hecho o cancelado). */
  "trade:closed": TradeClosedMessage;
}

/** Clic sobre el avatar de otro jugador: quién es y dónde (px de la ventana) abrir el menú. */
export interface PlayerClick {
  sessionId: string;
  name: string;
  screenX: number;
  screenY: number;
}

/** Lo que la UI necesita saber de cada jugador del barrio (sale del Schema). */
export interface PlayerSummary {
  sessionId: string;
  name: string;
  color: string;
  isSelf: boolean;
}

type Handler<T> = (payload: T) => void;

class TypedEventBus<Events extends object> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>) {
    this.handlers.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]) {
    this.handlers.get(event)?.forEach((handler) => (handler as Handler<Events[K]>)(payload));
  }
}

/** Singleton sin dependencias de Phaser: se puede importar desde React sin romper SSR. */
export const eventBus = new TypedEventBus<GameEvents>();
