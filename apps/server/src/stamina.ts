import { EXHAUSTED_RECOVERY, MAX_STAMINA } from "@montevideo-world/shared";

/**
 * Energía de un jugador con decimales (caminar gasta 0,6 por tile). Vive en la Room; al Schema
 * se copia el valor redondeado hacia abajo (`rounded`).
 *
 * Si una acción no alcanza, queda **agotado**: no puede gastar nada hasta recuperar
 * `EXHAUSTED_RECOVERY` (si no, cada tick de descanso alcanzaría para un paso más).
 */
export class Stamina {
  private amount = MAX_STAMINA;
  private exhausted = false;

  get rounded(): number {
    return Math.floor(this.amount);
  }

  has(cost: number): boolean {
    return !this.exhausted && this.amount >= cost;
  }

  /** Gasta `cost` si alcanza; si no, queda agotado, no cambia nada y devuelve false. */
  spend(cost: number): boolean {
    if (!this.has(cost)) {
      this.exhausted = true;
      return false;
    }
    this.amount -= cost;
    return true;
  }

  /** Pierde energía sin que sea una acción propia (p. ej. picaduras). No baja de 0. */
  drain(amount: number) {
    this.amount = Math.max(0, this.amount - amount);
  }

  recover(amount: number) {
    this.amount = Math.min(MAX_STAMINA, this.amount + amount);
    if (this.amount >= EXHAUSTED_RECOVERY) this.exhausted = false;
  }
}
