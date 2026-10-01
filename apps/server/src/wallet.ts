import { MAX_MONEY, STARTING_MONEY, isValidAmount } from "@montevideo-world/shared";

/**
 * Saldo de un jugador. Vive sólo en el servidor (estado privado de la Room) y se le manda a su
 * dueño con `MessageType.Wallet`. Toda operación valida el monto y nunca deja el saldo negativo
 * ni por encima de `MAX_MONEY`: si no se puede, no cambia nada y devuelve false.
 *
 * Uso previsto en tiendas: `if (!wallet.debit(price)) return;` → entregar el ítem → mandar saldo
 * e inventario actualizados.
 */
export class Wallet {
  private amount: number;

  constructor(initial = STARTING_MONEY) {
    this.amount = initial;
  }

  get balance(): number {
    return this.amount;
  }

  canAfford(amount: number): boolean {
    return isValidAmount(amount) && amount <= this.amount;
  }

  /** Cobrar (p. ej. vender algo): suma `amount` si es válido y no pasa el tope. */
  credit(amount: number): boolean {
    if (!isValidAmount(amount) || this.amount + amount > MAX_MONEY) return false;
    this.amount += amount;
    return true;
  }

  /** Pagar (p. ej. comprar algo): resta `amount` si es válido y alcanza el saldo. */
  debit(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.amount -= amount;
    return true;
  }
}
