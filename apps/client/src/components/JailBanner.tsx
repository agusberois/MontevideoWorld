"use client";

import { formatJailLeft } from "@montevideo-world/shared";
import { useGame } from "@/lib/gameStore";

/** Cartel fijo mientras estás preso en el COMCAR (`/ban`): cuánto te queda. Al cumplir, te llevan solo. */
export function JailBanner() {
  const jailLeft = useGame((state) => state.jailLeft);
  if (jailLeft <= 0) return null;
  return (
    <div className="jail-banner" role="status">
      <span className="jail-banner-icon" aria-hidden="true">
        🚔
      </span>
      <p>
        <strong>Estás preso en el COMCAR.</strong> Te quedan <span className="jail-banner-time">{formatJailLeft(jailLeft)}</span>.
        Al cumplir te llevan a Ciudad Vieja.
      </p>
    </div>
  );
}
