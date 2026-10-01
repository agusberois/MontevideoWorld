"use client";

import { useCallback, useEffect, useState } from "react";
import { FISH_STAMINA_COST, InventoryMessage, OutfitIds, getCity, getClothing } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { HotbarSlots, emptyHotbar, loadHotbar, saveHotbar } from "@/lib/hotbar";
import type { PlayerSummary } from "@/lib/eventBus";
import { CitySession, bindRoomMessages, sendEquip, sendFishing } from "@/lib/network";
import { AdminPanel } from "./AdminPanel";
import { Announcement } from "./Announcement";
import { Backpack } from "./Backpack";
import { ChatBox } from "./ChatBox";
import { FishingWidget } from "./FishingWidget";
import { CityMenu } from "./CityMenu";
import { PlayersPanel } from "./PlayersPanel";
import { ShopPanel } from "./ShopPanel";
import { Hotbar } from "./Hotbar";
import { Hud } from "./Hud";
import { Notices } from "./Notices";
import { JoinScreen } from "./JoinScreen";
import { PhaserGame } from "./PhaserGame";

export function App() {
  const [session, setSession] = useState<CitySession | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const room = session?.room ?? null;
  /** Un solo panel abierto a la vez: barrios (M), mochila (H), jugadores (Tab) o una tienda. */
  const [panel, setPanel] = useState<"cities" | "backpack" | "players" | "shop" | "admin" | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [clock, setClock] = useState<number | null>(null);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [fishing, setFishing] = useState({ canFish: false, fishing: false });
  const [stamina, setStamina] = useState<number | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [outfit, setOutfit] = useState<OutfitIds | null>(null);
  const [inventory, setInventory] = useState<InventoryMessage | null>(null);
  const [money, setMoney] = useState<number | null>(null);
  const [hotbar, setHotbar] = useState<HotbarSlots>(emptyHotbar);

  // La barra se recuerda en el navegador; se lee al montar (no en el render, por SSR).
  useEffect(() => setHotbar(loadHotbar()), []);

  const changeHotbar = useCallback((slots: HotbarSlots) => {
    setHotbar(slots);
    saveHotbar(slots);
  }, []);

  /** Atajo 1–9: si la prenda está puesta, se guarda en la mochila; si está en la mochila, se pone. */
  const activateHotbar = useCallback(
    (index: number) => {
      const item = hotbar[index] ? getClothing(hotbar[index]) : undefined;
      if (!item || !room) return;
      if (outfit?.[item.slot] === item.id) sendEquip(room, item.slot, null);
      else if (inventory?.stacks.some((stack) => stack.itemId === item.id)) sendEquip(room, item.slot, item.id);
    },
    [hotbar, room, outfit, inventory],
  );

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
      setSession(null);
      setPanel(null);
      setOutfit(null);
      setInventory(null);
      setMoney(null);
      setPlayers([]);
      setFishing({ canFish: false, fishing: false });
      setStamina(null);
      setIsAdmin(false);
      setClock(null);
      if (code !== 1000) setNotice(`Se perdió la conexión con el servidor (código ${code}).`);
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
    const offStamina = eventBus.on("player:stamina", setStamina);
    const offAdmin = eventBus.on("player:admin", setIsAdmin);
    const offTime = eventBus.on("city:clock", setClock);
    // El server avisa cuando llegaste a la tienda que clickeaste.
    const offShop = eventBus.on("shop:open", (message) => {
      setShopId(message.shopId);
      setPanel("shop");
    });
    return () => {
      offOutfit();
      offInventory();
      offWallet();
      offPlayers();
      offFishing();
      offStamina();
      offAdmin();
      offTime();
      offShop();
    };
  }, []);

  /** F / botón: tirar la línea si estás en la escollera, o recogerla si ya está en el agua. */
  const toggleFishing = useCallback(() => {
    if (!room) return;
    if (fishing.fishing) sendFishing(room, "stop");
    else if (fishing.canFish) sendFishing(room, "cast");
  }, [room, fishing]);

  // M: barrios, H: mochila, Tab: jugadores, F: pescar, 1–9: barra rápida, Esc: cerrar.
  // No interfiere mientras se escribe en el chat (ahí Tab sigue moviendo el foco).
  useEffect(() => {
    if (!session) return;
    const toggle = (target: "cities" | "backpack" | "players" | "admin") =>
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
      } else if (event.code === "KeyP" && isAdmin) {
        event.preventDefault();
        toggle("admin");
      } else if (event.code === "KeyF") {
        event.preventDefault();
        toggleFishing();
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
  }, [session, activateHotbar, toggleFishing, isAdmin]);

  const handleExit = useCallback(() => {
    room?.leave(true);
  }, [room]);

  const openCities = useCallback(() => setPanel("cities"), []);
  const openBackpack = useCallback(() => setPanel("backpack"), []);
  const openPlayers = useCallback(() => setPanel("players"), []);
  const openAdmin = useCallback(() => setPanel("admin"), []);
  const closePanel = useCallback(() => setPanel(null), []);

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
        onOpenAdmin={isAdmin ? openAdmin : undefined}
        onExit={handleExit}
      />
      <ChatBox room={room} />
      <FishingWidget
        canFish={fishing.canFish}
        fishing={fishing.fishing}
        hasEnergy={stamina === null || stamina >= FISH_STAMINA_COST}
        onToggle={toggleFishing}
      />
      <Notices />
      <Announcement />
      <Hotbar slots={hotbar} outfit={outfit} inventory={inventory} onChange={changeHotbar} onActivate={activateHotbar} />
      {panel === "cities" && <CityMenu currentCityId={session.cityId} onClose={closePanel} />}
      {panel === "admin" && isAdmin && (
        <AdminPanel
          room={room}
          cityName={getCity(session.cityId)?.name ?? session.cityId}
          clock={clock}
          onClose={closePanel}
        />
      )}
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
