"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CityRoom = void 0;
exports.saveEveryone = saveEveryone;
const core_1 = require("@colyseus/core");
const shared_1 = require("@montevideo-world/shared");
const cities_1 = require("@montevideo-world/shared/cities");
const schema_1 = require("@montevideo-world/shared/schema");
const audit_1 = require("../audit");
const bans_1 = require("../bans");
const mutes_1 = require("../mutes");
const connectionLimits_1 = require("../connectionLimits");
const directory_1 = require("../directory");
const env_1 = require("../env");
const gameClock_1 = require("../gameClock");
const inventory_1 = require("../inventory");
const metrics_1 = require("../metrics");
const needs_1 = require("../needs");
const playerStore_1 = require("../playerStore");
const weather_1 = require("../weather");
const rateLimit_1 = require("../rateLimit");
const trades_1 = require("../trades");
const wallet_1 = require("../wallet");
const weevils_1 = require("../weevils");
const session_1 = require("./session");
const activities_1 = require("./systems/activities");
const admin_1 = require("./systems/admin");
const life_1 = require("./systems/life");
const barras_1 = require("./systems/barras");
const casino_1 = require("./systems/casino");
const doors_1 = require("./systems/doors");
const follow_1 = require("./systems/follow");
const gestures_1 = require("./systems/gestures");
const movement_1 = require("./systems/movement");
const welcome_1 = require("./systems/welcome");
const shops_1 = require("./systems/shops");
const social_1 = require("./systems/social");
const trading_1 = require("./systems/trading");
const travel_1 = require("./systems/travel");
/** Cada cuánto se mueven los picudos (más seguido que los jugadores: se arrastran de a poco). */
const WEEVIL_TICK_MS = 100;
/** Cada cuánto se guarda el progreso de los jugadores conectados. */
const SAVE_INTERVAL_MS = 15_000;
/** Código de cierre para la sesión vieja cuando la misma clave entra de nuevo. */
const DUPLICATE_SESSION_CODE = 4001;
/** Código de cierre para un cliente que spamea mensajes de forma sostenida (ver `rateLimit.ts`). */
const RATE_LIMIT_CODE = 4002;
/** Código de cierre cuando un mensaje suyo hizo fallar al server (se lo saca a él, no a todos). */
const SERVER_ERROR_CODE = 4500;
/**
 * Al cerrar una sesión, cuánto se espera que el cliente conteste el cierre antes de cortar el socket
 * (`ws` esperaría hasta 30 s, y mientras tanto el cliente podría seguir mandando mensajes).
 */
const CLOSE_GRACE_MS = 2000;
/**
 * Copias como mucho de cada barrio (cada una hasta `MAX_PLAYERS_PER_ROOM`): con 10 × 80 sobra, y
 * pone un techo a cuántas salas (con sus intervalos) puede haber vivas aunque alguien abuse.
 */
const MAX_COPIES_PER_CITY = 10;
/** Código de error al rechazar una entrada por los límites por IP (`connectionLimits.ts`). */
const TOO_MANY_JOINS_CODE = 429;
/** Código de error al rechazar una entrada desde una página que no es la del juego (`CORS_ORIGIN`). */
const FOREIGN_ORIGIN_CODE = 403;
/** Código de error cuando un barrio ya tiene todas sus copias llenas. */
const CITY_FULL_CODE = 503;
/** Cuánto esperar para avisarle a alguien que entró con otro nombre (ver `onJoin`). */
const RENAME_NOTICE_DELAY_MS = 1500;
function guestName() {
    return `Invitado${Math.floor(1000 + Math.random() * 9000)}`;
}
/** `name` si nadie lo usa; si no, con un número al final ("Juan2", "Juan3"…) sin pasar el largo máximo. */
function uniqueName(name, taken) {
    if (!taken(name))
        return name;
    for (let n = 2; n < 100; n++) {
        const suffix = String(n);
        const candidate = `${(0, shared_1.truncate)(name, shared_1.NAME_MAX_LENGTH - suffix.length)}${suffix}`;
        if (!taken(candidate))
            return candidate;
    }
    return guestName();
}
/** Salas abiertas en este proceso: para guardar a todos si el proceso se va a caer (`saveEveryone`). */
const openRooms = new Set();
/** Guarda a todos los jugadores conectados en todas las salas (antes de un cierre de emergencia). */
function saveEveryone() {
    for (const room of openRooms)
        room.saveConnectedPlayers();
}
/** ¿Tiene algún boleto STM en la mochila guardada? */
function hasTicket(key) {
    return (playerStore_1.playerStore.get(key)?.inventory ?? []).some((stack) => stack.itemId === shared_1.TICKET_ID);
}
/** ¿Puede entrar a una sala de acceso restringido (las Termas)? Donador guardado o el admin. */
function hasDonorAccess(key, name) {
    return (key !== null && playerStore_1.playerStore.get(key)?.donor === true) || (0, env_1.isAdminName)(name);
}
/**
 * ¿Al volver a entrar se lo lleva adonde quedó? A las Termas, si sigue siendo donador (se sale por la
 * puerta, sin boleto); a otro barrio, si tiene un boleto para volver (sólo se venden en Ciudad Vieja).
 */
