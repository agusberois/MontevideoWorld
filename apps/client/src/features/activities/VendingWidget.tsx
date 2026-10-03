"use client";

import { useEffect, useState } from "react";
import { LOW_USES, VEND_ENERGY_COST, VendResultMessage, bestCart, cartPerks, stackUses, usesLabel, wornestStack } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { toggleVending } from "@/lib/gameActions";
import { useGame } from "@/lib/gameStore";
import type { CityRoom } from "@/lib/network";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./activities.module.css";

const cx = moduleClasses(styles);

interface VendingWidgetProps {
  room: CityRoom;
}

const RESULT_MS = 5000;

/**
 * Vender en la explanada del Centenario: botón "Vender (F)", barra de espera mientras ofrece (la
 * duración la decide el server) y aviso con lo que pasó. Usa los mismos estilos que la pesca.
 */
export function VendingWidget({ room }: VendingWidgetProps) {
  /** Si está parado en la explanada del Centenario y si está ofreciendo (según el Schema). */
  const { canVend, vending } = useGame((state) => state.vending);
  const energy = useGame((state) => state.energy);
  const inventory = useGame((state) => state.inventory);
  /** Mostrar la tecla F (no, si F ahora interactúa con algo que está al lado: ver `InteractPrompt`). */
  const hasInteraction = useGame((state) => state.interaction !== null);
  const keyHint = vending || !hasInteraction;
  const hasEnergy = energy === null || energy >= VEND_ENERGY_COST;
  /** El carrito con el que se vende: el de mayor nivel y, entre iguales, el más gastado (como el server). */
  const stacks = inventory?.stacks ?? [];
  const cart = bestCart(stacks.map((stack) => stack.itemId));
  const cartStack = cart && wornestStack(stacks, cart.id);
  const uses = cartStack ? stackUses(cartStack) : 0;
  /** El partido que se está jugando en el Centenario, si hay (se vende el doble; lo dice el server). */
  const match = useGame((state) => state.match);
  const onToggle = () => toggleVending(room);
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
    <div className={cx("fishing")} role="status" aria-live="polite">
      {result && <p className={cx(`fishing-result ${result.ok ? "ok" : "miss"}`)}>{result.text}</p>}
      {canVend && match && <p className={cx("vending-match")}>⚽ {match}: ¡se vende el doble!</p>}
      {vending ? (
        <div className={cx("fishing-card")}>
          <span className={cx("fishing-label")} title={cart ? `Vendiendo con ${cart.name}` : undefined}>
            <UiIcon name="cart" />
            Esperando un cliente…
          </span>
          {wait && (
            <span className={cx("fishing-bar")}>
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
            className={cx("fishing-cast")}
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
                Vender con <strong className={cx("fishing-rod-name")}>{cart.name}</strong>{" "}
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
