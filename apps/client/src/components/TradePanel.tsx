"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import {
  InventoryStack,
  TRADE_MAX_ITEMS,
  TradeOffer,
  TradeStateMessage,
  changeOfferQuantity,
  formatMoney,
  getItem,
  isTool,
  offeredQuantity,
  usesLabel,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { CityRoom, sendTradeAccept, sendTradeCancel, sendTradeOffer } from "@/lib/network";
import { ItemIcon } from "./ItemIcon";
import { ToolWear } from "./ToolWear";
import { UiIcon } from "./UiIcon";

interface TradePanelProps {
  room: CityRoom;
}

/**
 * Intercambio con otro jugador. Se abre cuando el server manda `trade:state` y se cierra con
 * `trade:closed`. Cada cambio de oferta es una intención: el server valida contra la mochila real,
 * anula las aceptaciones y les reenvía el estado a los dos. Esc o ✕ cancelan el intercambio.
 */
export function TradePanel({ room }: TradePanelProps) {
  const inventory = useGame((state) => state.inventory);
  const money = useGame((state) => state.money);
  const [trade, setTrade] = useState<TradeStateMessage | null>(null);
  const [moneyDraft, setMoneyDraft] = useState("");

  useEffect(() => {
    const offState = eventBus.on("trade:state", (state) => {
      setTrade(state);
      setMoneyDraft(state.mine.offer.money > 0 ? String(state.mine.offer.money) : "");
    });
    const offClosed = eventBus.on("trade:closed", () => setTrade(null));
    return () => {
      offState();
      offClosed();
    };
  }, []);

  useEffect(() => {
    if (!trade) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") sendTradeCancel(room);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [trade, room]);

  if (!trade) return null;

  const mine = trade.mine.offer;
  const theirs = trade.theirs.offer;
  const offer = (next: TradeOffer) => sendTradeOffer(room, next);

  /** Lo que queda en la mochila sin ofrecer, un casillero por ítem (lo puesto no se intercambia). */
  const totals = new Map<string, number>();
  for (const stack of inventory?.stacks ?? []) totals.set(stack.itemId, (totals.get(stack.itemId) ?? 0) + stack.quantity);
  const available = [...totals]
    .map(([itemId, quantity]) => [itemId, quantity - offeredQuantity(mine, itemId)] as const)
    .filter(([, quantity]) => quantity > 0);
  const canAddNew = mine.items.length < TRADE_MAX_ITEMS;

  function submitMoney(event?: FormEvent) {
    event?.preventDefault();
    const amount = moneyDraft.trim() === "" ? 0 : Number(moneyDraft);
    if (!Number.isSafeInteger(amount) || amount < 0) return setMoneyDraft(mine.money > 0 ? String(mine.money) : "");
    if (amount !== mine.money) offer({ ...mine, money: amount });
  }

  const nothingOffered = mine.items.length === 0 && mine.money === 0 && theirs.items.length === 0 && theirs.money === 0;

  return (
    <div className="modal-backdrop trade-backdrop">
      <section className="modal trade" role="dialog" aria-modal="true" aria-labelledby="trade-title">
        <header>
          <h2 id="trade-title">
            <UiIcon name="users" size={18} />
            Intercambio con {trade.partnerName}
          </h2>
          <button type="button" onClick={() => sendTradeCancel(room)} aria-label="Cancelar intercambio">
            ✕
          </button>
        </header>

        <div className="trade-sides">
          <TradeSideView
            title="Vos ofrecés"
            offer={mine}
            uses={trade.mine.uses}
            accepted={trade.mine.accepted}
            onItemClick={(itemId) => offer(changeOfferQuantity(mine, itemId, -1))}
            emptyText="Tocá algo de tu mochila para ofrecerlo."
          >
            <form className="trade-money" onSubmit={submitMoney}>
              <UiIcon name="moneyBag" size={14} className="hud-money-icon" />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={money ?? undefined}
                step={1}
                placeholder="0"
                value={moneyDraft}
                onChange={(event) => setMoneyDraft(event.target.value)}
                onBlur={() => submitMoney()}
                aria-label="Plata que ofrecés"
              />
              <small>de {money === null ? "$…" : formatMoney(money)}</small>
            </form>
          </TradeSideView>
          <TradeSideView
            title={`${trade.partnerName} ofrece`}
            offer={theirs}
            uses={trade.theirs.uses}
            accepted={trade.theirs.accepted}
            emptyText="Todavía no ofreció nada."
          >
            <p className="trade-money-view">
              <UiIcon name="moneyBag" size={14} className="hud-money-icon" />
              {formatMoney(theirs.money)}
            </p>
          </TradeSideView>
        </div>

        <div className="trade-backpack">
          <h3>Tu mochila</h3>
          {available.length === 0 ? (
            <p className="trade-hint">No te queda nada en la mochila para ofrecer. Lo que tenés puesto no se intercambia.</p>
          ) : (
            <ul className="trade-grid">
              {available.map(([itemId, quantity]) => {
                const item = getItem(itemId);
                if (!item) return null;
                const isNew = offeredQuantity(mine, itemId) === 0;
                const disabled = isNew && !canAddNew;
                return (
                  <li key={itemId}>
                    <button
                      type="button"
                      disabled={disabled}
                      title={disabled ? `Máximo ${TRADE_MAX_ITEMS} ítems distintos` : `Ofrecer 1 × ${item.name}`}
                      onClick={() => offer(changeOfferQuantity(mine, itemId, 1))}
                    >
                      <ItemIcon item={item} size={36} />
                      <span className="trade-cell-name">{item.name}</span>
                      {quantity > 1 && <span className="backpack-qty">x{quantity}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="trade-footer">
          <span className="trade-status">
            {trade.mine.accepted && !trade.theirs.accepted && `Esperando que ${trade.partnerName} acepte…`}
            {!trade.mine.accepted && trade.theirs.accepted && `${trade.partnerName} ya aceptó.`}
            {!trade.mine.accepted && !trade.theirs.accepted && "Si alguien cambia su oferta, hay que volver a aceptar."}
          </span>
          <button type="button" onClick={() => sendTradeCancel(room)}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            disabled={trade.mine.accepted || nothingOffered}
            onClick={() => sendTradeAccept(room)}
          >
            {trade.mine.accepted ? "Aceptado ✓" : "Aceptar"}
          </button>
        </footer>
      </section>
    </div>
  );
}

interface TradeSideViewProps {
  title: string;
  offer: TradeOffer;
  /** Usos que le quedan a cada herramienta ofrecida (las que se pasarían), por `itemId`. */
  uses: Record<string, number[]>;
  accepted: boolean;
  emptyText: string;
  onItemClick?: (itemId: string) => void;
  children: ReactNode;
}

/** Una columna del intercambio: los ítems ofrecidos, la plata y si ya aceptó. */
function TradeSideView({ title, offer, uses, accepted, emptyText, onItemClick, children }: TradeSideViewProps) {
  return (
    <div className={`trade-side${accepted ? " accepted" : ""}`}>
      <h3>
        {title}
        {accepted && <span className="trade-accepted">✓ Aceptó</span>}
      </h3>
      {offer.items.length === 0 ? (
        <p className="trade-hint">{emptyText}</p>
      ) : (
        <ul className="trade-grid">
          {offer.items.map((stack) => (
            <OfferCell key={stack.itemId} stack={stack} uses={uses[stack.itemId]} onClick={onItemClick} />
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}

interface OfferCellProps {
  stack: InventoryStack;
  /** Herramientas: usos de cada unidad que se pasa (la barrita muestra la más gastada). */
  uses?: number[];
  onClick?: (itemId: string) => void;
}

function OfferCell({ stack, uses, onClick }: OfferCellProps) {
  const item = getItem(stack.itemId);
  if (!item) return null;
  const tool = isTool(item) && uses && uses.length > 0 ? item : undefined;
  const wear = tool ? ` (${uses!.map((left) => usesLabel(tool, left)).join(", ")})` : "";
  const content = (
    <>
      <ItemIcon item={item} size={36} />
      <span className="trade-cell-name">{item.name}</span>
      {stack.quantity > 1 && <span className="backpack-qty">x{stack.quantity}</span>}
      {tool && <ToolWear item={tool} uses={Math.min(...uses!)} />}
    </>
  );
  return (
    <li>
      {onClick ? (
        <button type="button" title={`Sacar 1 × ${item.name}${wear} de la oferta`} onClick={() => onClick(stack.itemId)}>
          {content}
        </button>
      ) : (
        <div className="trade-cell-static" title={`${item.name}${wear}`}>
          {content}
        </div>
      )}
    </li>
  );
}
