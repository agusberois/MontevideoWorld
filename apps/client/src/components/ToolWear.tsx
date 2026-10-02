"use client";

import { ToolItem, usesLabel } from "@montevideo-world/shared";

/**
 * Desgaste de una herramienta (caña, carrito): barrita con los usos que le quedan. Verde nueva,
 * amarilla a la mitad, roja cuando está por romperse.
 */
export function ToolWear({ item, uses }: { item: ToolItem; uses: number }) {
  const ratio = uses / item.maxUses;
  const level = ratio > 0.5 ? "high" : ratio > 0.2 ? "mid" : "low";
  return (
    <span className="tool-wear" title={usesLabel(item, uses)} aria-label={usesLabel(item, uses)}>
      <span className={level} style={{ width: `${Math.max(4, ratio * 100)}%` }} />
    </span>
  );
}
