"use client";

import { useEffect, useMemo, useState } from "react";
import { TUTORIAL_STEPS, TUTORIAL_TOTAL_REWARD, formatMoney, getCityInfo, getItem, tutorialView } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { type CityRoom, sendTutorialSkip } from "@/lib/network";
import { moduleClasses } from "@/lib/cx";
import styles from "./tutorial.module.css";

const cx = moduleClasses(styles);

/** Plegada o no: preferencia del navegador. */
const COLLAPSED_KEY = "mw:tutorial-collapsed";
/** Cuánto se ve el "¡Bien! +$15" al cumplir un paso. */
const CHEER_MS = 3500;

interface TutorialCardProps {
  room: CityRoom;
  cityId: string;
}

/**
 * Guía de bienvenida (`TUTORIAL_STEPS`): el paso de ahora, qué hacer y el premio, con botones para
 * plegarla y saltearla. Le dice a la escena adónde apuntar la flecha (`tutorial:target`). Quién
 * cumple cada paso lo decide el server; esto sólo muestra. Arriba a la izquierda en escritorio; en
 * celulares, en el dock (arriba de las necesidades).
 */
export function TutorialCard({ room, cityId }: TutorialCardProps) {
  const tutorial = useGame((state) => state.tutorial);
  const jailed = useGame((state) => state.jailLeft > 0);
  const inventory = useGame((state) => state.inventory);
  const [collapsed, setCollapsed] = useState(() => readCollapsed());
  const [confirmSkip, setConfirmSkip] = useState(false);
  /** El paso que se acaba de cumplir (para el festejo) y si terminó la guía recién (tarjeta final). */
  const [cheer, setCheer] = useState<{ reward: number; gift?: string; id: number } | null>(null);
  /** Terminó la guía recién: la tarjeta final (con el regalo, si hubo). */
  const [finished, setFinished] = useState<{ gift?: string } | null>(null);

  const active = tutorial?.status === "active" && !jailed;
  const step = active ? TUTORIAL_STEPS[tutorial.step] : undefined;
  const itemIds = useMemo(() => (inventory?.stacks ?? []).map((stack) => stack.itemId), [inventory]);
  const view = step ? tutorialView(step, itemIds) : null;
  const target = view ? { cityId: view.target.cityId, area: view.target.area } : null;
  const targetKey = target ? `${target.cityId}:${target.area.x},${target.area.y}` : "";

  // Festejo al cumplir un paso; la tarjeta final sólo si se terminó ahora (al volver a entrar, no).
  useEffect(() => {
    return eventBus.on("tutorial:update", (message) => {
      if (!message.completed) return;
      setCheer({ reward: message.completed.reward, gift: message.completed.gift, id: Date.now() });
      if (message.status === "done") setFinished({ gift: message.completed.gift });
      setConfirmSkip(false);
    });
  }, []);

  useEffect(() => {
    if (!cheer) return;
    const timer = window.setTimeout(() => setCheer(null), CHEER_MS);
    return () => window.clearTimeout(timer);
  }, [cheer]);

  // `/guia` la vuelve a abrir: se despliega y se va el cartel final.
  useEffect(() => {
    if (tutorial?.status === "active" && tutorial.step === 0 && !tutorial.completed) setFinished(null);
  }, [tutorial]);

  // La flecha del mapa: el lugar del paso (cambia con la mochila en el del boleto). La escena nueva,
  // al viajar, la vuelve a pedir.
  useEffect(() => {
    const emit = () => eventBus.emit("tutorial:target", target);
    emit();
    const off = eventBus.on("tutorial:target:request", emit);
    return () => {
      off();
      eventBus.emit("tutorial:target", null);
    };
    // `target` se arma en cada render: alcanza con su clave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      writeCollapsed(!value);
      return !value;
    });
  };

  if (finished && !jailed) {
    const gift = getItem(finished.gift ?? "");
    return (
      <section className={cx("tutorial done")} aria-live="polite">
        <header>
          <span className={cx("tutorial-badge")}>🎉</span>
          <h2>¡Listo! Ya conocés Montevideo</h2>
        </header>
        <p>
          {tutorial?.replay
            ? "Repasaste la guía de bienvenida."
            : `Te ganaste ${formatMoney(TUTORIAL_TOTAL_REWARD)}${gift ? ` y la ${gift.name.toLowerCase()} (está en tu mochila)` : ""}.`}{" "}
          Seguí pescando, vendiendo en el Centenario y recorriendo los barrios.
        </p>
        <div className={cx("tutorial-actions")}>
          <button type="button" className={cx("primary")} onClick={() => setFinished(null)}>
            ¡Dale!
          </button>
        </div>
      </section>
    );
  }

  if (!step || !view || !tutorial) return null;

  const number = tutorial.step + 1;
  const total = TUTORIAL_STEPS.length;
  const elsewhere = view.target.cityId !== cityId ? getCityInfo(view.target.cityId)?.name : undefined;

  return (
    <section className={cx(`tutorial${collapsed ? " collapsed" : ""}`)} aria-live="polite" aria-label="Guía de bienvenida">
      <header>
        <span className={cx("tutorial-badge")}>
          {number}/{total}
        </span>
        <h2>{collapsed ? step.title : "Bienvenido a Montevideo"}</h2>
        <button type="button" className={cx("tutorial-toggle")} onClick={toggleCollapsed} aria-expanded={!collapsed} title={collapsed ? "Mostrar la guía" : "Achicar la guía"}>
          {collapsed ? "▾" : "▴"}
        </button>
      </header>
      {cheer && (
        <p key={cheer.id} className={cx("tutorial-cheer")}>
          ✅ ¡Bien!{cheer.reward > 0 ? ` +${formatMoney(cheer.reward)}` : ""}
        </p>
      )}
      {!collapsed && (
        <>
          <div className={cx("tutorial-progress")} aria-hidden="true">
            {TUTORIAL_STEPS.map((_, index) => (
              <span key={index} className={cx(index < tutorial.step ? "done" : index === tutorial.step ? "current" : "")} />
            ))}
          </div>
          <h3>{step.title}</h3>
          <p>{view.text}</p>
          <p className={cx("tutorial-meta")}>
            📍 {view.target.name}
            {elsewhere && ` (en ${elsewhere}: volvé en ómnibus)`}
            {tutorial.replay ? " · Repaso, sin premio" : ` · Premio: ${formatMoney(step.reward)}`}
          </p>
          <div className={cx("tutorial-actions")}>
            {confirmSkip ? (
              <>
                <span>¿Saltear la guía?</span>
                <button type="button" onClick={() => sendTutorialSkip(room)}>
                  Sí, saltear
                </button>
                <button type="button" onClick={() => setConfirmSkip(false)}>
                  No
                </button>
              </>
            ) : (
              <button type="button" className={cx("tutorial-skip")} onClick={() => setConfirmSkip(true)}>
                Saltear guía
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Sin almacenamiento: queda como está hasta recargar.
  }
}
