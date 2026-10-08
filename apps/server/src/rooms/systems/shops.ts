import {
  ITEM_CATEGORIES,
  ItemDefinition,
  MAX_HEALTH,
  MAX_MONEY,
  MessageType,
  SHOP_MAX_QUANTITY,
  Shop,
  CartLine,
  ShopResultMessage,
  ShopSellManyMessage,
  ShopTradeMessage,
  buyPrice,
  fishWithArticle,
  formatMoney,
  getClothing,
  FishItem,
  GRILLED_FISH_ID,
  GRILL_BURN_CHANCE,
  getItem,
  grillYield,
  getPet,
  haggleChance,
  hospitalPrice,
  isBox,
  isValidHagglePrice,
  maxHagglePrice,
  rollLoot,
  sanitizePetName,
  sellPrice,
} from "@montevideo-world/shared";
import type { CityRoom } from "../CityRoom";
import { PlayerSession, halt, oncePerTick, standUp } from "../session";
import { stopActivities } from "./activities";
import type { MessageRoutes } from "./types";

/** Tiendas (comprar, vender, regatear, carrito), ropa, mochila, cajas sorpresa, veterinaria y guardia. */
export function shopRoutes(room: CityRoom) {
  return {
    [MessageType.RequestInventory]: (session) => room.markInventory(session),
    [MessageType.RequestWallet]: (session) => room.markWallet(session),

    /** Clic en una tienda: si ya está al lado se abre; si no, camina hasta ella y se abre al llegar. */
    [MessageType.ShopVisit]: oncePerTick(MessageType.ShopVisit, (session, message) => {
      const { player } = session;
      const shop = room.map.shopAt(message.x, message.y);
      if (!shop) return;
      stopActivities(session);
      if (room.map.isNearShop(shop, player.x, player.y)) {
        halt(session);
        return openShop(room, session, shop);
      }
      const approach = room.map.shopApproach(shop, { x: player.x, y: player.y });
      const path = approach ? room.map.findPath({ x: player.x, y: player.y }, approach) : [];
      if (path.length === 0) return;
      standUp(player);
      session.path = path;
      session.pending = { kind: "shop", shop };
    }),

    /**
     * Comprar `quantity` unidades (1 si no viene): hay que estar al lado, que la tienda lo venda,
     * alcanzar la plata y tener lugar. Compra las que alcancen y entren (las herramientas van de a
     * una por casillero) y responde un solo resultado con lo que se compró de verdad.
     */
    [MessageType.ShopBuy]: (session, message) => {
      const trade = validateTrade(room, session, message);
      if (!trade) return;
      const { shop, item, quantity } = trade;
      const { wallet, inventory } = session;

      if (!shop.stock.includes(item.id)) return shopResult(room, session, false, `${shop.name} no vende ${item.name}.`);
      const price = buyPrice(item, shop.priceFactor);
      if (!wallet.canAfford(price)) return shopResult(room, session, false, `No te alcanza: ${item.name} cuesta ${formatMoney(price)}.`);
      if (!inventory.canAdd(item.id)) return shopResult(room, session, false, "No tenés lugar en la mochila.");

      let bought = 0;
      let stop = "";
      while (bought < quantity) {
        if (!wallet.canAfford(price)) {
          stop = "no te alcanzó la plata";
          break;
        }
        if (!inventory.canAdd(item.id)) {
          stop = "no había más lugar en la mochila";
          break;
        }
        wallet.debit(price);
        inventory.add(item.id);
        bought += 1;
      }
      room.markWallet(session);
      room.markInventory(session);
      const total = formatMoney(price * bought);
      const what = bought > 1 ? `${bought} × ${item.name}` : item.name;
      const text = stop ? `Compraste ${bought} de ${quantity} × ${item.name} por ${total}: ${stop}.` : `Compraste ${what} por ${total}.`;
      shopResult(room, session, true, text, { action: "buy", itemId: item.id, quantity: bought });
    },

    /**
     * Vender `quantity` unidades de la mochila (lo puesto no se vende: primero hay que sacárselo). Las
     * herramientas gastadas valen menos: se venden de la más usada a la menos.
     */
    [MessageType.ShopSell]: (session, message) => {
      const trade = validateTrade(room, session, message);
      if (!trade) return;
      const { shop, item, quantity } = trade;
      const { wallet, inventory } = session;

      if (!shop.buys.includes(item.category)) {
        return shopResult(room, session, false, `En ${shop.name} no compran ${ITEM_CATEGORIES[item.category].label}.`);
      }
      if (inventory.count(item.id) === 0) return shopResult(room, session, false, `No tenés ${item.name} en la mochila.`);

      let sold = 0;
      let earned = 0;
      let stop = "";
      while (sold < quantity) {
        if (inventory.count(item.id) === 0) {
          stop = "no tenías más";
          break;
        }
        // Una herramienta gastada vale menos: se vende la más usada (la que sale primero).
        const price = sellPrice(item, inventory.nextUses(item.id)[0]);
        if (!wallet.credit(price)) {
          stop = "no podés tener más plata";
          break;
        }
        inventory.remove(item.id);
        sold += 1;
        earned += price;
      }
      if (sold === 0) return shopResult(room, session, false, "No podés tener más plata.");
      room.markWallet(session);
      room.markInventory(session);
      const what = sold > 1 ? `${sold} × ${item.name}` : item.name;
      const text = stop
        ? `Vendiste ${sold} de ${quantity} × ${item.name} por ${formatMoney(earned)}: ${stop}.`
        : `Vendiste ${what} por ${formatMoney(earned)}.`;
      shopResult(room, session, true, text, { action: "sell", itemId: item.id, quantity: sold });
    },

    /**
     * Vender regateando, todo o nada: con probabilidad `haggleChance` la tienda paga lo pedido; si no,
     * el ítem se pierde igual y no se cobra nada. Mismas reglas que vender (lo puesto no se vende).
     */
    [MessageType.ShopHaggle]: (session, message) => {
      const trade = validateTrade(room, session, message);
      if (!trade) return;
      const { shop, item } = trade;
      const { wallet, inventory } = session;
      const base = sellPrice(item, inventory.nextUses(item.id)[0]);

      if (!shop.buys.includes(item.category)) {
        return shopResult(room, session, false, `En ${shop.name} no compran ${ITEM_CATEGORIES[item.category].label}.`);
      }
      if (inventory.count(item.id) === 0) return shopResult(room, session, false, `No tenés ${item.name} en la mochila.`);
      if (!isValidHagglePrice(base, message.price)) {
        return shopResult(room, session, false, `Podés pedir entre ${formatMoney(base + 1)} y ${formatMoney(maxHagglePrice(base))}.`);
      }
      // Antes de tirar los dados: si ganara y no le entrara la plata, ni se intenta.
      if (wallet.balance + message.price > MAX_MONEY) return shopResult(room, session, false, "No podés tener más plata.");

      const accepted = Math.random() < haggleChance(base, message.price);
      inventory.remove(item.id);
      if (accepted) wallet.credit(message.price);
      room.markWallet(session);
      room.markInventory(session);
      if (accepted) {
        shopResult(room, session, true, `🤝 ¡Aceptaron! Vendiste ${item.name} por ${formatMoney(message.price)}.`);
      } else {
        shopResult(room, session, false, `🙅 No aceptaron: te quedaste sin ${item.name} y sin cobrar nada.`);
      }
    },

    /**
     * Vender de una todo lo elegido (como el carrito al comprar): todo o nada. Cada herramienta paga
     * según su desgaste (se venden de la más gastada a la menos, como de a una).
     */
    [MessageType.ShopSellMany]: (session, message) => {
      const quote = saleQuote(room, session, message);
      if (!quote) return;
      const { shop, lines, total } = quote;
      if (!session.wallet.credit(total)) return shopResult(room, session, false, "No podés tener más plata.");
      for (const { item, quantity } of lines) for (let i = 0; i < quantity; i++) session.inventory.remove(item.id);
      room.markWallet(session);
      room.markInventory(session);
      shopResult(room, session, true, `Vendiste ${saleList(lines)} por ${formatMoney(total)}.`, { action: "sell", sold: soldLines(lines) });
    },

    /**
     * Regatear el lote entero: un precio por todo, todo o nada (`haggleChance` sobre lo que pagarían
     * vendiendo normal). Si aceptan se cobra lo pedido; si no, se pierde todo lo elegido sin cobrar.
     */
    [MessageType.ShopHaggleMany]: (session, message) => {
      const quote = saleQuote(room, session, message);
      if (!quote) return;
      const { shop, lines, total } = quote;
      const { wallet, inventory } = session;
      if (!isValidHagglePrice(total, message.price)) {
        return shopResult(room, session, false, `Podés pedir entre ${formatMoney(total + 1)} y ${formatMoney(maxHagglePrice(total))}.`);
      }
      if (wallet.balance + message.price > MAX_MONEY) return shopResult(room, session, false, "No podés tener más plata.");

      const accepted = Math.random() < haggleChance(total, message.price);
      for (const { item, quantity } of lines) for (let i = 0; i < quantity; i++) inventory.remove(item.id);
      if (accepted) wallet.credit(message.price);
      room.markWallet(session);
      room.markInventory(session);
      if (accepted) {
        shopResult(room, session, true, `🤝 ¡Aceptaron! Vendiste ${saleList(lines)} por ${formatMoney(message.price)}.`, { action: "sell", sold: soldLines(lines) });
      } else {
        shopResult(room, session, false, `🙅 No aceptaron: te quedaste sin ${saleList(lines)} y sin cobrar nada.`, { action: "sell" });
      }
    },

    /**
     * Comprar el carrito entero (todo o nada): hay que estar al lado, que la tienda venda todo, que
     * alcance la plata para el total y que todo entre en la mochila (se prueba con una copia). Si
     * algo falla no se compra nada y se dice por qué; si no, se cobra una vez y responde un solo resultado.
     */
    [MessageType.ShopCheckout]: (session, message) => {
      const { player, wallet, inventory } = session;
      const shop = room.map.getShop(message.shopId);
      if (!shop) return;
      if (!room.map.isNearShop(shop, player.x, player.y)) return shopResult(room, session, false, `Acercate a ${shop.name} para comprar.`);

      // Mismo ítem en dos líneas: se suman.
      const lines = new Map<string, number>();
      for (const { itemId, quantity } of message.items) lines.set(itemId, (lines.get(itemId) ?? 0) + quantity);
      const cart: Array<{ item: ItemDefinition; quantity: number }> = [];
      for (const [itemId, quantity] of lines) {
        const item = getItem(itemId);
        if (!item || !shop.stock.includes(item.id)) return shopResult(room, session, false, `${shop.name} no vende eso.`);
        if (quantity > SHOP_MAX_QUANTITY) return shopResult(room, session, false, `Como mucho ${SHOP_MAX_QUANTITY} de cada cosa.`);
        cart.push({ item, quantity });
      }
      if (cart.length === 0) return;

      const total = cart.reduce((sum, { item, quantity }) => sum + buyPrice(item, shop.priceFactor) * quantity, 0);
      if (!wallet.canAfford(total)) {
        return shopResult(room, session, false, `No te alcanza: el carrito sale ${formatMoney(total)} y tenés ${formatMoney(wallet.balance)}.`);
      }
      const trial = inventory.clone();
      for (const { item, quantity } of cart) {
        for (let i = 0; i < quantity; i++) {
          if (!trial.add(item.id)) return shopResult(room, session, false, "No te entra todo en la mochila: sacá algo del carrito o hacé lugar.");
        }
      }

      wallet.debit(total);
      for (const { item, quantity } of cart) for (let i = 0; i < quantity; i++) inventory.add(item.id);
      room.markWallet(session);
      room.markInventory(session);
      const list = cart.map(({ item, quantity }) => (quantity > 1 ? `${quantity} × ${item.name}` : item.name)).join(", ");
      shopResult(room, session, true, `Compraste ${list} por ${formatMoney(total)}.`, {
        action: "buy",
        itemId: cart.length === 1 ? cart[0].item.id : undefined,
        quantity: cart.length === 1 ? cart[0].quantity : undefined,
        bought: cart.map(({ item, quantity }) => ({ itemId: item.id, quantity })),
      });
    },

    /**
     * Ponerse una prenda la saca de la mochila (y lo que estaba puesto en ese lugar vuelve a la
     * mochila); sacarse una prenda la guarda en la mochila, si hay lugar.
     */
    [MessageType.Equip]: (session, message) => {
      const { player, inventory } = session;
      const { slot, itemId } = message;
      const worn = player[slot];

      if (itemId === null) {
        if (!worn || !inventory.add(worn)) return;
        player[slot] = "";
      } else {
        const item = getClothing(itemId);
        if (!item || item.slot !== slot || inventory.count(itemId) === 0) return;
        inventory.remove(itemId);
        // Con la mochila llena puede no haber lugar para lo que estaba puesto: se deshace el cambio.
        if (worn && !inventory.add(worn)) {
          inventory.add(itemId);
          return;
        }
        player[slot] = itemId;
      }
      room.markInventory(session);
    },

    /**
     * Reordenar la mochila. Con un intercambio abierto no (la oferta se arma con lo que hay; mover no
     * la cambia, pero así la mochila no se mueve mientras el otro la mira).
     */
    [MessageType.InventoryMove]: (session, message) => {
      if (!room.trades.get(session.client.sessionId)) session.inventory.move(message.from, message.to);
      // Siempre se reenvía: si no cambió nada, el cliente vuelve a dibujar lo que hay de verdad.
      room.markInventory(session);
    },

    /**
     * Cocinar en la Parrilla del Mercado: los pescados elegidos se cambian por pescado a la plancha
     * (`grillYield` porciones cada uno: más cuanto más difícil el pez), y cada porción se puede quemar
     * (`GRILL_BURN_CHANCE`). Gratis y todo o nada: si no entra lo que salió en la mochila (probado en
     * `inventory.clone()`), no se cocina nada.
     */
    [MessageType.GrillCook]: (session, message) => {
      const { player, inventory } = session;
      const shop = room.map.getShop(message.shopId);
      if (!shop?.grill) return;
      if (!room.map.isNearShop(shop, player.x, player.y)) return shopResult(room, session, false, `Acercate a ${shop.name} para cocinar.`);
      if (room.trades.get(session.client.sessionId)) return shopResult(room, session, false, "Terminá el intercambio antes de cocinar.");

      const lines = new Map<string, number>();
      for (const { itemId, quantity } of message.items) lines.set(itemId, (lines.get(itemId) ?? 0) + quantity);
      const batch: Array<{ fish: FishItem; quantity: number }> = [];
      for (const [itemId, quantity] of lines) {
        const fish = getItem(itemId);
        if (fish?.category !== "fish") return shopResult(room, session, false, "En la parrilla sólo se cocinan pescados.");
        if (inventory.count(fish.id) < quantity) return shopResult(room, session, false, `No tenés ${quantity} × ${fish.name} en la mochila.`);
        batch.push({ fish, quantity });
      }
      if (batch.length === 0) return;

      const total = batch.reduce((sum, { fish, quantity }) => sum + grillYield(fish) * quantity, 0);
      let burnt = 0;
      for (let i = 0; i < total; i++) if (Math.random() < GRILL_BURN_CHANCE) burnt += 1;
      const portions = total - burnt;
      const trial = inventory.clone();
      for (const { fish, quantity } of batch) for (let i = 0; i < quantity; i++) trial.remove(fish.id);
      for (let i = 0; i < portions; i++) {
        if (!trial.add(GRILLED_FISH_ID)) return shopResult(room, session, false, "No te entra todo en la mochila: cociná menos o hacé lugar.");
      }

      for (const { fish, quantity } of batch) for (let i = 0; i < quantity; i++) inventory.remove(fish.id);
      for (let i = 0; i < portions; i++) inventory.add(GRILLED_FISH_ID);
      room.markInventory(session);
      const list = batch.map(({ fish, quantity }) => (quantity > 1 ? `${quantity} × ${fish.name}` : fish.name)).join(", ");
      const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`);
      const outcome =
        burnt === 0
          ? `salieron ${plural(portions, "porción", "porciones")} a la plancha, ¡sin quemar ninguna!`
          : portions === 0
            ? `se te quemó todo (${plural(burnt, "porción", "porciones")}). ¡Mala suerte!`
            : `salieron ${total} porciones, pero se te ${burnt === 1 ? "quemó 1" : `quemaron ${burnt}`}: te quedan ${plural(portions, "pescado", "pescados")} a la plancha.`;
      const cooked = batch.map(({ fish, quantity }) => ({ itemId: fish.id, quantity }));
      shopResult(room, session, portions > 0, `🔥 Cocinaste ${list}: ${outcome}`, {
        action: "sell",
        sold: cooked,
        grill: { cooked, total, burnt, kept: portions },
      });
    },

    /** Tirar una unidad de algo que se puede tirar (`ItemCategoryInfo.droppable`: el sobre de la bienvenida). */
    [MessageType.InventoryDrop]: (session, message) => {
      const item = getItem(message.itemId);
      if (!item || !ITEM_CATEGORIES[item.category].droppable || room.trades.get(session.client.sessionId)) return;
      if (!session.inventory.remove(item.id)) return;
      room.notice(session, `🗑️ Tiraste el ${item.name.toLowerCase()}.`);
      room.markInventory(session);
    },

    /**
     * Abrir una caja sorpresa de la mochila: se consume y su premio (sorteado por peso) va a la
     * mochila. Si no hay lugar para el premio, la caja queda cerrada.
     */
    [MessageType.BoxOpen]: (session, message) => {
      const { player, inventory } = session;
      const box = getItem(message.itemId);
      if (!isBox(box) || inventory.count(box.id) === 0) return;

      const prize = rollLoot(box);
      const after = inventory.clone();
      after.remove(box.id);
      if (!after.canAdd(prize.id)) return room.notice(session, "No tenés lugar en la mochila para lo que hay adentro de la caja.");

      inventory.remove(box.id);
      inventory.add(prize.id);
      room.markInventory(session);
      const prizeName = prize.category === "fish" ? fishWithArticle(prize) : prize.name;
      room.sendTo(session, MessageType.BoxOpened, { boxId: box.id, prizeId: prize.id, text: `¡Te salió ${prizeName}!` });
      if (prize.category === "fish" && prize.difficulty >= 4) {
        room.broadcastSystem(`🎁 ${player.name} abrió ${box.name.toLowerCase()} y le salió ${prizeName}`);
      }
    },

    /** Adoptar: una mascota por jugador, se paga y queda con el nombre elegido (la ven todos). */
    [MessageType.PetAdopt]: (session, message) => {
      const shop = petShop(room, session, message.shopId);
      if (!shop) return;
      const { player } = session;
      const pet = shop.pets?.includes(message.petId) ? getPet(message.petId) : undefined;
      const name = sanitizePetName(message.name);
      if (!pet) return;
      if (!name) return shopResult(room, session, false, "Ponele un nombre a tu mascota.");
      if (player.pet) return shopResult(room, session, false, `Ya tenés a ${player.petName}: una mascota por persona.`);
      if (!session.wallet.debit(pet.price)) {
        return shopResult(room, session, false, `No te alcanza: adoptar un ${pet.name.toLowerCase()} cuesta ${formatMoney(pet.price)}.`);
      }
      player.pet = pet.id;
      player.petName = name;
      room.markWallet(session);
      room.savePlayer(session);
      shopResult(room, session, true, `🐾 ¡Adoptaste a ${name}! Te va a seguir a todos lados.`);
      room.broadcastSystem(`🐾 ${player.name} adoptó a ${name} (${pet.name.toLowerCase()})`);
    },

    [MessageType.PetRename]: (session, message) => {
      if (!petShop(room, session, message.shopId)) return;
      const { player } = session;
      const name = sanitizePetName(message.name);
      if (!player.pet || !name) return;
      const previous = player.petName;
      player.petName = name;
      room.savePlayer(session);
      shopResult(room, session, true, `${previous} ahora se llama ${name}.`);
    },

    /** Despedirse de la mascota: se queda en la veterinaria (no se devuelve la plata). */
    [MessageType.PetRelease]: (session, message) => {
      const { player } = session;
      if (!petShop(room, session, message.shopId) || !player.pet) return;
      const name = player.petName;
      player.pet = "";
      player.petName = "";
      room.savePlayer(session);
      shopResult(room, session, true, `Te despediste de ${name}. En la veterinaria lo van a cuidar bien.`);
    },

    /** Guardia del sanatorio: pagar la consulta (`hospitalPrice`) y quedar con la salud en 100. */
    [MessageType.HospitalHeal]: (session, message) => {
      const { player, needs, wallet } = session;
      const shop = room.map.getShop(message.shopId);
      if (!shop?.hospital) return;
      if (!room.map.isNearShop(shop, player.x, player.y)) return shopResult(room, session, false, `Acercate a ${shop.name}.`);
      if (needs.health >= MAX_HEALTH) return shopResult(room, session, false, "Estás sano: no hace falta la consulta.");
      const price = hospitalPrice(needs.health);
      if (!wallet.debit(price)) return shopResult(room, session, false, `La consulta sale ${formatMoney(price)} y no te alcanza.`);
      needs.heal(MAX_HEALTH);
      room.markWallet(session);
      room.sendNeeds(session);
      shopResult(room, session, true, `❤ Te atendieron en la guardia: salud al 100 por ${formatMoney(price)}.`);
    },
  } satisfies Partial<MessageRoutes>;
}

export function openShop(room: CityRoom, session: PlayerSession, shop: Shop) {
  room.sendTo(session, MessageType.ShopOpen, { shopId: shop.id });
}

/** Lo común a comprar y vender: tienda e ítem existentes y el jugador al lado de la tienda. */
function validateTrade(room: CityRoom, session: PlayerSession, message: ShopTradeMessage) {
  const shop = room.map.getShop(message.shopId);
  const item = getItem(message.itemId);
  if (!shop || !item) return null;
  if (!room.map.isNearShop(shop, session.player.x, session.player.y)) {
    shopResult(room, session, false, `Acercate a ${shop.name} para comprar o vender.`);
    return null;
  }
  return { shop, item, quantity: message.quantity ?? 1 };
}

/**
 * Lo común a vender lo elegido y a regatearlo: tienda al lado, que compre cada cosa, que esté todo en
 * la mochila y cuánto pagarían vendiendo normal (cada herramienta según su desgaste, de la más gastada
 * a la menos, probado sobre una copia de la mochila). null con el aviso de por qué no.
 */
function saleQuote(room: CityRoom, session: PlayerSession, message: ShopSellManyMessage) {
  const shop = room.map.getShop(message.shopId);
  if (!shop) return null;
  if (!room.map.isNearShop(shop, session.player.x, session.player.y)) {
    shopResult(room, session, false, `Acercate a ${shop.name} para vender.`);
    return null;
  }
  const merged = new Map<string, number>();
  for (const { itemId, quantity } of message.items) merged.set(itemId, (merged.get(itemId) ?? 0) + quantity);
  const lines: Array<{ item: ItemDefinition; quantity: number }> = [];
  const trial = session.inventory.clone();
  let total = 0;
  for (const [itemId, quantity] of merged) {
    const item = getItem(itemId);
    if (!item) return null;
    if (!shop.buys.includes(item.category)) {
      shopResult(room, session, false, `En ${shop.name} no compran ${ITEM_CATEGORIES[item.category].label}.`);
      return null;
    }
    if (trial.count(item.id) < quantity) {
      shopResult(room, session, false, `No tenés tantas unidades de ${item.name} en la mochila.`);
      return null;
    }
    for (let i = 0; i < quantity; i++) {
      total += sellPrice(item, trial.nextUses(item.id)[0]);
      trial.remove(item.id);
    }
    lines.push({ item, quantity });
  }
  if (lines.length === 0) return null;
  return { shop, lines, total };
}

/** "3 × Pejerrey, Corvina": lo que se vende, para los avisos. */
function saleList(lines: ReadonlyArray<{ item: ItemDefinition; quantity: number }>): string {
  return lines.map(({ item, quantity }) => (quantity > 1 ? `${quantity} × ${item.name}` : item.name)).join(", ");
}

function soldLines(lines: ReadonlyArray<{ item: ItemDefinition; quantity: number }>): CartLine[] {
  return lines.map(({ item, quantity }) => ({ itemId: item.id, quantity }));
}

/** La veterinaria donde está parado el jugador (pegado a ella), o null con el aviso de por qué no. */
function petShop(room: CityRoom, session: PlayerSession, shopId: string): Shop | null {
  const shop = room.map.getShop(shopId);
  if (!shop?.pets) return null;
  if (!room.map.isNearShop(shop, session.player.x, session.player.y)) {
    shopResult(room, session, false, `Acercate a ${shop.name}.`);
    return null;
  }
  return shop;
}

/** `detail`: en compras y ventas, qué ítem y cuántas unidades (el panel resalta esa fila). */
function shopResult(
  room: CityRoom,
  session: PlayerSession,
  ok: boolean,
  text: string,
  detail?: Pick<ShopResultMessage, "action" | "itemId" | "quantity" | "bought" | "sold" | "grill">,
) {
  room.sendTo(session, MessageType.ShopResult, { ok, text, ...detail });
}
