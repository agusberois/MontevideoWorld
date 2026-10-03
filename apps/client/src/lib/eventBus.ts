import type {
  AdminNearbyMessage,
  AnnouncementMessage,
  BoxOpenedMessage,
  CitiesMessage,
  TravelMessage,
  ChatBroadcastMessage,
  FishResultMessage,
  FishStartedMessage,
  VendResultMessage,
  VendStartedMessage,
  InventoryMessage,
  MatchMode,
  NeedsMessage,
  FaintMessage,
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
  /** Phaser → React: si el avatar propio está en la zona de venta y si está vendiendo. */
  "vending:status": { canVend: boolean; vending: boolean };
  /** Red → React: estás ofreciendo; el resultado llega en `durationMs`. */
  "vending:started": VendStartedMessage;
  /** Red → React: cómo salió la venta. */
  "vending:result": VendResultMessage;
  /** Phaser → React: energía del avatar propio (0–100), cada vez que cambia. */
  "player:energy": number;
  /** Red → React: necesidades privadas del jugador (hambre). */
  "needs:update": NeedsMessage;
  /** Red → React: te desmayaste (pantalla negra con el texto). */
  faint: FaintMessage;
  /** Phaser → React: segundos de condena que le quedan al avatar propio en el COMCAR (0 = libre). */
  "player:jail": number;
  /** Phaser → React: la mascota del avatar propio (id de `PETS` y nombre; "" = ninguna). */
  "player:pet": { id: string; name: string };
  /** Red → React: aviso breve del server para este jugador. */
  notice: NoticeMessage;
  /** Phaser → React: el avatar propio es admin (entró con `ADMIN_NAME`). */
  "player:admin": boolean;
  /** Red → React (sólo admin): jugadores cercanos, para elegir a quién darle ítems en el maker. */
  "admin:nearby": AdminNearbyMessage;
  /** Red → React: anuncio del admin (/post) para mostrar en el medio de la pantalla. */
  announcement: AnnouncementMessage;
  /** Phaser → React: hora del juego, minuto del día 0–1439 (Schema). */
  "city:clock": number;
  /** Phaser → React: qué copia del barrio es la sala (1 = la primera; ver `GameState.copy`). */
  "city:copy": number;
  /** Phaser → React: partido en el Centenario ("" = ninguno) y si el admin lo forzó (`GameState`). */
  "city:match": { name: string; mode: MatchMode };
  /** Phaser → React (admin): el modo coordenadas (tecla G) quedó prendido o apagado. */
  "admin:coords": boolean;
  /** React → Phaser (admin): botón del panel de admin para prender / apagar el modo coordenadas. */
  "admin:coords:toggle": null;
  /** Red → React: se abrió una caja sorpresa y salió `prizeId`. */
  "box:opened": BoxOpenedMessage;
  /** Red → React: boleto pagado, ya se puede viajar al barrio. */
  "travel:approved": TravelMessage;
  /** Red → lista de barrios: cuántos juegan en cada uno (respuesta a `cities:get`). */
  "cities:update": CitiesMessage;
  /** Phaser → React: el avatar propio llegó a la parada de ómnibus que clickeaste (abrir la lista de barrios). */
  "bus-stop:open": { name: string };
  /** Phaser → React: la cámara quedó libre (true) o fija siguiendo al avatar (false). */
  "camera:free": boolean;
  /** React → Phaser: botón "Centrar personaje": la cámara vuelve al avatar y lo marca. */
  "camera:command": "center";
  /** Phaser → React: con qué se puede interactuar ahora (cartel "F · Sentarse"), o null si con nada. */
  "interact:prompt": { label: string } | null;
  /** React → Phaser: F (o tocar el cartel): interactuar con lo que hay al lado. */
  "interact:use": null;
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
  /** Preso en el COMCAR: las visitas pueden burlarse. */
  jailed: boolean;
  screenX: number;
  screenY: number;
}

/** Lo que la UI necesita saber de cada jugador del barrio (sale del Schema). */
export interface PlayerSummary {
  sessionId: string;
  name: string;
  color: string;
  isSelf: boolean;
  /** Donador del proyecto (distintivo arriba del nombre). */
  isDonor: boolean;
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
