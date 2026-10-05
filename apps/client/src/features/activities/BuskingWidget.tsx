"use client";

import { useEffect, useState } from "react";
import {
  BUSK_ENERGY_COST,
  BuskResultMessage,
  LOW_USES,
  WEATHERS,
  bestInstrument,
  instrumentPerks,
  stackUses,
  usesLabel,
  wornestStack,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { toggleBusking } from "@/lib/gameActions";
import { useGame } from "@/lib/gameStore";
import type { CityRoom } from "@/lib/network";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./activities.module.css";

const cx = moduleClasses(styles);

interface BuskingWidgetProps {
  room: CityRoom;
}

const RESULT_MS = 5000;

/**
 * Tocar en la calle (18 de Julio y las plazas del Centro): botón "Tocar (F)", barra de espera
 * mientras dura el tema (la duración la decide el server) y aviso con la propina y cuánta gente
 * escuchaba. Usa los mismos estilos que la pesca y la venta.
 */
export function BuskingWidget({ room }: BuskingWidgetProps) {
  /** Si está parado donde se toca y si está tocando (según el Schema). */
  const { canBusk, busking } = useGame((state) => state.busking);
  const energy = useGame((state) => state.energy);
  const inventory = useGame((state) => state.inventory);
  /** Mostrar la tecla F (no, si F ahora interactúa con algo que está al lado: ver `InteractPrompt`). */
  const hasInteraction = useGame((state) => state.interaction !== null);
  const keyHint = busking || !hasInteraction;
  const hasEnergy = energy === null || energy >= BUSK_ENERGY_COST;
  /** El instrumento con el que se toca: el de mayor nivel y, entre iguales, el más gastado (como el server). */
  const stacks = inventory?.stacks ?? [];
  const instrument = bestInstrument(stacks.map((stack) => stack.itemId));
  const instrumentStack = instrument && wornestStack(stacks, instrument.id);
  const uses = instrumentStack ? stackUses(instrumentStack) : 0;
  /** Lo que cambia el clima de ahora en las propinas ("" = nada). */
  const weatherHint = useGame((state) => WEATHERS[state.weather].buskingHint);
  const onToggle = () => toggleBusking(room);
  const [wait, setWait] = useState<{ id: number; durationMs: number } | null>(null);
  const [result, setResult] = useState<BuskResultMessage | null>(null);

  useEffect(() => {
    const offStarted = eventBus.on("busking:started", ({ durationMs }) => {
      setResult(null);
      setWait({ id: Date.now(), durationMs });
    });
    const offResult = eventBus.on("busking:result", setResult);
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

  if (!canBusk && !busking && !result) return null;

  return (
    <div className={cx("fishing")} role="status" aria-live="polite">
      {result && <p className={cx(`fishing-result ${result.ok ? "ok" : "miss"}`)}>{result.text}</p>}
      {canBusk && !busking && <p className={cx("activity-weather")}>👥 Con gente cerca escuchando te dejan más.</p>}
      {canBusk && weatherHint && <p className={cx("activity-weather")}>{weatherHint}</p>}
      {busking ? (
        <div className={cx("fishing-card")}>
          <span className={cx("fishing-label")} title={instrument ? `Tocando ${instrument.name}` : undefined}>
            <UiIcon name="music" />
            Tocando…
          </span>
          {wait && (
            <span className={cx("fishing-bar")}>
              {/* La key reinicia la animación en cada tema. */}
              <span key={wait.id} style={{ animationDuration: `${wait.durationMs}ms` }} />
            </span>
          )}
          <button type="button" onClick={onToggle}>
            Parar {keyHint && <kbd>F</kbd>}
          </button>
        </div>
      ) : (
        canBusk && (
          <button
            type="button"
            className={cx("fishing-cast")}
            onClick={onToggle}
            disabled={!hasEnergy || !instrument}
            title={
              !instrument
                ? "Necesitás un instrumento: comprá uno en la Casa de Música, sobre 18 de Julio"
                : hasEnergy
                  ? `${usesLabel(instrument, uses)} · ${instrumentPerks(instrument).join(" · ")}`
                  : "Estás muy cansado para tocar: descansá un rato"
            }
          >
            <UiIcon name="music" />
            {!instrument ? (
              "Sin instrumento"
            ) : hasEnergy ? (
              // Un solo hijo: el botón separa sus hijos con `gap` y quedaría un espacio de más.
              <span>
                Tocar <strong className={cx("fishing-rod-name")}>{instrument.name}</strong>{" "}
                <small className={cx(`fishing-uses${uses <= LOW_USES ? " low" : ""}`)}>· {uses} usos</small>
              </span>
            ) : (
              "Sin energía"
            )}{" "}
            {keyHint && <kbd>F</kbd>}
          </button>
        )
      )}
    </div>
  );
}
