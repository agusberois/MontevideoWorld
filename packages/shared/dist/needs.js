"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FULL_NEEDS = exports.HOSPITAL_SHOP_ID = exports.HOSPITAL_CITY_ID = exports.FAINT_FEE_MIN_BALANCE = exports.FAINT_FEE_MAX = exports.FAINT_FEE_RATE = exports.REVIVE_HUNGER = exports.REVIVE_ENERGY = exports.REVIVE_HEALTH = exports.RAW_FISH_HEALTH_FLOOR = exports.RAW_FISH_HEALTH = exports.JACUZZI_HEALTH_REGEN = exports.SIT_HEALTH_REGEN = exports.IDLE_HEALTH_REGEN = exports.STARVE_HEALTH_PER_SECOND = exports.WEAK_ENERGY_CAP = exports.LOW_HEALTH = exports.MAX_HEALTH = exports.STARVING = exports.HUNGRY = exports.VEND_HUNGER_COST = exports.FISH_HUNGER_COST = exports.WALK_HUNGER_COST = exports.HUNGER_PER_SECOND = exports.MAX_HUNGER = exports.LOW_ENERGY = exports.EXHAUSTED_RECOVERY = exports.JACUZZI_ENERGY_REGEN = exports.SIT_ENERGY_REGEN = exports.IDLE_ENERGY_REGEN = exports.VEND_ENERGY_COST = exports.FISH_ENERGY_COST = exports.TIRED_RECOVERY = exports.TIRED_STEP_TICKS = exports.WALK_ENERGY_FLOOR = exports.WALK_ENERGY_COST = exports.MAX_ENERGY = void 0;
exports.hungerLevel = hungerLevel;
exports.energyRegenFactor = energyRegenFactor;
exports.faintFee = faintFee;
exports.hospitalPrice = hospitalPrice;
exports.energyCap = energyCap;
exports.sanitizeNeeds = sanitizeNeeds;
exports.MAX_ENERGY = 100;
/**
 * Gasto por cada tile caminado (de 100 a `WALK_ENERGY_FLOOR` son ~530 pasos, más de 2 minutos
 * caminando sin parar). Caminar nunca deja agotado: ver `WALK_ENERGY_FLOOR`.
 */
exports.WALK_ENERGY_COST = 0.15;
/**
 * Caminar no baja la energía de acá: con menos, se camina gratis. Así siempre se puede ir hasta un
 * banco o una tienda; la energía sólo frena el trabajo (pescar, vender).
 */
exports.WALK_ENERGY_FLOOR = 20;
/**
 * Cansado (`Player.tired`): con `WALK_ENERGY_FLOOR` o menos se camina `TIRED_STEP_TICKS` veces más
 * lento (un tile cada tantos ticks), hasta recuperar `TIRED_RECOVERY`. El margen hace que no alcance
 * con frenar un segundo: hay que descansar (sentado en un banco, en un segundo y medio).
 */
exports.TIRED_STEP_TICKS = 3;
exports.TIRED_RECOVERY = 35;
/** Gasto por cada vez que se tira la línea en la escollera. */
exports.FISH_ENERGY_COST = 10;
/** Gasto por cada vez que se ofrece la mercadería en la explanada del Centenario. */
exports.VEND_ENERGY_COST = 6;
/** Recuperación por segundo quieto (parado, sin pescar). */
exports.IDLE_ENERGY_REGEN = 2;
/** Recuperación por segundo sentado en un banco: descansar de verdad rinde mucho más. */
exports.SIT_ENERGY_REGEN = 10;
/** Metido en el jacuzzi de las Termas del Donador: recupera energía mucho más rápido (por segundo). */
exports.JACUZZI_ENERGY_REGEN = 25;
/**
 * Agotado (se quedó sin energía para la acción): no puede caminar ni pescar hasta recuperar
 * al menos esto. Evita "arrastrarse" gastando lo poco que recupera cada tick.
 */
