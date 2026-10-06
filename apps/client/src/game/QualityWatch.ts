import type { QualitySetting } from "@/lib/quality";

/** En automática: se mide desde acá (ms después de entrar, cuando ya se horneó todo)… */
const WARMUP_MS = 3000;
/** …en tandas de esto… */
const SAMPLE_MS = 5000;
/**
 * …y si `LOW_SAMPLES` tandas seguidas no llegan a esto, se pasa a baja (y queda así en este barrio).
 * Bien abajo de 30: el ahorro de energía de Chrome y el modo de bajo consumo de Safari limitan a 30
 * fps, y eso se juega bien; con 40 apagaba las luces y la lluvia en compus normales.
 */
const LOW_FPS = 24;
const LOW_SAMPLES = 2;

/**
 * Decide si la escena dibuja en calidad baja: lo elegido en Opciones o, en automática, según los
 * fps sostenidos en el barrio. Avisa con `apply(low)` sólo cuando cambia.
 */
export class QualityWatch {
  private elapsed = 0;
  private frames = 0;
  private sampledMs = 0;
  private autoLow = false;
  private slowSamples = 0;
  private low: boolean | null = null;

  constructor(
    private setting: QualitySetting,
    private readonly apply: (low: boolean) => void,
    /** En automática, cuando bajó por los fps (para avisarle al jugador). */
    private readonly onAutoLow?: () => void,
  ) {
    this.refresh();
  }

  set(setting: QualitySetting) {
    this.setting = setting;
    this.refresh();
  }

  /** Cada frame (con el delta real del loop). */
  update(delta: number) {
    if (this.setting !== "auto" || this.autoLow) return;
    // Con la pestaña oculta el navegador frena los frames: eso no es que el juego vaya lento.
    if (typeof document !== "undefined" && document.hidden) {
      this.frames = 0;
      this.sampledMs = 0;
      return;
    }
    this.elapsed += delta;
    if (this.elapsed < WARMUP_MS) return;
    this.frames++;
    this.sampledMs += delta;
    if (this.sampledMs < SAMPLE_MS) return;
    const fps = (this.frames * 1000) / this.sampledMs;
    this.frames = 0;
    this.sampledMs = 0;
    this.slowSamples = fps < LOW_FPS ? this.slowSamples + 1 : 0;
    if (this.slowSamples >= LOW_SAMPLES) {
      this.autoLow = true;
      this.refresh();
      this.onAutoLow?.();
    }
  }

  private refresh() {
    const low = this.setting === "low" || (this.setting === "auto" && this.autoLow);
    if (low === this.low) return;
    this.low = low;
    this.apply(low);
  }
}
