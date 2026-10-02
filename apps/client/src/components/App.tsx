"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FISH_STAMINA_COST,
  InventoryMessage,
  OutfitIds,
  VEND_STAMINA_COST,
  bestCart,
  bestRod,
  getCity,
  getItem,
  matchAt,
  stackUses,
  wornestStack,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { HotbarSlots, emptyHotbar, loadHotbar, saveHotbar } from "@/lib/hotbar";
import type { PlayerSummary } from "@/lib/eventBus";
import { ItemActionContext, countInBag, isWorn, itemAction } from "@/lib/itemActions";
import { trackKeyboardInset } from "@/lib/viewport";
import { CitySession, bindRoomMessages, sendFishing, sendTravelRequest, sendVending, travelTo } from "@/lib/network";
import { AdminPanel } from "./AdminPanel";
import { Announcement } from "./Announcement";
import { Backpack } from "./Backpack";
import { BoxReveal } from "./BoxReveal";
import { ChatBox } from "./ChatBox";
import { FishingWidget } from "./FishingWidget";
import { InteractPrompt } from "./InteractPrompt";
import { VendingWidget } from "./VendingWidget";
import { CameraButton } from "./CameraButton";
import { CityMenu } from "./CityMenu";
import { MakerPanel } from "./MakerPanel";
import { CommandsPanel } from "./CommandsPanel";
import { PlayersPanel } from "./PlayersPanel";
import { ShopPanel } from "./ShopPanel";
import { Hotbar } from "./Hotbar";
import { Hud } from "./Hud";
import { Notices } from "./Notices";
import { JoinScreen } from "./JoinScreen";
import { PhaserGame } from "./PhaserGame";
import { PlayerMenu } from "./PlayerMenu";
import { TradeInvites } from "./TradeInvites";
import { TradePanel } from "./TradePanel";
import { TRAVEL_MS, TravelOverlay } from "./TravelOverlay";

/** Cuánto tiene que seguir faltando un ítem para sacarlo de la barra rápida. */
const HOTBAR_CLEANUP_MS = 1000;

function cityName(cityId: string | undefined): string {
  return (cityId && getCity(cityId)?.name) || "";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));
}

/** El server cierra con este código la sesión vieja cuando la misma clave entra de nuevo. */
const DUPLICATE_SESSION_CODE = 4001;