exports.EXHAUSTED_RECOVERY = 20;
/** Por debajo de esto el HUD la muestra en rojo. */
exports.LOW_ENERGY = exports.EXHAUSTED_RECOVERY;
// --- Hambre (saciedad) -----------------------------------------------------------------------
exports.MAX_HUNGER = 100;
/** Baja sola esto por segundo jugando (de lleno a vacío en 50 min sin hacer nada). */
exports.HUNGER_PER_SECOND = 1 / 30;
/** Y además, por esfuerzo: */
exports.WALK_HUNGER_COST = 0.05;
exports.FISH_HUNGER_COST = 0.5;
exports.VEND_HUNGER_COST = 0.5;
/** Por debajo de esto "tenés hambre" y la energía se recupera a la mitad. */
exports.HUNGRY = 60;
/** Por debajo de esto "estás muerto de hambre" y se recupera a un cuarto (también en el HUD en rojo). */
exports.STARVING = 30;
function hungerLevel(hunger) {
    return hunger >= exports.HUNGRY ? "full" : hunger >= exports.STARVING ? "hungry" : "starving";
}
/** Cuánto rinde descansar según el hambre: lleno ×1, con hambre ×0,5, muerto de hambre ×0,25. */
function energyRegenFactor(hunger) {
    const level = hungerLevel(hunger);
    return level === "full" ? 1 : level === "hungry" ? 0.5 : 0.25;
}
// --- Salud ---------------------------------------------------------------------------------
exports.MAX_HEALTH = 100;
/** Por debajo de esto estás débil: HUD en rojo y la energía no pasa de `WEAK_ENERGY_CAP`. */
exports.LOW_HEALTH = 30;
exports.WEAK_ENERGY_CAP = 50;
/** Con la saciedad en 0 (fuera del COMCAR) se pierde esto por segundo: −1 cada 10 s. */
exports.STARVE_HEALTH_PER_SECOND = 1 / 10;
/** Con la saciedad en `HUNGRY` o más y quieto, se recupera esto por segundo (sentado, más). */
exports.IDLE_HEALTH_REGEN = 1 / 30;
exports.SIT_HEALTH_REGEN = 1 / 10;
/** En el jacuzzi también se cura más rápido (el doble que sentado en un banco). */
exports.JACUZZI_HEALTH_REGEN = exports.SIT_HEALTH_REGEN * 2;
/** Comer un pescado crudo saca esto de salud, pero nunca la deja por debajo de `RAW_FISH_HEALTH_FLOOR`. */
exports.RAW_FISH_HEALTH = 2;
exports.RAW_FISH_HEALTH_FLOOR = 10;
/** Al despertarse después de un desmayo. */
exports.REVIVE_HEALTH = 30;
exports.REVIVE_ENERGY = 50;
exports.REVIVE_HUNGER = 30;
/** La ambulancia cobra el 10 % de la plata, como mucho $200, y nada si tenés menos de $20. */
exports.FAINT_FEE_RATE = 0.1;
exports.FAINT_FEE_MAX = 200;
exports.FAINT_FEE_MIN_BALANCE = 20;
function faintFee(balance) {
    if (balance < exports.FAINT_FEE_MIN_BALANCE)
        return 0;
    return Math.min(exports.FAINT_FEE_MAX, Math.floor(balance * exports.FAINT_FEE_RATE));
}
/** El Sanatorio Americano (Tres Cruces): adonde te lleva la ambulancia y donde te curan pagando. */
exports.HOSPITAL_CITY_ID = "tres-cruces";
exports.HOSPITAL_SHOP_ID = "guardia-sanatorio";
/** Lo que cobra la guardia por dejarte en 100: $1 por punto que falta, como mínimo $10. */
function hospitalPrice(health) {
    return Math.max(10, Math.ceil(exports.MAX_HEALTH - health));
}
/** Tope de energía según la salud: débil, no pasa de `WEAK_ENERGY_CAP`. */
function energyCap(health) {
    return health < exports.LOW_HEALTH ? exports.WEAK_ENERGY_CAP : exports.MAX_ENERGY;
}
/** Recién creado (o un guardado sin necesidades): todo lleno. */
exports.FULL_NEEDS = { energy: exports.MAX_ENERGY, hunger: exports.MAX_HUNGER, health: exports.MAX_HEALTH };
/** Necesidades guardadas, validadas: lo que no sea un número entre 0 y el máximo vuelve lleno. */
function sanitizeNeeds(value) {
    const raw = typeof value === "object" && value !== null ? value : {};
    const valid = (key, max) => typeof raw[key] === "number" && raw[key] >= 0 && raw[key] <= max ? raw[key] : max;
    // Un guardado con salud 0 (se cortó justo en el desmayo) vuelve como si se hubiera despertado.
    const health = valid("health", exports.MAX_HEALTH);
    return { energy: valid("energy", exports.MAX_ENERGY), hunger: valid("hunger", exports.MAX_HUNGER), health: health > 0 ? health : exports.REVIVE_HEALTH };
}
//# sourceMappingURL=needs.js.map