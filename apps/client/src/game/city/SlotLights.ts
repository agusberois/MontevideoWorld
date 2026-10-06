import * as Phaser from "phaser";
import type { CityMap } from "@montevideo-world/shared";
import { isoPoint } from "../iso";
import { NIGHT_DEPTH } from "./DayNight";

/**
 * Las lamparitas de arriba de cada tragamonedas titilando, cada máquina a su ritmo (en un interior
 * `InteriorStyle.nightclub`: el casino). Van por encima del velo de la noche, así brillan.
 */

const COLORS = [0xff3d7f, 0x3de0ff, 0xb06bff, 0xffd166] as const;
const BLINK_MS = 220;

export class SlotLights {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly slots: Array<{ x: number; y: number }>;
  private time = 0;
  private lastStep = -1;

  constructor(scene: Phaser.Scene, map: CityMap) {
    this.graphics = scene.add.graphics().setDepth(NIGHT_DEPTH + 2).setBlendMode(Phaser.BlendModes.ADD);
    this.slots = map.city.landmarks.filter((landmark) => landmark.kind === "slotMachine").map(({ area }) => ({ x: area.x, y: area.y }));
  }

  tick(delta: number) {
    this.time += delta;
    const step = Math.floor(this.time / BLINK_MS);
    // Sólo cambia cada `BLINK_MS`: no hace falta redibujar en cada frame.
    if (step === this.lastStep) return;
    this.lastStep = step;
    const g = this.graphics.clear();
    for (const [index, slot] of this.slots.entries()) {
      for (let k = 0; k < 3; k++) {
        const p = isoPoint(slot.x - 0.15 + k * 0.15, slot.y + 0.28, 54);
        const on = (step + index + k) % 3 !== 0;
        g.fillStyle(COLORS[(step + k + index) % COLORS.length], on ? 0.9 : 0.15);
        g.fillCircle(p.x, p.y, on ? 3 : 2);
      }
    }
  }
}
