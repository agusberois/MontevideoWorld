"use client";

import { useEffect, useState } from "react";
import {
  InventoryMessage,
  MAX_STACK,
  Shop,
  ShopResultMessage,
  buyPrice,
  difficultyStars,
  FISH_BUY_MARKUP,
  formatMoney,
  getItem,
  sellPrice,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { CityRoom, sendShopTrade } from "@/lib/network";
import { ItemIcon } from "./ItemIcon";
import { UiIcon } from "./UiIcon";

interface ShopPanelProps {
  room: CityRoom;
  shop: Shop;
  money: number | null;
  inventory: InventoryMessage | null;
  onClose: () => void;
}

type Tab = "buy" | "sell";

/**
 * Panel de una tienda (se abre cuando el server avisa que llegaste). Comprar y vender son
 * intenciones: el server valida (cercanía, saldo, lugar en la mochila) y responde con `shop:result`;
 * saldo y mochila se actualizan con sus propios mensajes.
 */
export function ShopPanel({ room, shop, money, inventory, onClose }: ShopPanelProps) {
  const sellsSomething = shop.stock.length > 0;
  const [tab, setTab] = useState<Tab>(sellsSomething ? "buy" : "sell");
  const [result, setResult] = useState<ShopResultMessage | null>(null);

  useEffect(() => eventBus.on("shop:result", setResult), []);

  const stacks = inventory?.stacks ?? [];
  const capacity = inventory?.capacity ?? 0;
  const canStore = (itemId: string) =>
    stacks.some((stack) => stack.itemId === itemId && stack.quantity < MAX_STACK) || stacks.length < capacity;
  const stock = shop.stock.map(getItem).filter((item) => item !== undefined);
  /** Lo de la mochila que esta tienda compra (ropa en la ropería, pescado en la pescadería). */
  const sellable = stacks.filter((stack) => {
    const item = getItem(stack.itemId);
    return item !== undefined && shop.buys.includes(item.category);
  });

  function trade(action: Tab, itemId: string) {
    setResult(null);
    sendShopTrade(room, action, shop.id, itemId);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal shop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="shop-title">
            <UiIcon name="shop" size={18} />
            {shop.name}
          </h2>
          <span className="shop-money" title="Tu dinero">
            <UiIcon name="moneyBag" size={14} className="hud-money-icon" />
            {money === null ? "$…" : formatMoney(money)}
          </span>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className="shop-tabs" role="tablist">
          {sellsSomething && (
            <button type="button" role="tab" aria-selected={tab === "buy"} onClick={() => setTab("buy")}>
              Comprar
            </button>
          )}
          <button type="button" role="tab" aria-selected={tab === "sell"} onClick={() => setTab("sell")}>
            Vender
          </button>
        </div>

        {result && <p className={`shop-result ${result.ok ? "ok" : "error"}`}>{result.text}</p>}

        <ul className="shop-list">
          {tab === "buy" &&
            stock.map((item) => {
              const price = buyPrice(item);
              const affordable = money !== null && money >= price;
              const fits = canStore(item.id);
              return (
                <li key={item.id}>
                  <ItemIcon item={item} size={36} />
                  <span className="shop-item-name">
                    {item.name}
                    {item.category === "fish" && (
                      <span className="shop-stars" title={`Dificultad ${item.difficulty} de 5`}>
                        {difficultyStars(item.difficulty)}
                      </span>
                    )}
                  </span>
                  <span className="shop-price">{formatMoney(price)}</span>
                  <button
                    type="button"
                    disabled={!affordable || !fits}
                    title={!affordable ? "No te alcanza la plata" : !fits ? "No tenés lugar en la mochila" : undefined}
                    onClick={() => trade("buy", item.id)}
                  >
                    Comprar
                  </button>
                </li>
              );
            })}

          {tab === "sell" &&
            sellable.map((stack) => {
              const item = getItem(stack.itemId);
              if (!item) return null;
              return (
                <li key={stack.itemId}>
                  <ItemIcon item={item} size={36} />
                  <span className="shop-item-name">
                    {item.name}
                    {stack.quantity > 1 && <small> x{stack.quantity}</small>}
                    {item.category === "fish" && (
                      <span className="shop-stars" title={`Dificultad ${item.difficulty} de 5`}>
                        {difficultyStars(item.difficulty)}
                      </span>
                    )}
                  </span>
                  <span className="shop-price">{formatMoney(sellPrice(item))}</span>
                  <button type="button" onClick={() => trade("sell", item.id)}>
                    Vender
                  </button>
                </li>
              );
            })}
        </ul>

        {tab === "sell" && sellable.length === 0 && (
          <p className="shop-hint">
            {shop.buys.includes("fish") ? (
              <>No tenés pescados en la mochila. Pescá en la Escollera Sarandí y volvé.</>
            ) : (
              <>
                No tenés ropa en la mochila para vender. Lo que tenés puesto no se vende: sacátelo primero desde la
                mochila (<kbd>H</kbd>).
              </>
            )}
          </p>
        )}

        <footer>
          {tab === "sell" && shop.buys.includes("clothing") ? "Por la ropa usada te pagan la mitad. " : ""}
          {tab === "sell" && shop.buys.includes("fish") ? "El pescado se paga a precio completo. " : ""}
          {tab === "buy" && shop.stock.some((id) => getItem(id)?.category === "fish")
            ? `Comprar pescado sale ${Math.round((FISH_BUY_MARKUP - 1) * 100)} % más de lo que paga el mercado. `
            : ""}
          Apretá <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}
