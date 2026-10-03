import { shade } from "../../../color";
import { Face, IsoPainter, boxColors } from "../../IsoPainter";
import type { Landmark } from "@montevideo-world/shared";
import type { LandmarkDrawing, PlacedPiece } from "../types";

/** Puerta de la Ciudadela: muro norte-sur con el arco sobre el tile caminable de la peatonal. */

const GATE_STONE = 0xbcae94;

function gatePieces(landmark: Landmark): PlacedPiece[] {
  const { area } = landmark;
  const isPassage = (x: number, y: number) => landmark.passable?.some((t) => t.x === x && t.y === y) ?? false;
  const pieces: PlacedPiece[] = [];

  for (let y = area.y; y < area.y + area.height; y++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      const nextToPassage = isPassage(x, y - 1) || isPassage(x, y + 1);
      const role = isPassage(x, y) ? "arch" : nextToPassage ? "pier" : "wall";
      const draw = role === "arch" ? drawGateArch : role === "pier" ? drawGatePier : drawGateWall;
      const maxZ = role === "arch" ? 180 : role === "pier" ? 162 : 104;
      pieces.push({ tile: { x, y }, spec: { key: `gate-${role}`, width: 1, height: 1, maxZ, draw } });
    }
  }
  return pieces;
}

function stoneCourses(p: IsoPainter, face: Face, u0: number, u1: number, z0: number, z1: number) {
  for (let z = z0 + 10; z < z1; z += 10) {
    p.line(p.facePoint(face, u0, z), p.facePoint(face, u1, z), 0x000000, 1, 0.12);
  }
}

function drawGateWall(p: IsoPainter) {
  p.box(-0.3, -0.5, 0.3, 0.5, 0, 90, boxColors(GATE_STONE));
  stoneCourses(p, { side: "east", x: 0.3 }, -0.5, 0.5, 0, 90);
  // Almenas.
  p.box(-0.3, -0.45, 0.3, -0.1, 90, 102, boxColors(GATE_STONE));
  p.box(-0.3, 0.1, 0.3, 0.45, 90, 102, boxColors(GATE_STONE));
}

function drawGatePier(p: IsoPainter) {
  const east: Face = { side: "east", x: 0.38 };
  p.box(-0.38, -0.5, 0.38, 0.5, 0, 150, boxColors(GATE_STONE));
  stoneCourses(p, east, -0.5, 0.5, 0, 150);
  // Pilastras y hornacina.
  p.faceRect(east, -0.36, -0.18, 0, 148, shade(GATE_STONE, 10));
  p.faceRect(east, 0.18, 0.36, 0, 148, shade(GATE_STONE, 10));
  p.faceArch(east, -0.08, 0.08, 64, 100, shade(GATE_STONE, -30));
  p.box(-0.42, -0.5, 0.42, 0.5, 150, 160, boxColors(shade(GATE_STONE, 12)));
}

/** Arco sobre el tile caminable: la luz (hasta z = 110) deja pasar holgado a un avatar. */
function drawGateArch(p: IsoPainter) {
  const east: Face = { side: "east", x: 0.38 };
  p.box(-0.38, -0.5, 0.38, 0.5, 112, 150, boxColors(GATE_STONE));
  stoneCourses(p, east, -0.5, 0.5, 112, 150);

  // Enjutas: la piedra entre el arco de medio punto y el dintel.
  const spandrel: Array<[number, number]> = [[-0.5, 112]];
  for (let i = 0; i <= 12; i++) {
    const u = -0.5 + i / 12;
    spandrel.push([u, 90 + 22 * Math.sqrt(Math.max(0, 1 - (2 * u) ** 2))]);
  }
  spandrel.push([0.5, 112]);
  p.facePoly(east, spandrel, GATE_STONE);
  p.faceRect(east, -0.06, 0.06, 104, 118, shade(GATE_STONE, 18));

  p.box(-0.42, -0.5, 0.42, 0.5, 150, 160, boxColors(shade(GATE_STONE, 12)));
  p.facePoly(
    east,
    [
      [-0.4, 160],
      [0.4, 160],
      [0, 176],
    ],
    GATE_STONE,
  );
}

/** Varias piezas de 1 × 1: el área es alargada (ver `landmarkPieces`). */
export const puertaCiudadela: LandmarkDrawing = { pieces: gatePieces };
