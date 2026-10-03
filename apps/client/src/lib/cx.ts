/**
 * Clases de un CSS Module sin reescribir el JSX: `cx("shop-row primary")` devuelve la clase con alcance
 * local de cada nombre que esté en el módulo y deja igual los demás (las globales de `globals.css`:
 * `modal`, `primary`, `key-hint`…). Acepta lo mismo que antes iba en `className` (string, o
 * `undefined` / `false` que se ignoran).
 *
 * Uso, una vez por archivo: `const cx = moduleClasses(styles);` y después `className={cx("…")}`.
 */
export function moduleClasses(styles: Readonly<Record<string, string>>) {
  return (...names: Array<string | false | null | undefined>): string =>
    names
      .filter((name): name is string => Boolean(name))
      .join(" ")
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => styles[name] ?? name)
      .join(" ");
}
