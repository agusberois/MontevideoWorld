/**
 * Barras: los grupos de amigos ("¿de qué barra sos?"). Se fundan en el Registro de Barras de Ciudad
 * Vieja pagando `BARRA_FOUND_COST`, con un nombre, una sigla de 2 a 4 letras y dos colores. La sigla se
 * ve debajo del nombre de cada integrante. Reglas que comparten el server (que valida) y el cliente
 * (que arma el formulario). Ver `docs/pending/funcionalidades-primera-version.md` (2.2).
 */
/** Lo que cuesta fundar una barra (saca plata de la economía y hace que fundarla sea un logro). */
export declare const BARRA_FOUND_COST = 1000;
/** Tope de integrantes, para que haya muchas barras y no una gigante. */
export declare const BARRA_MAX_MEMBERS = 30;
export declare const BARRA_NAME_MIN = 3;
export declare const BARRA_NAME_MAX = 24;
export declare const BARRA_TAG_MIN = 2;
export declare const BARRA_TAG_MAX = 4;
/** Lo que dura una invitación sin responder. */
export declare const BARRA_INVITE_MS = 60000;
/** Los colores para elegir (dos por barra, como la camiseta de un club de barrio). */
export declare const BARRA_COLORS: readonly [{
    readonly id: "celeste";
    readonly name: "Celeste";
    readonly hex: "#6cace4";
}, {
    readonly id: "azul";
    readonly name: "Azul";
    readonly hex: "#1d4fa0";
}, {
    readonly id: "blanco";
    readonly name: "Blanco";
    readonly hex: "#f1f1f1";
}, {
    readonly id: "negro";
    readonly name: "Negro";
    readonly hex: "#26262b";
}, {
    readonly id: "rojo";
    readonly name: "Rojo";
    readonly hex: "#d62828";
}, {
    readonly id: "amarillo";
    readonly name: "Amarillo";
    readonly hex: "#f2c94c";
}, {
    readonly id: "verde";
    readonly name: "Verde";
    readonly hex: "#2e9e5b";
}, {
    readonly id: "violeta";
    readonly name: "Violeta";
    readonly hex: "#8a4dff";
}, {
    readonly id: "naranja";
    readonly name: "Naranja";
    readonly hex: "#f28c28";
}, {
    readonly id: "bordo";
    readonly name: "Bordó";
    readonly hex: "#7b1e2b";
}];
export type BarraColorId = (typeof BARRA_COLORS)[number]["id"];
export declare function isBarraColorId(value: unknown): value is BarraColorId;
export declare function barraColorHex(id: string): string;
/** Texto que se lee sobre un fondo de este color ("#rrggbb"): negro sobre claros, blanco sobre oscuros (la sigla de la barra). */
export declare function readableOn(hex: string): string;
/** La sigla como se guarda y se muestra: mayúsculas, sólo letras y números. */
export declare function normalizeBarraTag(raw: string): string;
/** El nombre como se guarda (la misma limpieza que los nombres de jugador). */
export declare function normalizeBarraName(raw: string): string;
/** Por qué este nombre no sirve (null = sirve). Recibe el nombre ya normalizado. */
export declare function barraNameProblem(name: string): string | null;
/** Por qué esta sigla no sirve (null = sirve). Recibe la sigla ya normalizada. */
export declare function barraTagProblem(tag: string): string | null;
export type BarraRole = "fundador" | "integrante";
/** Un integrante como lo ve el panel: si está conectado y en qué barrio. */
export interface BarraMemberView {
    name: string;
    role: BarraRole;
    online: boolean;
    /** Barrio donde está (sólo si está conectado). */
    cityName?: string;
    /** Es el que mira el panel. */
    you: boolean;
}
/** Tu barra, como la ve el panel "Mi barra". */
export interface BarraView {
    id: string;
    name: string;
    tag: string;
    colors: [BarraColorId, BarraColorId];
    /** Fecha de fundación (ISO). */
    createdAt: string;
    members: BarraMemberView[];
    /** Sos el fundador (invita y puede disolverla). */
    founder: boolean;
}
//# sourceMappingURL=barras.d.ts.map