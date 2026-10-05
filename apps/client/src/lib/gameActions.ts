import { getItem } from "@montevideo-world/shared";
import { eventBus } from "./eventBus";
import { gameStore } from "./gameStore";
import { ItemActionContext, itemAction } from "../features/inventory/itemActions";
import { CityRoom, sendBusking, sendFishing, sendTravelRequest, sendVending } from "./network";

/**
 * Acciones del jugador que dependen del estado de la UI (`gameStore`). Las usan los atajos de
 * teclado, los widgets y la barra rápida: así la tecla y el botón hacen siempre lo mismo.
 */

/** Lo que `itemAction` necesita para saber qué hace cada ítem ahora mismo. */
export function itemActionContext(room: CityRoom): ItemActionContext {
  const { outfit, inventory, fishing, vending, busking } = gameStore.getState();
  return { room, outfit, inventory, fishing, vending, busking };
}

/** F / botón: tirar la línea si estás en la escollera, o recogerla si ya está en el agua. */
export function toggleFishing(room: CityRoom) {
  const { fishing } = gameStore.getState();
  if (fishing.fishing) sendFishing(room, "stop");
  else if (fishing.canFish) sendFishing(room, "cast");
}

/** Botón (o F en la explanada): ofrecer la mercadería si estás en la explanada del Centenario, o dejar de vender. */
export function toggleVending(room: CityRoom) {
  const { vending } = gameStore.getState();
  if (vending.vending) sendVending(room, "stop");
  else if (vending.canVend) sendVending(room, "start");
}

/** Botón (o F sobre 18 de Julio): tocar un tema si estás donde se toca en el Centro, o dejar de tocar. */
export function toggleBusking(room: CityRoom) {
  const { busking } = gameStore.getState();
  if (busking.busking) sendBusking(room, "stop");
  else if (busking.canBusk) sendBusking(room, "start");
}

/**
 * F, en este orden: si estás pescando, vendiendo o tocando, lo corta; si tenés algo al lado (tienda,
 * banco, palmera, parada, otro jugador, un picudo), interactúa con eso; si no, pesca en la
 * escollera, vende en la explanada del Centenario o toca en 18 de Julio.
 */
export function pressF(room: CityRoom) {
  const { fishing, vending, busking, interaction } = gameStore.getState();
  if (fishing.fishing) toggleFishing(room);
  else if (vending.vending) toggleVending(room);
  else if (busking.busking) toggleBusking(room);
  else if (interaction) eventBus.emit("interact:use", null);
  else if (fishing.canFish) toggleFishing(room);
  else if (vending.canVend) toggleVending(room);
  else if (busking.canBusk) toggleBusking(room);
}

/** Atajo 1–9: usar el ítem (ponerse/sacarse ropa, pescar, vender, tocar, comer, abrir una caja). */
export function activateHotbar(room: CityRoom, index: number) {
  const itemId = gameStore.getState().hotbar[index];
  const item = itemId ? getItem(itemId) : undefined;
  if (item) itemAction(item, itemActionContext(room))?.run();
}

/** Botón "Ir" de la lista de barrios: pedir el boleto (el viaje arranca cuando el server lo cobra). */
export function requestTravel(room: CityRoom, currentCityId: string, cityId: string) {
  if (!gameStore.getState().traveling && cityId !== currentCityId) sendTravelRequest(room, cityId);
}
