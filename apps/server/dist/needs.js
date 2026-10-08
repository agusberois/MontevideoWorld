"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Needs = void 0;
const shared_1 = require("@montevideo-world/shared");
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
class Needs {
    constructor(saved = (0, shared_1.sanitizeNeeds)(undefined)) {
        this.exhausted = false;
        this.energyAmount = saved.energy;
        this.hungerAmount = saved.hunger;
        this.healthAmount = saved.health;
        this.capEnergy();
    }
    /** Lo guardado (validado) o, sin nada, todo lleno. */
    static restore(saved) {
        return new Needs((0, shared_1.sanitizeNeeds)(saved));
    }
    /** Jugador nuevo: energía y salud llenas, pero con hambre (`STARTING_HUNGER`). */
    static starter() {
        return new Needs({ ...(0, shared_1.sanitizeNeeds)(undefined), hunger: shared_1.STARTING_HUNGER });
    }
    /** Energía redondeada hacia abajo: lo que va al Schema y se muestra. */
    get energy() {
        return Math.floor(this.energyAmount);
    }
    /** Saciedad redondeada hacia arriba: con 0,4 todavía no estás "en 0". */
    get hunger() {
        return Math.ceil(this.hungerAmount);
    }
    /** Salud redondeada hacia arriba (con 0,4 todavía no te desmayaste). */
    get health() {
        return Math.ceil(this.healthAmount);
    }
    /** Se desmaya: la salud llegó a 0. */
    get fainted() {
        return this.healthAmount <= 0;
    }
    hasEnergy(cost) {
        return !this.exhausted && this.energyAmount >= cost;
    }
    /** Un paso: gasta `WALK_ENERGY_COST`, pero nunca la baja de `WALK_ENERGY_FLOOR` (caminar no agota). */
    walkStep() {
        const spend = Math.min(shared_1.WALK_ENERGY_COST, Math.max(0, this.energyAmount - shared_1.WALK_ENERGY_FLOOR));
        this.energyAmount -= spend;
    }
    /** Gasta `cost` si alcanza; si no, queda agotado, no cambia nada y devuelve false. */
    spendEnergy(cost) {
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
    drainEnergy(amount) {
        this.energyAmount = Math.max(0, this.energyAmount - amount);
    }
    recoverEnergy(amount) {
        this.energyAmount = Math.min((0, shared_1.energyCap)(this.healthAmount), this.energyAmount + amount);
        if (this.energyAmount >= shared_1.EXHAUSTED_RECOVERY)
            this.exhausted = false;
    }
    /** Débil (poca salud), la energía no pasa del tope. */
    capEnergy() {
        this.energyAmount = Math.min(this.energyAmount, (0, shared_1.energyCap)(this.healthAmount));
    }
    /** Daño (picaduras). No baja de 0: en 0 la Room lo desmaya. */
    hurt(amount) {
        this.healthAmount = Math.max(0, this.healthAmount - amount);
        this.capEnergy();
    }
    heal(amount) {
        this.healthAmount = Math.min(shared_1.MAX_HEALTH, this.healthAmount + amount);
    }
    /** Todo al máximo (`/curar` del admin). */
    fill() {
        this.healthAmount = shared_1.MAX_HEALTH;
        this.hungerAmount = shared_1.MAX_HUNGER;
        this.energyAmount = (0, shared_1.energyCap)(shared_1.MAX_HEALTH);
        this.exhausted = false;
    }
    /** Despertarse después de un desmayo: poca salud y energía, y algo en la panza. */
    revive() {
        this.healthAmount = shared_1.REVIVE_HEALTH;
        this.hungerAmount = Math.max(this.hungerAmount, shared_1.REVIVE_HUNGER);
        this.energyAmount = Math.min(shared_1.REVIVE_ENERGY, (0, shared_1.energyCap)(shared_1.REVIVE_HEALTH));
        this.exhausted = false;
    }
    /** Hambre por esfuerzo (caminar, pescar, vender). No baja de 0. */
    drainHunger(amount) {
        this.hungerAmount = Math.max(0, this.hungerAmount - amount);
    }
    /** ¿Comer esto serviría de algo? (no, si llenaría sólo lo que ya está lleno) */
    canEat(value) {
        return ((value.hunger > 0 && this.hungerAmount < shared_1.MAX_HUNGER) ||
            (value.energy > 0 && this.energyAmount < (0, shared_1.energyCap)(this.healthAmount)) ||
            (value.health > 0 && this.healthAmount < shared_1.MAX_HEALTH));
    }
    /** Come: llena, da energía y cura (o, crudo, saca salud sin bajarla de `RAW_FISH_HEALTH_FLOOR`). */
    eat(value) {
        this.hungerAmount = Math.min(shared_1.MAX_HUNGER, this.hungerAmount + value.hunger);
        if (value.health > 0)
            this.heal(value.health);
        else if (value.health < 0 && this.healthAmount > shared_1.RAW_FISH_HEALTH_FLOOR) {
            this.healthAmount = Math.max(shared_1.RAW_FISH_HEALTH_FLOOR, this.healthAmount + value.health);
        }
        this.capEnergy();
        this.recoverEnergy(value.energy);
    }
    /**
     * Lo que pasa solo cada `seconds`: baja el hambre (salvo preso; más rápido con calor) y, en 0, la salud; quieto, se
     * recupera energía (más rápido sentado y más lento cuanto más hambre, `energyRegenFactor`) y, con
     * la panza llena, también salud. En el jacuzzi, en cambio, las tres barras suben.
     */
    tick(seconds, { resting, sitting, bathing = false, jailed, hungerFactor = 1 }) {
        if (bathing && resting) {
            // El jacuzzi recarga todo: sin hambre que frene la energía ni que impida curarse.
            this.hungerAmount = Math.min(shared_1.MAX_HUNGER, this.hungerAmount + shared_1.JACUZZI_HUNGER_REGEN * seconds);
            this.heal(shared_1.JACUZZI_HEALTH_REGEN * seconds);
            this.recoverEnergy(shared_1.JACUZZI_ENERGY_REGEN * seconds);
            return;
        }
        if (!jailed) {
            this.drainHunger(shared_1.HUNGER_PER_SECOND * hungerFactor * seconds);
            if (this.hungerAmount <= 0)
                this.hurt(shared_1.STARVE_HEALTH_PER_SECOND * seconds);
        }
        if (resting) {
            const regen = (sitting ? shared_1.SIT_ENERGY_REGEN : shared_1.IDLE_ENERGY_REGEN) * (0, shared_1.energyRegenFactor)(this.hungerAmount);
            this.recoverEnergy(regen * seconds);
            if (this.hungerAmount >= shared_1.HUNGRY)
                this.heal((sitting ? shared_1.SIT_HEALTH_REGEN : shared_1.IDLE_HEALTH_REGEN) * seconds);
        }
    }
    /** Para guardar con el progreso (el valor exacto, con dos decimales). */
    snapshot() {
        const round = (value) => Math.round(value * 100) / 100;
        return { energy: round(this.energyAmount), hunger: round(this.hungerAmount), health: round(this.healthAmount) };
    }
}
exports.Needs = Needs;
//# sourceMappingURL=needs.js.map