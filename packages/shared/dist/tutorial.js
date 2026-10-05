"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEW_TUTORIAL = exports.TUTORIAL_TOTAL_REWARD = exports.TUTORIAL_GIFT_ID = exports.TUTORIAL_STEPS = void 0;
exports.sanitizeTutorial = sanitizeTutorial;
exports.tutorialView = tutorialView;
const items_1 = require("./items");
const CIUDAD_VIEJA = "ciudad-vieja";
exports.TUTORIAL_STEPS = [
    {
        title: "El Monumento a Artigas",
        text: "Caminá hasta el Monumento a Artigas, en el medio de la Plaza Independencia. Tocá el piso para caminar.",
        goal: { kind: "reach", cityId: CIUDAD_VIEJA, area: { x: 62, y: 24, width: 3, height: 3 }, within: 2 },
        reward: 15,
        target: { cityId: CIUDAD_VIEJA, name: "Monumento a Artigas", area: { x: 62, y: 24, width: 3, height: 3 } },
    },
    {
        title: "Una torta frita",
        text: "Comprate una torta frita en el Kiosco de la Plaza y comela desde la mochila (H) o la barra rápida.",
        goal: { kind: "eat", itemId: "torta-frita" },
        reward: 15,
        target: { cityId: CIUDAD_VIEJA, name: "Kiosco de la Plaza", area: { x: 54, y: 18, width: 2, height: 2 } },
    },
    {
        title: "A pescar",
        text: "Andá a la Escollera Sarandí, pará en la punta y apretá F (o el botón Pescar) para tirar la caña.",
        goal: { kind: "catch" },
        reward: 20,
        target: { cityId: CIUDAD_VIEJA, name: "Escollera Sarandí", area: { x: 59, y: 46, width: 3, height: 3 } },
    },
    {
        title: "Al Mercado del Puerto",
        text: "Vendé lo que pescaste en la Pescadería del Mercado: ahí pagan el pescado a precio completo.",
        goal: { kind: "sell", shopId: "pescaderia-mercado", category: "fish" },
        reward: 20,
        target: { cityId: CIUDAD_VIEJA, name: "Pescadería del Mercado", area: { x: 8, y: 3, width: 5, height: 5 } },
    },
    {
        title: "Tomate el ómnibus",
        text: "Ya tenés boleto: andá a una parada (como la de la Plaza Independencia) y tomate el ómnibus a otro barrio.",
        goal: { kind: "travel" },
        reward: 30,
        target: { cityId: CIUDAD_VIEJA, name: "Parada Plaza Independencia", area: { x: 52, y: 37, width: 1, height: 1 } },
        before: {
            missingItemId: items_1.TICKET_ID,
            text: "Para viajar entre barrios hace falta un boleto STM: comprá uno en la Agencia STM, sobre la Rambla 25 de Agosto.",
            target: { cityId: CIUDAD_VIEJA, name: "Agencia STM", area: { x: 27, y: 3, width: 2, height: 2 } },
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