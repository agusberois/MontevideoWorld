import { useSyncExternalStore } from "react";
import { BarraView, InventoryMessage, MatchMode, OutfitIds, WeatherId, WeatherMode, NpcSayMessage, WelcomeMessage, nameKey } from "@montevideo-world/shared";
import { type PlayerSummary, eventBus } from "./eventBus";
import { HotbarSlots, emptyHotbar, loadHotbar, saveHotbar } from "../features/inventory/hotbarStorage";
import { loadBlocked, saveBlocked, toggleInList } from "../features/players/blockStorage";
import { QualitySetting, loadQuality, saveQuality } from "./quality";

/**
 * Estado de la UI del juego que llega por el EventBus (de la red o de la escena) más qué panel está
 * abierto. Vive fuera de React para que cada componente lea sólo lo que necesita con `useGame`, sin
 * props desde `App`. Para un dato nuevo: sumarlo a `GameStoreState` y a `INITIAL`, escucharlo en
 * `bindGameStore` y decidir si es del barrio (`CITY_FIELDS`: se borra al viajar) o del jugador.
 */

/** Paneles que se abren de a uno (ver el registro en `shell/panels.ts`). */
export type PanelId = "cities" | "backpack" | "players" | "shop" | "admin" | "maker" | "commands" | "gestures" | "calendar" | "playerDetails" | "barra" | "options" | "welcome" | "npcDialog";

export interface GameStoreState {
  /** Un solo panel abierto a la vez. */
  panel: PanelId | null;
  /** La tienda a la que llegaste (para el panel `shop`). */
  shopId: string | null;
  /** El jugador (sessionId) del panel `playerDetails`: otro (desde su menú) o vos (clic en tu avatar). */
  detailsId: string | null;
  isAdmin: boolean;
  /** Modo coordenadas del admin (tecla G) prendido. */
  adminCoords: boolean;
  /** Hora del juego (minuto del día); null hasta que se sincroniza. */
  clock: number | null;
  /** Qué copia del barrio es la sala (1 = la primera; con el barrio lleno se abren más). */
  cityCopy: number;
  /** Partido en el Centenario ahora ("" = ninguno) y si el admin lo forzó (lo manda el server). */
  match: string;
  matchMode: MatchMode;
  /** Clima de ahora (global, lo manda el server) y si el admin lo dejó fijo. */
  weather: WeatherId;
  weatherMode: WeatherMode;
  players: PlayerSummary[];
  fishing: { canFish: boolean; fishing: boolean };
  vending: { canVend: boolean; vending: boolean };
  busking: { canBusk: boolean; busking: boolean };
  parking: { canPark: boolean; parking: boolean };
  /** Tu barra (la manda el server al pedirla y cada vez que cambia), o null. */
  barra: BarraView | null;
  /** Con qué se puede interactuar con F ahora (lo decide la escena), o null. */
  interaction: string | null;
  /** Tu mascota (id de `PETS` y nombre), o null si no tenés. */
  pet: { id: string; name: string } | null;
  /** Preso en el COMCAR: segundos de condena que quedan (0 = libre). */
  jailLeft: number;
  /** Calidad gráfica elegida (Opciones) y si la escena está dibujando en baja ahora. */
  quality: QualitySetting;
  qualityLow: boolean;
  /** A quién seguís (sessionId y nombre), o null. */
  following: { sessionId: string; name: string } | null;
  /** Energía del avatar propio; null hasta que se sincroniza. */
  energy: number | null;
  /** Hambre (saciedad) y salud del avatar propio, privadas; null hasta que llegan. */
  hunger: number | null;
  health: number | null;
  /** Ropa puesta según el Schema; null hasta que se sincroniza. */
  outfit: OutfitIds | null;
  /** Mochila según el server; null hasta que llega. */
  inventory: InventoryMessage | null;
  /** Saldo según el server; null hasta que llega. */
  money: number | null;
  /** Bienvenida del jugador nuevo (sigue al viajar); null hasta que llega. */
  welcome: WelcomeMessage | null;
  /** Porciones cocinadas que esperan en la bandeja de la parrilla (`grill:tray`). */
  grillTray: number;
  /** Lo último que te dijo un NPC (el panel `npcDialog`). */
  npcDialog: NpcSayMessage | null;
  /** Con un intercambio abierto no se abren otros paneles ni andan los atajos. */
  trading: boolean;
  /** Viaje en curso (pantalla del ómnibus): de qué barrio a cuál. */
  traveling: { from: string; to: string; ambulance?: boolean; door?: boolean; walk?: boolean } | null;
  /** Barra rápida 1–9: preferencia del navegador, sobrevive a salir y a viajar. */
  hotbar: HotbarSlots;
  /** Jugadores bloqueados (esqueleto del nombre, `nameKey`): preferencia del navegador, como la barra. */
  blocked: string[];
}

