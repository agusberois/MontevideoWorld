"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BARRA_COLORS = exports.BARRA_INVITE_MS = exports.BARRA_TAG_MAX = exports.BARRA_TAG_MIN = exports.BARRA_NAME_MAX = exports.BARRA_NAME_MIN = exports.BARRA_MAX_MEMBERS = exports.BARRA_FOUND_COST = void 0;
exports.isBarraColorId = isBarraColorId;
exports.barraColorHex = barraColorHex;
exports.readableOn = readableOn;
exports.normalizeBarraTag = normalizeBarraTag;
exports.normalizeBarraName = normalizeBarraName;
exports.barraNameProblem = barraNameProblem;
exports.barraTagProblem = barraTagProblem;
const sanitize_1 = require("./sanitize");
/**
 * Barras: los grupos de amigos ("¿de qué barra sos?"). Se fundan en el Registro de Barras de Ciudad
 * Vieja pagando `BARRA_FOUND_COST`, con un nombre, una sigla de 2 a 4 letras y dos colores. La sigla se
 * ve debajo del nombre de cada integrante. Reglas que comparten el server (que valida) y el cliente
 * (que arma el formulario). Ver `docs/pending/funcionalidades-primera-version.md` (2.2).
 */
/** Lo que cuesta fundar una barra (saca plata de la economía y hace que fundarla sea un logro). */
exports.BARRA_FOUND_COST = 5000;
/** Tope de integrantes, para que haya muchas barras y no una gigante. */
exports.BARRA_MAX_MEMBERS = 30;
exports.BARRA_NAME_MIN = 3;
exports.BARRA_NAME_MAX = 24;
exports.BARRA_TAG_MIN = 2;
exports.BARRA_TAG_MAX = 4;
/** Lo que dura una invitación sin responder. */
exports.BARRA_INVITE_MS = 60_000;
/** Los colores para elegir (dos por barra, como la camiseta de un club de barrio). */
exports.BARRA_COLORS = [
    { id: "celeste", name: "Celeste", hex: "#6cace4" },
    { id: "azul", name: "Azul", hex: "#1d4fa0" },
    { id: "blanco", name: "Blanco", hex: "#f1f1f1" },
    { id: "negro", name: "Negro", hex: "#26262b" },
    { id: "rojo", name: "Rojo", hex: "#d62828" },
    { id: "amarillo", name: "Amarillo", hex: "#f2c94c" },
    { id: "verde", name: "Verde", hex: "#2e9e5b" },
    { id: "violeta", name: "Violeta", hex: "#8a4dff" },
    { id: "naranja", name: "Naranja", hex: "#f28c28" },
    { id: "bordo", name: "Bordó", hex: "#7b1e2b" },
];
function isBarraColorId(value) {
    return exports.BARRA_COLORS.some((color) => color.id === value);
}
function barraColorHex(id) {
    return exports.BARRA_COLORS.find((color) => color.id === id)?.hex ?? "#f1f1f1";
}
/** Texto que se lee sobre un fondo de este color ("#rrggbb"): negro sobre claros, blanco sobre oscuros (la sigla de la barra). */
function readableOn(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    const luminance = (0.299 * ((value >> 16) & 255) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255;
    return luminance > 0.6 ? "#1a1a1f" : "#ffffff";
}
/** Siglas que nadie puede usar (parecen del staff del juego). Se comparan en mayúsculas. */
const RESERVED_TAGS = new Set(["ADM", "ADMN", "ADMI", "MOD", "MODS", "STAF", "SIST", "SYS", "GM", "DEV", "MW", "OFIC"]);
/** La sigla como se guarda y se muestra: mayúsculas, sólo letras y números. */
function normalizeBarraTag(raw) {
    return raw
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}
/** El nombre como se guarda (la misma limpieza que los nombres de jugador). */
function normalizeBarraName(raw) {
    return (0, sanitize_1.sanitizeLabel)(raw, exports.BARRA_NAME_MAX + 1);
}
/** Por qué este nombre no sirve (null = sirve). Recibe el nombre ya normalizado. */
function barraNameProblem(name) {
    if (name.length < exports.BARRA_NAME_MIN)
        return `El nombre tiene que tener al menos ${exports.BARRA_NAME_MIN} letras.`;
    if (name.length > exports.BARRA_NAME_MAX)
        return `El nombre puede tener hasta ${exports.BARRA_NAME_MAX} letras.`;
    const key = (0, sanitize_1.nameKey)(name);
    if (["admin", "moderador", "sistema", "staff", "montevideoworld"].some((word) => key.includes(word))) {
        return "Ese nombre no se puede usar.";
    }
    return null;
}
/** Por qué esta sigla no sirve (null = sirve). Recibe la sigla ya normalizada. */
function barraTagProblem(tag) {
    if (tag.length < exports.BARRA_TAG_MIN || tag.length > exports.BARRA_TAG_MAX) {
        return `La sigla tiene que tener de ${exports.BARRA_TAG_MIN} a ${exports.BARRA_TAG_MAX} letras o números.`;
    }
    if (RESERVED_TAGS.has(tag) || tag.startsWith("ADM") || tag.startsWith("MOD"))
        return "Esa sigla no se puede usar.";
    return null;
}
//# sourceMappingURL=barras.js.map