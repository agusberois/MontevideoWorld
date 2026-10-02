"use client";

import { useEffect, useState } from "react";
import { FishResultMessage, LOW_USES, RodItem, rodPerks, usesLabel } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { UiIcon } from "./UiIcon";

interface FishingWidgetProps {
  /** El avatar propio está parado en la escollera. */
  canFish: boolean;
  /** Tiene la línea en el agua (según el Schema). */
  fishing: boolean;
  /** Hay energía para tirar la línea. */
  hasEnergy: boolean;
  /** La caña con la que se pesca (la mejor de la mochila); undefined si no tiene ninguna. */
  rod: RodItem | undefined;
  /** Usos que le quedan a esa caña (se rompe al llegar a 0). */
  uses: number;
  /** Tirar o recoger la línea (lo mismo que la tecla F). */
  onToggle: () => void;
  /** Mostrar la tecla F (no, si F ahora interactúa con algo que está al lado: ver `InteractPrompt`). */
  keyHint?: boolean;
}

const RESULT_MS = 5000;

/**
 * Pesca en la escollera: botón "Pescar (F)", barra de espera mientras la línea está en el agua
 * (la duración la decide el server) y aviso con lo que picó.
 */
export function FishingWidget({ canFish, fishing, hasEnergy, rod, uses, onToggle, keyHint = true }: FishingWidgetProps) {
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
    <div className="fishing" role="status" aria-live="polite">
      {result && <p className={`fishing-result ${result.ok ? "ok" : "miss"}`}>{result.text}</p>}
      {fishing ? (
        <div className="fishing-card">
          {/* El nombre de la caña va en el tooltip: en el texto no entra junto a la barra de espera. */}
          <span className="fishing-label" title={rod ? `Pescando con ${rod.name}` : undefined}>
            <UiIcon name="fishingRod" />
            Esperando que pique…
          </span>
          {wait && (
            <span className="fishing-bar">
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
              className="fishing-cast"
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
                  Pescar con <strong className="fishing-rod-name">{rod.name}</strong>{" "}
                  <small className={`fishing-uses${uses <= LOW_USES ? " low" : ""}`}>· {uses} usos</small>
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