const INITIAL: GameStoreState = {
  panel: null,
  shopId: null,
  detailsId: null,
  isAdmin: false,
  adminCoords: false,
  clock: null,
  cityCopy: 1,
  match: "",
  matchMode: "auto",
  weather: "clear",
  weatherMode: "auto",
  players: [],
  fishing: { canFish: false, fishing: false },
  vending: { canVend: false, vending: false },
  busking: { canBusk: false, busking: false },
  parking: { canPark: false, parking: false },
  barra: null,
  interaction: null,
  jailLeft: 0,
  following: null,
  quality: "auto",
  qualityLow: false,
  pet: null,
  energy: null,
  hunger: null,
  health: null,
  outfit: null,
  inventory: null,
  money: null,
  welcome: null,
  grillTray: 0,
  npcDialog: null,
  trading: false,
  traveling: null,
  hotbar: emptyHotbar(),
  blocked: [],
};

/** Lo que depende del barrio en el que estás: al viajar se borra (mochila, plata, energía… siguen). */
const CITY_FIELDS = ["panel", "npcDialog", "shopId", "detailsId", "cityCopy", "adminCoords", "players", "fishing", "vending", "parking", "interaction", "trading", "jailLeft", "following", "grillTray"] as const;

let state = INITIAL;
const listeners = new Set<() => void>();

