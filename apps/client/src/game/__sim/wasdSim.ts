/**
 * Simulador del movimiento propio (`movement.ts`) sin navegador: un server de mentira con la misma
 * lógica que CityRoom (recorrido del cliente con `followRoute`, si no `findPath`; un paso cada
 * STEP_MS; parches cada 50 ms; latencia con jitter, en orden) y un avatar con la misma cola que
 * Avatar.ts. Corre escenarios de teclado y clics y una prueba al azar, y cuenta lo que se vería raro:
 * retrocesos, saltos (teletransportes), pasos de más y si termina donde el server.
 *
 *   npm run sim:movement -w @montevideo-world/client          (SEED=n para una corrida, TRACE=1 para el detalle)
 *
 * Esperado: saltos=0 y finalMal=0 en todo. Los retrocesos de "reversa", "alternando" y "clics
 * rápidos" son los de invertir la dirección (el paso en curso se termina): son lógicos.
 */
import { STEP_MS, TilePoint } from "@montevideo-world/shared";
import { getCityMap } from "@montevideo-world/shared/cities";
import { LocalMover, MoverAvatar, sameTile } from "../movement";

const map = getCityMap("ciudad-vieja")!;
const DEBUG_SEED = Number(process.env.SEED ?? 0);
const FRAME = 16;
const PATCH_MS = 50;

