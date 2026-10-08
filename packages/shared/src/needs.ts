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

export const MAX_ENERGY = 100;

/**
 * Gasto por cada tile caminado (de 100 a `WALK_ENERGY_FLOOR` son ~530 pasos, más de 2 minutos
 * caminando sin parar). Caminar nunca deja agotado: ver `WALK_ENERGY_FLOOR`.
 */
export const WALK_ENERGY_COST = 0.15;

/**
 * Caminar no baja la energía de acá: con menos, se camina gratis. Así siempre se puede ir hasta un
 * banco o una tienda; la energía sólo frena el trabajo (pescar, vender).
 */
export const WALK_ENERGY_FLOOR = 20;

/**
 * Cansado (`Player.tired`): con `WALK_ENERGY_FLOOR` o menos se camina `TIRED_STEP_TICKS` veces más
 * lento (un tile cada tantos ticks), hasta recuperar `TIRED_RECOVERY`. El margen hace que no alcance
 * con frenar un segundo: hay que descansar (sentado en un banco, en un segundo y medio).
 */
export const TIRED_STEP_TICKS = 3;
export const TIRED_RECOVERY = 35;

/** Gasto por cada vez que se tira la línea en la escollera. */
export const FISH_ENERGY_COST = 10;

/** Gasto por cada vez que se ofrece la mercadería en la explanada del Centenario. */
export const VEND_ENERGY_COST = 6;

/** Gasto por cada tema que se toca en la calle (el Centro). */
export const BUSK_ENERGY_COST = 6;

/** Gasto por cada auto que se cuida (cuidacoches, frente a un edificio con nombre). */
export const PARK_ENERGY_COST = 5;

/** Recuperación por segundo quieto (parado, sin pescar). */
export const IDLE_ENERGY_REGEN = 2;

/** Recuperación por segundo sentado en un banco: descansar de verdad rinde mucho más. */
export const SIT_ENERGY_REGEN = 10;
/** Metido en el jacuzzi de las Termas del Donador: recupera energía mucho más rápido (por segundo). */
export const JACUZZI_ENERGY_REGEN = 25;

/**
 * Agotado (se quedó sin energía para la acción): no puede caminar ni pescar hasta recuperar
 * al menos esto. Evita "arrastrarse" gastando lo poco que recupera cada tick.
 */
export const EXHAUSTED_RECOVERY = 20;

/** Por debajo de esto el HUD la muestra en rojo. */
export const LOW_ENERGY = EXHAUSTED_RECOVERY;

// --- Hambre (saciedad) -----------------------------------------------------------------------

export const MAX_HUNGER = 100;

/** Con esto aparece un jugador nuevo: con hambre, así lo primero es comerse la torta frita que trae. */
export const STARTING_HUNGER = 50;

/** Baja sola esto por segundo jugando (de lleno a vacío en 50 min sin hacer nada). */
export const HUNGER_PER_SECOND = 1 / 30;

/** Y además, por esfuerzo: */
export const WALK_HUNGER_COST = 0.05;
export const FISH_HUNGER_COST = 0.5;
export const VEND_HUNGER_COST = 0.5;
export const BUSK_HUNGER_COST = 0.5;
export const PARK_HUNGER_COST = 0.5;

/** Por debajo de esto "tenés hambre" y la energía se recupera a la mitad. */
export const HUNGRY = 60;
/** Por debajo de esto "estás muerto de hambre" y se recupera a un cuarto (también en el HUD en rojo). */
export const STARVING = 30;

export type HungerLevel = "full" | "hungry" | "starving";

export function hungerLevel(hunger: number): HungerLevel {
  return hunger >= HUNGRY ? "full" : hunger >= STARVING ? "hungry" : "starving";
}

/** Cuánto rinde descansar según el hambre: lleno ×1, con hambre ×0,5, muerto de hambre ×0,25. */
export function energyRegenFactor(hunger: number): number {
  const level = hungerLevel(hunger);
  return level === "full" ? 1 : level === "hungry" ? 0.5 : 0.25;
}

