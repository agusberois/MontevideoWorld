/**
 * Los primeros `maxLength` caracteres, contados por punto de código: `slice` cuenta unidades UTF-16
 * y podía cortar un emoji a la mitad (queda un sustituto suelto, que se ve como "�").
 */
export declare function truncate(value: string, maxLength: number): string;
/**
 * Nombre de jugador o de mascota: forma normal NFKC (letras "de ancho completo", ligaduras y
 * variantes pasan a la común), sin caracteres de control ni invisibles, a lo sumo una marca
 * combinante seguida, espacios colapsados y hasta `maxLength` caracteres.
 */
export declare function sanitizeLabel(value: unknown, maxLength: number): string;
export declare function sanitizeName(value: unknown): string;
export declare function sanitizeChat(value: unknown): string;
/**
 * "Esqueleto" de un nombre para compararlo con otro: dos nombres que se ven parecidos dan el mismo
 * (mayúsculas, tildes, letras de otros alfabetos que se ven iguales, I/l/1, rn/m, espacios y signos
 * no cuentan). Lo usan los nombres únicos y reservados y las búsquedas por nombre (`/mensaje`,
 * `/ban`…). Un nombre sin letras ni números (sólo emojis) se compara tal cual, en minúsculas.
 */
export declare function nameKey(name: string): string;
/** ¿Es (o se parece a) un nombre reservado? `adminName`: el del admin, que tampoco puede imitarse. */
export declare function isReservedName(name: string, adminName?: string | null): boolean;
//# sourceMappingURL=sanitize.d.ts.map