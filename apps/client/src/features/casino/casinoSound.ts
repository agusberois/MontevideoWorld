/**
 * Sonidos del casino, sintetizados con WebAudio (sin archivos): el traqueteo de los rodillos, el
 * golpe al frenar, el tic de la ruleta, las cartas, las fichas y la musiquita de cuando se gana.
 * Se pueden apagar (se recuerda en `mw:casino-sound`).
 */

const STORAGE_KEY = "mw:casino-sound";

let context: AudioContext | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    return false;
  }
}

export function isCasinoMuted(): boolean {
  return muted;
}

export function setCasinoMuted(value: boolean) {
  muted = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "off" : "on");
  } catch {
    // Sin almacenamiento: vale para esta visita.
  }
}

/** El contexto se crea con el primer sonido (siempre después de un clic, así el navegador lo deja sonar). */
function audio(): AudioContext | null {
  if (muted || typeof window === "undefined" || !("AudioContext" in window)) return null;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

/** Una nota: `at` segundos desde ahora, con ataque corto y caída. */
function tone(frequency: number, at: number, duration: number, type: OscillatorType = "square", volume = 0.06) {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + at;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export const casinoSound = {
  /** Clic de una ficha sobre el paño. */
  chip() {
    tone(1800, 0, 0.05, "triangle", 0.05);
    tone(2400, 0.03, 0.04, "triangle", 0.04);
  },
  /** Arranque de los rodillos: una escalita que sube. */
  spin() {
    [330, 392, 494, 587].forEach((f, i) => tone(f, i * 0.04, 0.06, "square", 0.035));
  },
  /** Un rodillo que frena. */
  reelStop(index: number) {
    tone(140 - index * 12, 0, 0.12, "triangle", 0.12);
    tone(900 + index * 120, 0, 0.04, "square", 0.03);
  },
  /** El tic de la bola pasando por una casilla. */
  tick() {
    tone(2600, 0, 0.018, "square", 0.025);
  },
  /** Carta sobre la mesa. */
  card() {
    tone(500, 0, 0.03, "sawtooth", 0.025);
    tone(260, 0.01, 0.05, "triangle", 0.04);
  },
  /** Tensión: falta un rodillo y los dos primeros coinciden. */
  suspense() {
    [660, 698, 740, 784, 831, 880].forEach((f, i) => tone(f, i * 0.11, 0.1, "square", 0.03));
  },
  /** Se ganó: arpegio; con premio grande, más largo y con campanas. */
  win(big: boolean) {
    const notes = big ? [523, 659, 784, 1047, 784, 1047, 1319, 1568] : [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, i * 0.09, 0.16, "square", 0.05));
    if (big) for (let i = 0; i < 14; i++) tone(2093 + (i % 3) * 300, 0.8 + i * 0.07, 0.08, "triangle", 0.035);
  },
  /** Empate o devolución: dos notas iguales. */
  push() {
    tone(587, 0, 0.1, "square", 0.04);
    tone(587, 0.12, 0.12, "square", 0.04);
  },
  /** Se perdió: dos notas que bajan. */
  lose() {
    tone(330, 0, 0.14, "triangle", 0.06);
    tone(247, 0.14, 0.22, "triangle", 0.06);
  },
};