function canResumeTo(key, location, name) {
    const city = (0, cities_1.getCityMap)(location.cityId)?.city;
    // Un barrio oculto (`CityInfo.hidden`): se vuelve a Ciudad Vieja.
    if (city?.hidden)
        return false;
    if (city?.access === "donor")
        return hasDonorAccess(key, name);
    // Las salas de puerta abierta (el casino) y el Centro, al que se llega caminando: se vuelve sin boleto.
    if (city?.access === "door" || city?.onFoot)
        return true;
    return hasTicket(key);
}
/** Dónde quedó la clave (barrio que existe y tile entero), o nada si no hay guardado válido. */
function savedLocation(key) {
    const location = playerStore_1.playerStore.get(key)?.location;
    if (!location || typeof location.cityId !== "string" || location.cityId === shared_1.JAIL_CITY_ID || !(0, cities_1.getCityMap)(location.cityId))
        return undefined;
    if (!Number.isInteger(location.x) || !Number.isInteger(location.y))
        return undefined;
    return location;
}
/**
 * Copias abiertas de cada barrio (cityId → números en uso). Cada sala nueva toma el número libre más
 * bajo y lo devuelve al cerrarse. En memoria del proceso, como `playerDirectory`: una sola instancia.
 */
const openCopies = new Map();
function takeCopyNumber(cityId) {
    const used = openCopies.get(cityId) ?? new Set();
    openCopies.set(cityId, used);
    let copy = 1;
    while (used.has(copy))
        copy += 1;
    used.add(copy);
    return copy;
}
function releaseCopyNumber(cityId, copy) {
    openCopies.get(cityId)?.delete(copy);
}
/**
 * Una sala por barrio: se registra con `filterBy(["cityId"])`, así cada `cityId` de las opciones de
 * join tiene sus propias salas. La sala tiene el ciclo de vida, los ticks, el registro de mensajes y
 * los envíos; lo que pasa con cada mensaje está en `systems/` (uno por tema), que recibe la sala y la
 * `PlayerSession` del jugador.
 */
