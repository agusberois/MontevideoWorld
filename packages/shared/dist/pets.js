"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PET_NAME_MAX_LENGTH = exports.PETS = void 0;
exports.getPet = getPet;
exports.sanitizePetName = sanitizePetName;
const sanitize_1 = require("./sanitize");
exports.PETS = [
    {
        id: "perro-mestizo",
        name: "Perro mestizo",
        kind: "dog",
        color: "#c89b62",
        accent: "#8a6236",
        size: 1,
        price: 400,
        description: "Rescatado de la calle: fiel como ninguno.",
    },
    {
        id: "cimarron",
        name: "Cimarrón uruguayo",
        kind: "dog",
        color: "#b0773d",
        accent: "#3b2a1c",
        size: 1.15,
        price: 1500,
        description: "El perro nacional: grandote, atigrado y guardián.",
    },
    {
        id: "salchicha",
        name: "Salchicha",
        kind: "dog",
        color: "#6b3e1e",
        accent: "#3a2010",
        size: 0.8,
        price: 1000,
        description: "Largo, petiso y con mucha personalidad.",
    },
    {
        id: "gato-atigrado",
        name: "Gato atigrado",
        kind: "cat",
        color: "#d08a45",
        accent: "#8a4f1d",
        size: 0.85,
        price: 600,
        description: "Te sigue cuando quiere. Casi siempre.",
    },
    {
        id: "gato-negro",
        name: "Gato negro",
        kind: "cat",
        color: "#2b2b30",
        accent: "#4a4a52",
        size: 0.85,
        price: 600,
        description: "Trae suerte (dicen).",
    },
    {
        id: "carpincho",
        name: "Carpincho",
        kind: "capybara",
        color: "#8b6a4a",
        accent: "#5e4630",
        size: 1.2,
        price: 4000,
        description: "El más tranquilo del Río de la Plata. Exclusivo.",
    },
];
function getPet(id) {
    return exports.PETS.find((pet) => pet.id === id);
}
exports.PET_NAME_MAX_LENGTH = 14;
/** Nombre de la mascota: limpio como el de un jugador (`sanitizeLabel`), hasta `PET_NAME_MAX_LENGTH`. */
function sanitizePetName(value) {
    return (0, sanitize_1.sanitizeLabel)(value, exports.PET_NAME_MAX_LENGTH);
}
//# sourceMappingURL=pets.js.map