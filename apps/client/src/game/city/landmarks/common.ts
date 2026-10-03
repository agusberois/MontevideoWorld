import { Face, IsoPainter } from "../IsoPainter";

/** Lo que usan edificios de varios barrios: colores de aberturas y materiales, caras y la bandera. */

export const WINDOW = 0x2f3946;
export const DARK_OPENING = 0x2a2420;
export const WOOD = 0x4a3426;
export const IRON = 0x1f1f22;

/** Caras visibles (sur y este) de un volumen cuyo borde sureste está en (x1, y1). */
export function facesOf(x1: number, y1: number): Face[] {
  return [
    { side: "south", y: y1 },
    { side: "east", x: x1 },
  ];
}

/** Mástil con la bandera uruguaya: nueve franjas resumidas en blanco/azul y el Sol de Mayo. */
export function drawUruguayFlag(p: IsoPainter, x: number, y: number, z: number) {
  p.spire(x, y, z, z + 24, 0x5b5b60, 1.5);
  const top = p.p(x, y, z + 24);
  const g = p.g;
  g.fillStyle(0xffffff, 1);
  g.fillRect(top.x, top.y, 16, 10);
  g.fillStyle(0x1d4fa0, 1);
  for (const stripe of [1, 3, 5, 7]) g.fillRect(top.x, top.y + stripe * 1.1, 16, 1.1);
  g.fillStyle(0xffffff, 1);
  g.fillRect(top.x, top.y, 6, 5.5);
  g.fillStyle(0xf2b705, 1);
  g.fillCircle(top.x + 3, top.y + 2.75, 1.8);
}