class CityRoom extends core_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = shared_1.MAX_PLAYERS_PER_ROOM;
        /** Estado sólo de servidor de cada jugador (mochila, plata, camino…), por sessionId. */
        this.sessions = new Map();
        /** Invitaciones e intercambios entre jugadores de esta sala. */
        this.trades = new trades_1.TradeManager();
        /** Cárcel: dónde aparecen los presos (el patio); vacío en los demás barrios. */
        this.prisonTiles = [];
        /** Lo que los comandos de chat pueden pedirle a la sala. */
        this.commandHost = (0, social_1.createCommandHost)(this);
        this.spawnTiles = [];
        /** Lista de jugadores que se les pasa a los picudos en cada tick (reutilizada, ver `WeevilHost.players`). */
        this.weevilTargets = [];
        /** Jugadores con mochila o plata por mandar (ver `flushPrivate`). */
        this.unsent = new Set();
        this.flushQueued = false;
        /** Partido que se está jugando en el Centenario (sólo en el barrio con zona de venta), para anunciarlo. */
        this.currentMatch = null;
        this.messageSeq = 0;
        /** Límite de frecuencia por cliente y por tipo de mensaje: lo aplica `route` a todos. */
        this.rateLimiter = new rateLimit_1.RateLimiter();
        /** "barrio#copia (roomId)", para los avisos del log (y la auditoría, `audit.ts`). */
        this.label = "";
        /** Lo llama presence en cada sala: reenvía el anuncio a sus jugadores. */
        this.relayAnnouncement = (announcement) => {
            this.broadcast(shared_1.MessageType.Announcement, announcement);
        };
    }
    /**
     * Corre en el pedido HTTP de matchmaking (`joinOrCreate` / `joinById`), antes de reservar el
     * asiento: aplica los límites por IP (`connectionLimits.ts`). Lo que devuelve llega a `onJoin`.
     */
    static async onAuth(_token, options, context) {
        // CORS sólo frena que el navegador lea la respuesta: el pedido igual llega. Acá se corta antes de
        // reservar el asiento, así otra página no puede meter a sus visitantes al juego.
        if (!(0, env_1.isOriginAllowed)(context.headers.origin)) {
            throw new core_1.ServerError(FOREIGN_ORIGIN_CODE, "Origen no permitido.");
        }
        const ip = (0, connectionLimits_1.clientIp)(context.ip);
        const refused = (0, connectionLimits_1.admitJoin)(ip);
        if (refused)
            throw new core_1.ServerError(TOO_MANY_JOINS_CODE, refused);
        // Clave sin progreso guardado: tope de claves nuevas por IP (M1, `players.json` sin techo).
        const key = (0, shared_1.isPlayerKey)(options?.playerKey) ? options.playerKey : null;
        const refusedKey = key && !playerStore_1.playerStore.get(key) ? (0, connectionLimits_1.admitNewKey)(ip, key) : null;
        if (refusedKey)
            throw new core_1.ServerError(TOO_MANY_JOINS_CODE, refusedKey);
        // Volver a donde quedó: si entra desde la pantalla de ingreso al barrio de spawn pero había quedado
        // en otro, se le da un pase hasta ese tile y se lo manda ahí (el cliente reintenta con ese barrio).
        // Sin boleto en la mochila, no (los boletos sólo se venden en Ciudad Vieja: quedaría trancado); a
        // las Termas, sólo si sigue siendo donador (`canResumeTo`).
        const saved = options?.resume && options.cityId === shared_1.SPAWN_CITY_ID && key ? savedLocation(key) : undefined;
        const location = saved && canResumeTo(key, saved, (0, shared_1.sanitizeName)(options?.name)) ? saved : undefined;
        // Un pase vigente (de un viaje o un `/trace` en curso) no se pisa.
        const pending = key ? playerStore_1.travelTickets.get(key) : undefined;
        if (location && location.cityId !== shared_1.SPAWN_CITY_ID && !(pending && pending.expiresAt >= Date.now())) {
            (0, playerStore_1.issueTravelTicket)(key, location.cityId, Date.now() + shared_1.TRAVEL_TICKET_MS, Date.now(), { at: { x: location.x, y: location.y } });
            throw new core_1.ServerError(shared_1.RESUME_CITY_CODE, location.cityId);
        }
        return { ip };
    }
    onCreate(options = {}) {
        const map = typeof options.cityId === "string" ? (0, cities_1.getCityMap)(options.cityId) : undefined;
        if (!map)
            throw new Error(`Barrio desconocido: ${(0, audit_1.logText)(String(options.cityId), 40)}`);
        if ((openCopies.get(map.city.id)?.size ?? 0) >= MAX_COPIES_PER_CITY) {
            throw new core_1.ServerError(CITY_FULL_CODE, `${map.city.name} está lleno: probá en un rato.`);
        }
        this.map = map;
        this.spawnTiles = map.spawnTiles();
        this.prisonTiles = map.prisonTiles();
        this.state = new schema_1.GameState();
        this.state.copy = takeCopyNumber(map.city.id);
        // Vacío hasta el primer `syncClock`, que copia el clima sin anunciarlo.
        this.state.weather = "";
        this.label = `${map.city.id}#${this.state.copy} (${this.roomId})`;
        metrics_1.liveRooms.add(this);
        openRooms.add(this);
        if (this.state.copy > 1)
            console.log(`[CityRoom ${this.roomId}] ${map.city.id} lleno: se abrió la copia ${this.state.copy}`);
        // Todos los mensajes del cliente, cada uno con su sistema. No compila si falta alguno.
        const routes = {
            ...(0, movement_1.movementRoutes)(this),
            ...(0, welcome_1.welcomeRoutes)(this),
            ...(0, shops_1.shopRoutes)(this),
            ...(0, activities_1.activityRoutes)(this),
            ...(0, life_1.lifeRoutes)(this),
            ...(0, trading_1.tradeRoutes)(this),
            ...(0, social_1.socialRoutes)(this),
            ...(0, gestures_1.gestureRoutes)(this),
            ...(0, doors_1.doorRoutes)(this),
            ...(0, follow_1.followRoutes)(this),
            ...(0, casino_1.casinoRoutes)(this),
            ...(0, barras_1.barraRoutes)(this),
            ...(0, admin_1.adminRoutes)(this),
            ...(0, travel_1.travelRoutes)(this),
        };
        for (const type of Object.keys(routes))
            this.route(type, routes[type]);
        // Tipos sin handler (cliente modificado): se cuentan contra el límite y se descartan sin loguear.
        this.onMessage(rateLimit_1.UNKNOWN_MESSAGE_TYPE, (client) => {
            const session = this.sessions.get(client.sessionId);
            if (session && !session.closed)
                this.allowMessage(session, rateLimit_1.UNKNOWN_MESSAGE_TYPE);
        });
        this.presence.subscribe(social_1.ANNOUNCEMENT_TOPIC, this.relayAnnouncement);
        this.clock.setInterval(() => {
            const started = performance.now();
            (0, movement_1.stepPlayers)(this);
            (0, gestures_1.stepGestures)(this);
            (0, life_1.tickNeeds)(this);
            (0, social_1.tickTyping)(this);
            metrics_1.tickMetrics.players.record(performance.now() - started, this.label);
        }, shared_1.STEP_MS);
        this.weevils = new weevils_1.WeevilManager(this.state.weevils, {
            // Se reutiliza la misma lista (y los mismos objetos) en cada tick: no se crea basura 10 veces por segundo.
            players: () => {
                let i = 0;
                for (const [id, { player }] of this.sessions) {
                    const target = (this.weevilTargets[i] ??= { id, tile: { x: 0, y: 0 } });
                    target.id = id;
                    target.tile.x = player.x;
                    target.tile.y = player.y;
                    i += 1;
                }
                this.weevilTargets.length = i;
                return this.weevilTargets;
            },
            bite: (sessionId) => {
                const needs = this.sessions.get(sessionId)?.needs;
                needs?.drainEnergy(shared_1.WEEVIL_BITE_ENERGY);
                needs?.hurt(shared_1.WEEVIL_BITE_HEALTH);
            },
        });
        this.clock.setInterval(() => {
            // Sin picudos no hay nada que simular (ni que medir).
            if (this.weevils.size === 0)
                return;
            const started = performance.now();
            this.weevils.tick(WEEVIL_TICK_MS, Date.now());
            metrics_1.tickMetrics.weevils.record(performance.now() - started, this.label);
        }, WEEVIL_TICK_MS);
        // Guardado periódico: si el proceso se corta, se pierde como mucho este intervalo.
        this.clock.setInterval(() => this.saveAllPlayers(), SAVE_INTERVAL_MS);
        // La hora del juego se copia al Schema una vez por segundo (avanza ~1 minuto del juego por segundo).
        // Si arranca con un partido en juego, no se anuncia (nadie estaba para oírlo).
        this.currentMatch = this.map.city.vending ? (gameClock_1.gameClock.currentMatch()?.name ?? null) : null;
        this.syncClock();
        this.clock.setInterval(() => this.syncClock(), 1000);
    }
    onJoin(client, options = {}, auth) {
        const spawn = this.randomSpawnTile();
        const player = new schema_1.Player();
        player.sessionId = client.sessionId;
        player.name = (0, shared_1.sanitizeName)(options.name) || guestName();
        // Aspecto elegido en la pantalla de ingreso (validado); si no vino o es inválido, uno al azar.
        const look = (0, shared_1.sanitizeAppearance)(options.appearance) ?? (0, shared_1.randomAppearance)();
        player.color = look.color;
        player.gender = look.gender;
        player.skin = look.skin;
        player.hairColor = look.hairColor;
        player.hairStyle = look.hairStyle;
        player.eyeColor = look.eyeColor;
        player.facialHair = look.facialHair;
        player.glasses = look.glasses;
        player.admin = (0, env_1.isAdminName)(player.name);
        player.x = spawn.x;
        player.y = spawn.y;
        // Con clave: se recupera lo guardado (y si la clave ya estaba en uso, se cierra esa sesión).
        const key = (0, shared_1.isPlayerKey)(options.playerKey) ? options.playerKey : null;
        // Nombres: nadie usa uno reservado ni imita al del admin, y no hay dos conectados que se vean
        // iguales (`nameKey`): al segundo se le suma un número. La sesión que esta clave reemplaza (otra
        // pestaña) no cuenta.
        const wantedName = player.name;
        const reserved = !player.admin && (0, shared_1.isReservedName)(player.name, (0, env_1.adminName)());
        if (reserved)
            player.name = guestName();
        const replacing = key ? playerStore_1.activeSessions.get(key)?.sessionId : undefined;
        player.name = uniqueName(player.name, (name) => directory_1.playerDirectory.find(name).some((other) => other.sessionId !== replacing));
        // Fuera del barrio de spawn sólo se entra con boleto (se paga en la sala de origen). Al de spawn
        // también puede venir uno (de `/trace`): se consume igual, para aparecer al lado del jugador.
        const issued = key ? playerStore_1.travelTickets.get(key) : undefined;
        const ticket = issued && issued.cityId === this.map.city.id && issued.expiresAt >= Date.now() ? issued : undefined;
        // Preso (`/ban`): sólo puede entrar al COMCAR, y ahí entra sin boleto. El cliente, al ver este
        // código, entra solo al COMCAR.
        const jailedUntil = Math.max(bans_1.bans.until(key, wantedName), bans_1.bans.until(key, player.name));
        const inJail = this.map.city.id === shared_1.JAIL_CITY_ID;
        if (jailedUntil && !inJail) {
            throw new core_1.ServerError(shared_1.JAILED_JOIN_CODE, `Estás preso en el COMCAR: te quedan ${(0, shared_1.formatJailLeft)((jailedUntil - Date.now()) / 1000)}.`);
        }
        if (this.map.city.id !== shared_1.SPAWN_CITY_ID && !ticket && !(inJail && jailedUntil)) {
            throw new Error(`Para entrar a ${this.map.city.name} necesitás un boleto.`);
        }
        // Las Termas: el pase solo no alcanza, tiene que ser donador (guardado) o el admin.
        if (this.map.city.access === "donor" && !hasDonorAccess(key, wantedName)) {
            throw new Error(`${this.map.city.name}: sólo entran los donadores del proyecto.`);
        }
        if (jailedUntil) {
            player.jailLeft = Math.ceil((jailedUntil - Date.now()) / 1000);
            // Preso: aparece adentro, en el patio (las visitas aparecen afuera, del otro lado de la reja).
            const cell = this.randomPrisonTile();
            if (cell) {
                player.x = cell.x;
                player.y = cell.y;
            }
        }
        // Vuelve a entrar al barrio donde había quedado (Ciudad Vieja; a los otros llega con el pase de
        // `onAuth`): aparece en el mismo tile, si se puede caminar.
        const location = options.resume && !ticket && !jailedUntil && key ? savedLocation(key) : undefined;
        if (location && location.cityId === this.map.city.id && this.map.isWalkable(location.x, location.y)) {
            player.x = location.x;
            player.y = location.y;
        }
        if (ticket) {
            playerStore_1.travelTickets.delete(key);
            const at = ticket.at && this.map.isWalkable(ticket.at.x, ticket.at.y) ? ticket.at : undefined;
            const near = ticket.near ? this.tileNear(ticket.near) : at;
            if (near) {
                player.x = near.x;
                player.y = near.y;
            }
        }
        if (key) {
            const previous = playerStore_1.activeSessions.get(key);
            if (previous)
                previous.owner.evictDuplicate(previous.sessionId);
            playerStore_1.activeSessions.set(key, { owner: this, sessionId: client.sessionId });
        }
        const saved = key ? playerStore_1.playerStore.get(key) : undefined;
        let inventory;
        let wallet;
        if (saved) {
            player.donor = saved.donor === true;
            const pet = saved.pet && (0, shared_1.getPet)(saved.pet.id);
            const petName = (0, shared_1.sanitizePetName)(saved.pet?.name);
            if (pet && petName) {
                player.pet = pet.id;
                player.petName = petName;
            }
            for (const slot of shared_1.ITEM_SLOTS) {
                const item = (0, shared_1.getClothing)(saved.outfit?.[slot] ?? "");
                player[slot] = item && item.slot === slot ? item.id : "";
            }
            inventory = inventory_1.Inventory.restore(saved.inventory ?? []);
            const money = Number.isSafeInteger(saved.money) && saved.money >= 0 && saved.money <= shared_1.MAX_MONEY ? saved.money : shared_1.STARTING_MONEY;
            wallet = new wallet_1.Wallet(money);
        }
        else {
            // Jugador nuevo: aparece con el kit inicial puesto y una torta frita en la mochila.
            for (const slot of shared_1.ITEM_SLOTS) {
                const options = shared_1.STARTER_KIT[slot];
                player[slot] = options ? options[Math.floor(Math.random() * options.length)] : "";
            }
            inventory = new inventory_1.Inventory();
            for (const itemId of shared_1.STARTER_INVENTORY)
                inventory.add(itemId);
            wallet = new wallet_1.Wallet();
        }
        // Necesidades guardadas (un guardado viejo sin ellas: todo lleno); jugador nuevo, con hambre.
        const needs = saved ? needs_1.Needs.restore(saved.needs) : needs_1.Needs.starter();
        player.energy = needs.energy;
        const session = (0, session_1.createSession)(client, player, inventory, wallet, needs, key);
        // Bienvenida: un jugador nuevo la empieza; un guardado sin ella (de antes) ya la tiene terminada.
        if (saved)
            session.welcome = (0, shared_1.sanitizeWelcome)(saved.welcome);
        session.ip = auth?.ip ?? "?";
        // Su barra (sigla y color sobre el avatar): la ve todo el barrio.
        (0, barras_1.applyBarra)(session);
        this.sessions.set(client.sessionId, session);
        (0, connectionLimits_1.connectionOpened)(session.ip);
        this.state.players.set(client.sessionId, player);
        directory_1.playerDirectory.add({
            sessionId: client.sessionId,
            name: player.name,
            cityId: this.map.city.id,
            cityName: this.map.city.name,
            playerId: key ? (0, playerStore_1.playerId)(key) : null,
            mailbox: this,
        });
        this.broadcastSystem(`${player.name} llegó a ${this.map.city.name}`, client);
        (0, audit_1.auditJoin)(session, this.label, saved !== undefined);
        // Había quedado en otro barrio pero sin boleto para volver a Ciudad Vieja: se lo trajo acá.
        const stranded = options.resume && key && !ticket && !jailedUntil ? savedLocation(key) : undefined;
        if (stranded && stranded.cityId !== this.map.city.id) {
            const city = (0, cities_1.getCityMap)(stranded.cityId)?.city;
            const text = city?.access === "donor"
                ? `♥ Habías quedado en ${city.name}, pero ya no tenés acceso: apareciste en ${this.map.city.name}.`
                : `🚌 Habías quedado en ${city?.name ?? "otro barrio"}, pero sin boleto para volver: apareciste en ${this.map.city.name}.`;
            this.clock.setTimeout(() => {
                if (!session.closed && this.sessions.get(client.sessionId) === session)
                    this.notice(session, text);
            }, RENAME_NOTICE_DELAY_MS);
        }
        if (player.name !== wantedName) {
            const why = reserved ? "Ese nombre está reservado" : "Ya hay alguien conectado con ese nombre (o uno muy parecido)";
            // Con demora: el cliente registra sus handlers después de entrar (si no, el aviso se pierde).
            this.clock.setTimeout(() => {
                if (!session.closed && this.sessions.get(client.sessionId) === session)
                    this.notice(session, `${why}: entraste como ${player.name}.`);
            }, RENAME_NOTICE_DELAY_MS);
        }
    }
    onLeave(client) {
        directory_1.playerDirectory.remove(client.sessionId);
        this.rateLimiter.forget(client.sessionId);
        const session = this.sessions.get(client.sessionId);
        if (!session)
            return;
        (0, activities_1.stopActivities)(session);
        (0, trading_1.cancelTrade)(this, session, "leave");
        this.savePlayer(session);
        if (session.key && playerStore_1.activeSessions.get(session.key)?.sessionId === client.sessionId)
            playerStore_1.activeSessions.delete(session.key);
        this.sessions.delete(client.sessionId);
        (0, connectionLimits_1.connectionClosed)(session.ip);
        this.unsent.delete(session);
        this.state.players.delete(client.sessionId);
        this.broadcastSystem(`${session.player.name} se fue de ${this.map.city.name}`);
        console.log(`[CityRoom ${this.roomId}] leave ${client.sessionId}`);
    }
    onDispose() {
        metrics_1.liveRooms.delete(this);
        openRooms.delete(this);
        // `onCreate` tiró antes de cargar el mapa (barrio desconocido o con todas sus copias): no tomó
        // número de copia ni se suscribió a nada.
        if (!this.map)
            return;
        releaseCopyNumber(this.map.city.id, this.state.copy);
        this.presence.unsubscribe(social_1.ANNOUNCEMENT_TOPIC, this.relayAnnouncement);
        console.log(`[CityRoom ${this.roomId}] disposed`);
    }
    /** Guarda la mochila, la plata, la ropa y lo demás del jugador bajo su clave (si entró con una). */
    savePlayer(session) {
        const { key, player } = session;
        if (!key)
            return;
        playerStore_1.playerStore.set(key, {
            name: player.name,
            money: session.wallet.balance,
            inventory: session.inventory.snapshot(),
            outfit: { hat: player.hat, top: player.top, bottom: player.bottom, shoes: player.shoes },
            donor: player.donor,
            jailedUntil: bans_1.bans.savedUntil(key),
            pet: player.pet ? { id: player.pet, name: player.petName } : undefined,
            needs: session.needs.snapshot(),
            welcome: session.welcome,
            // En el COMCAR (preso o de visita) se conserva el lugar de antes: al volver no aparece en la cárcel.
            // Volando (`/god`) puede estar arriba de un edificio: se guarda la baldosa caminable más cercana.
            location: this.map.city.id === shared_1.JAIL_CITY_ID ? playerStore_1.playerStore.get(key)?.location : { cityId: this.map.city.id, ...this.savedTile(player) },
        });
    }
    /** Dónde guardar al jugador: su tile o, volando (`/god`, quizá arriba de un edificio), la baldosa caminable más cercana. */
    savedTile(player) {
        const here = { x: player.x, y: player.y };
        return player.flying ? (this.map.nearestWalkable(here) ?? here) : here;
    }
    saveAllPlayers() {
        for (const session of this.sessions.values())
            this.savePlayer(session);
    }
    /** Para `saveEveryone` (cierre de emergencia del proceso). */
    saveConnectedPlayers() {
        this.saveAllPlayers();
    }
    /**
     * La misma clave entró de nuevo (otra pestaña): se guarda esta sesión y se cierra. Se le saca la
     * clave antes de cerrarla para que su `onLeave` no pise después lo que haga la sesión nueva.
     */
    evictDuplicate(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        (0, activities_1.stopActivities)(session);
        (0, trading_1.cancelTrade)(this, session, "leave");
        this.savePlayer(session);
        session.key = null;
        this.notice(session, "Entraste desde otra pestaña o dispositivo: esta sesión se cerró.");
        this.closeSession(session, DUPLICATE_SESSION_CODE);
    }
    /**
     * Cierra la sesión ya: desde este momento no se procesa nada suyo (`closed`), se corta lo que
     * estaba haciendo y se cierra el socket. `client.leave` sólo **pide** el cierre: si el cliente no lo
     * contesta, `ws` esperaría hasta 30 s y Colyseus seguiría entregando sus mensajes; por eso, pasado
     * `CLOSE_GRACE_MS`, se corta el socket. El guardado y la limpieza siguen siendo los de `onLeave`.
     */
    closeSession(session, code) {
        if (session.closed)
            return;
        session.closed = true;
        (0, activities_1.stopActivities)(session);
        (0, trading_1.cancelTrade)(this, session, "leave");
        session.client.leave(code);
        this.clock.setTimeout(() => {
            if (this.sessions.get(session.client.sessionId) !== session)
                return; // ya salió
            session.client.ref?.terminate?.();
        }, CLOSE_GRACE_MS);
    }
    /**
     * Registrar el handler de un mensaje: pasa por el límite de frecuencia (`rateLimit.ts`), sólo para
     * jugadores que están en la sala y sólo si el payload pasa su guard (`MESSAGE_GUARDS`).
     */
    route(type, handler) {
        const guard = shared_1.MESSAGE_GUARDS[type];
        const run = handler;
        this.onMessage(type, (client, message) => {
            const session = this.sessions.get(client.sessionId);
            // Una sesión que se está cerrando ya no hace nada (ni cuenta contra el límite).
            if (!session || session.closed)
                return;
            if (!this.allowMessage(session, type) || !guard(message))
                return;
            try {
                run(session, message);
            }
            catch (error) {
                // Un mensaje que hace fallar al server saca a ese jugador, no al proceso entero (Colyseus no
                // protege los handlers). Lo que el handler llegó a cambiar queda en memoria y se guarda al salir.
                console.error(`[CityRoom ${this.label}] error procesando "${type}" de ${client.sessionId} (${session.player.name})`, error);
                this.closeSession(session, SERVER_ERROR_CODE);
            }
        });
    }
    /** ¿Se procesa? Si el cliente abusa de forma sostenida, se lo desconecta (`RATE_LIMIT_CODE`). */
    allowMessage(session, type) {
        const { sessionId } = session.client;
        const decision = this.rateLimiter.check(sessionId, type, Date.now());
        if (decision === "ok")
            return true;
        if (decision === "kick") {
            console.warn(`[RateLimit] ${this.label}: se desconectó a ${sessionId} (${session.player.name}) por spam (${this.rateLimiter.droppedBy(sessionId)} mensajes descartados, el último "${type}")`);
            // El estado del límite se olvida recién en `onLeave`: si se olvidara ahora, sus mensajes
            // volverían a entrar con los baldes llenos hasta que se cierre el socket.
            this.closeSession(session, RATE_LIMIT_CODE);
        }
        return false;
    }
    /** Para `/health`. */
    stats() {
        return {
            roomId: this.roomId,
            cityId: this.map.city.id,
            copy: this.state.copy,
            players: this.state.players.size,
            weevils: this.weevils.size,
            rateLimited: this.rateLimiter.droppedTotal,
            kicked: this.rateLimiter.kickedTotal,
        };
    }
    // --- Envíos privados ---------------------------------------------------------------------------
    /**
     * Mensaje sólo para este jugador. Antes se manda la mochila / la plata que hayan cambiado, así le
     * llegan antes que el resultado que las menciona (p. ej. "Compraste…" con el saldo nuevo).
     */
    sendTo(session, type, message) {
        this.flushPrivate(session);
        session.client.send(type, message);
    }
    notice(session, text) {
        this.sendTo(session, shared_1.MessageType.Notice, { text });
    }
    /**
     * La mochila cambió: se le manda una sola vez aunque cambie varias veces en el mismo handler o
     * timer (antes, terminar una pesca la mandaba dos veces). Sale con el próximo `send` a ese jugador
     * o, si no hay ninguno, al terminar lo que se está ejecutando (microtarea).
     */
    markInventory(session) {
        session.inventoryDirty = true;
        // Vendió o tiró el sobre de la bienvenida antes de entregarlo: termina la misión (cuidacoches).
        (0, welcome_1.checkWelcomeLetter)(this, session);
        this.queueFlush(session);
    }
    /** La plata cambió (ver `markInventory`). */
    markWallet(session) {
        session.walletDirty = true;
        this.queueFlush(session);
    }
    queueFlush(session) {
        this.unsent.add(session);
        if (this.flushQueued)
            return;
        this.flushQueued = true;
        queueMicrotask(() => {
            this.flushQueued = false;
            for (const pending of [...this.unsent])
                this.flushPrivate(pending);
        });
    }
    /** Manda la mochila y la plata pendientes; si cambiaron, revisa que la oferta del intercambio siga valiendo. */
    flushPrivate(session) {
        if (!this.unsent.delete(session))
            return;
        if (this.sessions.get(session.client.sessionId) !== session)
            return;
        const { inventoryDirty, walletDirty } = session;
        session.inventoryDirty = false;
        session.walletDirty = false;
        if (inventoryDirty) {
            session.client.send(shared_1.MessageType.Inventory, { stacks: session.inventory.snapshot(), capacity: session.inventory.capacity });
        }
        if (walletDirty)
            session.client.send(shared_1.MessageType.Wallet, { balance: session.wallet.balance });
        if (inventoryDirty || walletDirty)
            (0, trading_1.revalidateTrade)(this, session);
    }
    /** Las necesidades privadas (hambre, salud) sólo al dueño, como la plata. */
    sendNeeds(session) {
        const message = { hunger: session.needs.hunger, health: session.needs.health };
        session.sentNeeds = message;
        this.sendTo(session, shared_1.MessageType.Needs, message);
    }
    // --- Chat de la sala ---------------------------------------------------------------------------
    broadcastSystem(text, except) {
        this.broadcastChat({ id: this.nextMessageId(), kind: "system", sessionId: "", name: "Sistema", text, timestamp: Date.now() }, except);
    }
    broadcastChat(payload, except) {
        this.broadcast(shared_1.MessageType.Chat, payload, except ? { except } : undefined);
    }
    nextMessageId() {
        this.messageSeq += 1;
        return `${this.roomId}-${this.messageSeq}`;
    }
    // --- Reloj y partidos --------------------------------------------------------------------------
    syncClock() {
        const minute = Math.floor(gameClock_1.gameClock.minuteOfDay());
        if (this.state.minuteOfDay !== minute)
            this.state.minuteOfDay = minute;
        const match = gameClock_1.gameClock.currentMatch()?.name ?? "";
        if (this.state.match !== match)
            this.state.match = match;
        const mode = gameClock_1.gameClock.getMatchMode();
        if (this.state.matchMode !== mode)
            this.state.matchMode = mode;
        this.announceMatch(match || null);
        const { id: weatherId, announce } = weather_1.weather.current();
        const weatherMode = weather_1.weather.getMode();
        if (this.state.weatherMode !== weatherMode)
            this.state.weatherMode = weatherMode;
        if (this.state.weather !== weatherId) {
            // Al abrir la sala no se anuncia (nadie estaba para verlo cambiar).
            if (this.state.weather !== "")
                this.broadcastSystem(announce);
            this.state.weather = weatherId;
        }
        (0, travel_1.updateJail)(this);
    }
    /** En el barrio con zona de venta se avisa por el chat cuando empieza y termina un partido. */
    announceMatch(match) {
        const zone = this.map.city.vending;
        if (!zone || match === this.currentMatch)
            return;
        if (match) {
            this.broadcastSystem(`⚽ ¡Arrancó ${match} en el Estadio Centenario! En la ${zone.name} se vende el doble.`);
        }
        else if (this.currentMatch) {
            this.broadcastSystem(`⚽ Terminó ${this.currentMatch}. Los hinchas se van del Centenario.`);
        }
        this.currentMatch = match;
    }
    // --- Lugares -----------------------------------------------------------------------------------
    randomSpawnTile() {
        return this.spawnTiles[Math.floor(Math.random() * this.spawnTiles.length)];
    }
    randomPrisonTile() {
        return this.prisonTiles[Math.floor(Math.random() * this.prisonTiles.length)];
    }
    /**
     * Tile caminable pegado al jugador `sessionId` (para `/trace`), el más cercano a `from` (otro
     * jugador de la sala) si viene. Si no hay ninguno libre, su propio tile si es caminable.
     */
    tileNear(sessionId, from) {
        const target = this.tileOf(sessionId);
        if (!target)
            return undefined;
        const origin = (from ? this.tileOf(from) : undefined) ?? target;
        return this.map.approachTile(target, origin) ?? (this.map.isWalkable(target.x, target.y) ? target : undefined);
    }
    // --- PrivateMailbox (otras salas: `/mensaje`, `/trace`, `/ban`) --------------------------------
    tileOf(sessionId) {
        const player = this.sessions.get(sessionId)?.player;
        return player ? { x: player.x, y: player.y } : undefined;
    }
    deliverPrivate(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (session)
            this.sendTo(session, shared_1.MessageType.Chat, message);
    }
    jail(sessionId, until) {
        const session = this.sessions.get(sessionId);
        if (session)
            (0, travel_1.jail)(this, session, until);
    }
    refreshBarra(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        (0, barras_1.applyBarra)(session);
        (0, barras_1.sendBarra)(this, session);
    }
    summon(sessionId, place) {
        const session = this.sessions.get(sessionId);
        if (!session || session.closed)
            return "ya no está conectado.";
        if (!session.key)
            return "su navegador no guarda datos del sitio (no puede viajar).";
        if (bans_1.bans.until(session.key, session.player.name))
            return "está preso: liberalo antes con /ban 0.";
        const city = (0, cities_1.getCityMap)(place.cityId)?.city;
        if (city?.access === "donor" && !session.player.donor && !session.player.admin)
            return `no es donador y no puede entrar a ${city.name}.`;
        (0, activities_1.stopActivities)(session);
        this.savePlayer(session);
        (0, playerStore_1.issueTravelTicket)(session.key, place.cityId, Date.now() + shared_1.TRAVEL_TICKET_MS, Date.now(), { at: place.at });
        this.sendTo(session, shared_1.MessageType.TravelApproved, { cityId: place.cityId, roomId: place.roomId });
        this.notice(session, `🧲 ${place.by} te está trayendo a su lado.`);
        return null;
    }
    mute(sessionId, until) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        mutes_1.mutes.set(session.key, session.player.name, until);
        this.notice(session, until ? `🔇 Te silenciaron: no podés hablar por ${(0, shared_1.formatJailLeft)((until - Date.now()) / 1000)}.` : "🔊 Ya podés volver a hablar.");
    }
}
exports.CityRoom = CityRoom;
//# sourceMappingURL=CityRoom.js.map