export function App() {
  const [session, setSession] = useState<CitySession | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const room = session?.room ?? null;
  /** Un solo panel abierto a la vez: barrios (M), mochila (H), jugadores (Tab) o una tienda. */
  const [panel, setPanel] = useState<"cities" | "backpack" | "players" | "shop" | "admin" | "maker" | "commands" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clock, setClock] = useState<number | null>(null);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [fishing, setFishing] = useState({ canFish: false, fishing: false });
  const [vending, setVending] = useState({ canVend: false, vending: false });
  /** Con qué se puede interactuar con F ahora (lo decide la escena), o null. */
  const [interaction, setInteraction] = useState<string | null>(null);
  const [stamina, setStamina] = useState<number | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [outfit, setOutfit] = useState<OutfitIds | null>(null);
  const [inventory, setInventory] = useState<InventoryMessage | null>(null);
  const [money, setMoney] = useState<number | null>(null);
  const [hotbar, setHotbar] = useState<HotbarSlots>(emptyHotbar);
  /** Con un intercambio abierto no se abren otros paneles ni andan los atajos. */
  const [trading, setTrading] = useState(false);
  /** Saliendo de un barrio para entrar a otro: esa salida no vuelve a la pantalla de ingreso. */
  const travelingRef = useRef(false);
  /** Viaje en curso (pantalla del ómnibus): de qué barrio a cuál. */
  const [traveling, setTraveling] = useState<{ from: string; to: string } | null>(null);

  // La barra se recuerda en el navegador; se lee al montar (no en el render, por SSR).
  useEffect(() => setHotbar(loadHotbar()), []);

  const changeHotbar = useCallback((slots: HotbarSlots) => {
    setHotbar(slots);
    saveHotbar(slots);
  }, []);

  /**
   * Lo que ya no tenés (ni en la mochila ni puesto: lo vendiste, lo comiste, lo intercambiaste) se
   * saca de la barra y el casillero queda libre. Se espera un rato sin cambios porque al ponerse o
   * sacarse algo la mochila y la ropa llegan por separado y, por un instante, la prenda no está en
   * ningún lado.
   */
  useEffect(() => {
    if (!inventory || !outfit) return;
    const timer = window.setTimeout(() => {
      setHotbar((slots) => {
        const next = slots.map((itemId) => {
          const item = itemId ? getItem(itemId) : undefined;
          return item && (countInBag(inventory, item.id) > 0 || isWorn(item, outfit)) ? itemId : null;
        });
        if (next.every((itemId, index) => itemId === slots[index])) return slots;
        saveHotbar(next);
        return next;
      });
    }, HOTBAR_CLEANUP_MS);
    return () => window.clearTimeout(timer);
  }, [inventory, outfit]);

  /** Lo que la barra necesita para saber qué hace cada ítem (ver `itemActions.ts`). */
  const actionContext = useMemo<ItemActionContext | null>(
    () => (room ? { room, outfit, inventory, fishing, vending } : null),
    [room, outfit, inventory, fishing, vending],
  );

  /** Atajo 1–9: usar el ítem (ponerse/sacarse ropa, pescar, vender, comer, abrir una caja). */
  const activateHotbar = useCallback(
    (index: number) => {
      const item = hotbar[index] ? getItem(hotbar[index]) : undefined;
      if (item && actionContext) itemAction(item, actionContext)?.run();
    },
    [hotbar, actionContext],
  );

  // Celulares: cuánto tapa el teclado en pantalla, para correr el chat arriba de él.
  useEffect(() => trackKeyboardInset(), []);

  // La conexión se abre en el submit (event handler), no en un efecto:
  // así StrictMode no crea dos conexiones al montar dos veces.
  const handleJoined = useCallback((joined: CitySession) => {
    setNotice(null);
    setSession(joined);
  }, []);

  useEffect(() => {
    if (!room) return;
    const unbindMessages = bindRoomMessages(room);

    const handleLeave = (code: number) => {
      if (travelingRef.current) return;
      setSession(null);
      setPanel(null);
      setOutfit(null);
      setInventory(null);
      setMoney(null);
      setPlayers([]);
      setFishing({ canFish: false, fishing: false });
      setVending({ canVend: false, vending: false });
      setInteraction(null);
      setStamina(null);
      setIsAdmin(false);
      setClock(null);
      setTrading(false);
      if (code === DUPLICATE_SESSION_CODE) setNotice("Entraste desde otra pestaña o dispositivo: esta sesión se cerró.");
      else if (code !== 1000) setNotice(`Se perdió la conexión con el servidor (código ${code}).`);
    };
    const handleError = (code: number, message?: string) => {
      console.error("[Montevideo World] room error", code, message);
    };
    room.onLeave(handleLeave);
    room.onError(handleError);

    return () => {
      unbindMessages();
      room.onLeave.remove(handleLeave);
      room.onError.remove(handleError);
    };
  }, [room]);

  useEffect(() => {
    const offOutfit = eventBus.on("player:outfit", setOutfit);
    const offInventory = eventBus.on("inventory:update", setInventory);
    const offWallet = eventBus.on("wallet:update", ({ balance }) => setMoney(balance));
    const offPlayers = eventBus.on("players:list", setPlayers);
    const offFishing = eventBus.on("fishing:status", setFishing);
    const offVending = eventBus.on("vending:status", setVending);
    const offInteraction = eventBus.on("interact:prompt", (prompt) => setInteraction(prompt?.label ?? null));
    const offStamina = eventBus.on("player:stamina", setStamina);
    const offAdmin = eventBus.on("player:admin", setIsAdmin);
    const offTime = eventBus.on("city:clock", setClock);
    // El server avisa cuando llegaste a la tienda que clickeaste.
    const offShop = eventBus.on("shop:open", (message) => {
      setShopId(message.shopId);
      setPanel("shop");
    });
    const offTradeState = eventBus.on("trade:state", () => {
      setTrading(true);
      setPanel(null);
    });
    const offTradeClosed = eventBus.on("trade:closed", () => setTrading(false));
    return () => {
      offOutfit();
      offInventory();
      offWallet();
      offPlayers();
      offFishing();
      offVending();
      offInteraction();
      offStamina();
      offAdmin();
      offTime();
      offShop();
      offTradeState();
      offTradeClosed();
    };
  }, []);

  /** F / botón: tirar la línea si estás en la escollera, o recogerla si ya está en el agua. */
  const toggleFishing = useCallback(() => {
    if (!room) return;
    if (fishing.fishing) sendFishing(room, "stop");
    else if (fishing.canFish) sendFishing(room, "cast");
  }, [room, fishing]);

  /** Botón (o F en la explanada): ofrecer la mercadería si estás en la explanada del Centenario, o dejar de vender. */
  const toggleVending = useCallback(() => {
    if (!room) return;
    if (vending.vending) sendVending(room, "stop");
    else if (vending.canVend) sendVending(room, "start");
  }, [room, vending]);

  /**
   * F, en este orden: si estás pescando o vendiendo, lo corta; si tenés algo al lado (tienda,
   * banco, palmera, parada, otro jugador, un picudo), interactúa con eso; si no, pesca en la
   * escollera o vende en la explanada del Centenario.
   */
  const pressF = useCallback(() => {
    if (fishing.fishing) toggleFishing();
    else if (vending.vending) toggleVending();
    else if (interaction) eventBus.emit("interact:use", null);
    else if (fishing.canFish) toggleFishing();
    else if (vending.canVend) toggleVending();
  }, [fishing, vending, interaction, toggleFishing, toggleVending]);

  // M: barrios, H: mochila, C: comandos, Tab: jugadores, F: interactuar / pescar / vender, 1–9: barra rápida, Esc: cerrar.
  // Sólo admin: P controles, I maker.
  // No interfiere mientras se escribe en el chat (ahí Tab sigue moviendo el foco).
  useEffect(() => {
    if (!session || trading) return;
    const toggle = (target: "cities" | "backpack" | "players" | "admin" | "maker" | "commands") =>
      setPanel((open) => (open === target ? null : target));
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code === "KeyM") {
        event.preventDefault();
        toggle("cities");
      } else if (event.code === "KeyH") {
        event.preventDefault();
        toggle("backpack");
      } else if (event.code === "KeyC") {
        event.preventDefault();
        toggle("commands");
      } else if (event.code === "KeyP" && isAdmin) {
        event.preventDefault();
        toggle("admin");
      } else if (event.code === "KeyI" && isAdmin) {
        event.preventDefault();
        toggle("maker");
      } else if (event.code === "KeyF") {
        event.preventDefault();
        pressF();
      } else if (event.key === "Tab") {
        event.preventDefault();
        toggle("players");
      } else if (/^Digit[1-9]$/.test(event.code)) {
        event.preventDefault();
        activateHotbar(Number(event.code.slice(5)) - 1);
      } else if (event.key === "Escape") {
        setPanel(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session, trading, activateHotbar, pressF, isAdmin]);

  /**
   * Con el boleto pagado (lo cobra el server): salir de la sala y entrar a la del destino. El
   * server sólo deja entrar a otro barrio con un boleto vigente.
   */
  const travel = useCallback(
    async (cityId: string) => {
      if (!room || travelingRef.current || cityId === session?.cityId) return;
      travelingRef.current = true;
      setTraveling({ from: cityName(session?.cityId), to: cityName(cityId) });
      const startedAt = Date.now();
      setPanel(null);
      setPlayers([]);
      setFishing({ canFish: false, fishing: false });
      setVending({ canVend: false, vending: false });
      setInteraction(null);
      setTrading(false);
      try {
        await room.leave(true);
        // El viaje dura al menos TRAVEL_MS (la animación del ómnibus); si el server tarda más, se espera.
        const [next] = await Promise.all([travelTo(cityId), wait(TRAVEL_MS - (Date.now() - startedAt))]);
        setSession(next);
      } catch (error) {
        console.error("[Montevideo World] travel failed", error);
        setSession(null);
        setNotice("No se pudo viajar al barrio. Volvé a entrar.");
      } finally {
        travelingRef.current = false;
        setTraveling(null);
      }
    },
    [room, session?.cityId],
  );

  // Clic en una parada de ómnibus (y llegaste): lo mismo que la tecla M. No con un intercambio abierto.
  useEffect(() => {
    if (trading) return;
    return eventBus.on("bus-stop:open", () => setPanel("cities"));
  }, [trading]);

  // El server aprobó el boleto: recién ahí se viaja.
  useEffect(() => eventBus.on("travel:approved", ({ cityId }) => void travel(cityId)), [travel]);

  /** Botón "Ir" de la lista de barrios: pedir el boleto (el viaje arranca cuando el server lo cobra). */
  const requestTravel = useCallback(
    (cityId: string) => {
      if (room && !travelingRef.current && cityId !== session?.cityId) sendTravelRequest(room, cityId);
    },
    [room, session?.cityId],
  );

  const handleExit = useCallback(() => {
    room?.leave(true);
  }, [room]);

  const openCities = useCallback(() => setPanel("cities"), []);
  const openBackpack = useCallback(() => setPanel("backpack"), []);
  const openPlayers = useCallback(() => setPanel("players"), []);
  const openAdmin = useCallback(() => setPanel("admin"), []);
  const openMaker = useCallback(() => setPanel("maker"), []);
  const openCommands = useCallback(() => setPanel("commands"), []);
  const closePanel = useCallback(() => setPanel(null), []);

  /** Con qué se pesca y se vende: lo de mayor nivel y, entre iguales, lo más gastado (como el server). */
  const stacks = inventory?.stacks ?? [];
  const rod = bestRod(stacks.map((stack) => stack.itemId));
  const rodStack = rod && wornestStack(stacks, rod.id);
  const cart = bestCart(stacks.map((stack) => stack.itemId));
  const cartStack = cart && wornestStack(stacks, cart.id);

  const openShop = session && shopId ? getCity(session.cityId)?.shops.find((shop) => shop.id === shopId) : undefined;

  if (!session || !room) {
    return <JoinScreen onJoined={handleJoined} notice={notice} />;
  }

  return (
    <>
      <PhaserGame session={session} />
      <Hud
        cityName={getCity(session.cityId)?.name ?? session.cityId}
        money={money}
        stamina={stamina}
        clock={clock}
        playerCount={players.length}
        onOpenPlayers={openPlayers}
        onOpenMap={openCities}
        onOpenBackpack={openBackpack}
        onOpenCommands={openCommands}
        onOpenAdmin={isAdmin ? openAdmin : undefined}
        onOpenMaker={isAdmin ? openMaker : undefined}
        onExit={handleExit}
      />
      {/*
        Lo de abajo de la pantalla. En celulares se apila en una columna (pesca / venta, barra rápida,
        chat) que sube con el teclado; en escritorio cada uno conserva su lugar (ver .dock en el CSS).
      */}
      <div className="dock">
        <InteractPrompt label={interaction} />
        <FishingWidget
          canFish={fishing.canFish}
          fishing={fishing.fishing}
          hasEnergy={stamina === null || stamina >= FISH_STAMINA_COST}
          rod={rod}
          uses={rodStack ? stackUses(rodStack) : 0}
          onToggle={toggleFishing}
          keyHint={fishing.fishing || !interaction}
        />
        <VendingWidget
          canVend={vending.canVend}
          vending={vending.vending}
          hasEnergy={stamina === null || stamina >= VEND_STAMINA_COST}
          cart={cart}
          uses={cartStack ? stackUses(cartStack) : 0}
          match={clock === null ? undefined : matchAt(clock)}
          onToggle={toggleVending}
          keyHint={vending.vending || !interaction}
        />
        {actionContext && (
          <Hotbar slots={hotbar} context={actionContext} onChange={changeHotbar} onActivate={activateHotbar} />
        )}
        <ChatBox room={room} isAdmin={isAdmin} />
      </div>
      <CameraButton />
      <Notices />
      <BoxReveal />
      <PlayerMenu room={room} players={players} />
      <TradeInvites room={room} />
      <TradePanel room={room} inventory={inventory} money={money} />
      <Announcement />
      {panel === "commands" && <CommandsPanel isAdmin={isAdmin} onClose={closePanel} />}
      {panel === "cities" && (
        <CityMenu
          currentCityId={session.cityId}
          money={money}
          traveling={traveling !== null}
          onTravel={requestTravel}
          onClose={closePanel}
        />
      )}
      {traveling && <TravelOverlay from={traveling.from} to={traveling.to} />}
      {panel === "admin" && isAdmin && (
        <AdminPanel
          room={room}
          cityName={getCity(session.cityId)?.name ?? session.cityId}
          clock={clock}
          onClose={closePanel}
        />
      )}
      {panel === "maker" && isAdmin && <MakerPanel room={room} onClose={closePanel} />}
      {panel === "players" && (
        <PlayersPanel cityName={getCity(session.cityId)?.name ?? session.cityId} players={players} onClose={closePanel} />
      )}
      {panel === "backpack" && <Backpack room={room} outfit={outfit} inventory={inventory} onClose={closePanel} />}
      {panel === "shop" && openShop && (
        <ShopPanel room={room} shop={openShop} money={money} inventory={inventory} onClose={closePanel} />
      )}
    </>
  );
}
