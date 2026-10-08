"use client";

import { useEffect, useState } from "react";
import { LETTER_LOST_PROFESSION, PROFESSIONS, PROFESSION_KIT, ProfessionId, WelcomeMessage, WelcomeStage, getItem, getProfession } from "@montevideo-world/shared";
import { useGame } from "@/lib/gameStore";
import { sendWelcomeProfession, sendWelcomeRead } from "@/lib/network";
import type { PanelProps } from "../../shell/panels";
import { ItemIcon } from "../inventory/ItemIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./welcome.module.css";

const cx = moduleClasses(styles);

interface MissionStep {
  icon: string;
  title: string;
  place: string;
  hint: string;
  /** Desde qué etapas cuenta como hecho. */
  doneFrom: readonly WelcomeStage[];
}

const MISSION_STEPS: readonly MissionStep[] = [
  {
    icon: "📮",
    title: "Encontrá al Cartero",
    place: "Plaza Independencia · Ciudad Vieja",
    hint: "Está en la plaza donde apareciste. Hacé clic en él, o acercate y apretá F.",
    doneFrom: ["deliver", "profession", "done"],
  },
  {
    icon: "🏛️",
    title: "Llevá el sobre a la Intendencia",
    place: "Explanada de la Intendencia · Centro",
    hint: "Caminá por 18 de Julio hacia el este hasta el Centro y hablá con la funcionaria de la puerta.",
    doneFrom: ["profession", "done"],
  },
  {
    icon: "✉️",
    title: "Abrí el sobre",
    place: "Intendencia de Montevideo",
    hint: "Adentro está tu carta de bienvenida.",
    doneFrom: ["done"],
  },
];

/**
 * Mensaje de bienvenida del jugador nuevo (el sobre ✉️ del HUD). Mientras dura la misión: el saludo
 * y los pasos (con el actual resaltado). Al entregar el sobre en la Intendencia: la carta, con algo
 * del juego y la elección de profesión. Terminada: la profesión que le tocó (cuidacoches si se quedó
 * sin el sobre). El server decide cada paso (`systems/welcome.ts`).
 */
