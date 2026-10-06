import {
  EXHAUSTED_RECOVERY,
  EdibleValue,
  HUNGER_PER_SECOND,
  HUNGRY,
  IDLE_ENERGY_REGEN,
  IDLE_HEALTH_REGEN,
  MAX_HEALTH,
  MAX_HUNGER,
  RAW_FISH_HEALTH_FLOOR,
  REVIVE_ENERGY,
  REVIVE_HEALTH,
  REVIVE_HUNGER,
  SIT_ENERGY_REGEN,
  JACUZZI_ENERGY_REGEN,
  JACUZZI_HEALTH_REGEN,
  JACUZZI_HUNGER_REGEN,
  SIT_HEALTH_REGEN,
  STARVE_HEALTH_PER_SECOND,
  SavedNeeds,
  WALK_ENERGY_COST,
  WALK_ENERGY_FLOOR,
  energyCap,
  energyRegenFactor,
  sanitizeNeeds,
} from "@montevideo-world/shared";

/** Qué está haciendo el jugador en este tick (decide cuánto recupera y si le da hambre). */
export interface NeedsTick {
  /** Quieto: sin camino, sin pescar ni vender. Sólo así se recupera energía. */
  resting: boolean;
  /** Sentado en un banco: descansa mucho más rápido. */
  sitting: boolean;
  /** Metido en el jacuzzi (las Termas del Donador): recarga las tres barras (energía, saciedad y salud). */
  bathing?: boolean;
  /** Preso en el COMCAR: el hambre queda congelada (y no hace daño). */
  jailed: boolean;
  /** Del clima (`Weather.hungerFactor`): con calor el hambre baja más rápido. */
  hungerFactor?: number;
}

/**
 * Necesidades de un jugador, con decimales: energía (caminar gasta 0,6 por tile), hambre
 * (saciedad) y salud. Viven en la Room; la energía redondeada va al Schema (`energy`), hambre y
 * salud al dueño por un mensaje privado (`needs`), y las tres se guardan con el progreso
 * (`snapshot`), así salir y volver a entrar no llena nada. Con poca salud la energía tiene tope
 * (`energyCap`); en 0 de salud, la Room lo desmaya (`revive` lo despierta).
 *
 * Si una acción no alcanza, queda **agotado**: no puede gastar energía hasta recuperar
 * `EXHAUSTED_RECOVERY` (si no, cada tick de descanso alcanzaría para un paso más).
 */
export class Needs {
  private energyAmount: number;
  private hungerAmount: number;
  private healthAmount: number;
  private exhausted = false;

  constructor(saved: SavedNeeds = sanitizeNeeds(undefined)) {
    this.energyAmount = saved.energy;
    this.hungerAmount = saved.hunger;
    this.healthAmount = saved.health;
    this.capEnergy();
  }

  /** Lo guardado (validado) o, sin nada, todo lleno. */
  static restore(saved: unknown): Needs {
    return new Needs(sanitizeNeeds(saved));
  }

  /** Energía redondeada hacia abajo: lo que va al Schema y se muestra. */
  get energy(): number {
    return Math.floor(this.energyAmount);
  }

  /** Saciedad redondeada hacia arriba: con 0,4 todavía no estás "en 0". */
  get hunger(): number {
    return Math.ceil(this.hungerAmount);
  }

  /** Salud redondeada hacia arriba (con 0,4 todavía no te desmayaste). */
  get health(): number {
    return Math.ceil(this.healthAmount);
  }

  /** Se desmaya: la salud llegó a 0. */
  get fainted(): boolean {
    return this.healthAmount <= 0;
  }

  hasEnergy(cost: number): boolean {
    return !this.exhausted && this.energyAmount >= cost;
  }

  /** Un paso: gasta `WALK_ENERGY_COST`, pero nunca la baja de `WALK_ENERGY_FLOOR` (caminar no agota). */
  walkStep() {
    const spend = Math.min(WALK_ENERGY_COST, Math.max(0, this.energyAmount - WALK_ENERGY_FLOOR));
    this.energyAmount -= spend;
  }

  /** Gasta `cost` si alcanza; si no, queda agotado, no cambia nada y devuelve false. */
  spendEnergy(cost: number): boolean {
    if (!this.hasEnergy(cost)) {
      this.exhausted = true;
      return false;
    }
    this.energyAmount -= cost;
    return true;
  }

  /**
   * Pierde energía sin chequear si alcanza: picaduras, o el costo de una tirada / venta que ya
   * terminó (se validó con `hasEnergy` al empezar). No baja de 0.
   */
  drainEnergy(amount: number) {
    this.energyAmount = Math.max(0, this.energyAmount - amount);
  }

