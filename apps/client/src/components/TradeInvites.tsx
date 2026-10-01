"use client";

import { useEffect, useState } from "react";
import type { TradeInviteMessage } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { CityRoom, sendTradeRespond } from "@/lib/network";

interface TradeInvitesProps {
  room: CityRoom;
}

/** Invitaciones a intercambiar que te llegaron: Aceptar / Rechazar. Se van solas cuando vencen. */
export function TradeInvites({ room }: TradeInvitesProps) {
  const [invites, setInvites] = useState<TradeInviteMessage[]>([]);

  useEffect(() => {
    const timers = new Set<number>();
    const offInvite = eventBus.on("trade:invite", (invite) => {
      setInvites((list) => [...list.filter((other) => other.fromId !== invite.fromId), invite]);
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setInvites((list) => list.filter((other) => other !== invite));
      }, invite.expiresInMs);
      timers.add(timer);
    });
    // Arrancó un intercambio: las demás invitaciones ya no se pueden aceptar.
    const offState = eventBus.on("trade:state", () => setInvites([]));
    return () => {
      offInvite();
      offState();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  if (invites.length === 0) return null;

  const respond = (invite: TradeInviteMessage, accept: boolean) => {
    sendTradeRespond(room, invite.fromId, accept);
    setInvites((list) => list.filter((other) => other !== invite));
  };

  return (
    <div className="trade-invites" role="region" aria-label="Invitaciones a intercambiar">
      {invites.map((invite) => (
        <div key={invite.fromId} className="trade-invite" role="alertdialog" aria-label={`Invitación de ${invite.fromName}`}>
          <p>
            🔁 <strong>{invite.fromName}</strong> quiere intercambiar con vos
          </p>
          <div className="trade-invite-actions">
            <button type="button" className="primary" onClick={() => respond(invite, true)}>
              Aceptar
            </button>
            <button type="button" onClick={() => respond(invite, false)}>
              Rechazar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