// --- Salud ---------------------------------------------------------------------------------

export const MAX_HEALTH = 100;

/** Por debajo de esto estás débil: HUD en rojo y la energía no pasa de `WEAK_ENERGY_CAP`. */
export const LOW_HEALTH = 30;
export const WEAK_ENERGY_CAP = 50;

/** Con la saciedad en 0 (fuera del COMCAR) se pierde esto por segundo: −1 cada 10 s. */
export const STARVE_HEALTH_PER_SECOND = 1 / 10;

/** Con la saciedad en `HUNGRY` o más y quieto, se recupera esto por segundo (sentado, más). */
export const IDLE_HEALTH_REGEN = 1 / 30;
export const SIT_HEALTH_REGEN = 1 / 10;
/** En el jacuzzi se cura mucho más rápido, y aunque tenga hambre (de 0 a lleno en algo más de 3 min). */
export const JACUZZI_HEALTH_REGEN = 0.5;
/** Y la saciedad, en vez de bajar, sube (de vacío a lleno en algo más de 3 min). */
export const JACUZZI_HUNGER_REGEN = 0.5;

/** Comer un pescado crudo saca esto de salud, pero nunca la deja por debajo de `RAW_FISH_HEALTH_FLOOR`. */
export const RAW_FISH_HEALTH = 2;
export const RAW_FISH_HEALTH_FLOOR = 10;

/** Al despertarse después de un desmayo. */
export const REVIVE_HEALTH = 30;
export const REVIVE_ENERGY = 50;
export const REVIVE_HUNGER = 30;

/** La ambulancia cobra el 10 % de la plata, como mucho $200, y nada si tenés menos de $20. */
export const FAINT_FEE_RATE = 0.1;
export const FAINT_FEE_MAX = 200;
export const FAINT_FEE_MIN_BALANCE = 20;

export function faintFee(balance: number): number {
  if (balance < FAINT_FEE_MIN_BALANCE) return 0;
  return Math.min(FAINT_FEE_MAX, Math.floor(balance * FAINT_FEE_RATE));
}

/** El Sanatorio Americano (Tres Cruces): adonde te lleva la ambulancia y donde te curan pagando. */
export const HOSPITAL_CITY_ID = "tres-cruces";
export const HOSPITAL_SHOP_ID = "guardia-sanatorio";

/** Lo que cobra la guardia por dejarte en 100: $1 por punto que falta, como mínimo $10. */
export function hospitalPrice(health: number): number {
  return Math.max(10, Math.ceil(MAX_HEALTH - health));
}

/** Tope de energía según la salud: débil, no pasa de `WEAK_ENERGY_CAP`. */
export function energyCap(health: number): number {
  return health < LOW_HEALTH ? WEAK_ENERGY_CAP : MAX_ENERGY;
}

// --- Guardado ------------------------------------------------------------------------------

/** Lo que se guarda de las necesidades con el progreso del jugador (`PlayerRecord.needs`). */
export interface SavedNeeds {
  energy: number;
  hunger: number;
  health: number;
}

/** Recién creado (o un guardado sin necesidades): todo lleno. */
export const FULL_NEEDS: SavedNeeds = { energy: MAX_ENERGY, hunger: MAX_HUNGER, health: MAX_HEALTH };

/** Necesidades guardadas, validadas: lo que no sea un número entre 0 y el máximo vuelve lleno. */
export function sanitizeNeeds(value: unknown): SavedNeeds {
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const valid = (key: keyof SavedNeeds, max: number) =>
    typeof raw[key] === "number" && (raw[key] as number) >= 0 && (raw[key] as number) <= max ? (raw[key] as number) : max;
  // Un guardado con salud 0 (se cortó justo en el desmayo) vuelve como si se hubiera despertado.
  const health = valid("health", MAX_HEALTH);
  return { energy: valid("energy", MAX_ENERGY), hunger: valid("hunger", MAX_HUNGER), health: health > 0 ? health : REVIVE_HEALTH };
}
