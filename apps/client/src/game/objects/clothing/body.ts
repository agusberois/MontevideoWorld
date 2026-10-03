import * as Phaser from "phaser";
import type { ClothingItem } from "@montevideo-world/shared";

/** Geometría del cuerpo (px, origen en los pies). La comparten el avatar y la ropa. */
export const HEAD_Y = -69;
export const HEAD_R = 10.5;
export const HIP_Y = -30;
export const SHOULDER_Y = -55;

export const OUTLINE = 0x000000;
export const OUTLINE_ALPHA = 0.28;
export const UNDERWEAR_COLOR = 0xe4e1da;

export type Graphics = Phaser.GameObjects.Graphics;

export function itemColor(item: ClothingItem): number {
  return Phaser.Display.Color.HexStringToColor(item.color).color;
}

/** Medio círculo superior del pelo (de oreja a oreja pasando por la coronilla). */
export function hairCap(g: Graphics, radius: number) {
  g.beginPath();
  g.arc(0, HEAD_Y, radius, Math.PI, Math.PI * 2, false);
}
