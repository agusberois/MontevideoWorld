"use client";

import { useGame } from "@/lib/gameStore";
import { CityRoom, sendUnfollow } from "@/lib/network";
import { moduleClasses } from "@/lib/cx";
import styles from "./FollowBadge.module.css";

const cx = moduleClasses(styles);

/** Cartel "👣 Siguiendo a X" mientras el avatar propio sigue a alguien, con el botón para dejar. */
export function FollowBadge({ room }: { room: CityRoom }) {
  const following = useGame((state) => state.following);
  if (!following) return null;
  return (
    <div className={cx("follow-badge")} role="status">
      <span>
        👣 Siguiendo a <strong>{following.name}</strong>
      </span>
      <button type="button" onClick={() => sendUnfollow(room)}>
        Dejar
      </button>
    </div>
  );
}
