import type { Landmark, LandmarkKind } from "@montevideo-world/shared";
import { casasReus } from "./barrioDeLosJudios/casasReus";
import { eac } from "./barrioDeLosJudios/eac";
import { sanPancracio } from "./barrioDeLosJudios/sanPancracio";
import { mercadoAgricola } from "./barrioDeLosJudios/mercadoAgricola";
import { artDeco } from "./centro/artDeco";
import { columnaDeLaPaz } from "./centro/columnaDeLaPaz";
import { david } from "./centro/david";
import { entrevero } from "./centro/entrevero";
import { lapido } from "./centro/lapido";
import { londonParis } from "./centro/londonParis";
import { nike } from "./centro/nike";
import { palacioDiaz } from "./centro/palacioDiaz";
import { palacioPiria } from "./centro/palacioPiria";
import { palacioSantos } from "./centro/palacioSantos";
import { palacioMunicipal } from "./centro/palacioMunicipal";
import { salaZitarrosa } from "./centro/salaZitarrosa";
import { cabildo } from "./ciudadVieja/cabildo";
import { catedral } from "./ciudadVieja/catedral";
import { farola } from "./ciudadVieja/farola";
import { fuente } from "./ciudadVieja/fuente";
import { mercado } from "./ciudadVieja/mercado";
import { monumentoArtigas } from "./ciudadVieja/monumentoArtigas";
import { palacioSalvo } from "./ciudadVieja/palacioSalvo";
import { puertaCiudadela } from "./ciudadVieja/puertaCiudadela";
import { teatroSolis } from "./ciudadVieja/teatroSolis";
import { termas } from "./ciudadVieja/termas";
import { casino } from "./ciudadVieja/casino";
import { blackjackTable, rouletteTable, slotMachine } from "./casino/juegos";
import { torreEjecutiva } from "./ciudadVieja/torreEjecutiva";
import { palacio } from "./ciudadVieja/palacio";
import { flowers, lamp, planta, pottedPalm } from "./termas/planta";
import { garita } from "./comcar/garita";
import { pabellon } from "./comcar/pabellon";
import { estadioCentenario } from "./tresCruces/estadioCentenario";
import { obelisco } from "./tresCruces/obelisco";
import { sanatorio } from "./tresCruces/sanatorio";
import { shopping } from "./tresCruces/shopping";
import { velodromo } from "./tresCruces/velodromo";
import type { LandmarkDrawing, PlacedPiece, RoofSpot } from "./types";

/**
 * Edificios emblemáticos dibujados con primitivas: un archivo por edificio en la carpeta de su
 * barrio. Cada uno se expresa en coordenadas locales: el área de w × h tiles va de (-0.5, -0.5) a
 * (w - 0.5, h - 0.5).
 *
 * Las áreas de un solo volumen son cuadradas a propósito: así un único valor de profundidad
 * ordena bien al edificio contra los avatares que pasan por delante y por detrás. Las áreas
 * alargadas (la Puerta de la Ciudadela) se dibujan como varias piezas de 1 × 1.
 *
 * Un `LandmarkKind` nuevo no compila hasta tener su dibujo acá.
 */
const LANDMARKS: Record<LandmarkKind, LandmarkDrawing> = {
  // Ciudad Vieja
  palacioSalvo,
  theater: teatroSolis,
  cathedral: catedral,
  cabildo,
  market: mercado,
  equestrianMonument: monumentoArtigas,
  fountain: fuente,
  lighthouse: farola,
  gate: puertaCiudadela,
  // Centro (18 de Julio): cada edificio con su dibujo, como es en la realidad.
  artDeco,
  modernTower: lapido,
  decoTower: palacioDiaz,
  italianPalace: palacioSantos,
  frenchPalace: palacioPiria,
  victoryStatue: nike,
  departmentStore: londonParis,
  entrevero,
  peaceColumn: columnaDeLaPaz,
  cinema: salaZitarrosa,
  cityHall: palacioMunicipal,
  statue: david,
  // Tres Cruces y Parque Batlle
  shopping,
  hospital: sanatorio,
  obelisk: obelisco,
  velodrome: velodromo,
  stadium: estadioCentenario,
  // COMCAR
  cellBlock: pabellon,
  watchtower: garita,
  // Barrio de los Judíos (Villa Muñoz)
  reusHouses: casasReus,
  agriMarket: mercadoAgricola,
  church: sanPancracio,
  artCenter: eac,
  // Termas del Donador (el edificio de Ciudad Vieja y las plantas de adentro)
  termas,
  executiveTower: torreEjecutiva,
  palace: palacio,
  plant: planta,
  pottedPalm,
  flowers,
  lamp,
  casino,
  slotMachine,
  rouletteTable,
  blackjackTable,
};

export type { PlacedPiece, RoofSpot };

export function landmarkPieces(landmark: Landmark): PlacedPiece[] {
  const drawing = LANDMARKS[landmark.kind];
  if ("pieces" in drawing) return drawing.pieces(landmark);
  const { area } = landmark;
  const { size, maxZ, draw } = drawing;
  return [
    {
      tile: { x: area.x, y: area.y },
      spec: { key: `landmark-${landmark.id}`, width: size, height: size, maxZ, draw, scale: area.width / size },
    },
  ];
}

/** Dónde va el cartel "MW" sobre el techo de este tipo de edificio, si puede llevarlo. */
export function roofSpot(kind: LandmarkKind): RoofSpot | undefined {
  return LANDMARKS[kind].roof;
}
