"use client";

import { useEffect, useState } from "react";
import { PARK_ENERGY_COST, ParkResultMessage, parkingPerks, wearsSafetyVest } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { toggleParking } from "@/lib/gameActions";
import { useGame } from "@/lib/gameStore";
import type { CityRoom } from "@/lib/network";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./activities.module.css";

const cx = moduleClasses(styles);

interface ParkingWidgetProps {
  room: CityRoom;
}

const RESULT_MS = 5000;

/**
 * Cuidar coches (frente a cualquier edificio con nombre, no tiendas: `CityMap.canParkAt`): botón "Cuidar autos (F)", barra de espera
 * mientras el dueño no vuelve (la duración la decide el server) y aviso con la propina. Hace falta el
 * chaleco flúo puesto. Usa los mismos estilos que la pesca, la venta y la música.
 */
export function ParkingWidget({ room }: ParkingWidgetProps) {
  /** Si está parado donde se cuidan coches y si está cuidando uno (según el Schema). */
  const { canPark, parking } = useGame((state) => state.parking);
  const energy = useGame((state) => state.energy);
  const top = useGame((state) => state.outfit?.top ?? "");
  /** Mostrar la tecla F (no, si F ahora interactúa con algo que está al lado: ver `InteractPrompt`). */
  const hasInteraction = useGame((state) => state.interaction !== null);
  const keyHint = parking || !hasInteraction;
  const hasEnergy = energy === null || energy >= PARK_ENERGY_COST;
  const hasVest = wearsSafetyVest(top);
  const onToggle = () => toggleParking(room);
  const [wait, setWait] = useState<{ id: number; durationMs: number } | null>(null);
  const [result, setResult] = useState<ParkResultMessage | null>(null);

  useEffect(() => {
    const offStarted = eventBus.on("parking:started", ({ durationMs }) => {
      setResult(null);
      setWait({ id: Date.now(), durationMs });
    });
    const offResult = eventBus.on("parking:result", setResult);
    return () => {
      offStarted();
      offResult();
    };
  }, []);

  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => setResult(null), RESULT_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  if (!canPark && !parking && !result) return null;

  return (
    <div className={cx("fishing")} role="status" aria-live="polite">
      {result && <p className={cx(`fishing-result ${result.ok ? "ok" : "miss"}`)}>{result.text}</p>}
      {canPark && !parking && !hasVest && <p className={cx("activity-weather")}>🦺 Sin el chaleco flúo puesto nadie te deja el auto.</p>}
      {parking ? (
        <div className={cx("fishing-card")}>
          <span className={cx("fishing-label")}>
            <UiIcon name="car" />
            Cuidando el auto…
          </span>
          {wait && (
            <span className={cx("fishing-bar")}>
              {/* La key reinicia la animación en cada auto. */}
              <span key={wait.id} style={{ animationDuration: `${wait.durationMs}ms` }} />
            </span>
          )}
          <button type="button" onClick={onToggle}>
            Parar {keyHint && <kbd>F</kbd>}
          </button>
        </div>
      ) : (
        canPark && (
          <button
            type="button"
            className={cx("fishing-cast")}
            onClick={onToggle}
            disabled={!hasEnergy || !hasVest}
            title={
              !hasVest
                ? "Necesitás el chaleco flúo puesto: ponételo desde la mochila"
                : hasEnergy
                  ? parkingPerks().join(" · ")
                  : "Estás muy cansado para cuidar coches: descansá un rato"
            }
          >
            <UiIcon name="car" />
            {!hasVest ? "Sin chaleco flúo" : hasEnergy ? "Cuidar autos" : "Sin energía"} {keyHint && <kbd>F</kbd>}
          </button>
        )
      )}
    </div>
  );
}
