"use client";

import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { moduleClasses } from "@/lib/cx";
import styles from "./InteractPrompt.module.css";

const cx = moduleClasses(styles);

/**
 * Cartel "F · Sentarse" cuando el avatar tiene algo al lado (tienda, banco, palmera, parada, otro
 * jugador, un picudo). La tecla F hace lo mismo que tocarlo; en celulares se toca. Qué hay al lado
 * lo decide la escena (`findInteraction`) y lo avisa con `interact:prompt`.
 */
export function InteractPrompt() {
  /** Con qué se puede interactuar ahora ("Sentarse", "Entrar a Ropería Sarandí"…), o null. */
  const label = useGame((state) => state.interaction);
  if (!label) return null;
  return (
    <button type="button" className={cx("interact-prompt")} onClick={() => eventBus.emit("interact:use", null)}>
      <kbd>F</kbd>
      {label}
    </button>
  );
}
