import { CartItem, InstrumentItem, RodItem } from "./items";

/**
 * Clima de Montevideo: global para todo el server como la hora (todos los barrios tienen el mismo).
 * Lo decide el server (`weather.ts` del server: cada clima dura unas horas del juego y después
 * sortea otro) y cada sala lo copia a `GameState.weather`. Cambia un poco la pesca, la venta y el
 * hambre; acá están los efectos, así el server sortea y el cliente avisa con los mismos números.
 */

export const WEATHER_IDS = ["clear", "rain", "pampero", "heat"] as const;
export type WeatherId = (typeof WEATHER_IDS)[number];

export interface Weather {
  id: WeatherId;
  name: string;
  /** Mensaje del chat cuando empieza (en todos los barrios). */
  announce: string;
  /** Qué cambia, en una frase corta, para los paneles de pesca y venta (vacío = nada). */
  fishingHint: string;
  vendingHint: string;
  buskingHint: string;
  /** Peso al sortear el próximo clima (nunca se repite el mismo seguido). */
  weight: number;
  /** Cuánto dura, en horas del juego (se sortea entre las dos). */
  hours: [number, number];
  /** Pesca: multiplica la espera y la probabilidad de que no pique nada. */
  fishWaitFactor: number;
  fishNothingFactor: number;
  /**
   * Venta (y tocar en la calle): multiplica la espera y la probabilidad de que nadie compre o deje
   * propina (con lluvia hay menos gente).
   */
  vendWaitFactor: number;
  vendNoSaleFactor: number;
  /**
   * Tocar en la calle (el Centro): multiplica la espera, la probabilidad de que nadie deje nada y la
   * propina. Cada clima la cambia para bien o para mal (con sol y con calor hay más gente paseando).
   */
  buskWaitFactor: number;
  buskNoTipFactor: number;
  buskTipFactor: number;
  /** Hambre: multiplica lo que baja solo con el tiempo (no lo de caminar ni trabajar). */
  hungerFactor: number;
}

export const WEATHERS: Record<WeatherId, Weather> = {
  clear: {
    id: "clear",
    name: "Despejado",
    announce: "☀️ Se despejó: lindo día en Montevideo.",
    fishingHint: "",
    vendingHint: "",
    buskingHint: "☀️ Con sol la gente se para a escuchar: más propina.",
    weight: 50,
    hours: [4, 10],
    fishWaitFactor: 1,
    fishNothingFactor: 1,
    vendWaitFactor: 1,
    vendNoSaleFactor: 1,
    buskWaitFactor: 1,
    buskNoTipFactor: 0.85,
    buskTipFactor: 1.15,
    hungerFactor: 1,
  },
  rain: {
    id: "rain",
    name: "Lluvia",
    announce: "🌧️ Se largó a llover: hay menos gente en la calle, pero los peces pican más.",
    fishingHint: "🌧️ Con lluvia pican más rápido.",
    vendingHint: "🌧️ Con lluvia pasa menos gente.",
    buskingHint: "🌧️ Con lluvia nadie se para: menos propinas y más espera.",
    weight: 25,
    hours: [2, 6],
    fishWaitFactor: 0.8,
    fishNothingFactor: 0.6,
    vendWaitFactor: 1.3,
    vendNoSaleFactor: 1.6,
    buskWaitFactor: 1.3,
    buskNoTipFactor: 1.6,
    buskTipFactor: 0.8,
    hungerFactor: 1,
  },
  pampero: {
    id: "pampero",
    name: "Viento pampero",
    announce: "🌬️ Entró el pampero: con este viento cuesta pescar.",
    fishingHint: "🌬️ Con el pampero cuesta que pique.",
    vendingHint: "",
    buskingHint: "🌬️ Con el pampero casi no se te escucha: cuesta que dejen algo.",
    weight: 12,
    hours: [2, 4],
    fishWaitFactor: 1.25,
    fishNothingFactor: 1.6,
    vendWaitFactor: 1,
    vendNoSaleFactor: 1,
    buskWaitFactor: 1.15,
    buskNoTipFactor: 1.4,
    buskTipFactor: 0.9,
    hungerFactor: 1,
  },
  heat: {
    id: "heat",
    name: "Calor de enero",
    announce: "🥵 ¡Qué calor! Da más hambre y todos quieren un refresco.",
    fishingHint: "",
    vendingHint: "🥵 Con este calor los refrescos se venden más y más caros.",
    buskingHint: "🥵 Con el calor de enero el Centro se llena de turistas: dejan más.",
    weight: 13,
    hours: [3, 6],
    fishWaitFactor: 1,
    fishNothingFactor: 1,
    vendWaitFactor: 1,
    vendNoSaleFactor: 1,
    buskWaitFactor: 0.9,
    buskNoTipFactor: 0.9,
    buskTipFactor: 1.25,
    hungerFactor: 1.3,
  },
};

