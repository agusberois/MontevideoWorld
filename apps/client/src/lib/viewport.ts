/**
 * Teclado en pantalla (celulares): con `interactiveWidget: "overlays-content"` el teclado tapa la
 * página sin achicarla. Esto mide cuánto tapa (con `visualViewport`) y lo deja en la variable CSS
 * `--keyboard-inset` del documento, así lo que va abajo (chat, barra rápida) se corre arriba del
 * teclado. En escritorio queda en 0. Devuelve la función para dejar de escuchar.
 */
export function trackKeyboardInset(): () => void {
  const viewport = window.visualViewport;
  const root = document.documentElement;
  if (!viewport) return () => {};

  const update = () => {
    const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    root.style.setProperty("--keyboard-inset", `${Math.round(covered)}px`);
    // iOS a veces desplaza la página al enfocar un input aunque no se pueda scrollear: se vuelve.
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  };
  update();
  viewport.addEventListener("resize", update);
  viewport.addEventListener("scroll", update);
  return () => {
    viewport.removeEventListener("resize", update);
    viewport.removeEventListener("scroll", update);
    root.style.removeProperty("--keyboard-inset");
  };
}

/** Pantalla táctil sin mouse (celular, tablet): sin hover y con puntero grueso. */
export function isTouchDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/** Pantalla chica (celular): el mismo corte que usa el CSS para el modo compacto. */
export function isSmallScreen(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 760px), (max-height: 500px)").matches;
}
