"use client";

import { COMMANDS, CommandDefinition, canUseCommand } from "@montevideo-world/shared";
import { useGame } from "@/lib/gameStore";
import type { PanelProps } from "../../shell/panels";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./chat.module.css";

const cx = moduleClasses(styles);

/**
 * Ayuda de comandos de chat (tecla C). Muestra sólo los que podés usar: un usuario ve los de
 * usuario; el admin, además, los de admin. Sale del mismo catálogo que valida el server (`COMMANDS`).
 */
export function CommandsPanel({ onClose }: PanelProps) {
  const isAdmin = useGame((state) => state.isAdmin);
  const available = COMMANDS.filter((command) => canUseCommand(command, isAdmin));
  const forEveryone = available.filter((command) => command.role === "user");
  const adminOnly = available.filter((command) => command.role === "admin");

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal commands")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="commands-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="commands-title">
            <UiIcon name="terminal" size={18} />
            Comandos
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <p className={cx("commands-intro")}>Escribilos en el chat. No se ven en el chat: la respuesta te llega como aviso.</p>
        <CommandList title="Para todos" commands={forEveryone} />
        {adminOnly.length > 0 && <CommandList title="Sólo admin" commands={adminOnly} admin />}
        <footer className={cx("key-hint")}>
          Apretá <kbd>C</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}

function CommandList({ title, commands, admin }: { title: string; commands: readonly CommandDefinition[]; admin?: boolean }) {
  return (
    <>
      <h3 className={cx("commands-group")}>
        {admin && <UiIcon name="shield" size={13} />}
        {title}
      </h3>
      <ul className={cx("commands-list")}>
        {commands.map((command) => (
          <li key={command.name}>
            <code className={cx(admin ? "admin" : undefined)}>{command.usage}</code>
            <span>{command.description}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
