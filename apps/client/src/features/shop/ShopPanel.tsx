"use client";

import { useEffect, useState } from "react";
import type { ItemDefinition } from "@montevideo-world/shared";
import {
  InventoryStack,
  Shop,
  getCityInfo,
  ShopResultMessage,
  SHOP_MAX_QUANTITY,
  buyPrice,
  ITEM_CATEGORIES,
  ITEM_CATEGORY_IDS,
  formatMoney,
  formatPercent,
  getItem,
  haggleChance,
  maxHagglePrice,
  isTool,
  maxStack,
  sellPrice,
  stackUses,
  usesLabel,
  wornestStack,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { CityRoom, sendShopCheckout, sendShopHaggleMany, sendShopSellMany } from "@/lib/network";
import type { PanelProps } from "../../shell/panels";
import { ItemIcon } from "../inventory/ItemIcon";
import { PetShop } from "../pets/PetShop";
import { HospitalPanel } from "../health/HospitalPanel";
import { CasinoPanel } from "../casino/CasinoPanel";
import { BarraRegistry } from "../barras/BarraRegistry";
import { GrillPanel } from "./GrillPanel";
import { itemPerks, itemRating } from "../inventory/itemCategoryUi";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./shop.module.css";

const cx = moduleClasses(styles);

interface ShopViewProps {
  room: CityRoom;
  shop: Shop;
  onClose: () => void;
}

type Tab = "buy" | "sell";

/** Cuánto queda a la vista el aviso de cómo salió la compra / venta. */
const RESULT_MS = 5000;
/** Si la respuesta no llega en este tiempo, el botón se vuelve a habilitar. */
const PENDING_MS = 3000;

/**
 * Panel de una tienda (se abre cuando el server avisa que llegaste). Comprar y vender son
 * intenciones: el server valida (cercanía, saldo, lugar en la mochila) y responde con `shop:result`;
 * saldo y mochila se actualizan con sus propios mensajes.
 */
export function ShopPanel({ room, cityId, onClose }: PanelProps) {
  const shopId = useGame((state) => state.shopId);
  const shop = shopId ? getCityInfo(cityId)?.shops.find((candidate) => candidate.id === shopId) : undefined;
  if (!shop) return null;
  // La veterinaria no compra ni vende ítems: se adoptan mascotas.
  if (shop.pets) return <PetShop room={room} shop={shop} onClose={onClose} />;
  // La guardia del sanatorio tampoco: se paga la consulta para curarse.
  if (shop.hospital) return <HospitalPanel room={room} shop={shop} onClose={onClose} />;
  // El Registro de Barras: el formulario para fundar una barra.
  if (shop.registry) return <BarraRegistry room={room} shop={shop} onClose={onClose} />;
  // La Parrilla del Mercado: se cocinan los pescados de la mochila.
  if (shop.grill) return <GrillPanel room={room} shop={shop} onClose={onClose} />;
  // Las máquinas y mesas del casino: su juego.
  if (shop.casino) return <CasinoPanel room={room} shop={shop} game={shop.casino} onClose={onClose} />;
  return <ShopView room={room} shop={shop} onClose={onClose} />;
}

function ShopView({ room, shop, onClose }: ShopViewProps) {
  const money = useGame((state) => state.money);
  const inventory = useGame((state) => state.inventory);
  const sellsSomething = shop.stock.length > 0;
  const [tab, setTab] = useState<Tab>(sellsSomething ? "buy" : "sell");
  /** Último resultado, con un número que cambia en cada uno (reinicia la animación del aviso). */
  const [result, setResult] = useState<{ message: ShopResultMessage; key: number } | null>(null);
  /** Regateo del lote elegido abierto (el formulario va en la barra de abajo). */
  const [haggling, setHaggling] = useState(false);
  /** Lo elegido para vender (pestaña Vender): id → unidades. Se vende o se regatea todo junto. */
  const [sale, setSale] = useState<Record<string, number>>({});
  /** Compra / venta esperando respuesta: el botón se deshabilita (así no se manda dos veces). */
  const [pending, setPending] = useState<string | null>(null);
  /** Carrito de la pestaña Comprar: id → unidades. Se compra todo junto con un solo botón. */
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(
    () =>
      eventBus.on("shop:result", (message) => {
        setResult({ message, key: Date.now() });
        setPending(null);
        // Compra del carrito hecha: se vacía. Venta (o regateo, salga como salga) de lo elegido: también.
        if (message.ok && message.bought) setCart({});
        // (Un regateo rechazado también llega con `action: "sell"`: lo elegido ya no está.)
        if (message.action === "sell") {
          setSale({});
          setHaggling(false);
        }
      }),
    [],
  );
  // El aviso se va solo; si la respuesta no llega (se cortó algo), el botón se libera igual.
  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => setResult(null), RESULT_MS);
    return () => window.clearTimeout(timer);
  }, [result]);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setPending(null), PENDING_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);

  const stacks = inventory?.stacks ?? [];
  const capacity = inventory?.capacity ?? 0;
  const canStore = (itemId: string) => fitCount(itemId) > 0;
  /** Cuántas unidades más entran (mismo criterio que el server: pilas sin llenar y casilleros libres). */
  function fitCount(itemId: string): number {
    const limit = maxStack(getItem(itemId));
    const free = Math.max(0, capacity - stacks.length);
    const room = stacks.filter((stack) => stack.itemId === itemId).reduce((total, stack) => total + Math.max(0, limit - stack.quantity), 0);
    return room + free * limit;
  }
  /** La fila del último resultado (se resalta un momento). */
  const flashed = (action: Tab, itemId: string) => {
    if (!result?.message.ok || result.message.action !== action) return null;
    const line = (action === "buy" ? result.message.bought : result.message.sold)?.find((done) => done.itemId === itemId);
    if (line) return { key: result.key, quantity: line.quantity };
    return result.message.itemId === itemId ? { key: result.key, quantity: result.message.quantity ?? 1 } : null;
  };
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

  /** Pie de la tienda: cómo paga lo que compra (Vender) o cómo funciona lo que vende (Comprar). */
  const notes =
    tab === "sell"
      ? shop.buys.map((category) => ITEM_CATEGORIES[category].sellNote).filter(Boolean)
      : ITEM_CATEGORY_IDS.filter((category) => stock.some((item) => item.category === category)).flatMap(
          (category) => ITEM_CATEGORIES[category].buyNote ?? [],
        );

  /**
   * Lo elegido para vender, con lo que pagan vendiendo normal: cada herramienta según su desgaste (se
   * venden de la más gastada a la menos, como en el server). Sólo lo que sigue en la mochila.
   */
  const saleLines = sellable.flatMap((stack) => {
    const item = getItem(stack.itemId);
    const quantity = Math.min(sale[stack.itemId] ?? 0, stack.quantity);
    if (!item || quantity <= 0) return [];
    const unitPrices = isTool(item)
      ? stacks
          .filter((other) => other.itemId === item.id)
          .map((other) => sellPrice(item, stackUses(other)))
          .sort((a, b) => a - b)
      : Array.from({ length: quantity }, () => sellPrice(item));
    const total = unitPrices.slice(0, quantity).reduce((sum, price) => sum + price, 0);
    return [{ item, quantity, total }];
  });
  const saleUnits = saleLines.reduce((sum, line) => sum + line.quantity, 0);
  const saleTotal = saleLines.reduce((sum, line) => sum + line.total, 0);
  const setSaleQuantity = (itemId: string, quantity: number) =>
    setSale((current) => {
      const next = { ...current };
      if (quantity > 0) next[itemId] = quantity;
      else delete next[itemId];
      return next;
    });
  const allSelected = sellable.length > 0 && sellable.every((stack) => (sale[stack.itemId] ?? 0) >= stack.quantity);
  const selectAll = () => setSale(allSelected ? {} : Object.fromEntries(sellable.map((stack) => [stack.itemId, stack.quantity])));
  const saleItems = () => saleLines.map(({ item, quantity }) => ({ itemId: item.id, quantity }));
  function sellSelection() {
    if (saleLines.length === 0) return;
    setResult(null);
    setPending("sell");
    sendShopSellMany(room, shop.id, saleItems());
  }
  function haggleSelection(price: number) {
    if (saleLines.length === 0) return;
    setResult(null);
    setPending("sell");
    sendShopHaggleMany(room, shop.id, saleItems(), price);
  }

  const resultItem = result?.message.itemId ? getItem(result.message.itemId) : undefined;

  /** El carrito: líneas con unidades, el total y si alcanza la plata. */
  const cartLines = stock.flatMap((item) => (cart[item.id] ? [{ item, quantity: cart[item.id] }] : []));
  const cartUnits = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cartLines.reduce((sum, line) => sum + buyPrice(line.item, shop.priceFactor) * line.quantity, 0);
  const cartAffordable = money !== null && money >= cartTotal;
  const setCartQuantity = (itemId: string, quantity: number) =>
    setCart((current) => {
      const next = { ...current };
      if (quantity > 0) next[itemId] = quantity;
      else delete next[itemId];
      return next;
    });
  function checkout() {
    if (cartLines.length === 0) return;
    setResult(null);
    setPending("checkout");
    sendShopCheckout(
      room,
      shop.id,
      cartLines.map(({ item, quantity }) => ({ itemId: item.id, quantity })),
    );
  }

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal shop")}
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
          <span className={cx("shop-money")} title="Tu dinero">
            <UiIcon name="moneyBag" size={14} className={cx("hud-money-icon")} />
            {money === null ? "$…" : formatMoney(money)}
          </span>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className={cx("shop-tabs")} role="tablist">
          {sellsSomething && (
            <button type="button" role="tab" aria-selected={tab === "buy"} onClick={() => setTab("buy")}>
              Comprar
            </button>
          )}
          <button type="button" role="tab" aria-selected={tab === "sell"} onClick={() => setTab("sell")}>
            Vender
          </button>
        </div>

        {/* Aviso de cómo salió: grande, con el ítem y el saldo, arriba de la lista (no se pierde al scrollear). */}
        {result && (
          <div key={result.key} className={cx(`shop-toast ${result.message.ok ? "ok" : "error"}`)} role="status" aria-live="polite">
            <span className={cx("shop-toast-mark")} aria-hidden="true">
              {result.message.ok ? "✓" : "✕"}
            </span>
            {resultItem && <ItemIcon item={resultItem} size={34} />}
            <span className={cx("shop-toast-text")}>
              {result.message.text}
              {result.message.ok && result.message.action && money !== null && (
                <small>Ahora tenés {formatMoney(money)}.</small>
              )}
            </span>
          </div>
        )}

        <ul className={cx("shop-list")}>
          {tab === "buy" &&
            stock.map((item) => {
              const price = buyPrice(item, shop.priceFactor);
              const fits = canStore(item.id);
              const inCart = cart[item.id] ?? 0;
              const max = Math.min(SHOP_MAX_QUANTITY, fitCount(item.id));
              const flash = flashed("buy", item.id);
              return (
                <li key={item.id} className={cx(`shop-row${inCart > 0 ? " in-cart" : ""}`)}>
                  {flash && (
                    <span key={flash.key} className={cx("shop-row-flash")} aria-hidden="true">
                      +{flash.quantity}
                    </span>
                  )}
                  <ItemIcon item={item} size={36} />
                  <span className={cx("shop-item-name")}>
                    {item.name}
                    <ItemRating item={item} />
                    {itemPerks(item).length > 0 && <span className={cx("shop-perks")}>{itemPerks(item).join(" · ")}</span>}
                  </span>
                  <span className={cx("shop-price")}>
                    {/* Mayorista: el precio de las otras tiendas, tachado. */}
                    {price < buyPrice(item) && <s className={cx("shop-price-old")}>{formatMoney(buyPrice(item))}</s>}
                    {formatMoney(price)}
                  </span>
                  <div className={cx("shop-buy-actions")}>
                    {fits ? (
                      <QuantityPicker
                        value={inCart}
                        min={0}
                        max={max}
                        label={item.name}
                        onChange={(value) => setCartQuantity(item.id, value)}
                      />
                    ) : (
                      <span className={cx("shop-no-room")}>Sin lugar</span>
                    )}
                  </div>
                </li>
              );
            })}

          {tab === "sell" &&
            sellable.map((stack) => {
              const item = getItem(stack.itemId);
              if (!item) return null;
              /** Usos que le quedan a la herramienta que se vende primero (undefined si no es herramienta). */
              const uses = isTool(item) ? stackUses(stack) : undefined;
              const max = stack.quantity;
              const chosen = Math.min(sale[item.id] ?? 0, max);
              const flash = flashed("sell", item.id);
              return (
                <li key={stack.itemId} className={cx(`shop-row${chosen > 0 ? " in-cart" : ""}`)}>
                  {flash && (
                    <span key={flash.key} className={cx("shop-row-flash sold")} aria-hidden="true">
                      −{flash.quantity}
                    </span>
                  )}
                  <label className={cx("shop-check")} title="Elegir para vender">
                    <input
                      type="checkbox"
                      checked={chosen > 0}
                      onChange={(event) => setSaleQuantity(item.id, event.target.checked ? max : 0)}
                      aria-label={`Vender ${item.name}`}
                    />
                  </label>
                  <ItemIcon item={item} size={36} />
                  <span className={cx("shop-item-name")}>
                    {item.name}
                    {stack.quantity > 1 && <small> x{stack.quantity}</small>}
                    {isTool(item) && uses !== undefined && (
                      <span className={cx("shop-uses")}>
                        {" "}
                        · {usesLabel(item, uses)}
                        {stack.quantity > 1 ? " (se vende la más gastada)" : ""}
                      </span>
                    )}
                    {/* Las herramientas muestran sus usos en vez del nivel. */}
                    {!isTool(item) && <ItemRating item={item} />}
                  </span>
                  <span className={cx("shop-price")}>{formatMoney(sellPrice(item, uses))}</span>
                  <div className={cx("shop-sell-actions")}>
                    {max > 1 && chosen > 0 && (
                      <QuantityPicker value={chosen} min={0} max={max} label={item.name} onChange={(value) => setSaleQuantity(item.id, value)} />
                    )}
                  </div>
                </li>
              );
            })}
        </ul>

        {tab === "buy" && (
          <div className={cx(`shop-cart${cartUnits > 0 ? " filled" : ""}`)}>
            <span className={cx("shop-cart-summary")}>
              <span aria-hidden="true">🛒</span>{" "}
              {cartUnits === 0 ? (
                "Elegí cuántas unidades querés de cada cosa"
              ) : (
                <>
                  {cartUnits} {cartUnits === 1 ? "producto" : "productos"} · <strong>{formatMoney(cartTotal)}</strong>
                  {!cartAffordable && <small> · no te alcanza</small>}
                </>
              )}
            </span>
            {cartUnits > 0 && (
              <button type="button" className={cx("shop-cart-clear")} onClick={() => setCart({})}>
                Vaciar
              </button>
            )}
            <button
              type="button"
              className={cx("shop-cart-buy")}
              disabled={cartUnits === 0 || !cartAffordable || pending === "checkout"}
              aria-busy={pending === "checkout"}
              title={cartUnits > 0 && !cartAffordable ? "No te alcanza la plata" : undefined}
              onClick={checkout}
            >
              Comprar
            </button>
          </div>
        )}

        {tab === "sell" && haggling && saleUnits > 0 && (
          <HaggleForm
            what={saleUnits === 1 ? saleLines[0].item.name : `los ${saleUnits} productos`}
            base={saleTotal}
            disabled={pending === "sell"}
            onHaggle={haggleSelection}
          />
        )}
        {tab === "sell" && sellable.length > 0 && (
          <div className={cx(`shop-cart${saleUnits > 0 ? " filled" : ""}`)}>
            <span className={cx("shop-cart-summary")}>
              <span aria-hidden="true">💰</span>{" "}
              {saleUnits === 0 ? (
                "Tildá lo que querés vender"
              ) : (
                <>
                  {saleUnits} {saleUnits === 1 ? "producto" : "productos"} · te pagan <strong>{formatMoney(saleTotal)}</strong>
                </>
              )}
            </span>
            <button type="button" className={cx("shop-cart-clear")} onClick={selectAll}>
              {allSelected ? "Destildar todo" : "Tildar todo"}
            </button>
            <button
              type="button"
              className={cx("shop-haggle-toggle")}
              aria-expanded={haggling}
              disabled={saleUnits === 0}
              onClick={() => setHaggling((open) => !open)}
              title="Pedí más plata por todo lo elegido: todo o nada"
            >
              Regatear
            </button>
            <button
              type="button"
              className={cx("shop-cart-buy")}
              disabled={saleUnits === 0 || pending === "sell"}
              aria-busy={pending === "sell"}
              onClick={sellSelection}
            >
              Vender
            </button>
          </div>
        )}

        {tab === "sell" && sellable.length === 0 && shop.buys.length > 0 && (
          <p className={cx("shop-hint")}>{ITEM_CATEGORIES[shop.buys[0]].nothingToSell}</p>
        )}

        <footer>
          {notes.map((note) => `${note} `)}
          <span className={cx("key-hint")}>
            Apretá <kbd>Esc</kbd> para cerrar
          </span>
        </footer>
      </section>
    </div>
  );
}

