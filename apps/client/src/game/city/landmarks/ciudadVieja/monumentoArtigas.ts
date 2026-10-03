import type * as Phaser from "phaser";
import { shade } from "../../../color";
import { IsoPainter, Vec2, boxColors } from "../../IsoPainter";
import type { LandmarkDrawing } from "../types";

/** Monumento a Artigas: pedestal de granito y estatua ecuestre de bronce. */

function drawMonumentoArtigas(p: IsoPainter) {
  const granite = 0x8e9296;
  const bronze = 0x3f4d3c;
  const highlight = 0x5f7356;

  p.box(-0.45, -0.45, 1.45, 1.45, 0, 6, boxColors(0xb0b3b6));
  p.box(-0.1, -0.1, 1.1, 1.1, 6, 50, boxColors(granite));
  p.faceRect({ side: "south", y: 1.1 }, 0.2, 0.8, 22, 34, 0x8a6d3b);
  p.box(-0.15, -0.15, 1.15, 1.15, 50, 54, boxColors(shade(granite, 12)));

  drawEquestrianStatue(p.g, p.p(0.5, 0.5, 54), bronze, highlight);
}

type Pt = readonly [number, number];

/**
 * Estatua ecuestre de perfil, mirando a la derecha, con los cascos en `base` (arriba del pedestal).
 * Coordenadas en px relativas a `base` (y negativa = hacia arriba). El caballo va al paso, con la
 * mano cercana levantada como en la estatua real; las patas del lado lejano van más oscuras para
 * dar profundidad, y el lomo y el cuello llevan el brillo del bronce.
 */
