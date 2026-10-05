"use client";

import { GESTURES, GESTURE_IDS, GestureId } from "@montevideo-world/shared";
import { sendGesture } from "@/lib/network";
import type { PanelProps } from "../../shell/panels";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./gestures.module.css";

const cx = moduleClasses(styles);

/**
 * Gestos (tecla E): tomar mate, bailar candombe… Elegir uno lo manda al server, que lo pone en el
 * Schema para que lo vean todos (si estás caminando, lo hacés al llegar), y cierra el panel.
 */
export function GesturesPanel({ room, onClose }: PanelProps) {
  const choose = (gesture: GestureId) => {
    sendGesture(room, gesture);
    onClose();
  };

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal gestures")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gestures-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="gestures-title">
            <UiIcon name="hand" size={18} />
            Gestos
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className={cx("gestures-grid")}>
          {GESTURE_IDS.map((id) => (
            <button key={id} type="button" className={cx("gesture")} onClick={() => choose(id)}>
              <span className={cx("gesture-emoji")} aria-hidden="true">
                {[...GESTURES[id].cry][0]}
              </span>
              <span>{GESTURES[id].name}</span>
            </button>
          ))}
        </div>
        <p className={cx("gestures-note")}>Los ve todo el barrio. Caminando, lo hacés al llegar; sentado, sólo los que no son de pararse.</p>
        <footer className={cx("key-hint")}>
          Apretá <kbd>E</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}
