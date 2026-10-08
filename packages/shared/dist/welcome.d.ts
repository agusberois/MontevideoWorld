/**
 * Bienvenida del jugador nuevo: un mensaje (el sobre ✉️ del HUD) con una misión guiada. Hay que
 * buscar al cartero en la Plaza Independencia (Ciudad Vieja), que da un sobre a tu nombre; llevarlo
 * a la funcionaria de la Intendencia (Centro), que lo recibe; y abrirlo: es la carta de bienvenida,
 * con algo del juego y la elección de una profesión. Quien vende o tira el sobre en el camino se queda
 * sin carta y le toca ser cuidacoches (`LETTER_LOST_PROFESSION`): la misión termina ahí. Las
 * profesiones todavía no hacen nada: sólo se guarda la elegida. El server decide cada paso
 * (`systems/welcome.ts`) y lo guarda con el progreso.
 */
/**
 * En qué va la bienvenida:
 * - `mail`: el mensaje no se abrió todavía (el sobre del HUD tiene el punto de "sin leer").
 * - `courier`: buscar al cartero. `deliver`: llevar el sobre a la Intendencia.
 * - `profession`: entregado; la carta está abierta y falta elegir profesión. `done`: terminada.
 */
export type WelcomeStage = "mail" | "courier" | "deliver" | "profession" | "done";
/** Profesiones. `choosable`: se eligen en la carta; la otra (cuidacoches) toca al perder el sobre. */
export declare const PROFESSIONS: readonly [{
    readonly id: "pescador";
    readonly name: "Pescador";
    readonly emoji: "🎣";
    readonly choosable: true;
    readonly description: "La caña, el río y la paciencia: de la Escollera Sarandí al Mercado del Puerto.";
}, {
    readonly id: "vendedor";
    readonly name: "Vendedor";
    readonly emoji: "🛒";
    readonly choosable: true;
    readonly description: "El carrito en la explanada del Centenario, a pura charla con los hinchas.";
}, {
    readonly id: "musico";
    readonly name: "Músico";
    readonly emoji: "🎸";
    readonly choosable: true;
    readonly description: "Tocar sobre 18 de Julio y en las plazas del Centro, por unas monedas.";
}, {
    readonly id: "cuidacoches";
    readonly name: "Cuidacoches";
    readonly emoji: "🦺";
    readonly choosable: false;
    readonly description: "Chaleco flúo y \"¿te lo cuido, jefe?\": la calle te eligió a vos.";
}];
export type Profession = (typeof PROFESSIONS)[number];
export type ProfessionId = Profession["id"];
/** La que toca al vender o tirar el sobre de bienvenida antes de entregarlo. */
export declare const LETTER_LOST_PROFESSION: ProfessionId;
export declare function getProfession(id: ProfessionId): Profession;
export declare function isProfessionId(value: unknown): value is ProfessionId;
/** Una de las que se eligen en la carta (lo que valida `welcome:profession`). */
export declare function isChoosableProfession(value: unknown): value is ProfessionId;
export interface WelcomeState {
    stage: WelcomeStage;
    /** La profesión elegida al abrir la carta (null hasta elegirla). */
    profession: ProfessionId | null;
}
/** Con esto arranca un jugador nuevo. */
export declare const NEW_WELCOME: WelcomeState;
/**
 * Lo que viene de un guardado convertido en un estado válido. Sin el campo (guardados de antes de
 * la bienvenida), terminada: es sólo para los que entran por primera vez.
 */
export declare function sanitizeWelcome(value: unknown): WelcomeState;
/** El sobre que da el cartero (categoría `letter`: no se intercambia; se vende en el kiosco o se tira). */
export declare const WELCOME_LETTER_ID = "sobre-bienvenida";
/** Los NPCs de la bienvenida (`CityDefinition.npcs`), por id. */
export declare const WELCOME_COURIER_ID = "cartero";
export declare const WELCOME_CLERK_ID = "funcionaria-intendencia";
//# sourceMappingURL=welcome.d.ts.map