function drawEquestrianStatue(g: Phaser.GameObjects.Graphics, base: Vec2, bronze: number, highlight: number) {
  const at = ([x, y]: Pt): Vec2 => ({ x: base.x + x, y: base.y + y });
  const poly = (points: readonly Pt[], color: number) => {
    g.fillStyle(color, 1);
    g.fillPoints(points.map(at), true);
  };
  /** Pata articulada: tramos gruesos con las articulaciones redondeadas y el casco abajo. */
  const leg = (joints: readonly Pt[], widths: readonly number[], color: number) => {
    for (let i = 0; i < joints.length - 1; i++) {
      const a = at(joints[i]);
      const b = at(joints[i + 1]);
      g.lineStyle(widths[i], color, 1);
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.fillStyle(color, 1);
      g.fillCircle(b.x, b.y, widths[i] / 2);
    }
    const hoof = at(joints[joints.length - 1]);
    g.fillStyle(shade(color, -25), 1);
    g.fillRect(hoof.x - 1.6, hoof.y - 1.6, 3.4, 2);
  };
  const far = shade(bronze, -22);
  const dark = shade(bronze, -14);

  // Lado lejano: cola y patas de atrás del cuerpo.
  poly(
    [
      [-15, -22],
      [-19, -20.5],
      [-21.5, -14],
      [-20.5, -6],
      [-18.5, -7.5],
      [-18.5, -13.5],
      [-16.5, -18],
    ],
    dark,
  );
  leg([[-10.5, -16], [-13.5, -8], [-12.5, -2.2], [-12.2, 0]], [5, 2.6, 2.2], far);
  leg([[9.5, -16], [10.5, -7.5], [10.6, -2.2], [11, 0]], [4.4, 2.4, 2.1], far);

  // Cuerpo: pecho, panza, flanco, ancas y grupa.
  poly(
    [
      [12.5, -23],
      [15, -19.5],
      [14.5, -15.5],
      [10.5, -12.5],
      [2, -11.5],
      [-6, -12],
      [-11, -13.5],
      [-15, -16.5],
      [-16.5, -20.5],
      [-14, -24.5],
      [-8, -24],
      [-1, -23],
      [6, -23.6],
      [9, -24.5],
    ],
    bronze,
  );
  // Cuello arqueado hasta la nuca.
  poly(
    [
      [6.5, -23.5],
      [8.5, -29],
      [11.5, -33.5],
      [14.8, -36.5],
      [18, -34.5],
      [18.2, -31],
      [16.5, -26],
      [15, -20],
    ],
    bronze,
  );
  // Cabeza inclinada hacia adelante, con el hocico abajo.
  poly(
    [
      [14.6, -37],
      [17.8, -37],
      [21.5, -33],
      [24.6, -29.5],
      [24.8, -27.6],
      [22.8, -26.6],
      [20, -28],
      [17.2, -31],
      [15, -33],
    ],
    bronze,
  );
  poly(
    [
      [15.4, -36.8],
      [16, -40.6],
      [17.4, -37],
    ],
    bronze,
  );
  // Crin sobre el cuello, ollar y ojo.
  poly(
    [
      [6, -24],
      [7.6, -29.8],
      [10.8, -34.6],
      [14.6, -38],
      [13.2, -34.2],
      [10.2, -30],
      [8.6, -25.2],
    ],
    dark,
  );
  g.fillStyle(far, 1);
  g.fillCircle(at([23.4, -28.6]).x, at([23.4, -28.6]).y, 0.8);
  g.fillCircle(at([18.8, -33.6]).x, at([18.8, -33.6]).y, 0.9);

  // Lado cercano: patas delante del cuerpo (la de adelante levantada, al paso).
  leg([[-8, -15.5], [-10.5, -7.5], [-8.6, -2.2], [-8.2, 0]], [5.4, 2.8, 2.3], bronze);
  leg([[12, -16.5], [16, -10.2], [14.4, -5.2], [15.4, -3.6]], [4.6, 2.6, 2.2], bronze);

  // Brillo del bronce sobre el lomo, la grupa y la cresta del cuello.
  g.lineStyle(1.3, highlight, 1);
  g.strokePoints(
    [at([-15, -22.5]), at([-12.5, -24.2]), at([-6, -23.4]), at([1, -22.6]), at([7, -23.4])],
    false,
  );
  g.strokePoints([at([9, -27.6]), at([11.6, -32]), at([14.4, -35])], false);
  g.fillStyle(highlight, 1);
  g.fillEllipse(at([-11, -19]).x, at([-11, -19]).y, 5, 3);

  // Jinete: poncho al viento, torso erguido, pierna sobre el flanco, brazo con las riendas.
  poly(
    [
      [-1.5, -33.5],
      [-6.5, -26],
      [-5, -21.5],
      [-0.5, -23.5],
    ],
    dark,
  );
  poly(
    [
      [-2, -23.5],
      [4, -23.5],
      [3.6, -33],
      [-1.2, -33.4],
    ],
    bronze,
  );
  leg([[1.5, -23.5], [5.5, -19.5], [4.6, -13.6]], [3.4, 2.4], bronze);
  leg([[2.8, -31], [6.6, -27.8], [9, -26]], [2.2, 1.8], bronze);
  g.lineStyle(0.8, far, 1);
  g.lineBetween(at([9, -26]).x, at([9, -26]).y, at([22.5, -28]).x, at([22.5, -28]).y);
  // Cabeza con sombrero de ala.
  g.fillStyle(bronze, 1);
  g.fillRect(at([0, -35.4]).x, at([0, -35.4]).y, 2.4, 2.4);
  g.fillCircle(at([1.2, -37.4]).x, at([1.2, -37.4]).y, 3);
  g.fillStyle(dark, 1);
  g.fillEllipse(at([1.2, -39.6]).x, at([1.2, -39.6]).y, 10, 2.4);
  g.fillRoundedRect(at([-1.4, -43]).x, at([-1.4, -43]).y, 5.2, 3.6, 1.2);
  g.fillStyle(highlight, 1);
  g.fillRect(at([-1, -32.6]).x, at([-1, -32.6]).y, 1.4, 8);
}

export const monumentoArtigas: LandmarkDrawing = {
  size: 2,
  maxZ: 100,
  draw: drawMonumentoArtigas,
};
