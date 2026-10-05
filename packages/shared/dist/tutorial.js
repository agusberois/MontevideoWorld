"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEW_TUTORIAL = exports.TUTORIAL_TOTAL_REWARD = exports.TUTORIAL_GIFT_ID = exports.TUTORIAL_STEPS = void 0;
exports.sanitizeTutorial = sanitizeTutorial;
exports.tutorialView = tutorialView;
const info_1 = require("./cities/ciudadVieja/info");
const items_1 = require("./items");
const CIUDAD_VIEJA = info_1.CIUDAD_VIEJA_INFO.id;
/** Área de un edificio o tienda de Ciudad Vieja (así la guía sigue al mapa si algo se mueve). */
function cityArea(id) {
    const found = [...info_1.CIUDAD_VIEJA_INFO.landmarks, ...info_1.CIUDAD_VIEJA_INFO.shops].find((place) => place.id === id);
    if (!found)
        throw new Error(`La guía apunta a algo que no está en Ciudad Vieja: ${id}`);
    return found.area;
}
const MONUMENT = cityArea("monumento-artigas");
exports.TUTORIAL_STEPS = [
    {
        title: "El Monumento a Artigas",
        text: "Caminá hasta el Monumento a Artigas, en el medio de la Plaza Independencia. Tocá el piso para caminar.",
        goal: { kind: "reach", cityId: CIUDAD_VIEJA, area: MONUMENT, within: 2 },
        reward: 15,
        target: { cityId: CIUDAD_VIEJA, name: "Monumento a Artigas", area: MONUMENT },
    },
    {
        title: "Una torta frita",
        text: "Comprate una torta frita en el Kiosco de la Plaza y comela desde la mochila (I) o la barra rápida.",
        goal: { kind: "eat", itemId: "torta-frita" },
        reward: 15,
        target: { cityId: CIUDAD_VIEJA, name: "Kiosco de la Plaza", area: cityArea("kiosco-independencia") },
    },
    {
        title: "A pescar",
        text: "Andá a la Escollera Sarandí, pará en la punta y apretá F (o el botón Pescar) para tirar la caña.",
        goal: { kind: "catch" },
        reward: 20,
        target: { cityId: CIUDAD_VIEJA, name: "Escollera Sarandí", area: info_1.ESCOLLERA_PLATFORM },
    },
    {
        title: "Al Mercado del Puerto",
        text: "Vendé lo que pescaste en la Pescadería del Mercado: ahí pagan el pescado a precio completo.",
        goal: { kind: "sell", shopId: "pescaderia-mercado", category: "fish" },
        reward: 20,
        target: { cityId: CIUDAD_VIEJA, name: "Pescadería del Mercado", area: cityArea("pescaderia-mercado") },
    },
    {
        title: "Tomate el ómnibus",
        text: "Ya tenés boleto: andá a una parada (como la de la Plaza Independencia) y tomate el ómnibus a otro barrio.",
        goal: { kind: "travel" },
        reward: 30,
        target: { cityId: CIUDAD_VIEJA, name: "Parada Plaza Independencia", area: { x: info_1.PLAZA_BUS_STOP.x, y: info_1.PLAZA_BUS_STOP.y, width: 1, height: 1 } },
        before: {
            missingItemId: items_1.TICKET_ID,
            text: "Para viajar entre barrios hace falta un boleto STM: comprá uno en la Agencia STM, sobre la Rambla 25 de Agosto.",
            target: { cityId: CIUDAD_VIEJA, name: "Agencia STM", area: cityArea("agencia-stm") },
        },
    },
];
/** Prenda de regalo al terminar la guía (la primera vez): sólo se consigue así. */
exports.TUTORIAL_GIFT_ID = "gorra-celeste";
/** Total en plata de la guía (para mostrarlo al empezar). */
exports.TUTORIAL_TOTAL_REWARD = exports.TUTORIAL_STEPS.reduce((sum, step) => sum + step.reward, 0);
exports.NEW_TUTORIAL = { status: "active", step: 0, replay: false };
/** Lo que viene de un guardado (o de la red) convertido en un estado válido; sin guardado, la guía desde el principio. */
function sanitizeTutorial(value) {
    if (typeof value !== "object" || value === null)
        return { ...exports.NEW_TUTORIAL };
    const { status, step, replay } = value;
    if (status !== "active" && status !== "done" && status !== "skipped")
        return { ...exports.NEW_TUTORIAL };
    const index = Number.isInteger(step) && step >= 0 && step < exports.TUTORIAL_STEPS.length ? step : 0;
    return { status, step: status === "active" ? index : 0, replay: replay === true };
}
/** Lo que hay que mostrar del paso ahora (texto y adónde apunta), según lo que tenga en la mochila. */
function tutorialView(step, itemIds) {
    if (step.before && !itemIds.includes(step.before.missingItemId))
        return { text: step.before.text, target: step.before.target };
    return { text: step.text, target: step.target };
}
//# sourceMappingURL=tutorial.js.map