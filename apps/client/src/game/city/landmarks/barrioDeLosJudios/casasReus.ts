import type { Landmark } from "@montevideo-world/shared";
import { shade } from "../../../color";
import { tileHash } from "../../buildings";
import { IsoPainter, boxColors } from "../../IsoPainter";
import { IRON, WINDOW, WOOD, facesOf } from "../common";
import type { LandmarkDrawing, PlacedPiece } from "../types";

/**
 * Casas de Reus al Norte: hilera de casas de dos pisos en colores pastel, con cornisa y pretil
 * blancos, balcón de hierro arriba y puerta alta abajo. Una casa por tile (el área es una fila
 * alargada junto a la peatonal Emilio Reus): el color sale del tile, igual en todos los clientes.
 */

/** Rosado, menta, amarillo, celeste, lila, durazno y verde agua. */
const PASTELS = [0xf7c8d0, 0xbfe3d0, 0xfbe3a6, 0xc8d8f2, 0xe4cdf0, 0xf9d2b0, 0xb8e2e0];
const CORNICE = 0xf6f2ea;
const HEIGHT = 50;

function housePieces(landmark: Landmark): PlacedPiece[] {
  const { area } = landmark;
  const pieces: PlacedPiece[] = [];
  for (let y = area.y; y < area.y + area.height; y++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      const color = tileHash(x, y, 7) % PASTELS.length;
      pieces.push({ tile: { x, y }, spec: { key: `reus-house-${color}`, width: 1, height: 1, maxZ: HEIGHT + 6, draw: (p) => drawHouse(p, PASTELS[color]) } });
    }
  }
  return pieces;
}

function drawHouse(p: IsoPainter, facade: number) {
  p.box(-0.48, -0.5, 0.48, 0.5, 0, HEIGHT, boxColors(facade, shade(facade, -20)));
  for (const face of facesOf(0.48, 0.5)) {
    const [u0, u1] = face.side === "south" ? [-0.48, 0.48] : [-0.5, 0.5];
    // Zócalo, faja entre pisos, cornisa y pretil blancos.
    p.faceRect(face, u0, u1, 0, 3, shade(facade, -30));
    p.faceRect(face, u0, u1, 23, 25, CORNICE);
    p.faceRect(face, u0, u1, HEIGHT - 6, HEIGHT, CORNICE);
    // Planta baja: puerta alta de madera y una ventana con reja; arriba, dos ventanas con balcón.
    p.faceArch(face, u0 + 0.12, u0 + 0.36, 0, 20, WOOD);
    p.windows(face, u0 + 0.5, u1 - 0.08, 5, 21, 1, 1, { color: WINDOW, widthRatio: 0.7, heightRatio: 0.75, balcony: IRON });
    p.windows(face, u0 + 0.04, u1 - 0.04, 26, 43, 2, 1, { color: WINDOW, widthRatio: 0.45, heightRatio: 0.8, balcony: IRON });
  }
}

/** Varias piezas de 1 × 1: el área es alargada (ver `landmarkPieces`). */
export const casasReus: LandmarkDrawing = { pieces: housePieces };