/** Avatar de mentira con la misma lógica de cola que Avatar.ts (en tiles, sin píxeles). */
class SimAvatar implements MoverAvatar {
  tile: TilePoint;
  queue: TilePoint[] = [];
  seg: { from: TilePoint; to: TilePoint; elapsed: number; duration: number } | null = null;
  log: Array<{ t: number; from: TilePoint; to: TilePoint }> = [];
  snaps: Array<{ t: number; to: TilePoint; why: string }> = [];
  constructor(start: TilePoint, private clock: () => number) {
    this.tile = start;
  }
  endTile() {
    return this.queue[this.queue.length - 1] ?? this.headingTile();
  }
  headingTile() {
    return this.seg ? this.seg.to : this.tile;
  }
  pushTile(x: number, y: number) {
    const end = this.endTile();
    if (end.x === x && end.y === y) return;
    if (Math.max(Math.abs(end.x - x), Math.abs(end.y - y)) > 1 || this.queue.length >= 8) {
      const caller = (new Error().stack ?? "").split("\n").slice(2, 5).map((l) => l.trim().replace(/\(.*\//, "(")).join(" < ");
      this.snaps.push({ t: this.clock(), to: { x, y }, why: `no vecino de ${end.x},${end.y} :: ${caller}` });
      this.queue = [];
      this.seg = null;
      this.tile = { x, y };
      return;
    }
    this.queue.push({ x, y });
  }
  setPath(tiles: readonly TilePoint[]) {
    this.queue = [];
    for (const t of tiles) this.pushTile(t.x, t.y);
  }
  start(carry: number) {
    const to = this.queue.shift()!;
    const behind = Math.max(0, this.queue.length + 1 - 2);
    const factor = Math.min(2.5, 1 + behind * 0.3);
    const from = this.seg ? this.seg.to : this.tile;
    this.seg = { from, to, elapsed: carry, duration: STEP_MS / factor };
    this.log.push({ t: this.clock(), from, to });
  }
  tick(delta: number) {
    if (!this.seg && this.queue.length) this.start(0);
    while (this.seg) {
      this.seg.elapsed += delta;
      delta = 0;
      if (this.seg.elapsed < this.seg.duration) return;
      const s = this.seg;
      this.tile = s.to;
      this.seg = null;
      if (this.queue.length) this.start(s.elapsed - s.duration);
    }
  }
}

/** Server de mentira: misma lógica de handleMove / stepPlayers que CityRoom. */
class SimServer {
  path: TilePoint[] = [];
  steps: TilePoint[] = [];
  constructor(public tile: TilePoint) {}
  move(target: TilePoint, route: TilePoint[]) {
    if (!map.isWalkable(target.x, target.y)) return;
    const followed = map.followRoute(this.tile, route.slice(0, 256));
    if (followed === null) this.fallbacks++;
    let path = followed ?? map.findPath(this.tile, target);
    const end = path[path.length - 1] ?? this.tile;
    if (followed && !sameTile(end, target)) path = [...path, ...map.findPath(end, target)];
    this.path = path;
  }
  fallbacks = 0;
  step() {
    const next = this.path.shift();
    if (next) {
      this.tile = next;
      this.steps.push(next);
    }
  }
}

type KeyEvent = [number, "down" | "up" | "click", string];

let rngState = 1;
const rnd = () => ((rngState = (rngState * 1664525 + 1013904223) >>> 0) / 2 ** 32);

export function run(name: string, start: TilePoint, events: KeyEvent[], latency: number, totalMs = 5000, seed = 1) {
  if (name.includes("muy lejos")) totalMs = 40000;
  rngState = seed * 7919 + 13;
  let now = 0;
  const clock = () => now;
  const avatar = new SimAvatar(start, clock);
  const server = new SimServer(start);
  const inFlight: Array<{ at: number; fn: () => void }> = [];
  let sent = 0;
  let lastUp = 0;
  let lastDown = 0;
  const jitter = () => Math.floor(rnd() * latency * 0.6);
  const mover = new LocalMover(map, {
    sendMove: (target, route) => {
      sent++;
      const copy = route.map((t) => ({ ...t }));
      lastUp = Math.max(lastUp, now + latency + jitter());
      inFlight.push({ at: lastUp, fn: () => server.move(target, copy) });
    },
    now: clock,
    canWalk: () => true,
  });
  mover.setAvatar(avatar, start);
  if (process.env.TRACE) {
    const original = mover.onServerTile.bind(mover);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inner = mover as any;
    mover.onServerTile = (tile: TilePoint) => {
      const p = inner.prediction;
      const known = inner.serverTile;
      if (p && !(known && sameTile(known, tile))) {
        const idx = p.path.findIndex((step: TilePoint, i: number) => i > p.confirmed && sameTile(step, tile));
        if (idx < 0)
          console.log(`  [${now}] DESACUERDO srv=${fmt(tile)} conocido=${known && fmt(known)} pred=${p.path.map(fmt).join(" ")} conf=${p.confirmed} fed=${p.fed} av=${fmt(avatar.headingTile())} srvPath=${server.path.map(fmt).join(" ")}`);
      }
      original(tile);
    };
    const go = inner.go.bind(inner);
    inner.go = (target: TilePoint, steps: TilePoint[]) => {
      const b = inner.planningBase();
      console.log(`  [${now}] go base=${fmt(b.base)} keep=${b.keep.map(fmt).join(" ")} steps=${steps.map(fmt).join(" ")} av=${fmt(avatar.headingTile())} conocido=${inner.serverTile && fmt(inner.serverTile)} srvReal=${fmt(server.tile)}`);
      go(target, steps);
    };
  }
  const keys = new Set<string>();
  let lastPatched = { ...start };
  const serverPhase = Math.floor(rnd() * STEP_MS);
  let heldIdleMs = 0;
  for (now = 0; now <= totalMs; now += FRAME) {
    for (const [t, kind, code] of events) {
      if (!(t > now - FRAME && t <= now)) continue;
      if (kind === "click") {
        const [dx, dy] = code === "FAR" ? [0, 0] : code.split(",").map(Number);
        const target = code === "FAR" ? farTile() : { x: start.x + dx, y: start.y + dy };
        if (map.isWalkable(target.x, target.y)) mover.requestMove(target);
      } else if (kind === "down") keys.add(code);
      else keys.delete(code);
    }
    // server
    for (const msg of inFlight.filter((m) => m.at <= now).sort((a, b) => a.at - b.at)) msg.fn();
    for (let i = inFlight.length - 1; i >= 0; i--) if (inFlight[i].at <= now) inFlight.splice(i, 1);
    if ((now + serverPhase) % STEP_MS < FRAME) {
      server.step();
      if (process.env.TRACE) console.log(`  [${now}] srv paso -> ${fmt(server.tile)}`);
    }
    if (now % PATCH_MS < FRAME && !sameTile(lastPatched, server.tile)) {
      const tile = { ...server.tile };
      lastPatched = tile;
      lastDown = Math.max(lastDown, now + latency + jitter());
      inFlight.push({ at: lastDown, fn: () => mover.onServerTile(tile) });
    }
    mover.update(keys);
    avatar.tick(FRAME);
    if (keys.size > 0 && !avatar.seg && avatar.queue.length === 0) heldIdleMs += FRAME;
  }
  // análisis
  const reversals = [];
  for (let i = 1; i < avatar.log.length; i++) {
    const a = avatar.log[i - 1];
    const b = avatar.log[i];
    const d1 = { x: a.to.x - a.from.x, y: a.to.y - a.from.y };
    const d2 = { x: b.to.x - b.from.x, y: b.to.y - b.from.y };
    const dot = d1.x * d2.x + d1.y * d2.y;
    if (dot < 0) reversals.push(`${b.t}ms ${fmt(a.from)}→${fmt(a.to)}→${fmt(b.to)}`);
  }
  const ok = sameTile(avatar.tile, server.tile) && !avatar.seg;
  console.log(
    `${name.padEnd(46)} lat=${latency} pasos=${avatar.log.length} srv=${server.steps.length} moves=${sent} ` +
      `retrocesos=${reversals.length} saltos=${avatar.snaps.length} bfsServer=${server.fallbacks} quietoConTecla=${heldIdleMs}ms final=${ok ? "OK" : `DIFIERE av ${fmt(avatar.tile)} srv ${fmt(server.tile)}`}`,
  );
  for (const r of reversals.slice(0, 4)) console.log("     retroceso", r);
  for (const s of avatar.snaps.slice(0, 3)) console.log("     salto", s.t, fmt(s.to), s.why);
  return { reversals: reversals.length, snaps: avatar.snaps.length, ok, heldIdleMs, extra: avatar.log.length - server.steps.length };
}

const fmt = (t: TilePoint) => `${t.x},${t.y}`;
const hold = (code: string, from: number, to: number): KeyEvent[] => [[from, "down", code], [to, "up", code]];

// Buscar un tile abierto para empezar (con espacio alrededor).
function openTile(): TilePoint {
  for (let y = 4; y < map.height - 4; y++)
    for (let x = 4; x < map.width - 4; x++) {
      let ok = true;
      for (let dy = -3; dy <= 3 && ok; dy++) for (let dx = -3; dx <= 3 && ok; dx++) ok = map.isWalkable(x + dx, y + dy);
      if (ok) return { x, y };
    }
  throw new Error("sin tile abierto");
}
const start = openTile();
/** El tile caminable más lejano (en pasos) desde el inicio. */
function farTile(): TilePoint {
  let best = start;
  let bestLen = 0;
  for (let y = 0; y < map.height; y++)
    for (let x = 0; x < map.width; x++) {
      if (!map.isWalkable(x, y)) continue;
      const len = map.findPath(start, { x, y }).length;
      if (len > bestLen) {
        bestLen = len;
        best = { x, y };
      }
    }
  return best;
}
console.log("inicio", fmt(start));

const scenarios: Array<[string, KeyEvent[]]> = [
  ["D 1,5s", hold("KeyD", 100, 1600)],
  ["W luego +D (diagonal) luego suelta W", [...hold("KeyW", 100, 1300), ...hold("KeyD", 700, 2000)]],
  ["4 teclas en secuencia W,A,S,D y suelta en orden", [...hold("KeyW", 100, 1500), ...hold("KeyA", 300, 1700), ...hold("KeyS", 500, 1900), ...hold("KeyD", 700, 2100)]],
  ["4 teclas juntas", [...hold("KeyW", 100, 1500), ...hold("KeyA", 100, 1500), ...hold("KeyS", 100, 1500), ...hold("KeyD", 100, 1500)]],
  ["D y al toque A (reversa)", [...hold("KeyD", 100, 1100), ...hold("KeyA", 1100, 2100)]],
  ["toques cortos W,A,S,D", [...hold("KeyW", 100, 180), ...hold("KeyA", 400, 480), ...hold("KeyS", 700, 780), ...hold("KeyD", 1000, 1080)]],
  ["W/S alternando rápido", [...hold("KeyW", 100, 300), ...hold("KeyS", 300, 500), ...hold("KeyW", 500, 700), ...hold("KeyS", 700, 900)]],
  ["giros: W, W+D, D, S+D, S", [...hold("KeyW", 100, 900), ...hold("KeyD", 500, 1700), ...hold("KeyS", 1300, 2100)]],
  ["D largo (paredes, deslizar)", hold("KeyD", 100, 4000)],
  ["clic lejos", [[100, "click", "8,0"]]],
  ["clic muy lejos (otra punta del mapa)", [[100, "click", "FAR"]]],
  ["clic y otro clic a mitad (cambio de destino)", [[100, "click", "8,0"], [700, "click", "0,-5"]]],
  ["clics rápidos seguidos", [[100, "click", "5,0"], [250, "click", "-5,0"], [400, "click", "0,5"], [550, "click", "3,-3"]]],
  ["clic y después WASD", [[100, "click", "8,0"], ...hold("KeyS", 800, 1800)]],
  ["WASD y clic mientras camina", [...hold("KeyW", 100, 1500), [700, "click", "6,2"]]],
];
const totals = { reversals: 0, extra: 0, snaps: 0, bad: 0, idle: 0 };
const quiet = (fn: () => ReturnType<typeof run>) => {
  const log = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = log;
  }
};
for (const latency of DEBUG_SEED ? [] : [40, 120, 200]) {
  for (const [name, ev] of scenarios) {
    const agg = { reversals: 0, extra: 0, snaps: 0, bad: 0, idle: 0 };
    for (let seed = 1; seed <= 20; seed++) {
      const r = quiet(() => run(name, start, ev, latency, 5500, seed));
      agg.reversals += r.reversals;
      agg.extra += r.extra;
      agg.snaps += r.snaps;
      agg.bad += r.ok ? 0 : 1;
      agg.idle += r.heldIdleMs;
    }
    console.log(`${name.padEnd(46)} lat=${String(latency).padEnd(3)} x20: retrocesos=${agg.reversals} pasosDeMas=${agg.extra} saltos=${agg.snaps} finalMal=${agg.bad} quieto=${agg.idle}ms`);
    for (const k of Object.keys(totals) as Array<keyof typeof totals>) totals[k] += agg[k];
  }
}
console.log("TOTAL", JSON.stringify(totals));

// ---------- Fuzz: teclas al azar, latencia con jitter ----------
function fuzz(seed: number) {
  let s = seed;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const codes = ["KeyW", "KeyA", "KeyS", "KeyD"];
  const events: KeyEvent[] = [];
  const down = new Set<string>();
  for (let t = 100; t < 15000; t += 40 + Math.floor(rand() * 400)) {
    const code = codes[Math.floor(rand() * 4)];
    if (down.has(code)) {
      events.push([t, "up", code]);
      down.delete(code);
    } else {
      events.push([t, "down", code]);
      down.add(code);
    }
  }
  for (const code of down) events.push([15000, "up", code]);
  return events;
}
let worst = { extra: 0, snaps: 0, bad: 0, runs: 0 };
if (DEBUG_SEED) {
  run("debug", start, fuzz(DEBUG_SEED), 30 + (DEBUG_SEED % 6) * 35, 18000, DEBUG_SEED);
  process.exit(0);
}
for (let seed = 1; seed <= 200; seed++) {
  const latency = 30 + (seed % 6) * 35;
  const r = quiet(() => run("fuzz", start, fuzz(seed), latency, 18000, seed));
  if (r.snaps > 0 && !DEBUG_SEED) console.log("  seed con saltos", seed, r.snaps);
  worst.runs++;
  worst.snaps += r.snaps;
  worst.extra += r.extra;
  if (!r.ok) {
    worst.bad++;
    console.log("FUZZ final distinto: seed", seed, "lat", latency);
  }
}
console.log("FUZZ", JSON.stringify(worst));

