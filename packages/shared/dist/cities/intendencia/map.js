"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INTENDENCIA = void 0;
const welcome_1 = require("../../welcome");
const layoutBuilder_1 = require("../layoutBuilder");
const types_1 = require("../types");
const info_1 = require("./info");
/**
 * La Intendencia por dentro: un hall de mármol con las paredes al norte y al oeste (las de adelante
 * no se dibujan, para ver la sala), la puerta doble de salida en la pared oeste, los escritorios con
 * sus empleados contra la pared norte y bancos de espera en el medio.
 */
const builder = new layoutBuilder_1.LayoutBuilder(info_1.WIDTH, info_1.HEIGHT, types_1.TileChar.Floor)
    .row(0, 0, info_1.WIDTH - 1, types_1.TileChar.InnerWall)
    .column(0, 0, info_1.HEIGHT - 1, types_1.TileChar.InnerWall);
/** La salida (puerta doble en la pared oeste): deja en la explanada, frente a la entrada del edificio. */
const exit = {
    id: "salida",
    name: "Salir al Centro",
    area: { x: 0, y: 6, width: 1, height: 2 },
    to: { cityId: "centro", at: { x: 117, y: 39 } },
};
/** Quién atiende en cada escritorio, en el orden de `DESKS` (la primera es la de la bienvenida). */
const EMPLOYEES = [
    {
        id: welcome_1.WELCOME_CLERK_ID,
        name: "Funcionaria de la Intendencia",
        role: "Intendencia de Montevideo · Atención al público",
        appearance: { gender: "f", skin: 2, hairColor: 1, hairStyle: "bun", eyeColor: 0, facialHair: "none", glasses: "square", color: "#9b5de5" },
        outfit: { hat: "", top: "buzo-bordo", bottom: "pantalon-vestir-negro", shoes: "botas-negras" },
    },
    {
        id: "empleado-tramites",
        name: "Empleado de Trámites",
        role: "Intendencia de Montevideo · Trámites",
        appearance: { gender: "m", skin: 1, hairColor: 2, hairStyle: "short", eyeColor: 1, facialHair: "beard", glasses: "none", color: "#4d908e" },
        outfit: { hat: "", top: "remera-blanca", bottom: "pantalon-vestir-negro", shoes: "championes-negros" },
        lines: [
            "Para ese trámite le falta un formulario. ¿Cuál? El que le voy a dar en la ventanilla de al lado.",
            "Número 47… ¿no? Bueno, siéntese que ya lo llamamos.",
            "El sistema está lento hoy. Como todos los días, bah.",
        ],
    },
    {
        id: "empleada-tributos",
        name: "Empleada de Tributos",
        role: "Intendencia de Montevideo · Tributos",
        appearance: { gender: "f", skin: 0, hairColor: 4, hairStyle: "long", eyeColor: 2, facialHair: "none", glasses: "none", color: "#f9844a" },
        outfit: { hat: "", top: "buzo-gris", bottom: "jean", shoes: "botas-marrones" },
        lines: [
            "¿Viene a pagar la contribución? Por suerte acá en Montevideo World todavía no se cobra.",
            "Si le llega una multa por estacionar, no fue culpa nuestra. Hable con los cuidacoches.",
            "Tributos, buenas. No, el mate no es mío, es de la oficina.",
        ],
    },
    {
        id: "empleado-catastro",
        name: "Empleado de Catastro",
        role: "Intendencia de Montevideo · Catastro",
        appearance: { gender: "m", skin: 3, hairColor: 0, hairStyle: "short", eyeColor: 0, facialHair: "mustache", glasses: "round", color: "#577590" },
        outfit: { hat: "", top: "remera-negra", bottom: "pantalon-beige", shoes: "championes-negros" },
        lines: [
            "Catastro: acá tenemos el plano de cada baldosa de la ciudad. Bueno, de casi todas.",
            "¿Un terreno en la Ciudad Vieja? Uh, eso está carísimo. Y no se pueden agrandar, eh.",
            "Volvé mañana, que hoy se cayó el sistema. Ah, no, era el monitor apagado.",
        ],
    },
];
exports.INTENDENCIA = {
    ...info_1.INTENDENCIA_INFO,
    layout: builder.build(),
    spawnArea: { x: 1, y: 5, width: 3, height: 4 },
    // Bancos de espera, en dos filas, mirando a la cámara.
    benches: [7, 11, 15].flatMap((x) => [...(0, types_1.doubleBench)(x, 8, "south"), ...(0, types_1.doubleBench)(x, 11, "south")]),
    busStops: [],
    doors: [exit],
    // Piso de mármol claro y paredes de cal con zócalo de madera.
    interior: {
        floor: ["#ddd6c6", "#cfc7b4"],
        wall: "#efe8d8",
        wallBase: "#6b4f37",
        wallTrim: "#b8a37a",
    },
    // Cada empleado, quieto detrás de su escritorio; se le habla desde adelante de la mesa.
    npcs: EMPLOYEES.map((employee, i) => ({
        ...employee,
        roam: { x: info_1.DESKS[i], y: info_1.DESK_Y, width: 1, height: 1 },
        counter: { x: info_1.DESKS[i], y: info_1.DESK_Y + 1, width: 2, height: 1 },
        talks: true,
    })),
    placeLabels: [{ name: "Atención al público", x: 10.5, y: 5.2 }],
};
//# sourceMappingURL=map.js.map