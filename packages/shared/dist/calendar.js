"use strict";
/**
 * Calendario real de Uruguay (feriados y fechas del año), para el panel Calendario (tecla K).
 *
 * - Feriados fijos por ley (16.805, redacción de la 17.414). **No laborables**: 1/1, 1/5, 18/7, 25/8 y
 *   25/12; el resto son **laborables** (no se trabaja en lo público, sí en lo privado).
 * - Se corren al lunes (misma ley) el 19/4, el 18/5 y el 12/10: martes o miércoles → lunes anterior;
 *   jueves o viernes → lunes siguiente; sábado, domingo o lunes quedan.
 * - Carnaval (lunes y martes, 48 y 47 días antes de Pascua) y Turismo (la semana anterior a Pascua)
 *   se calculan con la fecha de Pascua.
 * - Lo que cambia cada año (Llamadas, Desfile Inaugural, Semana Criolla, Día del Patrimonio) va en
 *   `DATED_EVENTS` **sólo** para los años con fechas ya confirmadas por la Intendencia o el MEC.
 *   Para sumar un año, agregar sus fechas oficiales ahí.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEEKDAY_SHORT = exports.MONTH_NAMES = exports.CALENDAR_KIND_LABELS = void 0;
exports.todayInUruguay = todayInUruguay;
exports.isoDate = isoDate;
exports.addDays = addDays;
exports.weekdayOf = weekdayOf;
exports.daysInMonth = daysInMonth;
exports.easterSunday = easterSunday;
exports.movedToMonday = movedToMonday;
exports.hasDatedEvents = hasDatedEvents;
exports.uruguayCalendar = uruguayCalendar;
exports.eventCovers = eventCovers;
exports.CALENDAR_KIND_LABELS = {
    holiday: "Feriado no laborable",
    workingHoliday: "Feriado laborable",
    celebration: "Fecha especial",
};
exports.MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
/** Días de la semana empezando por el lunes, como los calendarios de acá. */
exports.WEEKDAY_SHORT = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];
const URUGUAY_TIME_ZONE = "America/Montevideo";
/** "AAAA-MM-DD" de hoy en Uruguay. */
function todayInUruguay(now = new Date()) {
    // en-CA da el formato ISO (2026-10-05).
    return new Intl.DateTimeFormat("en-CA", { timeZone: URUGUAY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
/** Fecha "AAAA-MM-DD" (mes 1–12). */
function isoDate(year, month, day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
/** Suma días a una fecha "AAAA-MM-DD". */
function addDays(date, days) {
    const [y, m, d] = date.split("-").map(Number);
    const moved = new Date(Date.UTC(y, m - 1, d + days));
    return isoDate(moved.getUTCFullYear(), moved.getUTCMonth() + 1, moved.getUTCDate());
}
/** Día de la semana: 0 = lunes … 6 = domingo. */
function weekdayOf(date) {
    const [y, m, d] = date.split("-").map(Number);
    return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
/** Días que tiene el mes (1–12). */
function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
/** Domingo de Pascua (calendario gregoriano, algoritmo de Meeus/Jones/Butcher). */
function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return isoDate(year, month, day);
}
/** Ley 16.805 (17.414): martes o miércoles → lunes anterior; jueves o viernes → lunes siguiente. */
function movedToMonday(date) {
    const weekday = weekdayOf(date);
    if (weekday === 1 || weekday === 2)
        return addDays(date, -weekday);
    if (weekday === 3 || weekday === 4)
        return addDays(date, 7 - weekday);
    return date;
}
/** El `n`-ésimo domingo del mes (Día de la Madre, del Padre). */
function nthSunday(year, month, n) {
    const first = isoDate(year, month, 1);
    return addDays(first, (6 - weekdayOf(first)) + 7 * (n - 1));
}
/** Feriados y fechas que caen siempre el mismo día (mes, día). */
const FIXED = [
    { id: "ano-nuevo", name: "Año Nuevo", description: "Primer día del año.", kind: "holiday", month: 1, day: 1 },
    { id: "reyes", name: "Día de Reyes", description: "Día de los Niños: los Reyes Magos dejan regalos en los championes.", kind: "workingHoliday", month: 1, day: 6 },
    {
        id: "desembarco-33",
        name: "Desembarco de los Treinta y Tres Orientales",
        description: "1825: Lavalleja y los Treinta y Tres desembarcan en la playa de la Agraciada para liberar la Provincia Oriental.",
        kind: "workingHoliday",
        month: 4,
        day: 19,
        movable: true,
    },
    { id: "trabajadores", name: "Día de los Trabajadores", description: "Acto del PIT-CNT y casi todo cerrado.", kind: "holiday", month: 5, day: 1 },
    { id: "las-piedras", name: "Batalla de Las Piedras", description: "1811: Artigas vence a los españoles en Las Piedras.", kind: "workingHoliday", month: 5, day: 18, movable: true },
    {
        id: "artigas",
        name: "Natalicio de Artigas",
        description: "Nace José Gervasio Artigas (1764), prócer de la patria. También es el Día del Nunca Más.",
        kind: "workingHoliday",
        month: 6,
        day: 19,
    },
    { id: "jura-constitucion", name: "Jura de la Constitución", description: "1830: se jura la primera Constitución del Uruguay.", kind: "holiday", month: 7, day: 18 },
    {
        id: "nostalgia",
        name: "Noche de la Nostalgia",
        description: "La noche antes de la Independencia se baila la música de los 60, 70 y 80 en todo el país.",
        kind: "celebration",
        month: 8,
        day: 24,
    },
    { id: "independencia", name: "Declaratoria de la Independencia", description: "1825: el Congreso de la Florida declara la independencia.", kind: "holiday", month: 8, day: 25 },
    {
        id: "diversidad-cultural",
        name: "Día de la Diversidad Cultural",
        description: "El 12 de octubre: el encuentro de culturas y los pueblos originarios.",
        kind: "workingHoliday",
        month: 10,
        day: 12,
        movable: true,
    },
    { id: "difuntos", name: "Día de los Difuntos", description: "Se visita a los que ya no están.", kind: "workingHoliday", month: 11, day: 2 },
    {
        id: "candombe",
        name: "Día Nacional del Candombe",
        description: "Día del Candombe, la Cultura Afrouruguaya y la Equidad Racial (ley 18.059): toques de tambores en Barrio Sur y Palermo.",
        kind: "celebration",
        month: 12,
        day: 3,
    },
    { id: "familia", name: "Día de la Familia", description: "Navidad, que en Uruguay se llama oficialmente Día de la Familia.", kind: "holiday", month: 12, day: 25 },
    {
        id: "fin-de-ano",
        name: "Fin de año",
        description: "Fuegos artificiales sobre la rambla; el último día hábil, los papelitos de las oficinas en Ciudad Vieja.",
        kind: "celebration",
        month: 12,
        day: 31,
    },
];
/**
 * Fechas que fija cada año la Intendencia de Montevideo (Carnaval, Semana Criolla) o el MEC (Día del
 * Patrimonio). Sólo años confirmados: un año sin entrada no muestra estos eventos.
 */
const DATED_EVENTS = {
    2026: [
        {
            id: "desfile-inaugural",
            name: "Desfile Inaugural del Carnaval",
            description: "Murgas, comparsas, parodistas y humoristas por 18 de Julio: arranca el carnaval más largo del mundo.",
            kind: "celebration",
            start: "2026-01-22",
        },
        {
            id: "llamadas",
            name: "Desfile de Llamadas",
            description: "Las comparsas de negros y lubolos recorren Isla de Flores, por Barrio Sur y Palermo, con miles de tambores.",
            kind: "celebration",
            start: "2026-02-06",
            end: "2026-02-07",
        },
        {
            id: "semana-criolla",
            name: "Semana Criolla del Prado",
            description: "Jineteadas, payadores y fogones en la Rural del Prado (99.ª edición).",
            kind: "celebration",
            start: "2026-03-29",
            end: "2026-04-05",
        },
        {
            id: "patrimonio",
            name: "Día del Patrimonio",
            description: "Edificios y museos abiertos gratis en todo el país. Consigna 2026: \"Raíces indígenas: pasado, presente y futuro\".",
            kind: "celebration",
            start: "2026-10-03",
            end: "2026-10-04",
        },
    ],
};
/** Años con las fechas variables (Carnaval, Patrimonio…) ya confirmadas. */
function hasDatedEvents(year) {
    return DATED_EVENTS[year] !== undefined;
}
/** Todos los feriados y fechas del año, ordenados por fecha. */
function uruguayCalendar(year) {
    const events = [];
    for (const { month, day, movable, ...event } of FIXED) {
        const date = isoDate(year, month, day);
        const observed = movable ? movedToMonday(date) : date;
        events.push({ ...event, start: observed, ...(observed !== date ? { movedFrom: date } : {}) });
    }
    const easter = easterSunday(year);
    events.push({
        id: "carnaval",
        name: "Carnaval",
        description: "Lunes y martes de Carnaval: tablados, murgas y comparsas por todos los barrios.",
        kind: "workingHoliday",
        start: addDays(easter, -48),
        end: addDays(easter, -47),
    });
    events.push({
        id: "turismo",
        name: "Semana de Turismo",
        description: "La Semana Santa uruguaya: casi todo para y la gente se va a la costa o a la Semana Criolla.",
        kind: "workingHoliday",
        start: addDays(easter, -6),
        end: easter,
    });
    events.push({ id: "madre", name: "Día de la Madre", description: "Segundo domingo de mayo.", kind: "celebration", start: nthSunday(year, 5, 2) });
    events.push({ id: "padre", name: "Día del Padre", description: "En Uruguay es el segundo domingo de julio.", kind: "celebration", start: nthSunday(year, 7, 2) });
    events.push(...(DATED_EVENTS[year] ?? []));
    return events.sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
}
/** ¿El evento abarca ese día? */
function eventCovers(event, date) {
    return date >= event.start && date <= (event.end ?? event.start);
}
//# sourceMappingURL=calendar.js.map