import * as Phaser from "phaser";

/** Aclara (amount > 0) u oscurece (amount < 0) un color 0xRRGGBB en puntos porcentuales. */
export function shade(color: number, amount: number): number {
  const c = Phaser.Display.Color.IntegerToColor(color);
  return (amount < 0 ? c.darken(-amount) : c.lighten(amount)).color;
}
