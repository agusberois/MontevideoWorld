"use client";

import { setQuality, useGame } from "@/lib/gameStore";
import type { QualitySetting } from "@/lib/quality";
import type { PanelProps } from "../../shell/panels";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./options.module.css";

const cx = moduleClasses(styles);

const QUALITY_CHOICES: Array<{ id: QualitySetting; name: string; description: string }> = [
  { id: "auto", name: "Automática", description: "En alta; baja sola si el juego va muy lento (menos de 24 fps)." },
  { id: "high", name: "Alta", description: "Todo: luces de noche, lluvia y viento." },
  { id: "low", name: "Baja", description: "Sin halos de luz de noche ni lluvia: para celulares o compus lentas." },
];

/** Opciones del juego (tecla O): por ahora, la calidad gráfica. Se guarda en este navegador. */
export function OptionsPanel({ onClose }: PanelProps) {
  const quality = useGame((state) => state.quality);
  const qualityLow = useGame((state) => state.qualityLow);

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section className={cx("modal options")} role="dialog" aria-modal="true" aria-labelledby="options-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2 id="options-title">
            <UiIcon name="gear" size={18} />
            Opciones
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <fieldset className={cx("options-group")}>
          <legend>Calidad gráfica</legend>
          {QUALITY_CHOICES.map((choice) => (
            <label key={choice.id} className={cx("options-choice")}>
              <input type="radio" name="quality" checked={quality === choice.id} onChange={() => setQuality(choice.id)} />
              <span>
                <strong>{choice.name}</strong>
                <small>{choice.description}</small>
              </span>
            </label>
          ))}
          {quality === "auto" && <p className={cx("options-now")}>Ahora: {qualityLow ? "baja (el juego iba lento)" : "alta"}.</p>}
        </fieldset>
        <footer className={cx("key-hint")}>
          Apretá <kbd>O</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}
