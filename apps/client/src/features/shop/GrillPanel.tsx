"use client";

import { DragEvent, useEffect, useRef, useState } from "react";
import {
  FishItem,
  GRILLED_FISH_ID,
  GRILL_YIELD,
  InventoryStack,
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
import { CityRoom, sendGrillCook, sendGrillTake } from "@/lib/network";
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
/** Lo que dura la animación de cocinar (el resultado del server se muestra recién al terminar). */
const COOK_MS = 2600;
/** Tipo de lo que se arrastra dentro de la parrilla (un pescado de la mochila o la bandeja). */
const DRAG_TYPE = "application/x-mw-grill";

type GrillDrag = { from: "backpack"; itemId: string } | { from: "tray" };

/**
 * Parrilla del Mercado (tienda con `grill`), en tres partes: a la izquierda **tu mochila** (los
 * pescados se arrastran a la parrilla, o se tocan para poner de a uno), en el medio **la parrilla**
 * (lo que vas a cocinar sobre las brasas y el botón de cocinar, con su animación) y a la derecha **la
 * bandeja** con lo cocinado (se arrastra a la mochila, o se toca). Todo son intenciones: el server
 * cocina (`grill:cook`, lo que sale va a la bandeja) y pasa a la mochila (`grill:take`).
 */
export function GrillPanel({ room, shop, onClose }: GrillPanelProps) {
  const inventory = useGame((state) => state.inventory);
  const tray = useGame((state) => state.grillTray);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ message: ShopResultMessage; key: number } | null>(null);
  /** Cocinando: lo que está sobre la parrilla y lo que había en la bandeja antes (se muestra eso hasta terminar). */
  const [cooking, setCooking] = useState<{ fishes: Record<string, number>; trayBefore: number } | null>(null);
  const [dropOn, setDropOn] = useState<"grill" | "backpack" | null>(null);
  const pending = useRef<ShopResultMessage | null>(null);
  const cookingRef = useRef(cooking);
  const trayRef = useRef(tray);
  useEffect(() => {
    cookingRef.current = cooking;
    trayRef.current = tray;
  });

  useEffect(
    () =>
      eventBus.on("shop:result", (message) => {
        // Mientras dura la animación, el resultado espera.
        if (message.grill && cookingRef.current) pending.current = message;
        else setResult({ message, key: Date.now() });
        // Error al cocinar: termina la animación y vuelven los pescados a la parrilla.
        if (!message.grill && cookingRef.current) {
          setChosen(cookingRef.current.fishes);
          setCooking(null);
        }
      }),
    [],
  );
  useEffect(() => {
    if (!cooking) return;
    const timer = window.setTimeout(() => {
      setCooking(null);
      if (pending.current) setResult({ message: pending.current, key: Date.now() });
      pending.current = null;
    }, COOK_MS);
    return () => window.clearTimeout(timer);
  }, [cooking]);

  useEffect(() => {
    if (!result || result.message.grill) return;
    const timer = window.setTimeout(() => setResult(null), RESULT_MS);
    return () => window.clearTimeout(timer);
  }, [result]);

  // Al cerrar, lo que quedó en la bandeja pasa a la mochila (lo que entre).
  useEffect(
    () => () => {
      if (trayRef.current > 0) sendGrillTake(room, trayRef.current);
    },
    [room],
  );

  const stacks = inventory?.stacks ?? [];
  const capacity = inventory?.capacity ?? 0;
  const owned = (itemId: string) => stacks.reduce((sum, stack) => (stack.itemId === itemId ? sum + stack.quantity : sum), 0);
  const onGrill = cooking?.fishes ?? chosen;
  const grillLines = Object.entries(onGrill)
    .filter(([, quantity]) => quantity > 0)
    .map(([itemId, quantity]) => ({ fish: getItem(itemId) as FishItem | undefined, quantity }))
    .filter((line): line is { fish: FishItem; quantity: number } => line.fish?.category === "fish");
  const portions = grillLines.reduce((sum, { fish, quantity }) => sum + grillYield(fish) * quantity, 0);
  const shownTray = cooking ? cooking.trayBefore : tray;

  const grilled = getItem(GRILLED_FISH_ID);
  const grilledValue = edibleValue(grilled);

  /** Pone `amount` más de ese pescado en la parrilla (sin pasarse de los que tenés). */
  const addFish = (itemId: string, amount: number) => {
    if (cooking || getItem(itemId)?.category !== "fish") return;
    setChosen((current) => ({ ...current, [itemId]: Math.min(owned(itemId), (current[itemId] ?? 0) + amount) }));
  };
  const removeFish = (itemId: string) => {
    if (cooking) return;
    setChosen((current) => ({ ...current, [itemId]: Math.max(0, (current[itemId] ?? 0) - 1) }));
  };

  const cook = () => {
    if (cooking || grillLines.length === 0) return;
    setResult(null);
    pending.current = null;
    setCooking({ fishes: chosen, trayBefore: tray });
    setChosen({});
    sendGrillCook(
      room,
      shop.id,
      grillLines.map(({ fish, quantity }) => ({ itemId: fish.id, quantity })),
    );
  };

  const startDrag = (event: DragEvent, drag: GrillDrag) => {
    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(drag));
    event.dataTransfer.effectAllowed = "move";
  };
  const readDrag = (event: DragEvent): GrillDrag | null => {
    try {
      const parsed: unknown = JSON.parse(event.dataTransfer.getData(DRAG_TYPE));
      if (typeof parsed !== "object" || parsed === null) return null;
      const { from, itemId } = parsed as Record<string, unknown>;
      if (from === "tray") return { from };
      return from === "backpack" && typeof itemId === "string" ? { from, itemId } : null;
    } catch {
      return null;
    }
  };
  const dropZone = (zone: "grill" | "backpack", onDrop: (drag: GrillDrag) => void) => ({
    onDragOver: (event: DragEvent) => {
      if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
      event.preventDefault();
      setDropOn(zone);
    },
    onDragLeave: () => setDropOn((current) => (current === zone ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDropOn(null);
      const drag = readDrag(event);
      if (drag) onDrop(drag);
    },
  });

  const bySlot = new Map<number, InventoryStack>();
  for (const stack of stacks) if (stack.slot !== undefined) bySlot.set(stack.slot, stack);
  const free = freePerSlot(stacks, onGrill);

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

          <div className={cx("grill-columns")}>
            {/* Tu mochila: de acá salen los pescados y acá vuelven las porciones de la bandeja. */}
            <section
              className={cx(`grill-pane grill-backpack${dropOn === "backpack" ? " drop" : ""}`)}
              aria-label="Tu mochila"
              {...dropZone("backpack", (drag) => drag.from === "tray" && tray > 0 && sendGrillTake(room, tray))}
            >
              <h3>🎒 Tu mochila</h3>
              <div className={cx("grill-grid")}>
                {Array.from({ length: capacity }, (_, slot) => {
                  const stack = bySlot.get(slot);
                  const item = stack && getItem(stack.itemId);
                  if (!stack || !item) return <span key={slot} className={cx("grill-cell empty")} />;
                  const isFish = item.category === "fish";
                  const left = free.get(slot) ?? stack.quantity;
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={cx(`grill-cell${isFish ? " fish" : " other"}${left === 0 ? " used" : ""}`)}
                      draggable={isFish && left > 0 && !cooking}
                      onDragStart={(event) => startDrag(event, { from: "backpack", itemId: item.id })}
                      onClick={() => isFish && left > 0 && addFish(item.id, 1)}
                      disabled={!isFish || left === 0 || Boolean(cooking)}
                      title={isFish ? `${item.name} ${difficultyStars((item as FishItem).difficulty)} · da ${grillYield(item as FishItem)} ${grillYield(item as FishItem) === 1 ? "porción" : "porciones"}. Arrastralo a la parrilla o tocalo.` : `${item.name}: en la parrilla sólo se cocinan pescados.`}
                    >
                      <ItemIcon item={item} size={34} />
                      {left > 1 && <span className={cx("grill-cell-qty")}>{left}</span>}
                    </button>
                  );
                })}
              </div>
              <p className={cx("grill-hint")}>Arrastrá los pescados a la parrilla (o tocalos).</p>
            </section>

            {/* La parrilla: lo que se va a cocinar, sobre las brasas, y el botón. */}
            <section className={cx("grill-pane grill-center")} aria-label="La parrilla">
              <div
                className={cx(`grill-fire${cooking ? " cooking" : ""}${grillLines.length > 0 ? " loaded" : ""}${dropOn === "grill" ? " drop" : ""}`)}
                {...dropZone("grill", (drag) => drag.from === "backpack" && addFish(drag.itemId, owned(drag.itemId)))}
              >
                <div className={cx("grill-smoke")} aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className={cx("grill-grate")}>
                  {grillLines.length === 0 ? (
                    <span className={cx("grill-grate-empty")}>Soltá acá tus pescados</span>
                  ) : (
                    grillLines.map(({ fish, quantity }, i) => (
                      <button
                        key={fish.id}
                        type="button"
                        className={cx("grill-on")}
                        style={{ animationDelay: `${(i % 4) * 0.15}s` }}
                        onClick={() => removeFish(fish.id)}
                        disabled={Boolean(cooking)}
                        title={`${fish.name}: tocalo para sacar uno`}
                      >
                        <ItemIcon item={fish} size={40} />
                        {quantity > 1 && <span className={cx("grill-cell-qty")}>×{quantity}</span>}
                      </button>
                    ))
                  )}
                </div>
                <div className={cx("grill-coals")} aria-hidden="true">
                  {Array.from({ length: 9 }, (_, i) => (
                    <span key={i} style={{ animationDelay: `${(i * 0.37) % 1.3}s` }} />
                  ))}
                </div>
                <div className={cx("grill-sparks")} aria-hidden="true">
                  {Array.from({ length: 6 }, (_, i) => (
                    <span key={i} style={{ left: `${12 + i * 15}%`, animationDelay: `${i * 0.23}s` }} />
                  ))}
                </div>
              </div>

              <p className={cx("grill-estimate")}>
                {cooking ? (
                  <strong className={cx("grill-sizzle")}>¡Chsss! Cocinando…</strong>
                ) : portions > 0 ? (
                  <>
                    Hasta <strong>{portions}</strong> {portions === 1 ? "porción" : "porciones"}
                  </>
                ) : (
                  "La parrilla está vacía"
                )}
              </p>
              <button type="button" className={cx("grill-cook")} disabled={portions === 0 || Boolean(cooking)} onClick={cook}>
                🔥 Cocinar
              </button>
              <small className={cx("grill-burn")}>Ojo: a veces alguna porción se quema y va a parar a la basura.</small>
              <span className={cx("grill-yields")} title="Porciones por pescado, según lo difícil que es">
                {(Object.entries(GRILL_YIELD) as Array<[string, number]>).map(([difficulty, amount]) => (
                  <span key={difficulty}>
                    {difficultyStars(Number(difficulty) as FishItem["difficulty"])} → {amount}
                  </span>
                ))}
              </span>
            </section>

            {/* La bandeja: lo cocinado, para pasar a la mochila. */}
            <section className={cx("grill-pane grill-tray")} aria-label="La bandeja">
              <h3>🍽 Bandeja</h3>
              <div className={cx(`grill-plate${shownTray > 0 ? " full" : ""}`)}>
                {shownTray > 0 && grilled ? (
                  <button
                    key={shownTray}
                    type="button"
                    className={cx("grill-cell fish grill-served")}
                    draggable
                    onDragStart={(event) => startDrag(event, { from: "tray" })}
                    onClick={() => sendGrillTake(room, 1)}
                    title={`${grilled.name}: arrastralo a tu mochila o tocalo para pasar uno.`}
                  >
                    <ItemIcon item={grilled} size={44} />
                    <span className={cx("grill-cell-qty")}>×{shownTray}</span>
                  </button>
                ) : (
                  <span className={cx("grill-plate-empty")}>Acá sale lo cocinado</span>
                )}
              </div>
              {grilledValue && <small className={cx("grill-hint")}>Cada porción: {edibleLabel(grilledValue)}</small>}
              <button type="button" className={cx("grill-take")} disabled={shownTray === 0 || Boolean(cooking)} onClick={() => sendGrillTake(room, tray)}>
                🎒 Todo a la mochila
              </button>
            </section>
          </div>
        </div>

        <footer className={cx("key-hint")}>
          Apretá <kbd>Esc</kbd> para cerrar (lo de la bandeja pasa solo a tu mochila)
        </footer>
      </section>
    </div>
  );
}

/** Lo que queda en cada casillero descontando lo que está en la parrilla (se saca de las últimas pilas primero). */
function freePerSlot(stacks: readonly InventoryStack[], onGrill: Record<string, number>): Map<number, number> {
  const free = new Map<number, number>();
  const left = { ...onGrill };
  for (const stack of [...stacks].sort((a, b) => (b.slot ?? 0) - (a.slot ?? 0))) {
    if (stack.slot === undefined) continue;
    const taken = Math.min(stack.quantity, left[stack.itemId] ?? 0);
    if (taken > 0) left[stack.itemId] -= taken;
    free.set(stack.slot, stack.quantity - taken);
  }
  return free;
}

type GrillOutcome = NonNullable<ShopResultMessage["grill"]>;

/**
 * Cómo salió la parrilla, en partes: los pescados que entraron, y tres números (salieron, se
 * quemaron, a la bandeja) con una barra que muestra la parte quemada.
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
          <small>a la bandeja</small>
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
