"use client";

import { useEffect, useState } from "react";
import { eventBus } from "@/lib/eventBus";

/** Lo que dura la pantalla negra del desmayo (si después viaja, debajo ya está la ambulancia). */
const FAINT_MS = 3200;

/**
 * Desmayo (salud en 0): la pantalla se pone negra con el texto del server ("Te desmayaste… la
 * ambulancia te cobró $X") y se va aclarando. Si hay que viajar al sanatorio, debajo ya está la
 * pantalla de la ambulancia (`TravelOverlay`).
 */
export function FaintOverlay() {
  const [faint, setFaint] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => eventBus.on("faint", ({ text }) => setFaint({ id: Date.now(), text })), []);

  useEffect(() => {
    if (!faint) return;
    const timer = window.setTimeout(() => setFaint(null), FAINT_MS);
    return () => window.clearTimeout(timer);
  }, [faint]);

  if (!faint) return null;
  return (
    <div key={faint.id} className="faint-overlay" role="alert" style={{ animationDuration: `${FAINT_MS}ms` }}>
      <p>
        <span aria-hidden="true">💫</span> {faint.text}
      </p>
    </div>
  );
}
