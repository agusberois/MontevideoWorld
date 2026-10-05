"use client";

import { useEffect, useRef, useState } from "react";
import {
  CASINO_MAX_BET,
  CASINO_MIN_BET,
  Card,
  CasinoGame,
  CasinoResultMessage,
  RouletteBet,
  SLOT_SYMBOLS,
  Shop,
  SlotSymbol,
  formatMoney,
  formatPercent,
  handValue,
  rouletteColor,
  slotEmoji,
  slotsReturnRate,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { CityRoom, sendCasinoBlackjack, sendCasinoRoulette, sendCasinoSlots } from "@/lib/network";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./casino.module.css";

const cx = moduleClasses(styles);

/** Lo que tardan en girar los rodillos y la ruleta antes de mostrar el resultado. */
const SPIN_MS = 1200;

interface CasinoPanelProps {
  room: CityRoom;
  shop: Shop;
  game: CasinoGame;
  onClose: () => void;
}

/**
 * Juegos del casino (se abren al llegar a la máquina o la mesa, como una tienda): tragamonedas,
 * ruleta y blackjack. El server sortea y paga (`casino:result`); acá se elige la apuesta y se anima.
 */
export function CasinoPanel({ room, shop, game, onClose }: CasinoPanelProps) {
  const money = useGame((state) => state.money);
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState<CasinoResultMessage | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const off = eventBus.on("casino:result", (message) => {
      if (message.game !== game) return;
      // Tragamonedas y ruleta: se muestra después de girar; blackjack, enseguida.
      const delay = message.game === "blackjack" || (!message.slots && message.roulette === undefined) ? 0 : SPIN_MS;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setResult(message);
        setSpinning(false);
      }, delay);
    });
    return () => {
      off();
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [game]);

  const canBet = money !== null && money >= bet && !spinning;
  const play = (send: () => void, spins: boolean) => {
    if (spins) setSpinning(true);
    send();
  };

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section className={cx("modal casino")} role="dialog" aria-modal="true" aria-labelledby="casino-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2 id="casino-title">
            <UiIcon name="moneyBag" size={18} />
            {shop.name}
          </h2>
          <span className={cx("casino-money")}>{money === null ? "$…" : formatMoney(money)}</span>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className={cx("casino-bet")}>
          <span>Apuesta</span>
          {[1, 5, 10, 50, 100, 500].map((value) => (
            <button key={value} type="button" aria-pressed={bet === value} onClick={() => setBet(value)} disabled={value > CASINO_MAX_BET}>
              {formatMoney(value)}
            </button>
          ))}
          <input
            type="number"
            min={CASINO_MIN_BET}
            max={CASINO_MAX_BET}
            value={bet}
            onChange={(event) => setBet(Math.max(CASINO_MIN_BET, Math.min(CASINO_MAX_BET, Math.round(Number(event.target.value)) || CASINO_MIN_BET)))}
            aria-label="Apuesta"
          />
        </div>

        {game === "slots" && <Slots spinning={spinning} result={result} canBet={canBet} onSpin={() => play(() => sendCasinoSlots(room, shop.id, bet), true)} bet={bet} />}
        {game === "roulette" && (
          <Roulette spinning={spinning} result={result} canBet={canBet} onBet={(choice) => play(() => sendCasinoRoulette(room, shop.id, bet, choice), true)} />
        )}
        {game === "blackjack" && (
          <Blackjack result={result} canBet={canBet} onAction={(action) => sendCasinoBlackjack(room, shop.id, action, action === "deal" ? bet : undefined)} />
        )}

        {result && !spinning && (
          <p className={cx(`casino-result ${result.payout > 0 ? "win" : result.blackjack && !result.blackjack.done ? "" : "lose"}`)} role="status">
            {result.text}
          </p>
        )}
        <footer className={cx("key-hint")}>
          Jugá con cabeza: la casa siempre gana un poquito. Apretá <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}