/** Con calor, los carritos de bebida fría: casi siempre alguien compra y paga más. */
export const HEAT_COLD_CARTS: readonly string[] = ["conservadora"];
export const HEAT_COLD_NO_SALE_FACTOR = 0.5;
export const HEAT_COLD_SALE_MULTIPLIER = 1.5;

/** Nunca puede quedar imposible pescar ni vender, aunque se junten factores. */
const MAX_FAIL_CHANCE = 0.9;

export function isWeatherId(value: unknown): value is WeatherId {
  return (WEATHER_IDS as readonly unknown[]).includes(value);
}

export function getWeather(id: string): Weather {
  return isWeatherId(id) ? WEATHERS[id] : WEATHERS.clear;
}

/** La caña como rinde con este clima (espera y "no pica nada"); lo demás, igual. */
export function rodInWeather(rod: RodItem, weather: Weather): RodItem {
  return {
    ...rod,
    waitFactor: rod.waitFactor * weather.fishWaitFactor,
    nothingChance: Math.min(MAX_FAIL_CHANCE, rod.nothingChance * weather.fishNothingFactor),
  };
}

/** El carrito como rinde con este clima (espera, "nadie compra" y, con calor, el precio de lo frío). */
export function cartInWeather(cart: CartItem, weather: Weather): CartItem {
  const cold = weather.id === "heat" && HEAT_COLD_CARTS.includes(cart.id);
  return {
    ...cart,
    waitFactor: cart.waitFactor * weather.vendWaitFactor,
    noSaleChance: Math.min(MAX_FAIL_CHANCE, cart.noSaleChance * weather.vendNoSaleFactor * (cold ? HEAT_COLD_NO_SALE_FACTOR : 1)),
    saleMin: cold ? Math.round(cart.saleMin * HEAT_COLD_SALE_MULTIPLIER) : cart.saleMin,
    saleMax: cold ? Math.round(cart.saleMax * HEAT_COLD_SALE_MULTIPLIER) : cart.saleMax,
  };
}

/** El instrumento como rinde con este clima: espera, "nadie deja nada" y la propina (`busk*Factor`). */
export function instrumentInWeather(instrument: InstrumentItem, weather: Weather): InstrumentItem {
  return {
    ...instrument,
    waitFactor: instrument.waitFactor * weather.buskWaitFactor,
    noTipChance: Math.min(MAX_FAIL_CHANCE, instrument.noTipChance * weather.buskNoTipFactor),
    tipMin: Math.max(1, Math.round(instrument.tipMin * weather.buskTipFactor)),
    tipMax: Math.max(1, Math.round(instrument.tipMax * weather.buskTipFactor)),
  };
}

/**
 * Si el admin fuerza el clima (`GameState.weatherMode`): "auto" lo sortea solo; un `WeatherId` lo
 * deja fijo hasta que se vuelva a "auto".
 */
export type WeatherMode = "auto" | WeatherId;

export function isWeatherMode(value: unknown): value is WeatherMode {
  return value === "auto" || isWeatherId(value);
}
