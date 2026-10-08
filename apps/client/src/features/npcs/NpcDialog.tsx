"use client";

import { useEffect, useState } from "react";
import { getItem } from "@montevideo-world/shared";
import { openPanel, useGame } from "@/lib/gameStore";
import type { PanelProps } from "../../shell/panels";
import { AvatarPreview } from "../join/AvatarPreview";
import { ItemIcon } from "../inventory/ItemIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./npcs.module.css";

const cx = moduleClasses(styles);

/** Cada cuánto aparece una letra más del texto (efecto de "está hablando"). */
const TYPE_MS = 18;

const ACTION_LABELS = { mission: "Ver la misión", letter: "Abrir el sobre" } as const;

/**
 * Diálogo con un NPC (`npc:say`, al hablarle con clic o F): su retrato, nombre y quién es, lo que
 * dice (se va escribiendo; un clic lo muestra entero), lo que te dio y los botones (seguir, ver la
 * misión, abrir el sobre). Lo que dice y ofrece lo decide el server (`systems/welcome.ts`).
 */
export function NpcDialog({ onClose }: PanelProps) {
  const dialog = useGame((state) => state.npcDialog);
  const text = dialog?.text ?? "";
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return setShown(text.length);
    setShown(0);
    const timer = window.setInterval(() => {
      setShown((current) => {
        if (current >= text.length) window.clearInterval(timer);
        return Math.min(text.length, current + 1);
      });
    }, TYPE_MS);
    return () => window.clearInterval(timer);
  }, [dialog, text]);

  if (!dialog) return null;
  const typing = shown < text.length;
  const received = dialog.received ? getItem(dialog.received) : undefined;
  const { npc, action } = dialog;

  return (
    <div className={cx("modal-backdrop npc-backdrop")} onClick={onClose}>
      <section
        className={cx("npc-dialog")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="npc-dialog-name"
        aria-describedby="npc-dialog-text"
        onClick={(event) => {
          event.stopPropagation();
          // Un clic mientras habla muestra todo el texto de una.
          if (typing) setShown(text.length);
        }}
      >
        <div className={cx("npc-portrait")} aria-hidden="true">
          <AvatarPreview appearance={npc.appearance} outfit={npc.outfit} size={112} />
        </div>
        <div className={cx("npc-content")}>
          <header className={cx("npc-header")}>
            <div>
              <h2 id="npc-dialog-name">{npc.name}</h2>
              {dialog.role && <p className={cx("npc-role")}>{dialog.role}</p>}
            </div>
            <button type="button" className={cx("npc-close")} onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </header>
          <p id="npc-dialog-text" className={cx("npc-text")} aria-live="polite">
            {text.slice(0, shown)}
            {typing && <span className={cx("npc-caret")} aria-hidden="true" />}
          </p>
          {received && !typing && (
            <div className={cx("npc-received")}>
              <ItemIcon item={received} size={40} />
              <span>
                <small>Recibiste</small>
                <strong>{received.name}</strong>
              </span>
              <span className={cx("npc-received-where")}>Está en tu mochila</span>
            </div>
          )}
          <div className={cx("npc-actions")}>
            {action && (
              <button type="button" className={cx("npc-button primary")} disabled={typing} onClick={() => openPanel("welcome")}>
                {action === "letter" && "✉️ "}
                {ACTION_LABELS[action]}
              </button>
            )}
            <button type="button" className={cx(`npc-button${action ? "" : " primary"}`)} onClick={onClose}>
              {typing ? "Saltear" : "Gracias, ¡chau!"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
