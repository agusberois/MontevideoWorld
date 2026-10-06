"use client";

import { useEffect, useState } from "react";
import { BarraInvitedMessage, nameKey } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { gameStore } from "@/lib/gameStore";
import { CityRoom, sendBarraRespond } from "@/lib/network";
import { moduleClasses } from "@/lib/cx";
import styles from "./barras.module.css";

const cx = moduleClasses(styles);

/**
 * Invitaciones a una barra ("Juan te invita a [LCDP] La Barra del Pancho"): Entrar / No. Se van solas
 * al vencer. Las de un jugador bloqueado no se muestran (como las de los gestos de a dos).
 */
export function BarraInvites({ room }: { room: CityRoom }) {
  const [invites, setInvites] = useState<BarraInvitedMessage[]>([]);

  useEffect(() => {
    const timers = new Set<number>();
    const off = eventBus.on("barra:invited", (invite) => {
      if (gameStore.getState().blocked.includes(nameKey(invite.fromName))) return;
      setInvites((list) => [...list.filter((other) => other.barraId !== invite.barraId), invite]);
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setInvites((list) => list.filter((other) => other !== invite));
      }, invite.expiresInMs);
      timers.add(timer);
    });
    return () => {
      off();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  if (invites.length === 0) return null;

  const respond = (invite: BarraInvitedMessage, accept: boolean) => {
    sendBarraRespond(room, invite.barraId, accept);
    setInvites((list) => list.filter((other) => other !== invite));
  };

  return (
    <div className={cx("barra-invites")} role="region" aria-label="Invitaciones a barras">
      {invites.map((invite) => (
        <div key={invite.barraId} className={cx("barra-invite")} role="alertdialog" aria-label={`${invite.fromName} te invita a su barra`}>
          <p>
            🚩 <strong>{invite.fromName}</strong> te invita a{" "}
            <span className={cx("barra-preview-tag")} style={{ background: invite.color }}>
              {invite.tag}
            </span>{" "}
            <strong>{invite.name}</strong>
          </p>
          <div className={cx("barra-invite-actions")}>
            <button type="button" className={cx("primary")} onClick={() => respond(invite, true)}>
              Entrar
            </button>
            <button type="button" onClick={() => respond(invite, false)}>
              No, gracias
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