interface QuantityPickerProps {
  value: number;
  /** Lo mínimo (1 para vender; 0 en el carrito, que es "no lo quiero"). */
  min?: number;
  max: number;
  /** Para los lectores de pantalla ("Cantidad de Torta frita"). */
  label: string;
  onChange: (value: number) => void;
}

/** − / número / +: cuántas unidades comprar o vender (`min` … `max`). Se puede tipear. */
function QuantityPicker({ value, min = 1, max, label, onChange }: QuantityPickerProps) {
  const set = (next: number) => onChange(Math.max(min, Math.min(max, Math.round(next) || min)));
  return (
    <span className={cx("shop-qty")} role="group" aria-label={`Cantidad de ${label}`}>
      <button type="button" onClick={() => set(value - 1)} disabled={value <= min} aria-label="Una menos">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => set(Number(event.target.value))}
        onFocus={(event) => event.target.select()}
        aria-label="Cantidad"
      />
      <button type="button" onClick={() => set(value + 1)} disabled={value >= max} aria-label="Una más">
        +
      </button>
    </span>
  );
}

/** Estrellas del ítem (dificultad del pescado, nivel de la caña o el carrito), si tiene. */
function ItemRating({ item }: { item: ItemDefinition }) {
  const rating = itemRating(item);
  return rating ? (
    <span className={cx("shop-stars")} title={rating.title}>
      {rating.stars}
    </span>
  ) : null;
}

