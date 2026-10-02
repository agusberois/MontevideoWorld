import { useSyncExternalStore } from "react";
import type { InventoryMessage, MatchMode, OutfitIds } from "@montevideo-world/shared";
import { type PlayerSummary, eventBus } from "./eventBus";
import { HotbarSlots, emptyHotbar, loadHotbar, saveHotbar } from "./hotbar";

/**
 * Estado de la UI del juego que llega por el EventBus (de la red o de la escena) más qué panel está
 * abierto. Vive fuera de React para que cada componente lea sólo lo que necesita con `useGame`, sin
 * props desde `App`. Para un dato nuevo: sumarlo a `GameStoreState` y a `INITIAL`, escucharlo en
 * `bindGameStore` y decidir si es del barrio (`CITY_FIELDS`: se borra al viajar) o del jugador.
 */

/** Paneles que se abren de a uno (ver el registro en `components/panels.ts`). */
export type PanelId = "cities" | "backpack" | "players" | "shop" | "admin" | "maker" | "commands";

export interface GameStoreState {
  /** Un solo panel abierto a la vez. */
  panel: PanelId | null;
  /** La tienda a la que llegaste (para el panel `shop`). */
  shopId: string | null;
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
  players: PlayerSummary[];
  fishing: { canFish: boolean; fishing: boolean };
  vending: { canVend: boolean; vending: boolean };
  /** Con qué se puede interactuar con F ahora (lo decide la escena), o null. */
  interaction: string | null;
  /** Tu mascota (id de `PETS` y nombre), o null si no tenés. */
  pet: { id: string; name: string } | null;
  /** Preso en el COMCAR: segundos de condena que quedan (0 = libre). */
  jailLeft: number;
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
  /** Con un intercambio abierto no se abren otros paneles ni andan los atajos. */
  trading: boolean;
  /** Viaje en curso (pantalla del ómnibus): de qué barrio a cuál. */
  traveling: { from: string; to: string; ambulance?: boolean } | null;
  /** Barra rápida 1–9: preferencia del navegador, sobrevive a salir y a viajar. */
  hotbar: HotbarSlots;
}

const INITIAL: GameStoreState = {
  panel: null,
  shopId: null,
  isAdmin: false,
  adminCoords: false,
  clock: null,
  cityCopy: 1,
  match: "",
  matchMode: "auto",
  players: [],
  fishing: { canFish: false, fishing: false },
  vending: { canVend: false, vending: false },
  interaction: null,
  jailLeft: 0,
  pet: null,
  energy: null,
  hunger: null,
  health: null,
  outfit: null,
  inventory: null,
  money: null,
  trading: false,
  traveling: null,
  hotbar: emptyHotbar(),
};

/** Lo que depende del barrio en el que estás: al viajar se borra (mochila, plata, energía… siguen). */
const CITY_FIELDS = ["panel", "shopId", "cityCopy", "adminCoords", "players", "fishing", "vending", "interaction", "trading", "jailLeft"] as const;

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
  /** Al salir del juego: todo vuelve al principio salvo la barra rápida. */
  reset() {
    setState({ ...INITIAL, hotbar: state.hotbar });
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

export function setHotbar(hotbar: HotbarSlots) {
  setState({ hotbar });
  saveHotbar(hotbar);
}

/**
 * Escuchar el EventBus y volcarlo al store. Se llama una vez al montar `App` (devuelve la limpieza,
 * así StrictMode y el hot reload no duplican las suscripciones). La barra rápida se lee acá y no al
 * crear el store porque `localStorage` no existe en el server (SSR).
 */
export function bindGameStore(): () => void {
  setState({ hotbar: loadHotbar() });
  const offs = [
    eventBus.on("player:outfit", (outfit) => setState({ outfit })),
    eventBus.on("inventory:update", (inventory) => setState({ inventory })),
    eventBus.on("wallet:update", ({ balance }) => setState({ money: balance })),
    eventBus.on("players:list", (players) => setState({ players })),
    eventBus.on("fishing:status", (fishing) => setState({ fishing })),
    eventBus.on("vending:status", (vending) => setState({ vending })),
    eventBus.on("interact:prompt", (prompt) => setState({ interaction: prompt?.label ?? null })),
    eventBus.on("player:energy", (energy) => setState({ energy })),
    eventBus.on("needs:update", ({ hunger, health }) => setState({ hunger, health })),
    eventBus.on("player:jail", (jailLeft) => setState({ jailLeft })),
    eventBus.on("player:pet", (pet) => setState({ pet: pet.id ? pet : null })),
    eventBus.on("player:admin", (isAdmin) => setState({ isAdmin })),
    eventBus.on("admin:coords", (adminCoords) => setState({ adminCoords })),
    eventBus.on("city:clock", (clock) => setState({ clock })),
    eventBus.on("city:copy", (cityCopy) => setState({ cityCopy })),
    eventBus.on("city:match", ({ name, mode }) => setState({ match: name, matchMode: mode })),
    // El server avisa cuando llegaste a la tienda que clickeaste.
    eventBus.on("shop:open", ({ shopId }) => setState({ shopId, panel: "shop" })),
    eventBus.on("trade:state", () => setState({ trading: true, panel: null })),
    eventBus.on("trade:closed", () => setState({ trading: false })),
    // Clic en una parada de ómnibus (y llegaste): lo mismo que la tecla M. No con un intercambio abierto.
    eventBus.on("bus-stop:open", () => {
      if (!state.trading) setState({ panel: "cities" });
    }),
  ];
  return () => offs.forEach((off) => off());
}
