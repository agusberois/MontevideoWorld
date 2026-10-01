/**
 * Hora del juego. El server lleva un reloj global (`minuteOfDay`, 0–1439) que avanza solo; la luz
 * del barrio se deriva de la hora con `darknessAt`, igual en todos los clientes.
 */
export declare const MINUTES_PER_DAY: number;
/** Duración por defecto de un día del juego, en minutos reales (1 hora del juego = 1 minuto real). */
export declare const DEFAULT_DAY_LENGTH_MINUTES = 24;
/** Hora a la que arranca el reloj cuando se inicia el server. */
export declare const START_MINUTE: number;
/** Atajos del panel de admin para mover el reloj. */
export declare const CLOCK_PRESETS: readonly [{
    readonly label: "Amanecer";
    readonly phase: "dawn";
    readonly minute: number;
}, {
    readonly label: "Mediodía";
    readonly phase: "day";
    readonly minute: number;
}, {
    readonly label: "Atardecer";
    readonly phase: "dusk";
    readonly minute: number;
}, {
    readonly label: "Noche";
    readonly phase: "night";
    readonly minute: number;
}];
/** 0 = pleno día, 1 = noche cerrada. Transiciones suaves al amanecer y al atardecer. */
export declare function darknessAt(minuteOfDay: number): number;
/** "18:42" */
export declare function formatClock(minuteOfDay: number): string;
export declare function isValidMinuteOfDay(value: unknown): value is number;
//# sourceMappingURL=time.d.ts.map