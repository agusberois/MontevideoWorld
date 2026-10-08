"use client";

import { useEffect, useState } from "react";
import { BARRA_FOUND_COST, BARRA_MAX_MEMBERS, BarraMemberView, BarraResultMessage, BarraView, barraColorHex, formatMoney, readableOn } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { requestBarra, sendBarraLeave } from "@/lib/network";
import type { PanelProps } from "../../shell/panels";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./barras.module.css";

const cx = moduleClasses(styles);

/**
 * Mi barra (tecla B): la bandera con la sigla y el nombre, unos números (integrantes, conectados, tu
 * rol), los integrantes (los conectados primero, con el barrio donde están) y, al final, irse (el
 * fundador, si se va, la disuelve). Sin barra, las dos formas de tener una: que te inviten o fundarla.
 */
export function BarraPanel({ room, onClose }: PanelProps) {
  const barra = useGame((state) => state.barra);
  const [result, setResult] = useState<BarraResultMessage | null>(null);

  // Al abrirlo se piden los datos frescos (quién está conectado cambia todo el tiempo).
  useEffect(() => requestBarra(room), [room]);
  useEffect(() => eventBus.on("barra:result", setResult), []);

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal barra-panel")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="barra-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="barra-title">
            <UiIcon name="flag" size={18} />
            Mi barra
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className={cx("barra-body")}>
          {result && (
            <p className={cx(`barra-result ${result.ok ? "ok" : "error"}`)} role="status">
              {result.text}
            </p>
          )}
          {barra ? <BarraDetails room={room} barra={barra} /> : <NoBarra />}
        </div>

        <footer className={cx("key-hint")}>
          Hablale a tu barra con <kbd>/barra</kbd> en el chat · <kbd>B</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}

/** Sin barra: qué es una barra y las dos formas de tener una. */
function NoBarra() {
  return (
    <div className={cx("barra-empty")}>
      <div className={cx("barra-empty-icon")} aria-hidden="true">
        <UiIcon name="flag" size={30} />
      </div>
      <h3>Todavía no tenés barra</h3>
      <p>Una barra es tu grupo de amigos: llevan la sigla arriba de la cabeza, tienen su chat y se ven en qué barrio anda cada uno.</p>
      <div className={cx("barra-options")}>
        <div className={cx("barra-option")}>
          <span className={cx("barra-option-icon")} aria-hidden="true">
            🤝
          </span>
          <strong>Sumate a una</strong>
          <small>Pedile a un fundador que te invite: hace clic en tu avatar y elige &quot;Invitar a mi barra&quot;.</small>
        </div>
        <div className={cx("barra-option")}>
          <span className={cx("barra-option-icon")} aria-hidden="true">
            🏛️
          </span>
          <strong>Fundá la tuya</strong>
          <small>
            En el <b>Registro de Barras</b>, sobre la peatonal Sarandí (Ciudad Vieja). Cuesta {formatMoney(BARRA_FOUND_COST)}.
          </small>
        </div>
      </div>
    </div>
  );
}

function BarraDetails({ room, barra }: { room: PanelProps["room"]; barra: BarraView }) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [first, second] = barra.colors.map(barraColorHex);
  const online = barra.members.filter((member) => member.online).length;
  const founded = new Date(barra.createdAt).toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" });
  // Los conectados primero; entre iguales, el fundador arriba y después por nombre.
  const members = [...barra.members].sort(
    (a, b) => Number(b.online) - Number(a.online) || Number(b.role === "fundador") - Number(a.role === "fundador") || a.name.localeCompare(b.name, "es"),
  );

  return (
    <>
      <div className={cx("barra-banner")} style={{ background: `linear-gradient(135deg, ${first} 0 50%, ${second} 50% 100%)` }}>
        <span className={cx("barra-tag")} style={{ background: first, color: readableOn(first), borderColor: second }}>
          {barra.tag}
        </span>
        <span className={cx("barra-banner-text")}>
          <span className={cx("barra-name")}>{barra.name}</span>
          <small>Fundada el {founded}</small>
        </span>
      </div>

      <div className={cx("barra-stats")}>
        <span>
          <strong>
            {barra.members.length}
            <small>/{BARRA_MAX_MEMBERS}</small>
          </strong>
          Integrantes
        </span>
        <span className={cx(online > 0 ? "live" : "")}>
          <strong>{online}</strong>
          Conectados
        </span>
        <span>
          <strong>{barra.founder ? "👑" : "🙌"}</strong>
          {barra.founder ? "Fundador" : "Integrante"}
        </span>
      </div>

      <section className={cx("barra-section")} aria-labelledby="barra-members-title">
        <h3 id="barra-members-title">Integrantes</h3>
        <ul className={cx("barra-members")}>
          {members.map((member) => (
            <MemberRow key={`${member.name}-${member.role}`} member={member} colors={[first, second]} />
          ))}
        </ul>
      </section>

      {barra.founder && (
        <p className={cx("barra-hint")}>
          <span aria-hidden="true">💡</span> Para invitar a alguien, hacé clic en su avatar y elegí &quot;Invitar a mi barra&quot;.
        </p>
      )}

      {confirmLeave ? (
        <div className={cx("barra-confirm")} role="alertdialog" aria-label={barra.founder ? "Disolver la barra" : "Irte de la barra"}>
          <p>
            <strong>{barra.founder ? "¿Disolver la barra?" : "¿Irte de la barra?"}</strong>{" "}
            {barra.founder ? "Se van todos los integrantes y no se puede deshacer." : "Para volver, alguien te tiene que invitar de nuevo."}
          </p>
          <div className={cx("barra-confirm-actions")}>
            <button type="button" onClick={() => setConfirmLeave(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className={cx("danger")}
              onClick={() => {
                sendBarraLeave(room);
                setConfirmLeave(false);
              }}
            >
              {barra.founder ? "Sí, disolverla" : "Sí, irme"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={cx("barra-leave")} onClick={() => setConfirmLeave(true)}>
          {barra.founder ? "Disolver la barra" : "Irme de la barra"}
        </button>
      )}
    </>
  );
}

function MemberRow({ member, colors: [first, second] }: { member: BarraMemberView; colors: [string, string] }) {
  return (
    <li className={cx(`${member.online ? "online" : ""}${member.you ? " you" : ""}`)}>
      <span className={cx("barra-avatar")} style={{ background: first, color: readableOn(first), borderColor: second }} aria-hidden="true">
        {member.name.charAt(0).toLocaleUpperCase("es")}
        <span className={cx("barra-dot")} />
      </span>
      <span className={cx("barra-member-text")}>
        <span className={cx("barra-member-name")}>
          {member.name}
          {member.you && <small> (vos)</small>}
        </span>
        <span className={cx("barra-where")}>
          {member.online ? (
            <>
              <UiIcon name="pin" size={12} />
              {member.cityName}
            </>
          ) : (
            "Desconectado"
          )}
        </span>
      </span>
      {member.role === "fundador" && <span className={cx("barra-role")}>👑 Fundador</span>}
    </li>
  );
}