function setState(patch: Partial<GameStoreState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const gameStore = {
  getState: (): GameStoreState => state,
  setState,
  subscribe,
  /** Al salir del juego: todo vuelve al principio salvo la barra rápida y los bloqueados. */
  reset() {
    setState({ ...INITIAL, hotbar: state.hotbar, blocked: state.blocked });
  },
  /** Al viajar: se borra lo del barrio (`CITY_FIELDS`); lo del jugador sigue. */
  resetCity() {
    setState(Object.fromEntries(CITY_FIELDS.map((key) => [key, INITIAL[key]])));
  },
};

/**
 * Leer una parte del store desde un componente; se vuelve a renderizar sólo si esa parte cambia.
 * El selector tiene que devolver algo que ya está en el estado (o un valor primitivo), no un objeto
 * nuevo en cada llamada: si no, React entra en un loop.
 */
export function useGame<T>(selector: (state: GameStoreState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(INITIAL),
  );
}

export function openPanel(panel: PanelId) {
  setState({ panel });
}

export function togglePanel(panel: PanelId) {
  setState({ panel: state.panel === panel ? null : panel });
}

export function closePanel() {
  setState({ panel: null });
}

/** Detalles de un jugador del barrio (no con un intercambio abierto, como los demás paneles). */
export function openPlayerDetails(sessionId: string) {
  if (!state.trading) setState({ detailsId: sessionId, panel: "playerDetails" });
}

export function setHotbar(hotbar: HotbarSlots) {
  setState({ hotbar });
  saveHotbar(hotbar);
}

/** Elegir la calidad gráfica (se recuerda en el navegador y la escena la aplica en el acto). */
export function setQuality(quality: QualitySetting) {
  setState({ quality });
  saveQuality(quality);
  eventBus.emit("quality:set", quality);
}

/** Bloquear a un jugador (o desbloquearlo, si ya estaba). */
export function toggleBlocked(name: string) {
  const blocked = toggleInList(state.blocked, name);
  setState({ blocked });
  saveBlocked(blocked);
}

/** ¿Está bloqueado ese nombre (o uno que se ve igual)? */
export function isBlocked(name: string): boolean {
  return state.blocked.includes(nameKey(name));
}

/**
 * Escuchar el EventBus y volcarlo al store. Se llama una vez al montar `App` (devuelve la limpieza,
 * así StrictMode y el hot reload no duplican las suscripciones). La barra rápida y los bloqueados se leen acá y no al
 * crear el store porque `localStorage` no existe en el server (SSR).
 */
export function bindGameStore(): () => void {
  setState({ hotbar: loadHotbar(), blocked: loadBlocked(), quality: loadQuality() });
  const offs = [
    eventBus.on("player:outfit", (outfit) => setState({ outfit })),
    eventBus.on("inventory:update", (inventory) => setState({ inventory })),
    eventBus.on("wallet:update", ({ balance }) => setState({ money: balance })),
    eventBus.on("players:list", (players) => setState({ players })),
    eventBus.on("fishing:status", (fishing) => setState({ fishing })),
    eventBus.on("vending:status", (vending) => setState({ vending })),
    eventBus.on("busking:status", (busking) => setState({ busking })),
    eventBus.on("parking:status", (parking) => setState({ parking })),
    eventBus.on("barra:update", ({ barra }) => setState({ barra })),
    eventBus.on("interact:prompt", (prompt) => setState({ interaction: prompt?.label ?? null })),
    eventBus.on("player:energy", (energy) => setState({ energy })),
    eventBus.on("needs:update", ({ hunger, health }) => setState({ hunger, health })),
    eventBus.on("welcome:update", (welcome) => {
      // Vendió o tiró el sobre: se le muestra que le tocó ser cuidacoches (salvo con un intercambio abierto).
      const lost = state.welcome?.stage === "deliver" && welcome.stage === "done";
      setState(lost && !state.trading ? { welcome, panel: "welcome" } : { welcome });
    }),
    // Hablarle a un NPC abre el diálogo (con un intercambio abierto no se abren paneles).
    eventBus.on("npc:say", (npcDialog) => setState(state.trading ? { npcDialog } : { npcDialog, panel: "npcDialog" })),
    eventBus.on("player:jail", (jailLeft) => setState({ jailLeft })),
    eventBus.on("grill:tray", ({ portions }) => setState({ grillTray: portions })),
    eventBus.on("player:following", (following) => setState({ following })),
    eventBus.on("quality:low", (qualityLow) => setState({ qualityLow })),
    eventBus.on("player:pet", (pet) => setState({ pet: pet.id ? pet : null })),
    eventBus.on("player:admin", (isAdmin) => setState({ isAdmin })),
    eventBus.on("admin:coords", (adminCoords) => setState({ adminCoords })),
    eventBus.on("city:clock", (clock) => setState({ clock })),
    eventBus.on("city:copy", (cityCopy) => setState({ cityCopy })),
    eventBus.on("city:match", ({ name, mode }) => setState({ match: name, matchMode: mode })),
    eventBus.on("city:weather", ({ id, mode }) => setState({ weather: id, weatherMode: mode })),
    // El server avisa cuando llegaste a la tienda que clickeaste.
    eventBus.on("shop:open", ({ shopId }) => setState({ shopId, panel: "shop" })),
    eventBus.on("trade:state", () => setState({ trading: true, panel: null })),
    eventBus.on("trade:closed", () => setState({ trading: false })),
    // Clic en tu propio avatar: tus detalles.
    eventBus.on("player:details", openPlayerDetails),
    // Clic en una parada de ómnibus (y llegaste): lo mismo que la tecla M. No con un intercambio abierto.
    eventBus.on("bus-stop:open", () => {
      if (!state.trading) setState({ panel: "cities" });
    }),
  ];
  return () => offs.forEach((off) => off());
}
