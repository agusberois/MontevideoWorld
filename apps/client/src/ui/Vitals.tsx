"use client";

import { LOW_ENERGY, LOW_HEALTH, MAX_ENERGY, MAX_HEALTH, MAX_HUNGER, STARVING } from "@montevideo-world/shared";
import { useGame } from "@/lib/gameStore";
import { UiIcon, UiIconName } from "./UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./Vitals.module.css";

const cx = moduleClasses(styles);

/**
 * Energía, hambre y salud. En escritorio, un panel abajo a la izquierda (cerca de la barra rápida,
 * donde se mira al pescar o vender); en celulares, una fila arriba de la barra rápida (va en el
 * `.dock` de `App`).
 */
export function Vitals() {
  const energy = useGame((state) => state.energy);
  const hunger = useGame((state) => state.hunger);
  const health = useGame((state) => state.health);
  return (
    <div className={cx("vitals")}>
      <NeedMeter
        kind="energy"
        label="Energía"
        icon="zap"
        title="Energía: pescar y vender la gastan (caminar, un poco); quedarte quieto o sentarte en un banco la recupera (con hambre, más lento)"
        value={energy}
        max={MAX_ENERGY}
        low={LOW_ENERGY}
      />
      <NeedMeter
        kind="hunger"
        label="Hambre"
        icon="food"
        title="Hambre: baja con el tiempo y el esfuerzo. Comé algo (kioscos, Mercado del Puerto o un pescado) para llenarla"
        value={hunger}
        max={MAX_HUNGER}
        low={STARVING}
      />
      <NeedMeter
        kind="health"
        label="Salud"
        icon="heart"
        title="Salud: la bajan los picudos, pasar hambre y el pescado crudo. Vuelve comiendo bien y descansando, o en la guardia del Sanatorio Americano. En 0 te desmayás"
        value={health}
        max={MAX_HEALTH}
        low={LOW_HEALTH}
      />
    </div>
  );
}

interface NeedMeterProps {
  /** Clase (colores): `need-energy`, `need-hunger`, `need-health`. */
  kind: "energy" | "hunger" | "health";
  label: string;
  icon: UiIconName;
  title: string;
  value: number | null;
  max: number;
  /** Por debajo, en rojo (y el ícono titila); por debajo de la mitad, amarillo. */
  low: number;
}

/** Barra de una necesidad: llena = bien, amarilla por la mitad, roja cuando queda poca. */
function NeedMeter({ kind, label, icon, title, value, max, low }: NeedMeterProps) {
  const shown = value ?? max;
  const level = shown <= low ? "low" : shown <= max / 2 ? "mid" : "high";
  return (
    <span
      className={cx(`need need-${kind} ${level}`)}
      title={title}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={shown}
    >
      <UiIcon name={icon} />
      <span className={cx("need-label")}>{label}</span>
      <span className={cx("need-bar")}>
        <span style={{ width: `${(shown / max) * 100}%` }} />
      </span>
      <span className={cx("need-value")}>{value === null ? "…" : shown}</span>
    </span>
  );
}