export function WelcomePanel({ room, onClose }: PanelProps) {
  const welcome = useGame((state) => state.welcome);

  // Abrirlo por primera vez cuenta como leído: ya sabe que tiene que buscar al cartero.
  const unread = welcome?.stage === "mail";
  useEffect(() => {
    if (unread) sendWelcomeRead(room);
  }, [unread, room]);

  if (!welcome) return null;
  const view = welcome.stage === "profession" ? "letter" : welcome.stage === "done" ? "result" : "mission";

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx(`modal welcome welcome-${view}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={cx("welcome-close")} onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        {view === "mission" && <Mission welcome={welcome} onClose={onClose} />}
        {view === "letter" && <Letter room={room} welcome={welcome} onClose={onClose} />}
        {view === "result" && <Result welcome={welcome} onClose={onClose} />}
      </section>
    </div>
  );
}

function greeting(welcome: WelcomeMessage): string {
  return welcome.gender === "f" ? "Bienvenida" : "Bienvenido";
}

/** Sobre cerrado con el sello de lacre (el dibujo del encabezado). */
function Envelope() {
  return (
    <svg className={cx("welcome-envelope")} viewBox="0 0 96 72" aria-hidden="true">
      <rect x={4} y={10} width={88} height={58} rx={6} fill="#f3e7c9" stroke="#b8a37a" strokeWidth={2} />
      <path d="M6 14 L48 44 L90 14" fill="#e9dab2" stroke="#b8a37a" strokeWidth={2} strokeLinejoin="round" />
      <path d="M6 66 L38 38 M90 66 L58 38" stroke="#cdb98d" strokeWidth={2} />
      <circle cx={48} cy={44} r={9} fill="#c0392b" stroke="#7a1f16" strokeWidth={1.5} />
      <path d="M44 44 h8 M48 40 v8" stroke="#f3c6bf" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

function Mission({ welcome, onClose }: { welcome: WelcomeMessage; onClose: () => void }) {
  const done = MISSION_STEPS.filter((step) => step.doneFrom.includes(welcome.stage)).length;
  const currentIndex = Math.min(done, MISSION_STEPS.length - 1);

  return (
    <>
      <div className={cx("welcome-hero")}>
        <Envelope />
        <div>
          <p className={cx("welcome-kicker")}>Mensaje nuevo</p>
          <h2 id="welcome-title">
            ¡{greeting(welcome)}, {welcome.name}!
          </h2>
          <p className={cx("welcome-lead")}>Llegaste a Montevideo. Antes de largarte a recorrer, alguien te está esperando con un sobre a tu nombre.</p>
        </div>
      </div>

      <div className={cx("welcome-body")}>
        <div className={cx("welcome-progress")}>
          <div className={cx("welcome-progress-head")}>
            <strong>Misión: un sobre a tu nombre</strong>
            <span>
              Paso {currentIndex + 1} de {MISSION_STEPS.length}
            </span>
          </div>
          <div
            className={cx("welcome-progress-bar")}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={MISSION_STEPS.length}
            aria-valuenow={done}
            aria-label="Avance de la misión"
          >
            <span style={{ width: `${(done / MISSION_STEPS.length) * 100}%` }} />
          </div>
        </div>

        <ol className={cx("welcome-steps")}>
          {MISSION_STEPS.map((step, index) => {
            const state = index < done ? "done" : index === currentIndex ? "current" : "pending";
            return (
              <li key={step.title} className={cx(`welcome-step ${state}`)}>
                <span className={cx("welcome-step-icon")} aria-hidden="true">
                  {state === "done" ? "✓" : step.icon}
                </span>
                <div className={cx("welcome-step-text")}>
                  <strong>{step.title}</strong>
                  <small>📍 {step.place}</small>
                  {state === "current" && <p>{step.hint}</p>}
                </div>
                {state === "current" && <span className={cx("welcome-chip")}>Ahora</span>}
              </li>
            );
          })}
        </ol>

        {welcome.stage === "deliver" && (
          <p className={cx("welcome-warning")}>
            ⚠️ Cuidá el sobre: si lo vendés o lo tirás antes de entregarlo, te quedás sin carta de recomendación.
          </p>
        )}

        <button type="button" className={cx("welcome-button primary")} onClick={onClose}>
          ¡Vamos!
        </button>
      </div>
    </>
  );
}

function Letter({ room, welcome, onClose }: { room: PanelProps["room"]; welcome: WelcomeMessage; onClose: () => void }) {
  const [choice, setChoice] = useState<ProfessionId | null>(null);
  const choosable = PROFESSIONS.filter((profession) => profession.choosable);

  return (
    <div className={cx("welcome-body")}>
      <article className={cx("welcome-paper")}>
        <span className={cx("welcome-seal")} aria-hidden="true" />
        <p className={cx("welcome-paper-from")}>Intendencia de Montevideo</p>
        <h2 id="welcome-title">
          {greeting(welcome)}, {welcome.name}, a Montevideo World
        </h2>
        <p>
          Esta ciudad es tuya: caminá sus barrios, charlá con la gente y hacete un lugar. Arrancaste en Ciudad Vieja; al Centro se llega
          caminando por 18 de Julio y al resto de los barrios, en ómnibus con un boleto STM.
        </p>
        <p>
          Cuidá tu <strong>energía</strong>, tu <strong>hambre</strong> y tu <strong>salud</strong>: comé algo en los kioscos y descansá
          en los bancos. La plata se gana laburando, y con ella te comprás ropa, herramientas y lo que se te ocurra.
        </p>
        <p className={cx("welcome-keys")}>
          <kbd>M</kbd> barrios · <kbd>I</kbd> mochila · <kbd>F</kbd> interactuar · <kbd>E</kbd> gestos · <kbd>C</kbd> comandos
        </p>
        <p className={cx("welcome-signature")}>Con cariño, la Intendencia</p>
      </article>

      <h3 className={cx("welcome-section-title")}>¿A qué te vas a dedicar?</h3>
      <div className={cx("welcome-professions")} role="radiogroup" aria-label="Profesión">
        {choosable.map((profession) => (
          <label key={profession.id} className={cx(`welcome-profession${choice === profession.id ? " selected" : ""}`)}>
            <input type="radio" name="profession" checked={choice === profession.id} onChange={() => setChoice(profession.id)} />
            <span className={cx("welcome-profession-emoji")} aria-hidden="true">
              {profession.emoji}
            </span>
            <strong>{profession.name}</strong>
            <small>{profession.description}</small>
            <KitBadge profession={profession.id} label="Te llevás" />
            {choice === profession.id && (
              <span className={cx("welcome-profession-check")} aria-hidden="true">
                ✓
              </span>
            )}
          </label>
        ))}
      </div>
      <button
        type="button"
        className={cx("welcome-button primary")}
        disabled={!choice}
        onClick={() => {
          if (!choice) return;
          sendWelcomeProfession(room, choice);
          onClose();
        }}
      >
        {choice ? `${getProfession(choice).emoji} Elegir: ${getProfession(choice).name}` : "Elegí una profesión"}
      </button>
    </div>
  );
}

/** Lo que da la profesión (`PROFESSION_KIT`): su ícono y nombre. */
function KitBadge({ profession, label }: { profession: ProfessionId; label: string }) {
  const item = getItem(PROFESSION_KIT[profession]);
  if (!item) return null;
  return (
    <span className={cx("welcome-kit")}>
      <ItemIcon item={item} size={30} />
      <span>
        <small>🎁 {label}</small>
        <strong>{item.name}</strong>
      </span>
    </span>
  );
}

function Result({ welcome, onClose }: { welcome: WelcomeMessage; onClose: () => void }) {
  const profession = welcome.profession ? getProfession(welcome.profession) : null;
  const lost = welcome.profession === LETTER_LOST_PROFESSION;
  return (
    <div className={cx("welcome-body welcome-result")}>
      <span className={cx("welcome-result-emoji")} aria-hidden="true">
        {profession?.emoji ?? "✉️"}
      </span>
      <h2 id="welcome-title">{profession ? profession.name : "Misión terminada"}</h2>
      {profession && <p>{profession.description}</p>}
      {lost && <p className={cx("welcome-warning")}>Te deshiciste del sobre antes de entregarlo: sin carta de recomendación, la calle te eligió a vos.</p>}
      {welcome.profession && <KitBadge profession={welcome.profession} label="Te dieron (está en tu mochila)" />}
      <button type="button" className={cx("welcome-button primary")} onClick={onClose}>
        Listo
      </button>
    </div>
  );
}
