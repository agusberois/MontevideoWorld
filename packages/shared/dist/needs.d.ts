/**
 * Necesidades del personaje (ver `docs/finished/necesidades-del-personaje.md`):
 *
 * - **Energía** (antes "stamina"): las actividades la gastan y descansar la recupera, así nadie
 *   puede caminar, pescar ni vender sin parar.
 * - **Hambre** (saciedad, 100 = lleno): baja con el tiempo jugando y con el esfuerzo, sube comiendo.
 *   Con hambre la energía se recupera más lento (`energyRegenFactor`).
 * - **Salud**: baja con picaduras, pasando hambre y comiendo pescado crudo; vuelve de a poco con la
 *   panza llena y descansando, o pagando en el sanatorio. En 0, desmayo (`faintFee`).
 *
 * Las lleva el servidor (y las guarda con el progreso); el cliente sólo las muestra.
 */
export declare const MAX_ENERGY = 100;
/**
 * Gasto por cada tile caminado (de 100 a `WALK_ENERGY_FLOOR` son ~530 pasos, más de 2 minutos
 * caminando sin parar). Caminar nunca deja agotado: ver `WALK_ENERGY_FLOOR`.
 */
export declare const WALK_ENERGY_COST = 0.15;
/**
 * Caminar no baja la energía de acá: con menos, se camina gratis. Así siempre se puede ir hasta un
 * banco o una tienda; la energía sólo frena el trabajo (pescar, vender).
 */
export declare const WALK_ENERGY_FLOOR = 20;
/**
 * Cansado (`Player.tired`): con `WALK_ENERGY_FLOOR` o menos se camina `TIRED_STEP_TICKS` veces más
 * lento (un tile cada tantos ticks), hasta recuperar `TIRED_RECOVERY`. El margen hace que no alcance
 * con frenar un segundo: hay que descansar (sentado en un banco, en un segundo y medio).
 */
export declare const TIRED_STEP_TICKS = 3;
export declare const TIRED_RECOVERY = 35;
/** Gasto por cada vez que se tira la línea en la escollera. */
export declare const FISH_ENERGY_COST = 10;
/** Gasto por cada vez que se ofrece la mercadería en la explanada del Centenario. */
export declare const VEND_ENERGY_COST = 6;
/** Gasto por cada tema que se toca en la calle (el Centro). */
export declare const BUSK_ENERGY_COST = 6;
/** Gasto por cada auto que se cuida (cuidacoches, frente a un edificio con nombre). */
export declare const PARK_ENERGY_COST = 5;
/** Recuperación por segundo quieto (parado, sin pescar). */
export declare const IDLE_ENERGY_REGEN = 2;
/** Recuperación por segundo sentado en un banco: descansar de verdad rinde mucho más. */
export declare const SIT_ENERGY_REGEN = 10;
/** Metido en el jacuzzi de las Termas del Donador: recupera energía mucho más rápido (por segundo). */
export declare const JACUZZI_ENERGY_REGEN = 25;
/**
 * Agotado (se quedó sin energía para la acción): no puede caminar ni pescar hasta recuperar
 * al menos esto. Evita "arrastrarse" gastando lo poco que recupera cada tick.
 */
export declare const EXHAUSTED_RECOVERY = 20;
/** Por debajo de esto el HUD la muestra en rojo. */
export declare const LOW_ENERGY = 20;
export declare const MAX_HUNGER = 100;
/** Con esto aparece un jugador nuevo: con hambre, así lo primero es comerse la torta frita que trae. */
export declare const STARTING_HUNGER = 50;
/** Baja sola esto por segundo jugando (de lleno a vacío en 50 min sin hacer nada). */
export declare const HUNGER_PER_SECOND: number;
/** Y además, por esfuerzo: */
export declare const WALK_HUNGER_COST = 0.05;
export declare const FISH_HUNGER_COST = 0.5;
export declare const VEND_HUNGER_COST = 0.5;
export declare const BUSK_HUNGER_COST = 0.5;
export declare const PARK_HUNGER_COST = 0.5;
/** Por debajo de esto "tenés hambre" y la energía se recupera a la mitad. */
export declare const HUNGRY = 60;
/** Por debajo de esto "estás muerto de hambre" y se recupera a un cuarto (también en el HUD en rojo). */
export declare const STARVING = 30;
export type HungerLevel = "full" | "hungry" | "starving";
export declare function hungerLevel(hunger: number): HungerLevel;
/** Cuánto rinde descansar según el hambre: lleno ×1, con hambre ×0,5, muerto de hambre ×0,25. */
export declare function energyRegenFactor(hunger: number): number;
export declare const MAX_HEALTH = 100;
/** Por debajo de esto estás débil: HUD en rojo y la energía no pasa de `WEAK_ENERGY_CAP`. */
export declare const LOW_HEALTH = 30;
export declare const WEAK_ENERGY_CAP = 50;
/** Con la saciedad en 0 (fuera del COMCAR) se pierde esto por segundo: −1 cada 10 s. */
export declare const STARVE_HEALTH_PER_SECOND: number;
/** Con la saciedad en `HUNGRY` o más y quieto, se recupera esto por segundo (sentado, más). */
export declare const IDLE_HEALTH_REGEN: number;
export declare const SIT_HEALTH_REGEN: number;
/** En el jacuzzi se cura mucho más rápido, y aunque tenga hambre (de 0 a lleno en algo más de 3 min). */
export declare const JACUZZI_HEALTH_REGEN = 0.5;
/** Y la saciedad, en vez de bajar, sube (de vacío a lleno en algo más de 3 min). */
export declare const JACUZZI_HUNGER_REGEN = 0.5;
/** Comer un pescado crudo saca esto de salud, pero nunca la deja por debajo de `RAW_FISH_HEALTH_FLOOR`. */
export declare const RAW_FISH_HEALTH = 2;
export declare const RAW_FISH_HEALTH_FLOOR = 10;
/** Al despertarse después de un desmayo. */
export declare const REVIVE_HEALTH = 30;
export declare const REVIVE_ENERGY = 50;
export declare const REVIVE_HUNGER = 30;
/** La ambulancia cobra el 10 % de la plata, como mucho $200, y nada si tenés menos de $20. */
export declare const FAINT_FEE_RATE = 0.1;
export declare const FAINT_FEE_MAX = 200;
export declare const FAINT_FEE_MIN_BALANCE = 20;
export declare function faintFee(balance: number): number;
/** El Sanatorio Americano (Tres Cruces): adonde te lleva la ambulancia y donde te curan pagando. */
export declare const HOSPITAL_CITY_ID = "tres-cruces";
export declare const HOSPITAL_SHOP_ID = "guardia-sanatorio";
/** Lo que cobra la guardia por dejarte en 100: $1 por punto que falta, como mínimo $10. */
export declare function hospitalPrice(health: number): number;
/** Tope de energía según la salud: débil, no pasa de `WEAK_ENERGY_CAP`. */
export declare function energyCap(health: number): number;
/** Lo que se guarda de las necesidades con el progreso del jugador (`PlayerRecord.needs`). */
export interface SavedNeeds {
    energy: number;
    hunger: number;
    health: number;
}
/** Recién creado (o un guardado sin necesidades): todo lleno. */
export declare const FULL_NEEDS: SavedNeeds;
/** Necesidades guardadas, validadas: lo que no sea un número entre 0 y el máximo vuelve lleno. */
export declare function sanitizeNeeds(value: unknown): SavedNeeds;
//# sourceMappingURL=needs.d.ts.map