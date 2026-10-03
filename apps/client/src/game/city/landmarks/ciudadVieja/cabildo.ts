import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import { DARK_OPENING, IRON, WINDOW } from "../common";
import type { LandmarkDrawing } from "../types";

/** Cabildo: edificio colonial blanco de dos plantas con recova y campanario, frente al sur. */

function drawCabildo(p: IsoPainter) {
  const white = 0xf1ede4;
  const trim = 0xd8cfbd;
  const south: Face = { side: "south", y: 2.5 };
  const east: Face = { side: "east", x: 2.5 };

  p.box(-0.5, -0.3, 2.5, 2.5, 0, 62, boxColors(white));
  p.windows(south, -0.4, 2.4, 0, 28, 5, 1, { color: DARK_OPENING, arched: true, widthRatio: 0.62, heightRatio: 0.92 });
  p.windows(south, -0.4, 2.4, 32, 58, 5, 1, { color: WINDOW, widthRatio: 0.32, heightRatio: 0.7, balcony: IRON });
  p.windows(east, -0.2, 2.4, 6, 58, 3, 2, { color: WINDOW, widthRatio: 0.3, heightRatio: 0.6, shutters: 0x3f6b4f });
  p.faceRect(south, -0.5, 2.5, 28, 31, trim);

  p.box(-0.5, -0.3, 2.5, 2.5, 62, 67, boxColors(trim));
  p.facePoly(
    south,
    [
      [0.4, 67],
      [1.6, 67],
      [1.0, 78],
    ],
    white,
  );

  // Campanario central.
  p.box(0.7, 1.6, 1.3, 2.2, 67, 92, boxColors(white));
  p.windows({ side: "south", y: 2.2 }, 0.7, 1.3, 70, 90, 1, 1, { color: DARK_OPENING, arched: true, widthRatio: 0.5 });
  p.windows({ side: "east", x: 1.3 }, 1.6, 2.2, 70, 90, 1, 1, { color: DARK_OPENING, arched: true, widthRatio: 0.5 });
  p.box(0.66, 1.56, 1.34, 2.24, 92, 95, boxColors(trim));
  p.dome(1.0, 1.9, 95, 8, 0xd9cfb8);
}

export const cabildo: LandmarkDrawing = {
  size: 3,
  maxZ: 104,
  draw: drawCabildo,
  // Cartel "MW": parte de atrás del techo plano, detrás del campanario.
  roof: { u: 1.0, v: 0.55, z: 67 },
};