interface HaggleFormProps {
  /** Lo que se regatea ("Pejerrey", "los 5 productos"), para el aviso. */
  what: string;
  /** Lo que pagan vendiendo normal todo lo elegido (cada herramienta según su desgaste). */
  base: number;
  disabled?: boolean;
  onHaggle: (price: number) => void;
}

/**
 * Regatear lo elegido, todo junto: elegís cuánto pedir por todo (más que el precio normal, hasta el
 * tope) y se ve en vivo la probabilidad de que acepten. Es todo o nada: si no aceptan, perdés todo lo
 * elegido sin cobrar.
 */
function HaggleForm({ what, base, disabled, onHaggle }: HaggleFormProps) {
  const max = maxHagglePrice(base);
  const [chosen, setPrice] = useState(() => Math.min(max, Math.max(base + 1, Math.ceil(base * 1.5))));
  // Si cambia lo elegido, el precio queda dentro de lo que se puede pedir.
  const price = Math.min(max, Math.max(base + 1, chosen));
  const chance = haggleChance(base, price);
  const level = chance >= 0.6 ? "high" : chance >= 0.3 ? "mid" : "low";

  return (
    <div className={cx("haggle shop-haggle-all")}>
      <label className={cx("haggle-price")}>
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
      <div className={cx("haggle-odds")}>
        <span className={cx(`haggle-chance ${level}`)}>
          {formatPercent(chance)} de que acepten
        </span>
        <span className={cx("haggle-bar")} aria-hidden="true">
          <span className={cx(level)} style={{ width: `${chance * 100}%` }} />
        </span>
      </div>
      <p className={cx("haggle-warning")}>
        Todo o nada: o te pagan {formatMoney(price)} por {what} o los perdés sin cobrar nada (vendiendo normal te dan{" "}
        {formatMoney(base)}).
      </p>
      <button type="button" className={cx("haggle-go")} disabled={disabled} onClick={() => onHaggle(price)}>
        🎲 Todo o nada por {formatMoney(price)}
      </button>
    </div>
  );
}
