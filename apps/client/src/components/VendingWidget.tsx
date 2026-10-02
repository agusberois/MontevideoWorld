"use client";

import { useEffect, useState } from "react";
import { CartItem, LOW_USES, Match, VendResultMessage, cartPerks, usesLabel } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { UiIcon } from "./UiIcon";

interface VendingWidgetProps {
  /** El avatar propio está parado en la zona de venta (explanada del Centenario). */
  canVend: boolean;
  /** Está ofreciendo la mercadería (según el Schema). */
  vending: boolean;
  /** Hay energía para vender. */
  hasEnergy: boolean;
  /** El carrito con el que se vende (el mejor de la mochila); undefined si no tiene ninguno. */
  cart: CartItem | undefined;
  /** Usos que le quedan a ese carrito (se rompe al llegar a 0). */
  uses: number;
  /** El partido que se está jugando en el Centenario, si hay (se vende el doble). */
  match: Match | undefined;
  /** Ofrecer o dejar de vender (lo mismo que la tecla F en la explanada). */
  onToggle: () => void;
  /** Mostrar la tecla F (no, si F ahora interactúa con algo que está al lado: ver `InteractPrompt`). */
  keyHint?: boolean;
}

const RESULT_MS = 5000;

/**
 * Vender en la explanada del Centenario: botón "Vender (F)", barra de espera mientras ofrece (la
 * duración la decide el server) y aviso con lo que pasó. Usa los mismos estilos que la pesca.
 */
export function VendingWidget({ canVend, vending, hasEnergy, cart, uses, match, onToggle, keyHint = true }: VendingWidgetProps) {
  const [wait, setWait] = useState<{ id: number; durationMs: number } | null>(null);
  const [result, setResult] = useState<VendResultMessage | null>(null);

  useEffect(() => {
    const offStarted = eventBus.on("vending:started", ({ durationMs }) => {
      setResult(null);
      setWait({ id: Date.now(), durationMs });
    });
    const offResult = eventBus.on("vending:result", setResult);
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

  if (!canVend && !vending && !result) return null;

  return (
    <div className="fishing" role="status" aria-live="polite">
      {result && <p className={`fishing-result ${result.ok ? "ok" : "miss"}`}>{result.text}</p>}
      {canVend && match && <p className="vending-match">⚽ {match.name}: ¡se vende el doble!</p>}
      {vending ? (
        <div className="fishing-card">
          <span className="fishing-label" title={cart ? `Vendiendo con ${cart.name}` : undefined}>
            <UiIcon name="cart" />
            Esperando un cliente…
          </span>
          {wait && (
            <span className="fishing-bar">
              {/* La key reinicia la animación en cada intento. */}
              <span key={wait.id} style={{ animationDuration: `${wait.durationMs}ms` }} />
            </span>
          )}
          <button type="button" onClick={onToggle}>
            Dejar {keyHint && <kbd>F</kbd>}
          </button>
        </div>
      ) : (
        canVend && (
          <button
            type="button"
            className="fishing-cast"
            onClick={onToggle}
            disabled={!hasEnergy || !cart}
            title={
              !cart
                ? "Necesitás un carrito: comprá uno en el Kiosco del Parque, al lado del estadio"
                : hasEnergy
                  ? `${usesLabel(cart, uses)} · ${cartPerks(cart).join(" · ")}`
                  : "Estás muy cansado para vender: descansá un rato"
            }
          >
            <UiIcon name="cart" />
            {!cart ? (
              "Sin carrito"
            ) : hasEnergy ? (
              // Un solo hijo: el botón separa sus hijos con `gap` y quedaría un espacio de más.
              <span>
                Vender con <strong className="fishing-rod-name">{cart.name}</strong>{" "}
                <small className={`fishing-uses${uses <= LOW_USES ? " low" : ""}`}>· {uses} usos</small>
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
