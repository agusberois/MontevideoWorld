import {
  MessageType,
  NEW_TUTORIAL,
  TUTORIAL_GIFT_ID,
  TUTORIAL_STEPS,
  TutorialGoal,
  TutorialMessage,
  formatMoney,
  getItem,
} from "@montevideo-world/shared";
import type { CityRoom } from "../CityRoom";
import type { PlayerSession } from "../session";
import type { MessageRoutes } from "./types";

/**
 * Guía de bienvenida ("Bienvenido a Montevideo", `TUTORIAL_STEPS` en shared). La lleva el server:
 * cada sistema avisa lo que el jugador hizo de verdad (`tutorialEvent`: comió, pescó, vendió,
 * viajó; llegar a un lugar se mira en cada paso, `checkTutorialReach`) y, si es lo que pide el paso
 * de ahora, se cumple: paga el premio (salvo repitiéndola con `/guia`) y pasa al siguiente. Al
 * terminar regala la gorra celeste. El estado se guarda con el progreso (`PlayerRecord.tutorial`).
 */
export function tutorialRoutes(room: CityRoom) {
  return {
    /** Lo pide el cliente al entrar (como la mochila): si se mandara en `onJoin` se perdería. */
    [MessageType.RequestTutorial]: (session) => sendTutorial(room, session),

    /** Saltear la guía: no vuelve a aparecer (con `/guia` se puede abrir de nuevo, sin premios). */
    [MessageType.TutorialSkip]: (session) => {
      if (session.tutorial.status !== "active") return;
      session.tutorial = { ...session.tutorial, status: "skipped", step: 0 };
      room.savePlayer(session);
      sendTutorial(room, session);
    },
  } satisfies Partial<MessageRoutes>;
}

/** Lo que hizo el jugador, por si es lo que pide su paso de la guía. */
export type TutorialEvent =
  | { kind: "eat"; itemId: string }
  | { kind: "catch" }
  | { kind: "sell"; shopId: string; category: string }
  | { kind: "travel" };

export function tutorialEvent(room: CityRoom, session: PlayerSession, event: TutorialEvent) {
  if (tutorialWants(session, event)) completeStep(room, session);
}

/** ¿Esto es justo lo que pide su paso de ahora? (p. ej. para dejarlo comer aunque esté lleno). */
export function tutorialWants(session: PlayerSession, event: TutorialEvent): boolean {
  const goal = currentGoal(session);
  return goal !== undefined && matches(goal, event);
}

/** Llegar a un lugar: se mira cada vez que el jugador da un paso (es barato: una resta y una comparación). */
export function checkTutorialReach(room: CityRoom, session: PlayerSession) {
  const goal = currentGoal(session);
  if (goal?.kind !== "reach" || goal.cityId !== room.map.city.id) return;
  const { x, y } = session.player;
  const { area, within } = goal;
  const dx = Math.max(area.x - x, 0, x - (area.x + area.width - 1));
  const dy = Math.max(area.y - y, 0, y - (area.y + area.height - 1));
  if (Math.max(dx, dy) <= within) completeStep(room, session);
}

/** `/guia`: vuelve a abrir la guía desde el principio. Si ya la había empezado o terminado, sin premios. */
export function restartTutorial(room: CityRoom, session: PlayerSession) {
  const firstTime = session.tutorial.status === "active" && !session.tutorial.replay && session.tutorial.step === 0;
  session.tutorial = { ...NEW_TUTORIAL, replay: !firstTime || session.tutorial.replay };
  room.savePlayer(session);
  sendTutorial(room, session);
  room.notice(session, session.tutorial.replay ? "📍 Abriste la guía de nuevo (esta vez sin premios)." : "📍 Abriste la guía de bienvenida.");
}

function currentGoal(session: PlayerSession): TutorialGoal | undefined {
  const { status, step } = session.tutorial;
  return status === "active" ? TUTORIAL_STEPS[step]?.goal : undefined;
}

function matches(goal: TutorialGoal, event: TutorialEvent): boolean {
  switch (goal.kind) {
    case "reach":
      return false;
    case "eat":
      return event.kind === "eat" && event.itemId === goal.itemId;
    case "catch":
      return event.kind === "catch";
    case "sell":
      return event.kind === "sell" && event.shopId === goal.shopId && event.category === goal.category;
    case "travel":
      return event.kind === "travel";
  }
}

/**
 * Cumple el paso de ahora: paga (si no es repetición), pasa al siguiente o termina (con la gorra de
 * regalo). Guarda en el acto: el premio no se puede perder ni cobrar dos veces por un corte.
 */
function completeStep(room: CityRoom, session: PlayerSession) {
  const { step, replay } = session.tutorial;
  const definition = TUTORIAL_STEPS[step];
  const last = step === TUTORIAL_STEPS.length - 1;
  const completed: NonNullable<TutorialMessage["completed"]> = { step, reward: 0 };

  if (!replay && session.wallet.credit(definition.reward)) {
    completed.reward = definition.reward;
    room.markWallet(session);
  }
  if (last && !replay) {
    if (session.inventory.add(TUTORIAL_GIFT_ID)) {
      completed.gift = TUTORIAL_GIFT_ID;
      room.markInventory(session);
    } else {
      room.notice(session, `Tenías la mochila llena: no entró la ${getItem(TUTORIAL_GIFT_ID)?.name.toLowerCase()} de regalo.`);
    }
  }
  session.tutorial = last ? { status: "done", step: 0, replay } : { status: "active", step: step + 1, replay };
  room.savePlayer(session);
  sendTutorial(room, session, completed);

  if (last && !replay) room.broadcastSystem(`🎉 ${session.player.name} terminó la guía de bienvenida. ¡Bienvenido a Montevideo!`);
  else if (completed.reward > 0) console.log(`[Guía] ${session.player.name} cumplió el paso ${step + 1} (+${formatMoney(completed.reward)})`);
}

function sendTutorial(room: CityRoom, session: PlayerSession, completed?: TutorialMessage["completed"]) {
  room.sendTo(session, MessageType.Tutorial, { ...session.tutorial, ...(completed ? { completed } : {}) });
}
