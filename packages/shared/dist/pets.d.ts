/**
 * Mascotas: se adoptan en la Veterinaria de Ciudad Vieja (`Shop.pets`), se les pone nombre y
 * siguen a su dueño por todos lados (lo dibuja cada cliente; el server sólo guarda cuál es y cómo se
 * llama: `Player.pet` / `Player.petName`). Una por jugador.
 */
export type PetKind = "dog" | "cat" | "capybara";
export interface PetDefinition {
    id: string;
    name: string;
    kind: PetKind;
    /** Pelaje y manchas / orejas. */
    color: string;
    accent: string;
    /** Tamaño relativo al dibujo base (1 = perro mediano). */
    size: number;
    /** Lo que cuesta adoptarla. */
    price: number;
    description: string;
}
export declare const PETS: readonly PetDefinition[];
export declare function getPet(id: string): PetDefinition | undefined;
export declare const PET_NAME_MAX_LENGTH = 14;
/** Nombre de la mascota: sin caracteres de control ni espacios de más, hasta `PET_NAME_MAX_LENGTH`. */
export declare function sanitizePetName(value: unknown): string;
//# sourceMappingURL=pets.d.ts.map