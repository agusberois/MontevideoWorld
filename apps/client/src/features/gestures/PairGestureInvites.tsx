"use client";

import { useEffect, useState } from "react";
import { GesturePairInviteMessage, PAIR_GESTURES, nameKey } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { gameStore } from "@/lib/gameStore";
import { CityRoom, sendPairGestureRespond } from "@/lib/network";
import { moduleClasses } from "@/lib/cx";
import styles from "./gestures.module.css";

const cx = moduleClasses(styles);

/**
 * Invitaciones a un gesto de a dos ("Juan te quiere dar un abrazo"): Dale / No. Se van solas al
 * vencer. Las de un jugador bloqueado no se muestran (el bloqueo es sólo del navegador).
 */
export function PairGestureInvites({ room }: { room: CityRoom }) {
  const [invites, setInvites] = useState<GesturePairInviteMessage[]>([]);

  useEffect(() => {
    const timers = new Set<number>();
    const off = eventBus.on("gesture:invite", (invite) => {
      if (gameStore.getState().blocked.includes(nameKey(invite.fromName))) return;
      setInvites((list) => [...list.filter((other) => other.fromId !== invite.fromId), invite]);
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

  const respond = (invite: GesturePairInviteMessage, accept: boolean) => {
    sendPairGestureRespond(room, invite.fromId, accept);
    setInvites((list) => list.filter((other) => other !== invite));
  };

  return (
    <div className={cx("pair-invites")} role="region" aria-label="Invitaciones a gestos">
      {invites.map((invite) => {
        const gesture = PAIR_GESTURES[invite.gesture];
        return (
          <div key={invite.fromId} className={cx("pair-invite")} role="alertdialog" aria-label={`${invite.fromName} ${gesture.invite}`}>
            <p>
              {gesture.cry} <strong>{invite.fromName}</strong> {gesture.invite}
            </p>
            <div className={cx("pair-invite-actions")}>
              <button type="button" className={cx("primary")} onClick={() => respond(invite, true)}>
                Dale
              </button>
              <button type="button" onClick={() => respond(invite, false)}>
                No, gracias
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
