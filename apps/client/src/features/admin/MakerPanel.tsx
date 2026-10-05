"use client";

import { useEffect, useState } from "react";
import {
  ITEMS,
  ITEM_CATEGORIES,
  ITEM_CATEGORY_IDS,
  ItemCategory,
  MAKER_MAX_QUANTITY,
  MAKER_RANGE,
  NearbyPlayer,
  formatMoney,
  isTool,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { CityRoom, requestNearbyPlayers, sendAdminGive } from "@/lib/network";
import { ItemIcon } from "../inventory/ItemIcon";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./admin.module.css";

const cx = moduleClasses(styles);

interface MakerPanelProps {
  room: CityRoom;
  onClose: () => void;
}

/** Orden de las secciones del maker: el del catálogo de categorías. */
const CATEGORY_ORDER = ITEM_CATEGORY_IDS;
const QUICK_QUANTITIES = [1, 5, 10];

/**
 * Maker del admin (tecla H): crea cualquier ítem del catálogo en tu mochila o en la de un jugador
 * cercano (a `MAKER_RANGE` tiles). La lista de cercanos la arma el server, que además vuelve a
 * validar todo (que seas admin, la distancia, el lugar en la mochila) y avisa con un `notice`.
 */
export function MakerPanel({ room, onClose }: MakerPanelProps) {
  const [nearby, setNearby] = useState<NearbyPlayer[]>([]);
  /** A quién: null = a vos. */
  const [targetId, setTargetId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [search, setSearch] = useState("");
  /** Categorías abiertas (las cerradas muestran sólo su pestaña). Cada vez que se abre el maker, todas cerradas. */
  const [open, setOpen] = useState<Set<ItemCategory>>(() => new Set());

  function toggleCategory(category: ItemCategory) {
    const next = new Set(open);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    setOpen(next);
  }

  useEffect(() => {
    const off = eventBus.on("admin:nearby", ({ players }) => {
      setNearby(players);
      // Si el elegido se alejó, vuelve a "Vos".
      setTargetId((current) => (current && players.some((player) => player.sessionId === current) ? current : null));
    });
    requestNearbyPlayers(room);
    return off;
  }, [room]);

  const query = search.trim().toLocaleLowerCase("es");
  const items = ITEMS.filter((item) => !query || item.name.toLocaleLowerCase("es").includes(query));
  const target = nearby.find((player) => player.sessionId === targetId);

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal maker")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="maker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="maker-title">
            <UiIcon name="wand" size={18} />
            Maker
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className={cx("maker-body")}>
          <div className={cx("maker-row")}>
            <span className={cx("maker-label")}>Para</span>
            <div className={cx("maker-targets")}>
              <button
                type="button"
                className={cx(targetId === null ? "active" : undefined)}
                onClick={() => setTargetId(null)}
              >
                Vos
              </button>
              {nearby.map((player) => (
                <button
                  key={player.sessionId}
                  type="button"
                  className={cx(targetId === player.sessionId ? "active" : undefined)}
                  onClick={() => setTargetId(player.sessionId)}
                  title={`A ${player.distance} ${player.distance === 1 ? "tile" : "tiles"}`}
                >
                  {player.name}
                </button>
              ))}
              <button
                type="button"
                className={cx("maker-refresh")}
                onClick={() => requestNearbyPlayers(room)}
                title="Buscar jugadores cerca"
              >
                ↻
              </button>
            </div>
          </div>
          {nearby.length === 0 && (
            <p className={cx("maker-hint")}>No hay nadie a {MAKER_RANGE} tiles o menos. Acercate a alguien y tocá ↻.</p>
          )}

          <div className={cx("maker-row")}>
            <span className={cx("maker-label")}>Cantidad</span>
            <div className={cx("maker-quantity")}>
              {QUICK_QUANTITIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={cx(quantity === value ? "active" : undefined)}
                  onClick={() => setQuantity(value)}
                >
                  {value}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={MAKER_MAX_QUANTITY}
                value={quantity}
                onChange={(event) => {
                  const value = Math.floor(Number(event.target.value));
                  if (Number.isFinite(value)) setQuantity(Math.min(MAKER_MAX_QUANTITY, Math.max(1, value)));
                }}
                aria-label="Cantidad"
              />
            </div>
          </div>

          <input
            className={cx("maker-search")}
            type="search"
            placeholder="Buscar ítem…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            // Los atajos globales no corren dentro de un input: Esc cierra desde acá.
            onKeyDown={(event) => event.key === "Escape" && onClose()}
          />

          <div className={cx("maker-tabs-actions")}>
            <button type="button" onClick={() => setOpen(new Set(CATEGORY_ORDER))}>
              Abrir todas
            </button>
            <button type="button" onClick={() => setOpen(new Set())}>
              Cerrar todas
            </button>
          </div>

          {CATEGORY_ORDER.map((category) => {
            const list = items.filter((item) => item.category === category);
            if (list.length === 0) return null;
            // Buscando, las categorías con resultados se muestran abiertas (sin cambiar cuáles abriste a mano).
            const expanded = open.has(category) || query !== "";
            const panelId = `maker-${category}`;
            return (
              <section key={category} className={cx(`maker-section${expanded ? " open" : ""}`)}>
                <button
                  type="button"
                  className={cx("maker-tab")}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggleCategory(category)}
                  disabled={query !== ""}
                >
                  <span className={cx("maker-tab-arrow")} aria-hidden="true">
                    ▸
                  </span>
                  <span className={cx("maker-tab-label")}>{ITEM_CATEGORIES[category].label}</span>
                  <span className={cx("maker-tab-count")}>{list.length}</span>
                </button>
                {expanded && (
                  <ul className={cx("maker-grid")} id={panelId}>
                    {list.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => sendAdminGive(room, item.id, quantity, targetId ?? undefined)}
                          title={`Crear ${quantity} × ${item.name} para ${target?.name ?? "vos"}${item.price > 0 ? ` (vale ${formatMoney(item.price)})` : ""}${isTool(item) ? " · sale nueva" : ""}`}
                        >
                          <ItemIcon item={item} size={36} />
                          <span className={cx("maker-item-name")}>{item.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
          {items.length === 0 && <p className={cx("maker-hint")}>Ningún ítem se llama así.</p>}
        </div>

        <footer>
          Tocá un ítem para crear {quantity} para {target?.name ?? "vos"}
          <span className={cx("key-hint")}>
            {" "}
            · <kbd>H</kbd> o <kbd>Esc</kbd> para cerrar
          </span>
        </footer>
      </section>
    </div>
  );
}
