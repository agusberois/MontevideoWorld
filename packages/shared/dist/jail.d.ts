/** Cárcel (COMCAR): reglas de `/ban` que comparten el server y el cliente. */
/** `/ban`: máximo de minutos de cárcel (una semana). */
export declare const MAX_BAN_MINUTES: number;
/**
 * Código con el que el server rechaza entrar a un barrio a quien está preso: el cliente entra
 * entonces al COMCAR (`JAIL_CITY_ID`).
 */
export declare const JAILED_JOIN_CODE = 4030;
/** Código con el que se desconecta al preso que no fue al COMCAR cuando se lo mandó (cliente modificado). */
export declare const JAILED_KICK_CODE = 4003;
/** Cuánto se espera a que el preso viaje solo al COMCAR antes de desconectarlo. */
export declare const JAIL_TRAVEL_GRACE_MS = 15000;
/** Tiempo de condena que queda, para mostrar: "4:05", "1 h 20 min", "2 días 3 h". */
export declare function formatJailLeft(seconds: number): string;
//# sourceMappingURL=jail.d.ts.map