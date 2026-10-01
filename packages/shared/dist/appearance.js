"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HAIR_STYLE_LABELS = exports.HAIR_STYLES = exports.HAIR_COLORS = exports.SKIN_TONES = exports.GENDER_LABELS = exports.GENDERS = void 0;
exports.randomAppearance = randomAppearance;
exports.sanitizeAppearance = sanitizeAppearance;
const constants_1 = require("./constants");
/**
 * Aspecto del avatar que el jugador elige al entrar (sexo, piel, pelo y color). Viaja en las opciones
 * de join, el server lo valida (`sanitizeAppearance`) y lo copia al Schema: todos lo ven igual.
 * Las paletas son listas fijas y el Schema guarda el índice, así nadie inventa colores.
 */
exports.GENDERS = ["m", "f"];
exports.GENDER_LABELS = { m: "Hombre", f: "Mujer" };
exports.SKIN_TONES = ["#f6d5b8", "#eac09a", "#d9a273", "#b57a4c", "#8d5a3b", "#5e3a25"];
exports.HAIR_COLORS = ["#1b1310", "#3b2416", "#6b4226", "#a8742f", "#d9b26a", "#9c3b1f", "#8a8a8a"];
exports.HAIR_STYLES = ["short", "long", "afro", "buzz", "ponytail"];
exports.HAIR_STYLE_LABELS = {
    short: "Corto",
    long: "Largo",
    afro: "Afro",
    buzz: "Rapado",
    ponytail: "Colita",
};
/** Peinados que el dado prefiere para cada sexo (igual se puede elegir cualquiera). */
const LIKELY_HAIR = {
    m: ["short", "short", "buzz", "afro", "long"],
    f: ["long", "long", "ponytail", "ponytail", "afro", "short"],
};
/** Un aspecto al azar (el dado de la pantalla de ingreso y el default del server). */
function randomAppearance(random = Math.random) {
    const pick = (items) => items[Math.floor(random() * items.length)];
    const gender = pick(exports.GENDERS);
    return {
        gender,
        skin: Math.floor(random() * exports.SKIN_TONES.length),
        hairColor: Math.floor(random() * exports.HAIR_COLORS.length),
        hairStyle: pick(LIKELY_HAIR[gender]),
        color: pick(constants_1.PLAYER_COLORS),
    };
}
/** Valida un aspecto que llega por red; null si algún campo no es de las listas. */
function sanitizeAppearance(value) {
    if (typeof value !== "object" || value === null)
        return null;
    const { gender, skin, hairColor, hairStyle, color } = value;
    if (!exports.GENDERS.includes(gender))
        return null;
    if (!isIndex(skin, exports.SKIN_TONES.length) || !isIndex(hairColor, exports.HAIR_COLORS.length))
        return null;
    if (!exports.HAIR_STYLES.includes(hairStyle))
        return null;
    if (!constants_1.PLAYER_COLORS.includes(color))
        return null;
    return { gender: gender, skin, hairColor, hairStyle: hairStyle, color: color };
}
function isIndex(value, length) {
    return Number.isInteger(value) && value >= 0 && value < length;
}
//# sourceMappingURL=appearance.js.map