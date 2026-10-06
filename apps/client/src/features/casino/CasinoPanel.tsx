"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  rouletteBetLabel,
  rouletteColor,
  slotEmoji,
  slotsReturnRate,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { CityRoom, sendCasinoBlackjack, sendCasinoRoulette, sendCasinoSlots } from "@/lib/network";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import { casinoSound, isCasinoMuted, setCasinoMuted } from "./casinoSound";
import styles from "./casino.module.css";

const cx = moduleClasses(styles);

/** Cuándo frena cada rodillo (desde que se tiró). */
const REEL_STOPS_MS = [700, 1100, 1500] as const;
/** Si los dos primeros coinciden, el tercero tarda esto más (la tensión). */
const SUSPENSE_MS = 1000;
/** Lo que gira la ruleta hasta que la bola cae. */
const ROULETTE_SPIN_MS = 3800;
/** Entre carta y carta al repartir. */
const DEAL_STEP_MS = 320;
/** Tiradas seguidas del botón "Auto". */
const AUTO_SPINS = 10;
/** Pausa entre tiradas automáticas. */
const AUTO_PAUSE_MS = 700;
/** Desde esto (× apuesta) es premio mayor: lluvia de monedas y todo. */
const JACKPOT_MULTIPLIER = 20;

/** Orden real de los números en la rueda europea (en el sentido de las agujas del reloj, desde arriba). */
const EUROPEAN_WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const SECTOR_DEG = 360 / EUROPEAN_WHEEL.length;
const WHEEL_COLORS = { red: "#b3212f", black: "#16161a", green: "#1d7a46" } as const;
const WHEEL_GRADIENT = `conic-gradient(${EUROPEAN_WHEEL.map((n, i) => `${WHEEL_COLORS[rouletteColor(n)]} ${i * SECTOR_DEG}deg ${(i + 1) * SECTOR_DEG}deg`).join(", ")})`;

/**
 * Lo que va de esta visita (mientras no se recargue la página): jugadas, cuánto se ganó o perdió y
 * los últimos números de la ruleta, como el marcador de la mesa.
 */
const visit = { plays: 0, net: 0 };
const rouletteHistory: number[] = [];

type Phase = "idle" | "playing" | "revealed";

interface Celebration {
  id: number;
  kind: "win" | "jackpot" | "blackjack" | "near";
  amount: number;
}

interface CasinoPanelProps {
  room: CityRoom;
  shop: Shop;
  game: CasinoGame;
  onClose: () => void;
}

/**
 * Juegos del casino (se abren al llegar a la máquina o la mesa, como una tienda): tragamonedas,
 * ruleta y blackjack. El server sortea y paga (`casino:result`) enseguida; acá se hace el show:
 * los rodillos frenan uno por uno (con tensión si vienen dos iguales), la rueda gira con sus números
 * hasta que cae la bola, las cartas se reparten de a una, y al ganar hay monedas, música y el
 * contador de plata que sube. Mientras gira, la plata del panel queda como antes del resultado.
 */
