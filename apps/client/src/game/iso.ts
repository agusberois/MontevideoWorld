import { TILE_HEIGHT, TILE_WIDTH } from "@montevideo-world/shared";

const HALF_W = TILE_WIDTH / 2;
const HALF_H = TILE_HEIGHT / 2;

/** Centro de un tile (coordenadas de grilla) en coordenadas de mundo (píxeles). */
export function tileToWorld(tileX: number, tileY: number) {
  return {
    x: (tileX - tileY) * HALF_W,
    y: (tileX + tileY) * HALF_H,
  };
}

/** Inversa de tileToWorld: devuelve el tile cuyo rombo contiene el punto. */
export function worldToTile(worldX: number, worldY: number) {
  const fx = (worldX / HALF_W + worldY / HALF_H) / 2;
  const fy = (worldY / HALF_H - worldX / HALF_W) / 2;
  return { x: Math.round(fx), y: Math.round(fy) };
}

/** Vértices del rombo de un tile: arriba, derecha, abajo, izquierda. */
export function tileDiamond(tileX: number, tileY: number) {
  const { x, y } = tileToWorld(tileX, tileY);
  return {
    top: { x, y: y - HALF_H },
    right: { x: x + HALF_W, y },
    bottom: { x, y: y + HALF_H },
    left: { x: x - HALF_W, y },
  };
}

/**
 * Proyección isométrica de un punto continuo del mapa (centro de tile = coordenadas enteras)
 * a una altura `z` en píxeles sobre el piso.
 */
export function isoPoint(tileX: number, tileY: number, z = 0) {
  return {
    x: (tileX - tileY) * HALF_W,
    y: (tileX + tileY) * HALF_H - z,
  };
}
