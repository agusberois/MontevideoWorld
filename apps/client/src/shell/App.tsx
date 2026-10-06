"use client";

import { useCallback, useEffect, useState } from "react";
import { JAILED_KICK_CODE, type TravelMessage, getCityInfo } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { activateHotbar, pressF } from "@/lib/gameActions";
import { bindGameStore, closePanel, gameStore, togglePanel, useGame } from "@/lib/gameStore";
import { trackKeyboardInset } from "@/lib/viewport";
import { CitySession, bindRoomMessages, requestBarra, travelTo } from "@/lib/network";
import { Announcement } from "../features/admin/Announcement";
import { BoxReveal } from "../features/boxes/BoxReveal";
import { ChatBox } from "../features/chat/ChatBox";
import { FishingWidget } from "../features/activities/FishingWidget";
import { InteractPrompt } from "../ui/InteractPrompt";
import { FollowBadge } from "../ui/FollowBadge";
import { JailBanner } from "../features/jail/JailBanner";
import { FaintOverlay } from "../features/health/FaintOverlay";
import { VendingWidget } from "../features/activities/VendingWidget";
import { BuskingWidget } from "../features/activities/BuskingWidget";
import { CameraButton } from "../ui/CameraButton";
import { Vitals } from "../ui/Vitals";
import { TutorialCard } from "../features/tutorial/TutorialCard";
import { Hotbar } from "../features/inventory/Hotbar";
import { Hud } from "../ui/Hud";
import { Notices } from "../ui/Notices";
import { JoinScreen } from "../features/join/JoinScreen";
import { LoginScreen } from "../features/join/LoginScreen";
import { CharacterSelect } from "../features/join/CharacterSelect";
import { Character, listCharacters } from "@/lib/characters";
import { PANELS, panelForKey } from "./panels";
import { PhaserGame } from "./PhaserGame";
import { PlayerMenu } from "../features/players/PlayerMenu";
import { TradeInvites } from "../features/trade/TradeInvites";
import { PairGestureInvites } from "../features/gestures/PairGestureInvites";
import { BarraInvites } from "../features/barras/BarraInvites";
import { TradePanel } from "../features/trade/TradePanel";
import { DOOR_MS, DoorOverlay, TRAVEL_MS, TravelOverlay } from "../features/cities/TravelOverlay";
import { moduleClasses } from "@/lib/cx";
import styles from "./App.module.css";

const cx = moduleClasses(styles);

function cityName(cityId: string | undefined): string {
  return (cityId && getCityInfo(cityId)?.name) || "";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)));
}

/** El server cierra con este código la sesión vieja cuando la misma clave entra de nuevo. */
const DUPLICATE_SESSION_CODE = 4001;

/**
 * Conexión (entrar, salir, viajar), atajos de teclado y armado de la pantalla. El estado de la UI
 * vive en `gameStore` y cada componente lee lo suyo con `useGame`; los paneles están en `panels.ts`.
 */
