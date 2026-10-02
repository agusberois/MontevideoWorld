"use client";

import { useEffect, useState } from "react";
import { BoxOpenedMessage, getItem } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { ItemIcon } from "./ItemIcon";
import { itemRating } from "./itemCategoryUi";

const REVEAL_MS = 3500;

/** Lo que salió de una caja sorpresa: aparece en el medio de la pantalla y se va solo. */
export function BoxReveal() {
  const [reveal, setReveal] = useState<(BoxOpenedMessage & { id: number }) | null>(null);

  useEffect(() => eventBus.on("box:opened", (message) => setReveal({ ...message, id: Date.now() })), []);

  useEffect(() => {
    if (!reveal) return;
    const timer = window.setTimeout(() => setReveal(null), REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [reveal]);

  const prize = reveal ? getItem(reveal.prizeId) : undefined;
  if (!reveal || !prize) return null;
  const rating = itemRating(prize);

  return (
    <div key={reveal.id} className="box-reveal" role="status" aria-live="polite" onClick={() => setReveal(null)}>
      <div className="box-reveal-burst" aria-hidden="true" />
      <ItemIcon item={prize} size={72} />
      <strong>{reveal.text}</strong>
      {rating && <span className="box-reveal-stars">{rating.stars}</span>}
    </div>
  );
}
