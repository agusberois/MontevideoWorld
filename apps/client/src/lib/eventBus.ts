import type { QualitySetting } from "./quality";
import type {
  AdminNearbyMessage,
  AnnouncementMessage,
  BoxOpenedMessage,
  CitiesMessage,
  TravelMessage,
  ChatBroadcastMessage,
  FishResultMessage,
  Appearance,
  FishStartedMessage,
  VendResultMessage,
  BuskResultMessage,
  BuskStartedMessage,
  BuskCrowdMessage,
  BarraInvitedMessage,
  BarraMessage,
  BarraResultMessage,
  VendStartedMessage,
  VendCustomerMessage,
  GesturePairInviteMessage,
  CasinoResultMessage,
  InventoryMessage,
  MatchMode,
  TileRect,
  TutorialMessage,
  WeatherId,
  WeatherMode,
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
  /** Sólo al vendedor: su hincha llega, compra (con qué carrito), pasa o se va. */
  "vending:customer": VendCustomerMessage;
  /** Phaser → React: si el avatar propio está donde se toca en la calle (el Centro) y si está tocando. */
  "busking:status": { canBusk: boolean; busking: boolean };
  /** Red → React: estás tocando; el resultado llega en `durationMs`. */
  "busking:started": BuskStartedMessage;
  /** Red → React: cómo te fue con el tema. */
  "busking:result": BuskResultMessage;
  /** Red → React: tu barra (o null), para el panel "Mi barra" y el menú de los jugadores. */
  "barra:update": BarraMessage;
  /** Red → React: te invitaron a una barra. */
  "barra:invited": BarraInvitedMessage;
  /** Red → React: cómo salió fundar, invitar, entrar o irse. */
  "barra:result": BarraResultMessage;
  /** Sólo al músico: la gente de mentira que se arrima a escuchar, deja plata o se va. */
  "busking:crowd": BuskCrowdMessage;
  /** Te invitan a un gesto de a dos (chocar los cinco, abrazo, pasar el mate). */
  "gesture:invite": GesturePairInviteMessage;
  /** Cómo salió la jugada en el casino (sólo al que juega). */
  "casino:result": CasinoResultMessage;
  /** Phaser → React: energía del avatar propio (0–100), cada vez que cambia. */
  "player:energy": number;
  /** Red → React: necesidades privadas del jugador (hambre). */
  "needs:update": NeedsMessage;
  /** Servidor → React: cómo va la guía de bienvenida (y, si se cumplió un paso, cuál y qué pagó). */
  "tutorial:update": TutorialMessage;
  /** React → Phaser: adónde apunta la flecha de la guía (un área de un barrio), o null para sacarla. */
  "tutorial:target": { cityId: string; area: TileRect } | null;
  /** Phaser → React: la escena (nueva, p. ej. al viajar) pide adónde apunta la guía ahora. */
  "tutorial:target:request": null;
  /** Red → React: te desmayaste (pantalla negra con el texto). */
  faint: FaintMessage;
  /** Phaser → React: segundos de condena que le quedan al avatar propio en el COMCAR (0 = libre). */
  "player:jail": number;
  /** Phaser → React: la mascota del avatar propio (id de `PETS` y nombre; "" = ninguna). */
  "player:pet": { id: string; name: string };
  /** Red → React: aviso breve del server para este jugador. */
  notice: NoticeMessage;
  /** Phaser → React: a quién sigue el avatar propio (`Player.following`), o null. */
  "player:following": { sessionId: string; name: string } | null;
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
  /** Phaser → React: clima de ahora y si el admin lo dejó fijo (`GameState.weather` / `weatherMode`). */
  "city:weather": { id: WeatherId; mode: WeatherMode };
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
  /** Phaser → React: la escena del barrio ya está armada y dibujando (al viajar, recién ahí se saca la cortina). */
  "city:ready": { cityId: string };
  /** React → Phaser: la calidad gráfica elegida en Opciones. */
  "quality:set": QualitySetting;
  /** Phaser → React: si la escena está dibujando en calidad baja (elegida o, en automática, por fps). */
  "quality:low": boolean;
  /** Phaser → React: clic sobre otro jugador (posición en pantalla para abrir su menú). */
  "player:click": PlayerClick;
  /** Phaser → React: clic sobre el avatar propio (abre tus detalles, sin menú). */
  "player:details": string;
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

/**
 * Lo que la UI necesita saber de cada jugador del barrio (sale del Schema, así que es público: lo
 * privado, como la plata o la mochila, no viaja a los demás). La escena la vuelve a mandar sólo
 * cuando cambia algo de acá (no al caminar).
 */
export interface PlayerSummary {
  sessionId: string;
  name: string;
  color: string;
  isSelf: boolean;
  /** Donador del proyecto (distintivo arriba del nombre). */
  isDonor: boolean;
  /** Entró con el nombre de admin (★ en el nombre). */
  isAdmin: boolean;
  /** Su barra (sigla, color y nombre), o null. */
  barra: { tag: string; color: string; name: string } | null;
  /** Aspecto elegido al entrar, para dibujarlo en sus detalles. */
  look: Pick<Appearance, "gender" | "skin" | "hairColor" | "hairStyle" | "eyeColor" | "facialHair" | "glasses">;
  /** Prendas puestas (id de `ITEMS` o "" por lugar). */
  outfit: OutfitIds;
  /** Mascota que lo sigue (id de `PETS` y nombre), o null. */
  pet: { id: string; name: string } | null;
  /** Segundos de condena en el COMCAR (0 = libre). */
  jailLeft: number;
  /** Qué está haciendo, con la caña o el carrito que usa (id de `ITEMS`). */
  activity: PlayerActivity | null;
  /** Energía 0–100 (redondeada). */
  energy: number;
}

export type PlayerActivity = { kind: "fishing"; rod: string } | { kind: "vending"; cart: string } | { kind: "busking"; instrument: string } | { kind: "sitting" };

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
