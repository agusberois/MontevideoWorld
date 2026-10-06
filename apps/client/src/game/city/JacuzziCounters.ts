import * as Phaser from "phaser";
import { JACUZZI_CAPACITY, type CityMap, type Jacuzzi } from "@montevideo-world/shared";
import { isoPoint } from "../iso";
import { NIGHT_DEPTH } from "./DayNight";

/**
 * Arriba de cada jacuzzi (el Hotel del Donador), cuántos hay metidos: "x/20" (`JACUZZI_CAPACITY`).
 * Sale del Schema (los jugadores con `bathing` en su área); va por encima del velo de la noche.
 */
export class JacuzziCounters {
  private readonly counters: Array<{ jacuzzi: Jacuzzi; text: Phaser.GameObjects.Text; inside: number }>;

  constructor(scene: Phaser.Scene, private readonly map: CityMap) {
    this.counters = (map.city.jacuzzis ?? []).map((jacuzzi) => {
      // La punta de arriba del jacuzzi en pantalla (la esquina norte del área), un poco más alto.
      const point = isoPoint(jacuzzi.area.x - 0.5, jacuzzi.area.y - 0.5, 18);
      const text = scene.add
        .text(point.x, point.y, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#ffffff",
          backgroundColor: "#1b4d6bcc",
          padding: { x: 6, y: 2 },
        })
        .setOrigin(0.5, 1)
        .setDepth(NIGHT_DEPTH + 2);
      return { jacuzzi, text, inside: -1 };
    });
  }

  /** Cuenta los metidos en cada jacuzzi y cambia el texto sólo si cambió. */
  update(players: Iterable<{ x: number; y: number; bathing: boolean }>) {
    if (this.counters.length === 0) return;
    const inside = new Map<Jacuzzi, number>();
    for (const player of players) {
      if (!player.bathing) continue;
      const jacuzzi = this.map.jacuzziAt(player.x, player.y);
      if (jacuzzi) inside.set(jacuzzi, (inside.get(jacuzzi) ?? 0) + 1);
    }
    for (const counter of this.counters) {
      const count = inside.get(counter.jacuzzi) ?? 0;
      if (count === counter.inside) continue;
      counter.inside = count;
      counter.text.setText(`${count}/${JACUZZI_CAPACITY}`);
      counter.text.setBackgroundColor(count >= JACUZZI_CAPACITY ? "#8b1e1ecc" : "#1b4d6bcc");
    }
  }
}
