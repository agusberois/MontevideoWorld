"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncate = truncate;
exports.sanitizeLabel = sanitizeLabel;
exports.sanitizeName = sanitizeName;
exports.sanitizeChat = sanitizeChat;
exports.nameKey = nameKey;
exports.isReservedName = isReservedName;
const constants_1 = require("./constants");
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/g;
/**
 * Caracteres de formato (`\p{Cf}`): marcas bidi (U+202A–202E, U+2066–2069, dan vuelta lo que se
 * ve), ancho cero (U+200B–200D, U+2060, U+FEFF), guion blando (U+00AD)… Invisibles: servían para
 * hacer un nombre que se ve igual a otro. Más los "rellenos" que se ven en blanco aunque son letras.
 */
const FORMAT_CHARS = /[\p{Cf}ᅟᅠㅤﾠ⠀]/gu;
/** En el chat se deja el unidor de ancho cero (U+200D): arma los emojis compuestos (familias, banderas…). */
const CHAT_FORMAT_CHARS = /(?!‍)[\p{Cf}ᅟᅠㅤﾠ⠀]/gu;
/** Marcas combinantes seguidas (texto "zalgo" que se sale del renglón): se deja una. */
const STACKED_MARKS = /(\p{M})\p{M}+/gu;
/**
 * Los primeros `maxLength` caracteres, contados por punto de código: `slice` cuenta unidades UTF-16
 * y podía cortar un emoji a la mitad (queda un sustituto suelto, que se ve como "�").
 */
function truncate(value, maxLength) {
    if (value.length <= maxLength)
        return value;
    return Array.from(value).slice(0, maxLength).join("").trim();
}
/**
 * Nombre de jugador o de mascota: forma normal NFKC (letras "de ancho completo", ligaduras y
 * variantes pasan a la común), sin caracteres de control ni invisibles, a lo sumo una marca
 * combinante seguida, espacios colapsados y hasta `maxLength` caracteres.
 */
function sanitizeLabel(value, maxLength) {
    if (typeof value !== "string")
        return "";
    const cleaned = value
        .normalize("NFKC")
        .replace(CONTROL_CHARS, "")
        .replace(FORMAT_CHARS, "")
        .replace(STACKED_MARKS, "$1")
        .replace(/\s+/g, " ")
        .trim();
    return truncate(cleaned, maxLength);
}
function sanitizeName(value) {
    return sanitizeLabel(value, constants_1.NAME_MAX_LENGTH);
}
function sanitizeChat(value) {
    if (typeof value !== "string")
        return "";
    const cleaned = value
        .replace(CONTROL_CHARS, "")
        .replace(CHAT_FORMAT_CHARS, "")
        .replace(STACKED_MARKS, "$1")
        .replace(/\s+/g, " ")
        .trim();
    return truncate(cleaned, constants_1.CHAT_MAX_LENGTH);
}
/**
 * Letras que se ven iguales a una latina (cirílico, griego, IPA) y dígitos o signos que pasan por
 * letras. Lista básica, no la tabla completa de Unicode: alcanza para que "АGOSHO" (A cirílica),
 * "AG0SHO" o "lván" no pasen por "AGOSHO" o "Iván".
 */
const CONFUSABLES = new Map(Object.entries({
    // Cirílico
    А: "a", а: "a", В: "b", в: "b", Е: "e", е: "e", Ѕ: "s", ѕ: "s", І: "i", і: "i", Ј: "j", ј: "j",
    К: "k", к: "k", М: "m", м: "m", Н: "h", н: "h", О: "o", о: "o", Р: "p", р: "p", С: "c", с: "c",
    Т: "t", т: "t", У: "y", у: "y", Х: "x", х: "x", Ү: "y", ү: "y", һ: "h", ԁ: "d", ԛ: "q", ԝ: "w", ь: "b",
    // Griego
    Α: "a", α: "a", Β: "b", β: "b", Ε: "e", ε: "e", Ζ: "z", Η: "h", Ι: "i", ι: "i", Κ: "k", κ: "k",
    Μ: "m", Ν: "n", ν: "v", Ο: "o", ο: "o", Ρ: "p", ρ: "p", Τ: "t", τ: "t", Υ: "y", υ: "u", Χ: "x", χ: "x",
    // IPA y otros
    ı: "i", ɡ: "g", ɑ: "a", ɩ: "i", ʏ: "y",
    // Dígitos y signos
    "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "@": "a", "$": "s", "!": "l", "|": "l",
}));
/**
 * "Esqueleto" de un nombre para compararlo con otro: dos nombres que se ven parecidos dan el mismo
 * (mayúsculas, tildes, letras de otros alfabetos que se ven iguales, I/l/1, rn/m, espacios y signos
 * no cuentan). Lo usan los nombres únicos y reservados y las búsquedas por nombre (`/mensaje`,
 * `/ban`…). Un nombre sin letras ni números (sólo emojis) se compara tal cual, en minúsculas.
 */
function nameKey(name) {
    const plain = name.normalize("NFKC").toLocaleLowerCase("es").replace(/\s+/g, " ").trim();
    const mapped = Array.from(name.normalize("NFKC"), (char) => CONFUSABLES.get(char) ?? char).join("");
    const skeleton = mapped
        .toLocaleLowerCase("es")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[^\p{L}\p{N}]/gu, "")
        .replace(/i/g, "l")
        .replace(/rn/g, "m")
        .replace(/vv/g, "w");
    return skeleton || plain;
}
/**
 * Nombres que nadie puede usar (ni parecidos): se haría pasar por el sistema o por la moderación.
 * El nombre del admin se agrega aparte (`isReservedName`). Los de `RESERVED_WORDS` no pueden ni
 * aparecer adentro ("AdminJuan").
 */
const RESERVED_NAMES = ["mod", "staff", "soporte", "montevideoworld", "server", "servidor"].map(nameKey);
const RESERVED_WORDS = ["admin", "sistema", "moderador", "moderacion"].map(nameKey);
/** ¿Es (o se parece a) un nombre reservado? `adminName`: el del admin, que tampoco puede imitarse. */
function isReservedName(name, adminName = null) {
    const key = nameKey(name);
    if (RESERVED_NAMES.includes(key) || RESERVED_WORDS.some((word) => key.includes(word)))
        return true;
    return adminName !== null && key === nameKey(adminName);
}
//# sourceMappingURL=sanitize.js.map