  recoverEnergy(amount: number) {
    this.energyAmount = Math.min(energyCap(this.healthAmount), this.energyAmount + amount);
    if (this.energyAmount >= EXHAUSTED_RECOVERY) this.exhausted = false;
  }

  /** Débil (poca salud), la energía no pasa del tope. */
  private capEnergy() {
    this.energyAmount = Math.min(this.energyAmount, energyCap(this.healthAmount));
  }

  /** Daño (picaduras). No baja de 0: en 0 la Room lo desmaya. */
  hurt(amount: number) {
    this.healthAmount = Math.max(0, this.healthAmount - amount);
    this.capEnergy();
  }

  heal(amount: number) {
    this.healthAmount = Math.min(MAX_HEALTH, this.healthAmount + amount);
  }

  /** Todo al máximo (`/curar` del admin). */
  fill() {
    this.healthAmount = MAX_HEALTH;
    this.hungerAmount = MAX_HUNGER;
    this.energyAmount = energyCap(MAX_HEALTH);
    this.exhausted = false;
  }

  /** Despertarse después de un desmayo: poca salud y energía, y algo en la panza. */
  revive() {
    this.healthAmount = REVIVE_HEALTH;
    this.hungerAmount = Math.max(this.hungerAmount, REVIVE_HUNGER);
    this.energyAmount = Math.min(REVIVE_ENERGY, energyCap(REVIVE_HEALTH));
    this.exhausted = false;
  }

  /** Hambre por esfuerzo (caminar, pescar, vender). No baja de 0. */
  drainHunger(amount: number) {
    this.hungerAmount = Math.max(0, this.hungerAmount - amount);
  }

  /** ¿Comer esto serviría de algo? (no, si llenaría sólo lo que ya está lleno) */
  canEat(value: EdibleValue): boolean {
    return (
      (value.hunger > 0 && this.hungerAmount < MAX_HUNGER) ||
      (value.energy > 0 && this.energyAmount < energyCap(this.healthAmount)) ||
      (value.health > 0 && this.healthAmount < MAX_HEALTH)
    );
  }

  /** Come: llena, da energía y cura (o, crudo, saca salud sin bajarla de `RAW_FISH_HEALTH_FLOOR`). */
  eat(value: EdibleValue) {
    this.hungerAmount = Math.min(MAX_HUNGER, this.hungerAmount + value.hunger);
    if (value.health > 0) this.heal(value.health);
    else if (value.health < 0 && this.healthAmount > RAW_FISH_HEALTH_FLOOR) {
      this.healthAmount = Math.max(RAW_FISH_HEALTH_FLOOR, this.healthAmount + value.health);
    }
    this.capEnergy();
    this.recoverEnergy(value.energy);
  }

  /**
   * Lo que pasa solo cada `seconds`: baja el hambre (salvo preso; más rápido con calor) y, en 0, la salud; quieto, se
   * recupera energía (más rápido sentado y más lento cuanto más hambre, `energyRegenFactor`) y, con
   * la panza llena, también salud. En el jacuzzi, en cambio, las tres barras suben.
   */
  tick(seconds: number, { resting, sitting, bathing = false, jailed, hungerFactor = 1 }: NeedsTick) {
    if (bathing && resting) {
      // El jacuzzi recarga todo: sin hambre que frene la energía ni que impida curarse.
      this.hungerAmount = Math.min(MAX_HUNGER, this.hungerAmount + JACUZZI_HUNGER_REGEN * seconds);
      this.heal(JACUZZI_HEALTH_REGEN * seconds);
      this.recoverEnergy(JACUZZI_ENERGY_REGEN * seconds);
      return;
    }
    if (!jailed) {
      this.drainHunger(HUNGER_PER_SECOND * hungerFactor * seconds);
      if (this.hungerAmount <= 0) this.hurt(STARVE_HEALTH_PER_SECOND * seconds);
    }
    if (resting) {
      const regen = (sitting ? SIT_ENERGY_REGEN : IDLE_ENERGY_REGEN) * energyRegenFactor(this.hungerAmount);
      this.recoverEnergy(regen * seconds);
      if (this.hungerAmount >= HUNGRY) this.heal((sitting ? SIT_HEALTH_REGEN : IDLE_HEALTH_REGEN) * seconds);
    }
  }

  /** Para guardar con el progreso (el valor exacto, con dos decimales). */
  snapshot(): SavedNeeds {
    const round = (value: number) => Math.round(value * 100) / 100;
    return { energy: round(this.energyAmount), hunger: round(this.hungerAmount), health: round(this.healthAmount) };
  }
}
