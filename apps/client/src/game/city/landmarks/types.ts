import type { Landmark, TilePoint } from "@montevideo-world/shared";
import type { PieceSpec } from "../buildings";
import type { IsoPainter } from "../IsoPainter";

export interface PlacedPiece {
  /** Tile ancla de la pieza en el mapa. */
  tile: TilePoint;
  spec: PieceSpec;
}

/**
 * Punto del techo (en coordenadas del dibujo base, antes de escalar) donde puede ir el cartel "MW"
 * (`CityDefinition.logoSign`). Elegido para no chocar con torres ni cúpulas.
 */
export interface RoofSpot {
  u: number;
  v: number;
  z: number;
}

/** Cómo se dibuja un tipo de edificio emblemático (`LandmarkKind`). */
export type LandmarkDrawing =
  | {
      /**
       * El dibujo está escrito para un área cuadrada de `size` tiles; si el área real es más grande
       * se escala al hornear (más ancho y más alto en la misma proporción).
       */
      size: number;
      /** Altura máxima del dibujo base (px), para el tamaño de la textura. */
      maxZ: number;
      draw: (p: IsoPainter) => void;
      roof?: RoofSpot;
    }
  | {
      /** Áreas alargadas: se arman con varias piezas (p. ej. de 1 × 1). */
      pieces: (landmark: Landmark) => PlacedPiece[];
      roof?: RoofSpot;
    };
