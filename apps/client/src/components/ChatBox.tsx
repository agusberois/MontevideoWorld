"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  CHAT_MAX_LENGTH,
  COMMANDS,
  ChatBroadcastMessage,
  CommandDefinition,
  MessageType,
  canUseCommand,
  getCommand,
  sanitizeChat,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import type { CityRoom } from "@/lib/network";

const HISTORY_LIMIT = 50;
/** Cuántos mensajes propios se recuerdan para recorrer con ↑ / ↓. */
const SENT_LIMIT = 50;

interface ChatBoxProps {
  room: CityRoom;
}

/** ¿El comando lleva algo después del nombre? ("/help" no; "/mensaje <jugador> <texto>" sí). */
function takesArgs(command: CommandDefinition): boolean {
  return command.usage.trim() !== `/${command.name}`;
}

export function ChatBox({ room }: ChatBoxProps) {
  /** Para sugerir sólo los comandos que podés usar (los de admin, sólo al admin). */
  const isAdmin = useGame((state) => state.isAdmin);
  const [messages, setMessages] = useState<ChatBroadcastMessage[]>([]);
  const [text, setText] = useState("");
  const historyRef = useRef<HTMLUListElement>(null);
  /** Mensajes enviados por mí, del más viejo al más nuevo. */
  const sentRef = useRef<string[]>([]);
  /** Posición en `sentRef` mientras se recorre con ↑ / ↓; null = escribiendo un mensaje nuevo. */
  const cursorRef = useRef<number | null>(null);
  /** Lo que estaba escrito antes de empezar a recorrer, para recuperarlo al volver con ↓. */
  const draftRef = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);
  /** Sugerencia marcada (↑ / ↓) en la lista de comandos. */
  const [selected, setSelected] = useState(0);
  /** Esc esconde la lista hasta que se vuelva a escribir. */
  const [dismissed, setDismissed] = useState(false);
  /**
   * Celulares: el chat arranca compacto (los últimos mensajes y el input) y se expande al escribir o
   * al tocar el historial. En escritorio no cambia nada (lo decide el CSS del modo compacto).
   */
  const [expanded, setExpanded] = useState(false);

  /**
   * Autoayuda de comandos. Mientras se escribe el nombre ("/", "/me"…) se listan los que empiezan
   * así; ya escrito el nombre y un espacio, se muestra cómo se usa. Sólo los que tu rol puede usar.
   */
  const typingName = text.startsWith("/") && !/\s/.test(text) ? text.slice(1).toLowerCase() : null;
  const suggestions =
    typingName === null || dismissed
      ? []
      : COMMANDS.filter((command) => canUseCommand(command, isAdmin) && command.name.startsWith(typingName));
  const active = Math.min(selected, Math.max(0, suggestions.length - 1));
  const typedCommand = /^\/(\S+)\s/.exec(text);
  const usageHint = typedCommand ? getCommand(typedCommand[1].toLowerCase()) : undefined;
  const showUsage = usageHint !== undefined && canUseCommand(usageHint, isAdmin) && takesArgs(usageHint);

  function changeText(value: string) {
    // Editar un mensaje recuperado lo convierte en un borrador nuevo.
    cursorRef.current = null;
    setSelected(0);
    setDismissed(false);
    setText(value);
  }

  /** Completa el comando: "/mensaje " (con espacio si lleva argumentos) y el foco sigue en el input. */
  function complete(command: CommandDefinition) {
    changeText(`/${command.name}${takesArgs(command) ? " " : ""}`);
    inputRef.current?.focus();
  }

  /** Clic en un mensaje privado: deja escrito "/mensaje <nombre> " para responder. */
  function replyTo(name: string) {
    cursorRef.current = null;
    setText(`/mensaje ${name} `);
    inputRef.current?.focus();
  }

  useEffect(
    () =>
      eventBus.on("chat:message", (message) => {
        setMessages((previous) => [...previous, message].slice(-HISTORY_LIMIT));
      }),
    [],
  );

  useEffect(() => {
    const history = historyRef.current;
    if (history) history.scrollTop = history.scrollHeight;
  }, [messages, expanded]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = sanitizeChat(text);
    if (!clean) return;
    room.send(MessageType.Chat, { text: clean });
    const sent = sentRef.current;
    if (sent[sent.length - 1] !== clean) sentRef.current = [...sent, clean].slice(-SENT_LIMIT);
    cursorRef.current = null;
    draftRef.current = "";
    setText("");
  }

  /**
   * Con la lista de comandos abierta: ↑ / ↓ eligen, Tab completa, Enter completa (o envía, si el
   * comando ya está escrito entero) y Esc la cierra. Si no, ↑ trae el mensaje enviado anterior (el
   * último, la primera vez) y ↓ vuelve hacia el borrador.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length > 0) {
      const command = suggestions[active];
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setSelected((active + step + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === "Tab" || (event.key === "Enter" && command.name !== typingName)) {
        event.preventDefault();
        complete(command);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setDismissed(true);
        return;
      }
    }

    const sent = sentRef.current;
    const cursor = cursorRef.current;

    if (event.key === "ArrowUp") {
      if (sent.length === 0) return;
      event.preventDefault();
      if (cursor === null) draftRef.current = text;
      const next = cursor === null ? sent.length - 1 : Math.max(0, cursor - 1);
      cursorRef.current = next;
      setText(sent[next]);
    } else if (event.key === "ArrowDown") {
      if (cursor === null) return;
      event.preventDefault();
      if (cursor < sent.length - 1) {
        cursorRef.current = cursor + 1;
        setText(sent[cursor + 1]);
      } else {
        cursorRef.current = null;
        setText(draftRef.current);
      }
    }
  }

  return (
    <section className={`chat${expanded ? " expanded" : ""}`} aria-label="Chat">
      <ul className="chat-history" ref={historyRef} onClick={() => setExpanded(true)}>
        {messages.length === 0 && <li className="chat-empty">Tocá el piso para caminar. ¡Saludá!</li>}
        {messages.map((message) =>
          message.kind === "system" ? (
            <li key={message.id} className="chat-system">
              {message.text}
            </li>
          ) : message.kind === "private" ? (
            // Privado: "✉ De X" (recibido) o "✉ Para X" (la copia del que mandaste). Clic = responder.
            <li key={message.id} className="chat-private">
              <button
                type="button"
                className="chat-name"
                title={`Responderle a ${message.to ?? message.name} en privado`}
                onClick={() => replyTo(message.to ?? message.name)}
              >
                ✉ {message.to ? `Para ${message.to}` : `De ${message.name}`}:
              </button>
              {message.text}
            </li>
          ) : (
            <li key={message.id}>
              <span className="chat-name">{message.name}:</span>
              {message.text}
            </li>
          ),
        )}
      </ul>
      {suggestions.length > 0 && (
        <ul className="chat-commands" role="listbox" aria-label="Comandos">
          {suggestions.map((command, index) => (
            <li key={command.name} role="option" aria-selected={index === active}>
              <button
                type="button"
                className={index === active ? "active" : undefined}
                // mousedown en vez de click: así el input no pierde el foco.
                onMouseDown={(event) => {
                  event.preventDefault();
                  complete(command);
                }}
                onMouseEnter={() => setSelected(index)}
              >
                <span className="chat-command-usage">{command.usage}</span>
                {command.role === "admin" && <span className="chat-command-admin">admin</span>}
                <span className="chat-command-description">{command.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {typingName !== null && !dismissed && suggestions.length === 0 && (
        <p className="chat-command-hint">No hay ningún comando que empiece con /{typingName}. Borrá para ver la lista.</p>
      )}
      {showUsage && (
        <p className="chat-command-hint">
          <span className="chat-command-usage">{usageHint.usage}</span> {usageHint.description}
        </p>
      )}
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={text}
          maxLength={CHAT_MAX_LENGTH}
          placeholder="Escribí un mensaje… (/ para comandos)"
          onChange={(event) => changeText(event.target.value)}
          aria-autocomplete="list"
          onKeyDown={handleKeyDown}
          onFocus={() => setExpanded(true)}
          // Al tocar el mapa (el input pierde el foco) el chat vuelve a achicarse, si no quedó nada escrito.
          onBlur={() => !text && setExpanded(false)}
          enterKeyHint="send"
          autoComplete="off"
          autoCorrect="off"
        />
        <button
          type="button"
          className="chat-toggle"
          // mousedown: así no le saca el foco al input antes de cambiar.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-label={expanded ? "Achicar el chat" : "Agrandar el chat"}
        >
          {expanded ? "▾" : "▴"}
        </button>
        <button type="submit">Enviar</button>
      </form>
    </section>
  );
}
