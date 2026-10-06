import * as Phaser from "phaser";
import type { CityRoom } from "@/lib/network";
import { CityScene } from "./scenes/CityScene";
import { isTouchDevice } from "@/lib/viewport";

/**
 * Crea el juego (una sola vez por partida: sigue vivo entre viajes, así no se recrea el contexto de
 * WebGL ni se vuelven a hornear las texturas que comparten los barrios). El barrio lo pone `startCity`.
 */
export function createGame(parent: HTMLElement): Phaser.Game {
  // Defensa extra contra canvas duplicados si un juego anterior aún no terminó de destruirse.
  parent.replaceChildren();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#12151f",
    banner: false,
    antialias: true,
    // MSAA del canvas: en celular cuesta mucho fill rate y casi todo ya va horneado a texturas (suavizado).
    antialiasGL: !isTouchDevice(),
    powerPreference: "high-performance",
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    },
  });

  return game;
}

/**
 * Espera el primer estado de la sala (recién conectada al viajar): la escena lo lee desde el primer
 * frame (`room.state.players`). Con el juego recién creado no se notaba (Phaser tarda unos frames en
 * arrancar); con el juego vivo entre viajes la escena arrancaba antes y se trababa.
 */
export function whenStateReady(room: CityRoom): Promise<void> {
  if (room.state?.players) return Promise.resolve();
  return new Promise((resolve) => room.onStateChange.once(() => resolve()));
}

/**
 * Muestra el barrio de esta sala (con su estado ya llegado, ver `whenStateReady`): saca la escena del anterior (su `dispose` libera lo que era sólo
 * de él) y arranca una nueva, de cero (una instancia nueva: nada de su estado viene del barrio de antes).
 */
export function startCity(game: Phaser.Game, room: CityRoom, cityId: string) {
  if (game.scene.getScene(CityScene.KEY)) game.scene.remove(CityScene.KEY);
  game.scene.add(CityScene.KEY, CityScene, true, { room, cityId });
}