export function App() {
  const [session, setSession] = useState<CitySession | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Pasó por la pantalla de inicio de sesión (todavía sin cuentas: el botón sólo avanza). */
  const [signedIn, setSignedIn] = useState(false);
  /** Personajes guardados en este navegador (se leen al iniciar sesión) y si se eligió crear uno. */
  const [characters, setCharacters] = useState<Character[]>([]);
  const [creating, setCreating] = useState(false);
  const room = session?.room ?? null;
  const panel = useGame((state) => state.panel);
  const isAdmin = useGame((state) => state.isAdmin);
  const traveling = useGame((state) => state.traveling);

  // El store escucha el EventBus desde que se monta la app (antes de conectarse).
  useEffect(() => bindGameStore(), []);

  // Celulares: cuánto tapa el teclado en pantalla, para correr el chat arriba de él.
  useEffect(() => trackKeyboardInset(), []);

  // La conexión se abre en el submit (event handler), no en un efecto:
  // así StrictMode no crea dos conexiones al montar dos veces.
  const handleJoined = useCallback((joined: CitySession) => {
    setNotice(null);
    setSession(joined);
    // Al salir del juego se vuelve a elegir, ya con el personaje recién creado en la lista.
    setCharacters(listCharacters());
    setCreating(false);
  }, []);

  useEffect(() => {
    if (!room) return;
    const unbindMessages = bindRoomMessages(room);

    const handleLeave = (code: number) => {
      // Saliendo de un barrio para entrar a otro: esa salida no vuelve a la pantalla de ingreso.
      if (gameStore.getState().traveling) return;
      setSession(null);
      gameStore.reset();
      if (code === DUPLICATE_SESSION_CODE) setNotice("Entraste desde otra pestaña o dispositivo: esta sesión se cerró.");
      else if (code === JAILED_KICK_CODE) setNotice("🚔 Quedaste preso: al volver a entrar vas al COMCAR.");
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

  // Tu barra: se pide al entrar a cada sala (los mensajes ya están escuchados en el efecto de arriba),
  // así el menú de los jugadores sabe si sos fundador.
  useEffect(() => {
    if (room) requestBarra(room);
  }, [room]);

  // Paneles (teclas en `PANELS`: M, I, E, B, K, C, Tab y, sólo admin, P y H), F: interactuar / pescar / vender,
  // 1–9: barra rápida, Esc: cerrar. Con un intercambio abierto no anda ninguno.
  // No interfiere mientras se escribe en el chat (ahí Tab sigue moviendo el foco).
  useEffect(() => {
    if (!room) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const { trading, isAdmin } = gameStore.getState();
      if (trading) return;
      const panelId = panelForKey(event.code, isAdmin);
      if (panelId) {
        event.preventDefault();
        togglePanel(panelId);
      } else if (event.code === "KeyF") {
        event.preventDefault();
        pressF(room);
      } else if (/^Digit[1-9]$/.test(event.code)) {
        event.preventDefault();
        activateHotbar(room, Number(event.code.slice(5)) - 1);
      } else if (event.key === "Escape") {
        closePanel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [room]);

  /**
   * Con el boleto pagado (lo cobra el server): salir de la sala y entrar a la del destino. El
   * server sólo deja entrar a otro barrio con un boleto vigente.
   */
  const travel = useCallback(
    async ({ cityId, roomId, ambulance, door, walk }: TravelMessage) => {
      // `roomId` (de `/trace`) puede ser otra copia del mismo barrio.
      if (!room || gameStore.getState().traveling || (roomId ? roomId === room.roomId : cityId === session?.cityId)) return;
      gameStore.setState({ traveling: { from: cityName(session?.cityId), to: cityName(cityId), ambulance, door, walk } });
      gameStore.resetCity();
      const startedAt = Date.now();
      try {
        await room.leave(true);
        // El viaje dura al menos TRAVEL_MS (la animación del ómnibus); si el server tarda más, se espera.
        // Por una puerta (las Termas) es un fundido corto, no el ómnibus.
        const [next] = await Promise.all([travelTo(cityId, roomId), wait((door ? DOOR_MS : TRAVEL_MS) - (Date.now() - startedAt))]);
        setSession(next);
      } catch (error) {
        console.error("[Montevideo World] travel failed", error);
        setSession(null);
        setNotice("No se pudo viajar al barrio. Volvé a entrar.");
      } finally {
        gameStore.setState({ traveling: null });
      }
    },
    [room, session?.cityId],
  );

  // El server aprobó el boleto: recién ahí se viaja.
  useEffect(
    () => eventBus.on("travel:approved", (message) => void travel(message)),
    [travel],
  );

  const handleExit = useCallback(() => {
    room?.leave(true);
  }, [room]);

  // Inicio de sesión → elegir un personaje (si hay guardados) o crear uno → juego. Al salir del juego
  // se vuelve a elegir.
  if (!session || !room) {
    if (!signedIn) {
      return (
        <LoginScreen
          onSignIn={() => {
            setCharacters(listCharacters());
            setCreating(false);
            setSignedIn(true);
          }}
        />
      );
    }
    if (characters.length > 0 && !creating) {
      return <CharacterSelect characters={characters} onJoined={handleJoined} onCreate={() => setCreating(true)} notice={notice} />;
    }
    return <JoinScreen onJoined={handleJoined} notice={notice} onBack={characters.length > 0 ? () => setCreating(false) : undefined} />;
  }

  const panelEntry = panel ? PANELS[panel] : null;
  const Panel = panelEntry && (!panelEntry.adminOnly || isAdmin) ? panelEntry.component : null;

  return (
    <>
      <PhaserGame session={session} />
      <Hud cityName={cityName(session.cityId) || session.cityId} onExit={handleExit} />
      {/*
        Lo de abajo de la pantalla. En celulares se apila en una columna (pesca / venta, necesidades,
        barra rápida, chat) que sube con el teclado; en escritorio cada uno conserva su lugar (ver .dock en el CSS).
      */}
      <div className={cx("dock")}>
        <FollowBadge room={room} />
        <InteractPrompt />
        <FishingWidget room={room} />
        <VendingWidget room={room} />
        <BuskingWidget room={room} />
        <TutorialCard room={room} cityId={session.cityId} />
        <Vitals />
        <Hotbar room={room} />
        <ChatBox room={room} />
      </div>
      <CameraButton />
      <Notices />
      <BoxReveal />
      <PlayerMenu room={room} />
      <TradeInvites room={room} />
      <PairGestureInvites room={room} />
      <BarraInvites room={room} />
      <TradePanel room={room} />
      <Announcement />
      <JailBanner />
      {Panel && <Panel room={room} cityId={session.cityId} onClose={closePanel} />}
      {traveling &&
        (traveling.door ? (
          <DoorOverlay to={traveling.to} walk={traveling.walk} />
        ) : (
          <TravelOverlay from={traveling.from} to={traveling.to} ambulance={traveling.ambulance} />
        ))}
      <FaintOverlay />
    </>
  );
}
