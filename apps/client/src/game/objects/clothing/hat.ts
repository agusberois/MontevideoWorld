import type { ClothingOf, SlotStyle } from "@montevideo-world/shared";
import { shade } from "../../color";
import { Graphics, HEAD_R, HEAD_Y, hairCap, itemColor } from "./body";

/** Dibuja el gorro sobre el pelo. `back` = vista de espaldas (sin visera ni detalles de frente). */
type HatDrawer = (g: Graphics, color: number, back: boolean) => void;

const R = HEAD_R;

const HATS: Record<SlotStyle<"hat">, HatDrawer> = {
  cap: (g, color, back) => {
    g.fillStyle(color, 1);
    hairCap(g, R + 1.8);
    g.lineTo(R + 1.8, HEAD_Y - 1);
    g.lineTo(-R - 1.8, HEAD_Y - 1);
    g.closePath();
    g.fillPath();
    if (!back) {
      g.fillStyle(shade(color, -20), 1);
      g.fillEllipse(R + 3, HEAD_Y - 2, 13, 4.5);
    } else {
      g.fillStyle(shade(color, -30), 1);
      g.fillRect(-3, HEAD_Y - 4, 6, 2.5);
    }
    g.fillStyle(shade(color, 20), 1);
    g.fillCircle(0, HEAD_Y - R - 1.5, 1.6);
  },
  beanie: (g, color) => {
    g.fillStyle(color, 1);
    hairCap(g, R + 2.5);
    g.lineTo(R + 2.5, HEAD_Y - 1);
    g.lineTo(-R - 2.5, HEAD_Y - 1);
    g.closePath();
    g.fillPath();
    g.fillStyle(shade(color, -18), 1);
    g.fillRoundedRect(-R - 2.5, HEAD_Y - 5, R * 2 + 5, 5, 2);
    g.fillStyle(shade(color, 25), 1);
    g.fillCircle(0, HEAD_Y - R - 4, 3.5);
  },
  beret: (g, color) => {
    g.fillStyle(color, 1);
    g.fillEllipse(-1, HEAD_Y - R + 1, R * 2 + 8, 9);
    g.fillStyle(shade(color, 18), 1);
    g.fillEllipse(-3, HEAD_Y - R - 0.5, R, 3);
    g.fillStyle(color, 1);
    g.fillRect(-0.75, HEAD_Y - R - 5, 1.5, 3);
  },
};

export function drawHat(g: Graphics, hat: ClothingOf<"hat"> | undefined, back: boolean) {
  if (hat) HATS[hat.style](g, itemColor(hat), back);
}
