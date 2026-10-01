"use client";

import { useEffect, useState } from "react";
import { eventBus } from "@/lib/eventBus";

const NOTICE_MS = 4000;

/** Avisos breves del server para este jugador (p. ej. "estás agotado"), arriba al centro. */
export function Notices() {
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    const show = ({ text }: { text: string }) => setNotice({ id: Date.now(), text });
    const offNotice = eventBus.on("notice", show);
    // Cómo terminó un intercambio (hecho, cancelado o el otro se fue).
    const offTrade = eventBus.on("trade:closed", show);
    return () => {
      offNotice();
      offTrade();
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!notice) return null;
  return (
    <p key={notice.id} className="notice" role="status" aria-live="polite">
      {notice.text}
    </p>
  );
}
