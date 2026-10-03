import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { DARK_OPENING, WINDOW, WOOD, facesOf } from "../common";
import type { LandmarkDrawing } from "../types";

/** Catedral Metropolitana: nave con cúpula y dos torres campanario mirando a la Plaza Matriz (este). */

function drawCatedral(p: IsoPainter) {
  const brick = 0xd8b49a;
  const trim = 0xefe2cf;
  const tile = 0x5f9ea0;
  const towerA = { y0: -0.5, y1: 0.3 };
  const towerB = { y0: 1.7, y1: 2.5 };

  // Nave lateral norte (atrás).
  p.box(-0.5, -0.35, 1.7, 0.3, 0, 40, boxColors(brick));
  drawBellTower(p, towerA.y0, towerA.y1, brick, trim, tile);

  // Nave central, cúpula sobre el crucero y fachada con frontón.
  p.box(-0.5, 0.3, 2.35, 1.7, 0, 66, boxColors(brick));
  p.windows({ side: "south", y: 1.7 }, -0.4, 1.6, 22, 60, 3, 1, { color: WINDOW, arched: true, widthRatio: 0.35 });
  p.box(0.25, 0.65, 1.05, 1.35, 66, 84, boxColors(trim));
  p.windows({ side: "south", y: 1.35 }, 0.3, 1.0, 70, 82, 2, 1, { color: WINDOW, arched: true, widthRatio: 0.4 });
  p.dome(0.65, 1.0, 84, 17, tile);
  p.spire(0.65, 1.0, 100, 112, 0xd9c48a, 1.5);

  const facade: Face = { side: "east", x: 2.35 };
  p.faceArch(facade, 0.75, 1.25, 0, 32, WOOD);
  p.faceRect(facade, 0.3, 1.7, 36, 39, trim);
  const rose = p.facePoint(facade, 1.0, 50);
  p.g.fillStyle(trim, 1);
  p.g.fillEllipse(rose.x, rose.y, 14, 12);
  p.g.fillStyle(WINDOW, 1);
  p.g.fillEllipse(rose.x, rose.y, 9, 8);
  p.facePoly(
    facade,
    [
      [0.3, 66],
      [1.7, 66],
      [1.0, 88],
    ],
    trim,
  );
  const cross = p.facePoint(facade, 1.0, 88);
  p.line(cross, { x: cross.x, y: cross.y - 10 }, 0xd9c48a, 1.5);
  p.line({ x: cross.x - 3, y: cross.y - 7 }, { x: cross.x + 3, y: cross.y - 7 }, 0xd9c48a, 1.5);

  // Nave lateral sur (adelante) y torre sur.
  p.box(-0.5, 1.7, 1.7, 2.35, 0, 40, boxColors(brick));
  p.windows({ side: "south", y: 2.35 }, -0.4, 1.6, 8, 36, 3, 1, { color: WINDOW, arched: true, widthRatio: 0.3 });
  drawBellTower(p, towerB.y0, towerB.y1, brick, trim, tile);
}

function drawBellTower(p: IsoPainter, y0: number, y1: number, brick: number, trim: number, tile: number) {
  const x0 = 1.7;
  const x1 = 2.5;
  p.box(x0, y0, x1, y1, 0, 112, boxColors(brick));
  for (const face of facesOf(x1, y1)) {
    const [u0, u1] = face.side === "south" ? [x0, x1] : [y0, y1];
    p.windows(face, u0, u1, 40, 70, 1, 1, { color: WINDOW, arched: true, widthRatio: 0.3 });
    p.windows(face, u0, u1, 82, 108, 1, 1, { color: DARK_OPENING, arched: true, widthRatio: 0.5, heightRatio: 0.8 });
    p.faceRect(face, u0, u1, 76, 79, trim);
  }
  p.box(x0 - 0.03, y0 - 0.03, x1, y1, 112, 117, boxColors(trim));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  p.dome(cx, cy, 117, 12, tile);
  p.spire(cx, cy, 128, 140, 0xd9c48a, 1.5);
}

export const catedral: LandmarkDrawing = {
  size: 3,
  maxZ: 150,
  draw: drawCatedral,
};
