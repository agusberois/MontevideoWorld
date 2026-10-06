"use client";

import { useEffect, useState } from "react";
import { BARRA_MAX_MEMBERS, BarraResultMessage, BarraView, barraColorHex } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { requestBarra, sendBarraLeave } from "@/lib/network";
import type { PanelProps } from "../../shell/panels";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./barras.module.css";

const cx = moduleClasses(styles);

/**
 * Mi barra (tecla B): nombre, sigla y colores, los integrantes (quién está conectado y en qué barrio)
 * y el botón para irse (el fundador, si se va, la disuelve). Sin barra, explica dónde se funda.
 */
export function BarraPanel({ room, onClose }: PanelProps) {
  const barra = useGame((state) => state.barra);
  const [result, setResult] = useState<BarraResultMessage | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

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

        {result && <p className={cx(`barra-result ${result.ok ? "ok" : "error"}`)}>{result.text}</p>}

        {barra ? (
          <BarraDetails barra={barra} />
        ) : (
          <div className={cx("barra-empty")}>
            <p>
              Todavía no sos de ninguna barra. Pedile a un fundador que te invite (clic en su avatar) o fundá la tuya en
              el <strong>Registro de Barras</strong>, sobre la peatonal Sarandí, en Ciudad Vieja.
            </p>
          </div>
        )}

        {barra &&
          (confirmLeave ? (
            <div className={cx("barra-confirm")}>
              <span>{barra.founder ? "¿Disolver la barra? Se van todos y no se puede deshacer." : "¿Irte de la barra?"}</span>
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
              <button type="button" onClick={() => setConfirmLeave(false)}>
                No
              </button>
            </div>
          ) : (
            <button type="button" className={cx("barra-leave")} onClick={() => setConfirmLeave(true)}>
              {barra.founder ? "Disolver la barra" : "Irme de la barra"}
            </button>
          ))}

        <footer className={cx("key-hint")}>
          Hablale a tu barra con <kbd>/barra</kbd> en el chat · Apretá <kbd>B</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}

function BarraDetails({ barra }: { barra: BarraView }) {
  const [first, second] = barra.colors.map(barraColorHex);
  const online = barra.members.filter((member) => member.online).length;
  const founded = new Date(barra.createdAt).toLocaleDateString("es-UY", { day: "numeric", month: "long", year: "numeric" });
  return (
    <>
      <div className={cx("barra-banner")} style={{ background: `linear-gradient(135deg, ${first} 0 50%, ${second} 50% 100%)` }}>
        <span className={cx("barra-tag")}>[{barra.tag}]</span>
        <span className={cx("barra-name")}>{barra.name}</span>
      </div>
      <p className={cx("barra-meta")}>
        Fundada el {founded} · {barra.members.length}/{BARRA_MAX_MEMBERS} integrantes · {online} conectados
      </p>
      <ul className={cx("barra-members")}>
        {barra.members.map((member) => (
          <li key={`${member.name}-${member.role}`} className={cx(member.online ? "online" : "")}>
            <span className={cx("barra-dot")} aria-hidden="true" />
            <span className={cx("barra-member-name")}>
              {member.name}
              {member.you && <small> (vos)</small>}
            </span>
            {member.role === "fundador" && <span className={cx("barra-role")}>Fundador</span>}
            <span className={cx("barra-where")}>{member.online ? member.cityName : "Desconectado"}</span>
          </li>
        ))}
      </ul>
      {barra.founder && <p className={cx("barra-hint")}>Para invitar a alguien, hacele clic a su avatar y elegí "Invitar a mi barra".</p>}
    </>
  );
}
