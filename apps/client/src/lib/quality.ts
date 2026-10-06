/**
 * Calidad gráfica elegida en Opciones (tecla O). Es una preferencia del navegador, como la barra
 * rápida. "auto": en alta, y la escena baja a "baja" si va muy lento (`QualityWatch`).
 * En baja no se dibujan los halos de luz de noche ni la lluvia y el viento (queda el tinte).
 */
export type QualitySetting = "auto" | "high" | "low";

export const QUALITY_SETTINGS: readonly QualitySetting[] = ["auto", "high", "low"];

const STORAGE_KEY = "mw:quality";

export function loadQuality(): QualitySetting {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return QUALITY_SETTINGS.includes(saved as QualitySetting) ? (saved as QualitySetting) : "auto";
  } catch {
    return "auto";
  }
}

export function saveQuality(quality: QualitySetting) {
  try {
    window.localStorage.setItem(STORAGE_KEY, quality);
  } catch {
    // Sin almacenamiento (modo privado, etc.): vale hasta recargar.
  }
}
