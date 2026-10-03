"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLASSES_LABELS = exports.GLASSES = exports.FACIAL_HAIR_LABELS = exports.FACIAL_HAIR = exports.EYE_COLORS = exports.HAIR_STYLE_LABELS = exports.HAIR_STYLES = exports.HAIR_COLORS = exports.SKIN_TONES = exports.GENDER_LABELS = exports.GENDERS = void 0;
exports.randomAppearance = randomAppearance;
exports.sanitizeAppearance = sanitizeAppearance;
const constants_1 = require("./constants");
/**
 * Aspecto del avatar que el jugador elige al entrar (sexo, piel, pelo, ojos, barba, lentes y color). Viaja en las opciones
 * de join, el server lo valida (`sanitizeAppearance`) y lo copia al Schema: todos lo ven igual.
 * Las paletas son listas fijas y el Schema guarda el índice, así nadie inventa colores.
 */
exports.GENDERS = ["m", "f"];
exports.GENDER_LABELS = { m: "Hombre", f: "Mujer" };
exports.SKIN_TONES = ["#f6d5b8", "#eac09a", "#d9a273", "#b57a4c", "#8d5a3b", "#5e3a25"];
exports.HAIR_COLORS = ["#1b1310", "#3b2416", "#6b4226", "#a8742f", "#d9b26a", "#9c3b1f", "#8a8a8a"];
exports.HAIR_STYLES = ["short", "long", "afro", "buzz", "ponytail", "curly", "braids", "bun", "dreads"];
exports.HAIR_STYLE_LABELS = {
    short: "Corto",
    long: "Largo",
    afro: "Afro",
    buzz: "Rapado",
    ponytail: "Colita",
    curly: "Rulos",
    braids: "Trenzas",
    bun: "Moño",
    dreads: "Rastas",
};
/** Marrón oscuro, marrón, negro, verde y celeste. */
exports.EYE_COLORS = ["#2b1d14", "#6b4226", "#141414", "#3f7a52", "#4f86b8"];
exports.FACIAL_HAIR = ["none", "stubble", "mustache", "goatee", "beard"];
exports.FACIAL_HAIR_LABELS = {
    none: "Sin barba",
    stubble: "De días",
    mustache: "Bigote",
    goatee: "Chiva",
    beard: "Barba",
};
exports.GLASSES = ["none", "round", "square", "sun"];
exports.GLASSES_LABELS = {
    none: "Sin lentes",
    round: "Redondos",
    square: "Cuadrados",
    sun: "De sol",
};
/** Peinados que el dado prefiere para cada sexo (igual se puede elegir cualquiera). */
const LIKELY_HAIR = {
    m: ["short", "short", "buzz", "afro", "long", "curly", "dreads"],
    f: ["long", "long", "ponytail", "ponytail", "afro", "short", "curly", "braids", "bun"],
};
/** Barbas que tira el dado (al avatar de mujer, ninguna; igual se puede elegir). */
const LIKELY_FACIAL_HAIR = {
    m: ["none", "none", "none", "stubble", "mustache", "goatee", "beard"],
    f: ["none"],
};
/** Lentes que tira el dado: la mayoría sin. */
const LIKELY_GLASSES = ["none", "none", "none", "none", "round", "square", "sun"];
/** Un aspecto al azar (el dado de la pantalla de ingreso y el default del server). */
function randomAppearance(random = Math.random) {
    const pick = (items) => items[Math.floor(random() * items.length)];
    const gender = pick(exports.GENDERS);
    return {
        gender,
        skin: Math.floor(random() * exports.SKIN_TONES.length),
        hairColor: Math.floor(random() * exports.HAIR_COLORS.length),
        hairStyle: pick(LIKELY_HAIR[gender]),
        eyeColor: Math.floor(random() * exports.EYE_COLORS.length),
        facialHair: pick(LIKELY_FACIAL_HAIR[gender]),
        glasses: pick(LIKELY_GLASSES),
        color: pick(constants_1.PLAYER_COLORS),
    };
}
/**
 * Valida un aspecto que llega por red; null si algún campo no es de las listas. Ojos, barba y lentes
 * son posteriores: si faltan (un aspecto guardado en el navegador antes de que existieran, o un
 * cliente viejo) van los de por defecto en vez de descartar todo; si vienen, tienen que ser válidos.
 */
function sanitizeAppearance(value) {
    if (typeof value !== "object" || value === null)
        return null;
    const { gender, skin, hairColor, hairStyle, color, eyeColor = 0, facialHair = "none", glasses = "none" } = value;
    if (!exports.GENDERS.includes(gender))
        return null;
    if (!isIndex(skin, exports.SKIN_TONES.length) || !isIndex(hairColor, exports.HAIR_COLORS.length))
        return null;
    if (!exports.HAIR_STYLES.includes(hairStyle))
        return null;
    if (!isIndex(eyeColor, exports.EYE_COLORS.length))
        return null;
    if (!exports.FACIAL_HAIR.includes(facialHair) || !exports.GLASSES.includes(glasses))
        return null;
    if (!constants_1.PLAYER_COLORS.includes(color))
        return null;
    return {
        gender: gender,
        skin,
        hairColor,
        hairStyle: hairStyle,
        eyeColor,
        facialHair: facialHair,
        glasses: glasses,
        color: color,
    };
}
function isIndex(value, length) {
    return Number.isInteger(value) && value >= 0 && value < length;
}
//# sourceMappingURL=appearance.js.map