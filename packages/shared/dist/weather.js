"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEAT_COLD_SALE_MULTIPLIER = exports.HEAT_COLD_NO_SALE_FACTOR = exports.HEAT_COLD_CARTS = exports.WEATHERS = exports.WEATHER_IDS = void 0;
exports.isWeatherId = isWeatherId;
exports.getWeather = getWeather;
exports.rodInWeather = rodInWeather;
exports.cartInWeather = cartInWeather;
exports.instrumentInWeather = instrumentInWeather;
exports.isWeatherMode = isWeatherMode;
/**
 * Clima de Montevideo: global para todo el server como la hora (todos los barrios tienen el mismo).
 * Lo decide el server (`weather.ts` del server: cada clima dura unas horas del juego y después
 * sortea otro) y cada sala lo copia a `GameState.weather`. Cambia un poco la pesca, la venta y el
 * hambre; acá están los efectos, así el server sortea y el cliente avisa con los mismos números.
 */
exports.WEATHER_IDS = ["clear", "rain", "pampero", "heat"];
exports.WEATHERS = {
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
exports.HEAT_COLD_CARTS = ["conservadora"];
exports.HEAT_COLD_NO_SALE_FACTOR = 0.5;
exports.HEAT_COLD_SALE_MULTIPLIER = 1.5;
/** Nunca puede quedar imposible pescar ni vender, aunque se junten factores. */
const MAX_FAIL_CHANCE = 0.9;
function isWeatherId(value) {
    return exports.WEATHER_IDS.includes(value);
}
function getWeather(id) {
    return isWeatherId(id) ? exports.WEATHERS[id] : exports.WEATHERS.clear;
}
/** La caña como rinde con este clima (espera y "no pica nada"); lo demás, igual. */
function rodInWeather(rod, weather) {
    return {
        ...rod,
        waitFactor: rod.waitFactor * weather.fishWaitFactor,
        nothingChance: Math.min(MAX_FAIL_CHANCE, rod.nothingChance * weather.fishNothingFactor),
    };
}
/** El carrito como rinde con este clima (espera, "nadie compra" y, con calor, el precio de lo frío). */
function cartInWeather(cart, weather) {
    const cold = weather.id === "heat" && exports.HEAT_COLD_CARTS.includes(cart.id);
    return {
        ...cart,
        waitFactor: cart.waitFactor * weather.vendWaitFactor,
        noSaleChance: Math.min(MAX_FAIL_CHANCE, cart.noSaleChance * weather.vendNoSaleFactor * (cold ? exports.HEAT_COLD_NO_SALE_FACTOR : 1)),
        saleMin: cold ? Math.round(cart.saleMin * exports.HEAT_COLD_SALE_MULTIPLIER) : cart.saleMin,
        saleMax: cold ? Math.round(cart.saleMax * exports.HEAT_COLD_SALE_MULTIPLIER) : cart.saleMax,
    };
}
/** El instrumento como rinde con este clima: espera, "nadie deja nada" y la propina (`busk*Factor`). */
function instrumentInWeather(instrument, weather) {
    return {
        ...instrument,
        waitFactor: instrument.waitFactor * weather.buskWaitFactor,
        noTipChance: Math.min(MAX_FAIL_CHANCE, instrument.noTipChance * weather.buskNoTipFactor),
        tipMin: Math.max(1, Math.round(instrument.tipMin * weather.buskTipFactor)),
        tipMax: Math.max(1, Math.round(instrument.tipMax * weather.buskTipFactor)),
    };
}
function isWeatherMode(value) {
    return value === "auto" || isWeatherId(value);
}
//# sourceMappingURL=weather.js.map