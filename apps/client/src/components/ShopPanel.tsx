"use client";

import { useEffect, useState } from "react";
import type { ItemDefinition } from "@montevideo-world/shared";
import {
  InventoryMessage,
  InventoryStack,
  Shop,
  ShopResultMessage,
  buyPrice,
  difficultyStars,
  FISH_BUY_MARKUP,
  formatMoney,
  formatPercent,
  getItem,
  haggleChance,
  maxHagglePrice,
  rodPerks,
  rodStars,
  cartPerks,
  cartStars,
  isTool,
  maxStack,
  sellPrice,
  stackUses,
  usesLabel,
  wornestStack,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { CityRoom, sendShopHaggle, sendShopTrade } from "@/lib/network";
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
  /** Ítem que se está regateando (se abre su formulario debajo de la fila). */
  const [haggling, setHaggling] = useState<string | null>(null);

  useEffect(() => eventBus.on("shop:result", setResult), []);

  const stacks = inventory?.stacks ?? [];
  const capacity = inventory?.capacity ?? 0;
  const canStore = (itemId: string) =>
    stacks.some((stack) => stack.itemId === itemId && stack.quantity < maxStack(getItem(itemId))) || stacks.length < capacity;
  const stock = shop.stock.map(getItem).filter((item) => item !== undefined);
  /**
   * Lo de la mochila que esta tienda compra (ropa en la ropería, pescado en la pescadería), una fila
   * por ítem. Las herramientas van de a una por casillero: se juntan y se muestra el precio de la
   * que se vende primero (la más gastada, como hace el server).
   */
  const sellable: InventoryStack[] = [];
  for (const stack of stacks) {
    const item = getItem(stack.itemId);
    if (!item || !shop.buys.includes(item.category)) continue;
    const row = sellable.find((other) => other.itemId === stack.itemId);
    if (row) row.quantity += stack.quantity;
    else sellable.push({ itemId: stack.itemId, quantity: stack.quantity, uses: wornestStack(stacks, stack.itemId)?.uses });
  }

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
                    {item.category === "rod" && (
                      <>
                        <span className="shop-stars" title={`Nivel ${item.tier} de 4`}>
                          {rodStars(item.tier)}
                        </span>
                        <span className="shop-perks">{rodPerks(item).join(" · ")}</span>
                      </>
                    )}
                    {item.category === "cart" && (
                      <>
                        <span className="shop-stars" title={`Nivel ${item.tier} de 4`}>
                          {cartStars(item.tier)}
                        </span>
                        <span className="shop-perks">{cartPerks(item).join(" · ")}</span>
                      </>
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
              const open = haggling === item.id;
              /** Usos que le quedan a la herramienta que se vende (undefined si no es herramienta). */
              const uses = isTool(item) ? stackUses(stack) : undefined;
              return (
                <li key={stack.itemId} className={open ? "haggling" : undefined}>
                  <ItemIcon item={item} size={36} />
                  <span className="shop-item-name">
                    {item.name}
                    {stack.quantity > 1 && <small> x{stack.quantity}</small>}
                    {isTool(item) && uses !== undefined && (
                      <span className="shop-uses">
                        {" "}
                        · {usesLabel(item, uses)}
                        {stack.quantity > 1 ? " (se vende la más gastada)" : ""}
                      </span>
                    )}
                    {item.category === "fish" && (
                      <span className="shop-stars" title={`Dificultad ${item.difficulty} de 5`}>
                        {difficultyStars(item.difficulty)}
                      </span>
                    )}
                  </span>
                  <span className="shop-price">{formatMoney(sellPrice(item, uses))}</span>
                  <div className="shop-sell-actions">
                    <button type="button" onClick={() => trade("sell", item.id)}>
                      Vender
                    </button>
                    <button
                      type="button"
                      className="shop-haggle-toggle"
                      aria-expanded={open}
                      onClick={() => setHaggling(open ? null : item.id)}
                      title="Pedí más plata: todo o nada"
                    >
                      Regatear
                    </button>
                  </div>
                  {open && (
                    <HaggleForm
                      item={item}
                      base={sellPrice(item, uses)}
                      onHaggle={(price) => {
                        setResult(null);
                        sendShopHaggle(room, shop.id, item.id, price);
                        // Si era la última unidad, la fila desaparece; si quedan, el formulario sigue abierto.
                        if (stack.quantity <= 1) setHaggling(null);
                      }}
                    />
                  )}
                </li>
              );
            })}
        </ul>

        {tab === "sell" && sellable.length === 0 && (
          <p className="shop-hint">
            {shop.buys.includes("fish") ? (
              <>No tenés pescados en la mochila. Pescá en la Escollera Sarandí y volvé.</>
            ) : shop.buys.includes("rod") ? (
              <>No tenés cañas en la mochila para vender.</>
            ) : shop.buys.includes("cart") ? (
              <>No tenés carritos en la mochila para vender.</>
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
          {tab === "sell" && shop.buys.includes("rod")
            ? "Por una caña te pagan la mitad de su precio, menos cuanto más gastada esté. "
            : ""}
          {tab === "sell" && shop.buys.includes("cart")
            ? "Por un carrito te pagan la mitad de su precio, menos cuanto más gastado esté. "
            : ""}
          {tab === "buy" && shop.stock.some((id) => getItem(id)?.category === "rod")
            ? "Pescás siempre con la mejor caña que tengas en la mochila; cada tirada la gasta y al final se rompe. "
            : ""}
          {tab === "buy" && shop.stock.some((id) => getItem(id)?.category === "cart")
            ? "Vendés siempre con el mejor carrito de la mochila, parado en la Explanada del Centenario; cada intento lo gasta y al final se rompe. "
            : ""}
          {tab === "buy" && shop.stock.some((id) => getItem(id)?.category === "fish")
            ? `Comprar pescado sale ${Math.round((FISH_BUY_MARKUP - 1) * 100)} % más de lo que paga el mercado. `
            : ""}
          <span className="key-hint">
            Apretá <kbd>Esc</kbd> para cerrar
          </span>
        </footer>
      </section>
    </div>
  );
}

interface HaggleFormProps {
  item: ItemDefinition;
  /** Lo que pagan vendiendo normal (para una herramienta, según su desgaste). */
  base: number;
  onHaggle: (price: number) => void;
}

/**
 * Regatear la venta de un ítem: elegís cuánto pedir (más que el precio normal, hasta el tope) y se
 * ve en vivo la probabilidad de que acepten. Es todo o nada: si no aceptan, perdés el ítem.
 */
function HaggleForm({ item, base, onHaggle }: HaggleFormProps) {
  const max = maxHagglePrice(base);
  const [price, setPrice] = useState(() => Math.min(max, Math.max(base + 1, Math.ceil(base * 1.5))));
  const chance = haggleChance(base, price);
  const level = chance >= 0.6 ? "high" : chance >= 0.3 ? "mid" : "low";

  return (
    <div className="haggle">
      <label className="haggle-price">
        <span>Pedir</span>
        <input
          type="range"
          min={base + 1}
          max={max}
          value={price}
          onChange={(event) => setPrice(Number(event.target.value))}
          aria-label="Precio que pedís"
        />
        <strong>{formatMoney(price)}</strong>
      </label>
      <div className="haggle-odds">
        <span className={`haggle-chance ${level}`}>
          {formatPercent(chance)} de que acepten
        </span>
        <span className="haggle-bar" aria-hidden="true">
          <span className={level} style={{ width: `${chance * 100}%` }} />
        </span>
      </div>
      <p className="haggle-warning">
        Todo o nada: o te pagan {formatMoney(price)} o perdés {item.name} sin cobrar nada (vendiendo normal te dan{" "}
        {formatMoney(base)}).
      </p>
      <button type="button" className="haggle-go" onClick={() => onHaggle(price)}>
        🎲 Todo o nada por {formatMoney(price)}
      </button>
    </div>
  );
}