function Slots({ spinning, result, canBet, onSpin, bet }: { spinning: boolean; result: CasinoResultMessage | null; canBet: boolean; onSpin: () => void; bet: number }) {
  const reels: SlotSymbol[] = result?.slots ?? ["seven", "seven", "seven"];
  return (
    <div className={cx("slots")}>
      <div className={cx("slots-reels")}>
        {reels.map((symbol, i) => (
          <span key={i} className={cx(`slots-reel${spinning ? " spinning" : ""}`)} style={{ animationDelay: `${i * 80}ms` }}>
            {spinning ? "🎰" : slotEmoji(symbol)}
          </span>
        ))}
      </div>
      <button type="button" className={cx("casino-go")} disabled={!canBet} onClick={onSpin}>
        🎰 Tirar ({formatMoney(bet)})
      </button>
      <ul className={cx("slots-table")}>
        {SLOT_SYMBOLS.map((symbol) => (
          <li key={symbol.id}>
            {symbol.emoji.repeat(3)} <strong>×{symbol.triple}</strong>
          </li>
        ))}
        <li>
          🍒🍒 <strong>te devuelve la apuesta</strong>
        </li>
      </ul>
      <small className={cx("casino-note")}>Devuelve en promedio el {formatPercent(slotsReturnRate())} de lo apostado.</small>
    </div>
  );
}

function Roulette({ spinning, result, canBet, onBet }: { spinning: boolean; result: CasinoResultMessage | null; canBet: boolean; onBet: (choice: RouletteBet) => void }) {
  const [number, setNumber] = useState(17);
  const last = result?.roulette;
  return (
    <div className={cx("roulette")}>
      <div className={cx(`roulette-wheel${spinning ? " spinning" : ""}`)}>
        <span className={cx(`roulette-ball ${last === undefined ? "" : rouletteColor(last)}`)}>{spinning || last === undefined ? "" : last}</span>
      </div>
      <div className={cx("roulette-bets")}>
        <button type="button" className={cx("red")} disabled={!canBet} onClick={() => onBet({ kind: "red" })}>
          Rojo ×2
        </button>
        <button type="button" className={cx("black")} disabled={!canBet} onClick={() => onBet({ kind: "black" })}>
          Negro ×2
        </button>
        <button type="button" disabled={!canBet} onClick={() => onBet({ kind: "even" })}>
          Par ×2
        </button>
        <button type="button" disabled={!canBet} onClick={() => onBet({ kind: "odd" })}>
          Impar ×2
        </button>
      </div>
      <label className={cx("roulette-number")}>
        Número
        <input type="number" min={0} max={36} value={number} onChange={(event) => setNumber(Math.max(0, Math.min(36, Math.round(Number(event.target.value)) || 0)))} />
        <button type="button" disabled={!canBet} onClick={() => onBet({ kind: "number", number })}>
          Al {number} ×36
        </button>
      </label>
      <small className={cx("casino-note")}>Ruleta europea: del 0 al 36. Con el 0 pierden el rojo, el negro, el par y el impar.</small>
    </div>
  );
}

function Blackjack({ result, canBet, onAction }: { result: CasinoResultMessage | null; canBet: boolean; onAction: (action: "deal" | "hit" | "stand") => void }) {
  const table = result?.blackjack;
  const playing = Boolean(table && !table.done);
  return (
    <div className={cx("blackjack")}>
      <Hand title="Crupier" cards={table?.dealer ?? []} hidden={playing} />
      <Hand title="Vos" cards={table?.player ?? []} />
      <div className={cx("blackjack-actions")}>
        {playing ? (
          <>
            <button type="button" className={cx("casino-go")} onClick={() => onAction("hit")}>
              Pedir carta
            </button>
            <button type="button" onClick={() => onAction("stand")}>
              Plantarse
            </button>
          </>
        ) : (
          <button type="button" className={cx("casino-go")} disabled={!canBet} onClick={() => onAction("deal")}>
            🃏 Repartir
          </button>
        )}
      </div>
      <small className={cx("casino-note")}>El crupier se planta en 17. Blackjack paga 3 a 2; empate, te devuelven la apuesta.</small>
    </div>
  );
}

function Hand({ title, cards, hidden = false }: { title: string; cards: readonly Card[]; hidden?: boolean }) {
  return (
    <div className={cx("blackjack-hand")}>
      <span className={cx("blackjack-title")}>
        {title}
        {cards.length > 0 && !hidden && <strong> · {handValue(cards)}</strong>}
      </span>
      <div className={cx("blackjack-cards")}>
        {cards.map((card, i) => (
          <span key={i} className={cx(`playing-card${card.suit === "♥" || card.suit === "♦" ? " red" : ""}`)}>
            {card.rank}
            {card.suit}
          </span>
        ))}
        {hidden && <span className={cx("playing-card back")}>🂠</span>}
        {cards.length === 0 && <span className={cx("casino-note")}>—</span>}
      </div>
    </div>
  );
}
