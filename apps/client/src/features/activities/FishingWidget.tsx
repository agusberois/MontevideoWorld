"use client";

import { useEffect, useState } from "react";
import { FISH_ENERGY_COST, FishResultMessage, LOW_USES, bestRod, rodPerks, stackUses, usesLabel, wornestStack } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { toggleFishing } from "@/lib/gameActions";
import { useGame } from "@/lib/gameStore";
import type { CityRoom } from "@/lib/network";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./activities.module.css";

const cx = moduleClasses(styles);

interface FishingWidgetProps {
  room: CityRoom;
}

const RESULT_MS = 5000;

/**
 * Pesca en la escollera: botón "Pescar (F)", barra de espera mientras la línea está en el agua
 * (la duración la decide el server) y aviso con lo que picó.
 */
export function FishingWidget({ room }: FishingWidgetProps) {
  /** Si está parado en la escollera y si tiene la línea en el agua (según el Schema). */
  const { canFish, fishing } = useGame((state) => state.fishing);
  const energy = useGame((state) => state.energy);
  const inventory = useGame((state) => state.inventory);
  /** Mostrar la tecla F (no, si F ahora interactúa con algo que está al lado: ver `InteractPrompt`). */
  const hasInteraction = useGame((state) => state.interaction !== null);
  const keyHint = fishing || !hasInteraction;
  const hasEnergy = energy === null || energy >= FISH_ENERGY_COST;
  /** La caña con la que se pesca: la de mayor nivel y, entre iguales, la más gastada (como el server). */
  const stacks = inventory?.stacks ?? [];
  const rod = bestRod(stacks.map((stack) => stack.itemId));
  const rodStack = rod && wornestStack(stacks, rod.id);
  const uses = rodStack ? stackUses(rodStack) : 0;
  const onToggle = () => toggleFishing(room);
  const [wait, setWait] = useState<{ id: number; durationMs: number } | null>(null);
  const [result, setResult] = useState<FishResultMessage | null>(null);

  useEffect(() => {
    const offStarted = eventBus.on("fishing:started", ({ durationMs }) => {
      setResult(null);
      setWait({ id: Date.now(), durationMs });
    });
    const offResult = eventBus.on("fishing:result", setResult);
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

  if (!canFish && !fishing && !result) return null;

  return (
    <div className={cx("fishing")} role="status" aria-live="polite">
      {result && <p className={cx(`fishing-result ${result.ok ? "ok" : "miss"}`)}>{result.text}</p>}
      {fishing ? (
        <div className={cx("fishing-card")}>
          {/* El nombre de la caña va en el tooltip: en el texto no entra junto a la barra de espera. */}
          <span className={cx("fishing-label")} title={rod ? `Pescando con ${rod.name}` : undefined}>
            <UiIcon name="fishingRod" />
            Esperando que pique…
          </span>
          {wait && (
            <span className={cx("fishing-bar")}>
              {/* La key reinicia la animación en cada tirada. */}
              <span key={wait.id} style={{ animationDuration: `${wait.durationMs}ms` }} />
            </span>
          )}
          <button type="button" onClick={onToggle}>
            Recoger {keyHint && <kbd>F</kbd>}
          </button>
        </div>
      ) : (
        canFish && (
          <>
            <button
              type="button"
              className={cx("fishing-cast")}
              onClick={onToggle}
              disabled={!hasEnergy || !rod}
              title={
                !rod
                  ? "Necesitás una caña: comprá una en Pesca Sarandí, la tienda frente a la escollera"
                  : hasEnergy
                    ? `${usesLabel(rod, uses)} · ${rodPerks(rod).join(" · ")}`
                    : "Estás muy cansado para pescar: descansá un rato"
              }
            >
              <UiIcon name="fishingRod" />
              {!rod ? (
                "Sin caña"
              ) : hasEnergy ? (
                // Un solo hijo: el botón separa sus hijos con `gap` y quedaría un espacio de más.
                <span>
                  Pescar con <strong className={cx("fishing-rod-name")}>{rod.name}</strong>{" "}
                  <small className={cx(`fishing-uses${uses <= LOW_USES ? " low" : ""}`)}>· {uses} usos</small>
                </span>
              ) : (
                "Sin energía"
              )}{" "}
              {keyHint && <kbd>F</kbd>}
            </button>
          </>
        )
      )}
    </div>
  );
}
