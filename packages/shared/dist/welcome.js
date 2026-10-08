"use strict";
/**
 * Bienvenida del jugador nuevo: un mensaje (el sobre ✉️ del HUD) con una misión guiada. Hay que
 * buscar al cartero en la Plaza Independencia (Ciudad Vieja), que da un sobre a tu nombre; llevarlo
 * a la funcionaria de la Intendencia (Centro), que lo recibe; y abrirlo: es la carta de bienvenida,
 * con algo del juego y la elección de una profesión. Quien vende o tira el sobre en el camino se queda
 * sin carta y le toca ser cuidacoches (`LETTER_LOST_PROFESSION`): la misión termina ahí. Las
 * profesiones todavía no hacen nada: sólo se guarda la elegida. El server decide cada paso
 * (`systems/welcome.ts`) y lo guarda con el progreso.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WELCOME_CLERK_ID = exports.WELCOME_COURIER_ID = exports.WELCOME_LETTER_ID = exports.NEW_WELCOME = exports.LETTER_LOST_PROFESSION = exports.PROFESSIONS = void 0;
exports.getProfession = getProfession;
exports.isProfessionId = isProfessionId;
exports.isChoosableProfession = isChoosableProfession;
exports.sanitizeWelcome = sanitizeWelcome;
const WELCOME_STAGES = ["mail", "courier", "deliver", "profession", "done"];
/** Profesiones. `choosable`: se eligen en la carta; la otra (cuidacoches) toca al perder el sobre. */
exports.PROFESSIONS = [
    { id: "pescador", name: "Pescador", emoji: "🎣", choosable: true, description: "La caña, el río y la paciencia: de la Escollera Sarandí al Mercado del Puerto." },
    { id: "vendedor", name: "Vendedor", emoji: "🛒", choosable: true, description: "El carrito en la explanada del Centenario, a pura charla con los hinchas." },
    { id: "musico", name: "Músico", emoji: "🎸", choosable: true, description: "Tocar sobre 18 de Julio y en las plazas del Centro, por unas monedas." },
    { id: "cuidacoches", name: "Cuidacoches", emoji: "🦺", choosable: false, description: "Chaleco flúo y \"¿te lo cuido, jefe?\": la calle te eligió a vos." },
];
/** La que toca al vender o tirar el sobre de bienvenida antes de entregarlo. */
exports.LETTER_LOST_PROFESSION = "cuidacoches";
function getProfession(id) {
    return exports.PROFESSIONS.find((profession) => profession.id === id);
}
function isProfessionId(value) {
    return exports.PROFESSIONS.some((profession) => profession.id === value);
}
/** Una de las que se eligen en la carta (lo que valida `welcome:profession`). */
function isChoosableProfession(value) {
    return exports.PROFESSIONS.some((profession) => profession.choosable && profession.id === value);
}
/** Con esto arranca un jugador nuevo. */
exports.NEW_WELCOME = { stage: "mail", profession: null };
/**
 * Lo que viene de un guardado convertido en un estado válido. Sin el campo (guardados de antes de
 * la bienvenida), terminada: es sólo para los que entran por primera vez.
 */
function sanitizeWelcome(value) {
    if (typeof value !== "object" || value === null)
        return { stage: "done", profession: null };
    const { stage, profession } = value;
    return {
        stage: WELCOME_STAGES.includes(stage) ? stage : "done",
        profession: isProfessionId(profession) ? profession : null,
    };
}
/** El sobre que da el cartero (categoría `letter`: no se intercambia; se vende en el kiosco o se tira). */
exports.WELCOME_LETTER_ID = "sobre-bienvenida";
/** Los NPCs de la bienvenida (`CityDefinition.npcs`), por id. */
exports.WELCOME_COURIER_ID = "cartero";
exports.WELCOME_CLERK_ID = "funcionaria-intendencia";
//# sourceMappingURL=welcome.js.map