import type { ComponentType } from "react";
import type { PanelId } from "@/lib/gameStore";
import type { CityRoom } from "@/lib/network";
import { AdminPanel } from "../features/admin/AdminPanel";
import { Backpack } from "../features/inventory/Backpack";
import { CityMenu } from "../features/cities/CityMenu";
import { CommandsPanel } from "../features/chat/CommandsPanel";
import { MakerPanel } from "../features/admin/MakerPanel";
import { PlayerDetails } from "../features/players/PlayerDetails";
import { PlayersPanel } from "../features/players/PlayersPanel";
import { ShopPanel } from "../features/shop/ShopPanel";

/** Lo que `App` le pasa a cada panel; lo demás (mochila, plata…) lo lee del store con `useGame`. */
export interface PanelProps {
  room: CityRoom;
  cityId: string;
  onClose: () => void;
}

interface PanelEntry {
  component: ComponentType<PanelProps>;
  /** Tecla que lo abre y lo cierra (`event.code`); sin tecla, se abre desde el juego (p. ej. la tienda). */
  shortcut?: string;
  /** Sólo para el admin (igual el server valida cada pedido). */
  adminOnly?: boolean;
}

/**
 * Paneles que se abren de a uno (`gameStore.panel`). Para uno nuevo: sumar su id a `PanelId`, su
 * componente (con `PanelProps`) y, si tiene, su tecla. Esc cierra cualquiera.
 */
export const PANELS: Record<PanelId, PanelEntry> = {
  cities: { component: CityMenu, shortcut: "KeyM" },
  backpack: { component: Backpack, shortcut: "KeyH" },
  commands: { component: CommandsPanel, shortcut: "KeyC" },
  players: { component: PlayersPanel, shortcut: "Tab" },
  admin: { component: AdminPanel, shortcut: "KeyP", adminOnly: true },
  maker: { component: MakerPanel, shortcut: "KeyI", adminOnly: true },
  shop: { component: ShopPanel },
  // Del jugador `detailsId`: desde su menú o con un clic en tu avatar (`openPlayerDetails`).
  playerDetails: { component: PlayerDetails },
};

/** El panel que abre esta tecla, si hay (y si podés usarlo). */
export function panelForKey(code: string, isAdmin: boolean): PanelId | null {
  const found = (Object.keys(PANELS) as PanelId[]).find((id) => PANELS[id].shortcut === code);
  return found && (!PANELS[found].adminOnly || isAdmin) ? found : null;
}
