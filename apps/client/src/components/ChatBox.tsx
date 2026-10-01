"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { CHAT_MAX_LENGTH, ChatBroadcastMessage, MessageType, sanitizeChat } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import type { CityRoom } from "@/lib/network";

const HISTORY_LIMIT = 50;
/** Cuántos mensajes propios se recuerdan para recorrer con ↑ / ↓. */
const SENT_LIMIT = 50;

interface ChatBoxProps {
  room: CityRoom;
}

export function ChatBox({ room }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatBroadcastMessage[]>([]);
  const [text, setText] = useState("");
  const historyRef = useRef<HTMLUListElement>(null);
  /** Mensajes enviados por mí, del más viejo al más nuevo. */
  const sentRef = useRef<string[]>([]);
  /** Posición en `sentRef` mientras se recorre con ↑ / ↓; null = escribiendo un mensaje nuevo. */
  const cursorRef = useRef<number | null>(null);
  /** Lo que estaba escrito antes de empezar a recorrer, para recuperarlo al volver con ↓. */
  const draftRef = useRef("");

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
  }, [messages]);

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

  /** ↑ trae el mensaje enviado anterior (el último, la primera vez); ↓ vuelve hacia el borrador. */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
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
    <section className="chat" aria-label="Chat">
      <ul className="chat-history" ref={historyRef}>
        {messages.length === 0 && <li className="chat-empty">Hacé clic en el piso para caminar. ¡Saludá!</li>}
        {messages.map((message) =>
          message.kind === "system" ? (
            <li key={message.id} className="chat-system">
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
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          value={text}
          maxLength={CHAT_MAX_LENGTH}
          placeholder="Escribí un mensaje… (↑ para el anterior)"
          onChange={(event) => {
            // Editar un mensaje recuperado lo convierte en un borrador nuevo.
            cursorRef.current = null;
            setText(event.target.value);
          }}
          onKeyDown={handleKeyDown}
        />
        <button type="submit">Enviar</button>
      </form>
    </section>
  );
}
