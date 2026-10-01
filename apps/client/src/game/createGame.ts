import * as Phaser from "phaser";
import type { CityRoom } from "@/lib/network";
import { CityScene } from "./scenes/CityScene";

export function createGame(parent: HTMLElement, room: CityRoom, cityId: string): Phaser.Game {
  // Defensa extra contra canvas duplicados si un juego anterior aún no terminó de destruirse.
  parent.replaceChildren();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#12151f",
    banner: false,
    antialias: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    },
  });

  game.scene.add(CityScene.KEY, CityScene, true, { room, cityId });
  return game;
}
