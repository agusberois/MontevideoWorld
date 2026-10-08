"use client";

import { useEffect, useState } from "react";
import {
  FishItem,
  GRILLED_FISH_ID,
  GRILL_BURN_CHANCE,
  GRILL_YIELD,
  formatPercent,
  Shop,
  ShopResultMessage,
  difficultyStars,
  edibleLabel,
  edibleValue,
  getItem,
  grillYield,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { CityRoom, sendGrillCook } from "@/lib/network";
import { ItemIcon } from "../inventory/ItemIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./grill.module.css";

const cx = moduleClasses(styles);

interface GrillPanelProps {
  room: CityRoom;
  shop: Shop;
  onClose: () => void;
}

/** El aviso de error se va solo; la tarjeta de lo cocinado queda hasta cerrarla o cocinar de nuevo. */
const RESULT_MS = 5000;

/**
 * Parrilla del Mercado (tienda con `grill`): los pescados de la mochila, cuántas porciones de pescado
 * a la plancha da cada uno (`grillYield`: más cuanto más difícil el pez) y un solo botón para
 * cocinar lo elegido. Es una intención: el server valida (cercanía, que los tengas, que entre todo)
 * y responde con `shop:result`.
 */
export function GrillPanel({ room, shop, onClose }: GrillPanelProps) {
  const inventory = useGame((state) => state.inventory);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ message: ShopResultMessage; key: number } | null>(null);

  useEffect(
    () =>
      eventBus.on("shop:result", (message) => {
        setResult({ message, key: Date.now() });
        // Cocinado (aunque se haya quemado todo, los pescados ya no están): se limpia lo elegido.
        if (message.ok || message.action === "sell") setChosen({});
      }),
    [],
  );
  useEffect(() => {
    if (!result || result.message.grill) return;
    const timer = window.setTimeout(() => setResult(null), RESULT_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  // Los pescados de la mochila (sumando pilas), de los que más rinden a los que menos.
  const counts = new Map<string, number>();
  for (const stack of inventory?.stacks ?? []) counts.set(stack.itemId, (counts.get(stack.itemId) ?? 0) + stack.quantity);
  const fishes = [...counts]
    .map(([itemId, count]) => ({ fish: getItem(itemId), count }))
    .filter((entry): entry is { fish: FishItem; count: number } => entry.fish?.category === "fish")
    .sort((a, b) => b.fish.difficulty - a.fish.difficulty || a.fish.name.localeCompare(b.fish.name, "es"));

  const grilled = getItem(GRILLED_FISH_ID);
  const grilledValue = edibleValue(grilled);
  const portions = fishes.reduce((sum, { fish }) => sum + grillYield(fish) * (chosen[fish.id] ?? 0), 0);
  const set = (id: string, value: number, max: number) => setChosen((current) => ({ ...current, [id]: Math.max(0, Math.min(max, value)) }));

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section className={cx("modal grill")} role="dialog" aria-modal="true" aria-labelledby="grill-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2 id="grill-title">
            <span aria-hidden="true">🔥</span> {shop.name}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className={cx("grill-body")}>
          {result &&
            (result.message.grill ? (
              <GrillResult key={result.key} result={result.message.grill} onClose={() => setResult(null)} />
            ) : (
              <p key={result.key} className={cx(`grill-result ${result.message.ok ? "ok" : "error"}`)} role="status" aria-live="polite">
                {result.message.text}
              </p>
            ))}

          <div className={cx("grill-output")}>
            {grilled && <ItemIcon item={grilled} size={44} />}
            <div>
              <strong>Siempre sale {grilled?.name.toLowerCase() ?? "pescado a la plancha"}</strong>
              {grilledValue && <small>Cada porción: {edibleLabel(grilledValue)}</small>}
              <small className={cx("grill-burn")}>🔥 Ojo: cada porción se puede quemar ({formatPercent(GRILL_BURN_CHANCE)}).</small>
              <span className={cx("grill-yields")}>
                {(Object.entries(GRILL_YIELD) as Array<[string, number]>).map(([difficulty, amount]) => (
                  <span key={difficulty} title={`Peces de dificultad ${difficulty}`}>
                    {difficultyStars(Number(difficulty) as FishItem["difficulty"])} → {amount}
                  </span>
                ))}
              </span>
            </div>
          </div>

          {fishes.length === 0 ? (
            <p className={cx("grill-empty")}>No tenés pescados en la mochila. Pescá en la Escollera Sarandí y volvé: más grande el pez, más porciones.</p>
          ) : (
            <ul className={cx("grill-list")}>
              {fishes.map(({ fish, count }) => {
                const amount = chosen[fish.id] ?? 0;
                const each = grillYield(fish);
                return (
                  <li key={fish.id} className={cx(amount > 0 ? "selected" : "")}>
                    <ItemIcon item={fish} size={38} />
                    <span className={cx("grill-fish")}>
                      <strong>{fish.name}</strong>
                      <small>
                        {difficultyStars(fish.difficulty)} · tenés {count}
                      </small>
                    </span>
                    <span className={cx("grill-each")} title="Porciones de pescado a la plancha por cada uno">
                      🍽 ×{each}
                    </span>
                    <span className={cx("grill-qty")}>
                      <button type="button" onClick={() => set(fish.id, amount - 1, count)} disabled={amount === 0} aria-label={`Uno menos de ${fish.name}`}>
                        −
                      </button>
                      <span aria-live="polite">{amount}</span>
                      <button type="button" onClick={() => set(fish.id, amount + 1, count)} disabled={amount >= count} aria-label={`Uno más de ${fish.name}`}>
                        +
                      </button>
                      <button type="button" className={cx("grill-all")} onClick={() => set(fish.id, count, count)} disabled={amount >= count}>
                        Todos
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {fishes.length > 0 && (
            <div className={cx("grill-bar")}>
              <span>
                {portions > 0 ? (
                  <>
                    Hasta <strong>{portions}</strong> {portions === 1 ? "porción" : "porciones"}{" "}
                    <small className={cx("grill-burn")}>(sin quemarse, ~{Math.round(portions * (1 - GRILL_BURN_CHANCE))})</small>
                  </>
                ) : (
                  "Elegí qué pescados cocinar"
                )}
              </span>
              <button
                type="button"
                className={cx("grill-cook")}
                disabled={portions === 0}
                onClick={() =>
                  sendGrillCook(
                    room,
                    shop.id,
                    Object.entries(chosen)
                      .filter(([, quantity]) => quantity > 0)
                      .map(([itemId, quantity]) => ({ itemId, quantity })),
                  )
                }
              >
                🔥 Cocinar
              </button>
            </div>
          )}
        </div>

        <footer className={cx("key-hint")}>
          Apretá <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}

type GrillOutcome = NonNullable<ShopResultMessage["grill"]>;

/**
 * Cómo salió la parrilla, en partes: los pescados que entraron, y tres números (salieron, se
 * quemaron, te quedan) con una barra que muestra la parte quemada.
 */
function GrillResult({ result, onClose }: { result: GrillOutcome; onClose: () => void }) {
  const grilled = getItem(GRILLED_FISH_ID);
  const { cooked, total, burnt, kept } = result;
  const verdict = burnt === 0 ? "¡Perfecto, no se quemó nada!" : kept === 0 ? "Se quemó todo… ¡mala suerte!" : burnt === 1 ? "Se te quemó una" : `Se te quemaron ${burnt}`;
  return (
    <section className={cx(`grill-outcome${kept === 0 ? " lost" : burnt === 0 ? " perfect" : ""}`)} role="status" aria-live="polite">
      <header className={cx("grill-outcome-head")}>
        <strong>🔥 {verdict}</strong>
        <button type="button" onClick={onClose} aria-label="Cerrar el resultado">
          ✕
        </button>
      </header>

      <div className={cx("grill-outcome-in")}>
        <small>Cocinaste</small>
        <ul>
          {cooked.map(({ itemId, quantity }) => {
            const fish = getItem(itemId);
            return fish ? (
              <li key={itemId}>
                <ItemIcon item={fish} size={26} />
                {quantity > 1 && <span className={cx("grill-outcome-qty")}>×{quantity}</span>}
                <span>{fish.name}</span>
              </li>
            ) : null;
          })}
        </ul>
      </div>

      <div className={cx("grill-stats")}>
        <span>
          <strong>{total}</strong>
          <small>salieron</small>
        </span>
        <span className={cx("burnt")}>
          <strong>{burnt}</strong>
          <small>{burnt === 1 ? "se quemó" : "se quemaron"}</small>
        </span>
        <span className={cx("kept")}>
          <strong>
            {grilled && <ItemIcon item={grilled} size={24} />}
            {kept}
          </strong>
          <small>a tu mochila</small>
        </span>
      </div>

      {total > 0 && (
        <div className={cx("grill-meter")} aria-hidden="true">
          <span className={cx("kept")} style={{ width: `${(kept / total) * 100}%` }} />
          <span className={cx("burnt")} style={{ width: `${(burnt / total) * 100}%` }} />
        </div>
      )}
    </section>
  );
}