export function CasinoPanel({ room, shop, game, onClose }: CasinoPanelProps) {
  const money = useGame((state) => state.money);
  const [bet, setBet] = useState(10);
  const [result, setResult] = useState<CasinoResultMessage | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reelsStopped, setReelsStopped] = useState(3);
  const [suspense, setSuspense] = useState(false);
  const [turn, setTurn] = useState({ wheel: 0, ball: 0 });
  const [dealFrom, setDealFrom] = useState({ player: 0, dealer: 0 });
  const [heldMoney, setHeldMoney] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [auto, setAuto] = useState(0);
  const [muted, setMuted] = useState(isCasinoMuted);
  const [lastChoice, setLastChoice] = useState<RouletteBet | null>(null);
  const [, setVisitTick] = useState(0);

  const timers = useRef<number[]>([]);
  const spinStart = useRef(0);
  const betAtPlay = useRef(bet);
  const autoLeft = useRef(0);
  const shownCards = useRef({ player: 0, dealer: 0 });
  const spinAgain = useRef<() => void>(() => {});
  /** Se mandó la jugada y todavía no volvió el resultado. */
  const awaiting = useRef(false);

  const later = useCallback((ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  }, []);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const stopAuto = useCallback(() => {
    autoLeft.current = 0;
    setAuto(0);
  }, []);

  /** Termina la jugada: festejo (o no), cuentas de la visita y, en automático, la próxima tirada. */
  const reveal = useCallback(
    (message: CasinoResultMessage) => {
      setPhase("revealed");
      setHeldMoney(null);
      setSuspense(false);
      if (message.game === "roulette" && message.roulette !== undefined) {
        rouletteHistory.unshift(message.roulette);
        rouletteHistory.length = Math.min(rouletteHistory.length, 14);
      }
      const finished = message.game !== "blackjack" || message.blackjack?.done;
      if (!finished) return;
      const staked = betAtPlay.current;
      visit.plays += 1;
      visit.net += message.payout - staked;
      setVisitTick((n) => n + 1);

      const id = Date.now();
      let big = false;
      if (message.payout > staked) {
        big = message.payout >= staked * JACKPOT_MULTIPLIER;
        const natural = message.game === "blackjack" && message.blackjack?.player.length === 2 && handValue(message.blackjack.player) === 21;
        setCelebration({ id, kind: big ? "jackpot" : natural ? "blackjack" : "win", amount: message.payout });
        casinoSound.win(big || natural);
        later(big ? 4200 : 2400, () => setCelebration((current) => (current?.id === id ? null : current)));
      } else if (message.payout > 0) {
        casinoSound.push();
      } else {
        casinoSound.lose();
        const [a, b, c] = message.slots ?? [];
        // Dos premios gordos y el tercero no: "¡por un pelo!".
        if (a && a === b && a !== c && ["bell", "star", "seven"].includes(a)) {
          setCelebration({ id, kind: "near", amount: 0 });
          later(1600, () => setCelebration((current) => (current?.id === id ? null : current)));
        }
      }

      if (message.game === "slots" && autoLeft.current > 0) {
        if (big) return stopAuto();
        later(AUTO_PAUSE_MS, () => spinAgain.current());
      }
    },
    [later, stopAuto],
  );

  useEffect(() => {
    const off = eventBus.on("casino:result", (message) => {
      if (message.game !== game) return;
      awaiting.current = false;
      setResult(message);
      const elapsed = performance.now() - spinStart.current;

      if (message.game === "slots" && message.slots) {
        const [a, b] = message.slots;
        const tense = a === b;
        const stops = REEL_STOPS_MS.map((ms, i) => (i === 2 && tense ? ms + SUSPENSE_MS : ms));
        stops.forEach((ms, i) =>
          later(Math.max(0, ms - elapsed), () => {
            setReelsStopped(i + 1);
            casinoSound.reelStop(i);
            if (i === 1 && tense) {
              setSuspense(true);
              casinoSound.suspense();
            }
          }),
        );
        later(Math.max(0, stops[2] - elapsed) + 180, () => reveal(message));
        return;
      }

      if (message.game === "roulette" && message.roulette !== undefined) {
        const index = EUROPEAN_WHEEL.indexOf(message.roulette);
        const mod = (n: number) => ((n % 360) + 360) % 360;
        setTurn((previous) => {
          // La rueda da varias vueltas y frena con el número del resultado arriba, bajo la flecha;
          // la bola gira al revés y termina arriba también.
          const target = mod(-(index + 0.5) * SECTOR_DEG);
          let wheel = previous.wheel + 360 * 5 - mod(previous.wheel) + target;
          if (wheel - previous.wheel < 360 * 4) wheel += 360;
          return { wheel, ball: previous.ball - 360 * 8 };
        });
        // El tic de la bola, cada vez más espaciado (la misma curva con que frena).
        const ticks = 34;
        for (let k = 1; k <= ticks; k++) later(ROULETTE_SPIN_MS * (1 - Math.cbrt(1 - k / ticks)), casinoSound.tick);
        later(ROULETTE_SPIN_MS + 200, () => reveal(message));
        return;
      }

      if (message.game === "blackjack" && message.blackjack) {
        const { player, dealer, done } = message.blackjack;
        const from = shownCards.current;
        const fresh = Math.max(0, player.length - from.player) + Math.max(0, dealer.length - from.dealer);
        setDealFrom(from);
        shownCards.current = done ? { player: 0, dealer: 0 } : { player: player.length, dealer: dealer.length };
        for (let i = 0; i < fresh; i++) later(i * DEAL_STEP_MS, casinoSound.card);
        if (done) {
          setPhase("playing");
          later(fresh * DEAL_STEP_MS + 250, () => reveal(message));
        } else setPhase("revealed");
        return;
      }

      // Error (sin plata, mano sin terminar…): se muestra enseguida.
      stopAuto();
      setPhase("revealed");
      setHeldMoney(null);
      setReelsStopped(3);
    });
    return off;
  }, [game, later, reveal, stopAuto]);

  const playing = phase === "playing";
  const canBet = money !== null && money >= bet && !playing;

  /** Arranca una jugada: cobra (a la vista) la apuesta y deja la plata quieta hasta el resultado. */
  const start = (send: () => void) => {
    if (money === null || money < bet) return stopAuto();
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    betAtPlay.current = bet;
    spinStart.current = performance.now();
    setCelebration(null);
    setHeldMoney(money - bet);
    setPhase("playing");
    awaiting.current = true;
    send();
    // Si el server no contesta (p. ej. el límite de mensajes la descartó), se destraba.
    later(6000, () => {
      if (!awaiting.current) return;
      awaiting.current = false;
      stopAuto();
      setPhase("idle");
      setHeldMoney(null);
      setReelsStopped(3);
    });
  };

  const spinSlots = () => {
    setReelsStopped(0);
    casinoSound.spin();
    start(() => sendCasinoSlots(room, shop.id, bet));
    if (autoLeft.current > 0) {
      autoLeft.current -= 1;
      setAuto(autoLeft.current);
    }
  };
  spinAgain.current = spinSlots;

  const toggleAuto = () => {
    if (auto > 0) return stopAuto();
    autoLeft.current = AUTO_SPINS;
    setAuto(AUTO_SPINS);
    spinSlots();
  };

  const betRoulette = (choice: RouletteBet) => {
    setLastChoice(choice);
    casinoSound.chip();
    start(() => sendCasinoRoulette(room, shop.id, bet, choice));
  };

  const blackjackAction = (action: "deal" | "hit" | "stand") => {
    if (action === "deal") {
      shownCards.current = { player: 0, dealer: 0 };
      casinoSound.chip();
      return start(() => sendCasinoBlackjack(room, shop.id, "deal", bet));
    }
    sendCasinoBlackjack(room, shop.id, action);
  };

  const shownMoney = useCountUp(heldMoney ?? money);
  const toggleMute = () => {
    setCasinoMuted(!muted);
    setMuted(!muted);
  };

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx(`modal casino${celebration?.kind === "jackpot" ? " jackpot" : ""}${suspense ? " tense" : ""}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="casino-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="casino-title" className={cx("casino-title")}>
            <UiIcon name="moneyBag" size={18} />
            {shop.name}
          </h2>
          <span className={cx(`casino-money${heldMoney !== null ? " held" : ""}`)}>{shownMoney === null ? "$…" : formatMoney(shownMoney)}</span>
          <button type="button" className={cx("casino-mute")} onClick={toggleMute} aria-label={muted ? "Prender el sonido" : "Apagar el sonido"} aria-pressed={!muted}>
            {muted ? "🔇" : "🔊"}
          </button>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <Marquee />

        <div className={cx("casino-bet")}>
          <span>Apuesta</span>
          {[1, 5, 10, 50, 100, 500].map((value) => (
            <button
              key={value}
              type="button"
              className={cx(`casino-chip chip-${value}`)}
              aria-pressed={bet === value}
              onClick={() => {
                casinoSound.chip();
                setBet(value);
              }}
              disabled={value > CASINO_MAX_BET || playing}
            >
              {formatMoney(value)}
            </button>
          ))}
          <input
            type="number"
            min={CASINO_MIN_BET}
            max={CASINO_MAX_BET}
            value={bet}
            disabled={playing}
            onChange={(event) => setBet(Math.max(CASINO_MIN_BET, Math.min(CASINO_MAX_BET, Math.round(Number(event.target.value)) || CASINO_MIN_BET)))}
            aria-label="Apuesta"
          />
        </div>

        {game === "slots" && (
          <Slots
            reels={result?.slots ?? ["seven", "seven", "seven"]}
            stopped={reelsStopped}
            suspense={suspense}
            winning={phase === "revealed" && (result?.payout ?? 0) > 0}
            canBet={canBet}
            bet={bet}
            auto={auto}
            onSpin={spinSlots}
            onAuto={toggleAuto}
          />
        )}
        {game === "roulette" && <Roulette turn={turn} spinning={playing} last={phase === "revealed" ? result?.roulette : undefined} lastChoice={lastChoice} canBet={canBet} onBet={betRoulette} />}
        {game === "blackjack" && <Blackjack table={result?.blackjack} dealFrom={dealFrom} canBet={canBet} busy={playing} onAction={blackjackAction} />}

        {result && phase === "revealed" && (
          <p className={cx(`casino-result ${result.payout > 0 ? "win" : result.blackjack && !result.blackjack.done ? "" : "lose"}`)} role="status">
            {result.text}
          </p>
        )}
        {visit.plays > 0 && (
          <p className={cx("casino-visit")}>
            Esta visita: {visit.plays} {visit.plays === 1 ? "jugada" : "jugadas"} ·{" "}
            <strong className={cx(visit.net >= 0 ? "up" : "down")}>
              {visit.net >= 0 ? "+" : "−"}
              {formatMoney(Math.abs(visit.net))}
            </strong>
          </p>
        )}
        <footer className={cx("key-hint")}>
          Jugá con cabeza: la casa siempre gana un poquito. Apretá <kbd>Esc</kbd> para cerrar
        </footer>

      </section>
      {celebration && <CelebrationLayer celebration={celebration} />}
    </div>
  );
}

/** El número que se muestra va hasta el nuevo de a poco (como el contador de una máquina). */
function useCountUp(value: number | null): number | null {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (value === null || from.current === null) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = from.current;
    const began = performance.now();
    const duration = Math.min(900, 250 + Math.abs(value - start) * 4);
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / duration);
      const current = Math.round(start + (value - start) * (1 - (1 - t) ** 3));
      from.current = current;
      setShown(current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

/** Fila de lamparitas que se persiguen, como la marquesina del Victoria Plaza. */
function Marquee() {
  return (
    <div className={cx("casino-marquee")} aria-hidden="true">
      {Array.from({ length: 24 }, (_, i) => (
        <span key={i} style={{ animationDelay: `${(i % 3) * 0.18}s` }} />
      ))}
    </div>
  );
}

/**
 * Festejo por encima de todo (fuera del panel, que scrollea): cartel, monto que sube y monedas
 * (lluvia en el premio mayor). No ataja clics: se puede seguir jugando.
 */
function CelebrationLayer({ celebration }: { celebration: Celebration }) {
  const amount = useCountUp(celebration.amount);
  const coins = useMemo(() => {
    const count = celebration.kind === "jackpot" ? 42 : celebration.kind === "near" ? 0 : 16;
    // Posiciones al azar pero fijas para este festejo (se sortean una vez).
    return Array.from({ length: count }, (_, i) => ({
      left: `${(i * 37 + celebration.id) % 100}%`,
      delay: `${((i * 53) % 90) / 100}s`,
      duration: `${1.3 + ((i * 29) % 70) / 100}s`,
      size: `${1 + ((i * 17) % 10) / 10}rem`,
    }));
  }, [celebration]);
  const title = { win: "¡GANASTE!", jackpot: "¡¡PREMIO MAYOR!!", blackjack: "¡BLACKJACK!", near: "¡Uh, por un pelo!" }[celebration.kind];
  return (
    <div className={cx(`casino-celebration ${celebration.kind}`)} aria-hidden="true">
      {coins.map((coin, i) => (
        <span key={i} className={cx("casino-coin")} style={{ left: coin.left, animationDelay: coin.delay, animationDuration: coin.duration, fontSize: coin.size }}>
          🪙
        </span>
      ))}
      <div className={cx("casino-banner")}>
        <strong>{title}</strong>
        {celebration.kind !== "near" && amount !== null && <span>+{formatMoney(amount)}</span>}
      </div>
    </div>
  );
}

interface SlotsProps {
  reels: readonly SlotSymbol[];
  stopped: number;
  suspense: boolean;
  winning: boolean;
  canBet: boolean;
  bet: number;
  auto: number;
  onSpin: () => void;
  onAuto: () => void;
}

/** Los símbolos de un rodillo girando: varias vueltas de la tabla, mezcladas distinto en cada rodillo. */
const STRIPS = [0, 1, 2].map((reel) => {
  const ids = SLOT_SYMBOLS.map((symbol) => symbol.id);
  const order = ids.map((_, i) => ids[(i * (reel + 2) + reel) % ids.length]);
  return [...order, ...order];
});

function Slots({ reels, stopped, suspense, winning, canBet, bet, auto, onSpin, onAuto }: SlotsProps) {
  const spinning = stopped < 3;
  const neighbor = (symbol: SlotSymbol, offset: number) => SLOT_SYMBOLS[(SLOT_SYMBOLS.findIndex((s) => s.id === symbol) + offset + SLOT_SYMBOLS.length) % SLOT_SYMBOLS.length].id;
  const hit = (symbol: SlotSymbol) => winning && (reels.every((reel) => reel === reels[0]) || symbol === "cherry");
  return (
    <div className={cx("slots")}>
      <div className={cx(`slots-cabinet${winning ? " winning" : ""}`)}>
        <div className={cx("slots-topper")}>
          <span>7️⃣ VICTORIA 7️⃣</span>
        </div>
        <div className={cx("slots-reels")}>
          {reels.map((symbol, i) => (
            <div key={i} className={cx(`slots-reel${i >= stopped ? " spinning" : " landed"}${suspense && i === 2 && spinning ? " tense" : ""}${hit(symbol) && !spinning ? " hit" : ""}`)}>
              {i >= stopped ? (
                <div className={cx("slots-strip")} style={{ animationDuration: `${0.32 + i * 0.04}s` }}>
                  {STRIPS[i].map((id, k) => (
                    <span key={k}>{slotEmoji(id)}</span>
                  ))}
                </div>
              ) : (
                <div className={cx("slots-window")}>
                  <span className={cx("slots-side")}>{slotEmoji(neighbor(symbol, -1))}</span>
                  <span className={cx("slots-main")}>{slotEmoji(symbol)}</span>
                  <span className={cx("slots-side")}>{slotEmoji(neighbor(symbol, 1))}</span>
                </div>
              )}
            </div>
          ))}
          <span className={cx("slots-payline")} aria-hidden="true" />
        </div>
        <button type="button" className={cx(`slots-lever${spinning ? " pulled" : ""}`)} onClick={onSpin} disabled={!canBet} aria-label="Bajar la palanca">
          <span />
        </button>
      </div>
      <div className={cx("slots-buttons")}>
        <button type="button" className={cx("casino-go")} disabled={!canBet} onClick={onSpin}>
          🎰 Tirar ({formatMoney(bet)})
        </button>
        <button type="button" className={cx(`slots-auto${auto > 0 ? " on" : ""}`)} disabled={auto === 0 && !canBet} onClick={onAuto}>
          {auto > 0 ? `Parar (${auto})` : `Auto ×${AUTO_SPINS}`}
        </button>
      </div>
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

interface RouletteProps {
  turn: { wheel: number; ball: number };
  spinning: boolean;
  last: number | undefined;
  lastChoice: RouletteBet | null;
  canBet: boolean;
  onBet: (choice: RouletteBet) => void;
}

function Roulette({ turn, spinning, last, lastChoice, canBet, onBet }: RouletteProps) {
  const [number, setNumber] = useState(17);
  const chosen = (kind: RouletteBet["kind"]) => (lastChoice?.kind === kind ? " chosen" : "");
  return (
    <div className={cx("roulette")}>
      <div className={cx("roulette-stage")}>
        <span className={cx("roulette-pointer")} aria-hidden="true" />
        <div className={cx("roulette-wheel")} style={{ transform: `rotate(${turn.wheel}deg)`, background: WHEEL_GRADIENT, transitionDuration: `${ROULETTE_SPIN_MS}ms` }}>
          {EUROPEAN_WHEEL.map((n, i) => (
            <span key={n} className={cx("roulette-number-label")} style={{ transform: `rotate(${(i + 0.5) * SECTOR_DEG}deg)` }}>
              <span>{n}</span>
            </span>
          ))}
        </div>
        <div className={cx("roulette-ball-track")} style={{ transform: `rotate(${turn.ball}deg)`, transitionDuration: `${ROULETTE_SPIN_MS}ms` }} aria-hidden="true">
          <span className={cx("roulette-ball")} />
        </div>
        <div className={cx(`roulette-hub ${last === undefined ? "" : rouletteColor(last)}${last !== undefined ? " show" : ""}`)}>{spinning || last === undefined ? "🎡" : last}</div>
      </div>
      <div className={cx("roulette-history")} aria-label="Últimos números">
        {rouletteHistory.length === 0 ? (
          <small className={cx("casino-note")}>Todavía no salió ningún número.</small>
        ) : (
          rouletteHistory.map((n, i) => (
            <span key={`${rouletteHistory.length - i}`} className={cx(`roulette-past ${rouletteColor(n)}${i === 0 ? " latest" : ""}`)}>
              {n}
            </span>
          ))
        )}
      </div>
      <div className={cx("roulette-bets")}>
        <button type="button" className={cx(`red${chosen("red")}`)} disabled={!canBet} onClick={() => onBet({ kind: "red" })}>
          Rojo ×2
        </button>
        <button type="button" className={cx(`black${chosen("black")}`)} disabled={!canBet} onClick={() => onBet({ kind: "black" })}>
          Negro ×2
        </button>
        <button type="button" className={cx(chosen("even").trim())} disabled={!canBet} onClick={() => onBet({ kind: "even" })}>
          Par ×2
        </button>
        <button type="button" className={cx(chosen("odd").trim())} disabled={!canBet} onClick={() => onBet({ kind: "odd" })}>
          Impar ×2
        </button>
      </div>
      <label className={cx("roulette-number")}>
        Número
        <input type="number" min={0} max={36} value={number} onChange={(event) => setNumber(Math.max(0, Math.min(36, Math.round(Number(event.target.value)) || 0)))} />
        <button type="button" className={cx(chosen("number").trim())} disabled={!canBet} onClick={() => onBet({ kind: "number", number })}>
          Al {number} ×36
        </button>
      </label>
      {lastChoice && <small className={cx("casino-note")}>Tu ficha: {rouletteBetLabel(lastChoice)}. Tocá otra vez para repetir.</small>}
      <small className={cx("casino-note")}>Ruleta europea: del 0 al 36. Con el 0 pierden el rojo, el negro, el par y el impar.</small>
    </div>
  );
}

interface BlackjackProps {
  table: { player: Card[]; dealer: Card[]; done: boolean } | undefined;
  /** Cuántas cartas de cada mano ya estaban en la mesa: las que siguen entran repartidas. */
  dealFrom: { player: number; dealer: number };
  canBet: boolean;
  busy: boolean;
  onAction: (action: "deal" | "hit" | "stand") => void;
}

function Blackjack({ table, dealFrom, canBet, busy, onAction }: BlackjackProps) {
  const open = Boolean(table && !table.done);
  // Al repartir de entrada se alternan: vos, crupier, vos (la tapada va después).
  const playerDelay = (i: number) => (i - dealFrom.player) * DEAL_STEP_MS * (dealFrom.player === 0 ? 2 : 1);
  const dealerDelay = (i: number) => (dealFrom.dealer === 0 && dealFrom.player === 0 ? DEAL_STEP_MS : (i - dealFrom.dealer) * DEAL_STEP_MS);
  return (
    <div className={cx("blackjack")}>
      <div className={cx("blackjack-felt")}>
        <span className={cx("blackjack-motto")}>BLACKJACK PAGA 3 A 2 · EL CRUPIER SE PLANTA EN 17</span>
        <Hand title="Crupier" cards={table?.dealer ?? []} hidden={open} delay={dealerDelay} />
        <Hand title="Vos" cards={table?.player ?? []} delay={playerDelay} />
      </div>
      <div className={cx("blackjack-actions")}>
        {open ? (
          <>
            <button type="button" className={cx("casino-go")} onClick={() => onAction("hit")}>
              Pedir carta
            </button>
            <button type="button" onClick={() => onAction("stand")}>
              Plantarse
            </button>
          </>
        ) : (
          <button type="button" className={cx("casino-go")} disabled={!canBet || busy} onClick={() => onAction("deal")}>
            🃏 Repartir
          </button>
        )}
      </div>
    </div>
  );
}

function Hand({ title, cards, hidden = false, delay }: { title: string; cards: readonly Card[]; hidden?: boolean; delay: (index: number) => number }) {
  const value = handValue(cards);
  return (
    <div className={cx("blackjack-hand")}>
      <span className={cx("blackjack-title")}>
        {title}
        {cards.length > 0 && !hidden && <strong className={cx(`blackjack-total${value > 21 ? " bust" : value === 21 ? " twentyone" : ""}`)}>{value}</strong>}
      </span>
      <div className={cx("blackjack-cards")}>
        {cards.map((card, i) => (
          <span
            key={`${i}-${card.rank}${card.suit}`}
            className={cx(`playing-card dealt${card.suit === "♥" || card.suit === "♦" ? " red" : ""}`)}
            style={{ animationDelay: `${Math.max(0, delay(i))}ms` }}
          >
            <small>{card.rank}</small>
            {card.suit}
          </span>
        ))}
        {hidden && <span className={cx("playing-card back dealt")} style={{ animationDelay: `${DEAL_STEP_MS * 3}ms` }} />}
        {cards.length === 0 && <span className={cx("casino-note")}>—</span>}
      </div>
    </div>
  );
}
