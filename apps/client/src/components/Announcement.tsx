"use client";

import { useEffect, useState } from "react";
import type { AnnouncementMessage } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { UiIcon } from "./UiIcon";

/** Cuánto queda en pantalla: base + un poco más por cada carácter, para que dé tiempo a leerlo. */
const BASE_MS = 8000;
const PER_CHAR_MS = 80;

/**
 * Anuncio del admin (`/post`) para todos los jugadores de todos los barrios: un banner arriba al
 * centro, debajo del HUD, que se ve siempre sin tapar al avatar (la cámara lo deja en el medio).
 * No va al chat. Se va solo (la barrita muestra cuánto le queda) o con la ✕; uno nuevo reemplaza
 * al anterior.
 */
export function Announcement() {
  const [announcement, setAnnouncement] = useState<AnnouncementMessage | null>(null);
  const duration = announcement ? BASE_MS + announcement.text.length * PER_CHAR_MS : 0;

  useEffect(() => eventBus.on("announcement", setAnnouncement), []);

  useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => setAnnouncement(null), duration);
    return () => window.clearTimeout(timer);
  }, [announcement, duration]);

  if (!announcement) return null;
  return (
    <div className="announcement" role="alert" key={announcement.id}>
      <UiIcon name="megaphone" size={20} className="announcement-icon" />
      <p>
        <strong>{announcement.name}:</strong> {announcement.text}
      </p>
      <button type="button" onClick={() => setAnnouncement(null)} aria-label="Cerrar anuncio">
        ✕
      </button>
      <span className="announcement-timer" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
}
