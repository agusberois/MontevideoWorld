import type { ClothingOf, SlotStyle } from "@montevideo-world/shared";
import { shade } from "../../color";
import { Graphics, OUTLINE, OUTLINE_ALPHA, itemColor } from "./body";

/** Dibuja el calzado al pie de la pierna (la punta mira a +x). `skin` por si deja el pie a la vista. */
type ShoesDrawer = (g: Graphics, color: number, skin: number) => void;

/** Zapato cerrado desde `top` hasta el piso (y = 30), con la suela de `sole`. */
function closedShoe(g: Graphics, color: number, top: number, sole: number) {
  g.fillStyle(color, 1);
  g.fillRoundedRect(-4, top, 10, 30 - top, 3);
  g.fillStyle(sole, 1);
  g.fillRect(-4, 28.5, 10, 1.5);
  g.lineStyle(1.5, OUTLINE, OUTLINE_ALPHA);
  g.strokeRoundedRect(-4, top, 10, 30 - top, 3);
}

const SHOES: Record<SlotStyle<"shoes">, ShoesDrawer> = {
  // Suela blanca; si el champión ya es blanco, gris para que se note.
  sneakers: (g, color) => closedShoe(g, color, 24, color > 0xe0e0e0 ? 0xbdbdbd : 0xf4f4f4),
  boots: (g, color) => closedShoe(g, color, 18, 0x2a1d14),
  flipflops: (g, color, skin) => {
    // Pie a la vista sobre una suela finita, con la tira en V.
    g.fillStyle(shade(color, -20), 1);
    g.fillEllipse(1.5, 29, 11, 3.5);
    g.fillStyle(skin, 1);
    g.fillEllipse(1, 27, 9, 4.5);
    g.lineStyle(1.5, color, 1);
    g.lineBetween(-2, 25.5, 2, 27.5);
    g.lineBetween(2, 27.5, 5, 25.5);
  },
};

export function drawShoes(g: Graphics, shoes: ClothingOf<"shoes"> | undefined, skin: number) {
  if (shoes) {
    SHOES[shoes.style](g, itemColor(shoes), skin);
    return;
  }
  // Descalzo.
  g.fillStyle(skin, 1);
  g.fillEllipse(1, 27.5, 9, 5);
  g.lineStyle(1, OUTLINE, OUTLINE_ALPHA);
  g.strokeEllipse(1, 27.5, 9, 5);
}
