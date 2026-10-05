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
/** `holiday` = feriado no laborable; `workingHoliday` = feriado laborable; `celebration` = fecha o evento (no feriado). */
export type CalendarEventKind = "holiday" | "workingHoliday" | "celebration";
export interface CalendarEvent {
    id: string;
    name: string;
    description: string;
    kind: CalendarEventKind;
    /** Primer día, "AAAA-MM-DD" (hora de Uruguay). */
    start: string;
    /** Último día, si dura más de uno. */
    end?: string;
    /** Fecha original, si el feriado se corrió al lunes. */
    movedFrom?: string;
}
export declare const CALENDAR_KIND_LABELS: Record<CalendarEventKind, string>;
export declare const MONTH_NAMES: readonly ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
/** Días de la semana empezando por el lunes, como los calendarios de acá. */
export declare const WEEKDAY_SHORT: readonly ["lu", "ma", "mi", "ju", "vi", "sá", "do"];
/** "AAAA-MM-DD" de hoy en Uruguay. */
export declare function todayInUruguay(now?: Date): string;
/** Fecha "AAAA-MM-DD" (mes 1–12). */
export declare function isoDate(year: number, month: number, day: number): string;
/** Suma días a una fecha "AAAA-MM-DD". */
export declare function addDays(date: string, days: number): string;
/** Día de la semana: 0 = lunes … 6 = domingo. */
export declare function weekdayOf(date: string): number;
/** Días que tiene el mes (1–12). */
export declare function daysInMonth(year: number, month: number): number;
/** Domingo de Pascua (calendario gregoriano, algoritmo de Meeus/Jones/Butcher). */
export declare function easterSunday(year: number): string;
/** Ley 16.805 (17.414): martes o miércoles → lunes anterior; jueves o viernes → lunes siguiente. */
export declare function movedToMonday(date: string): string;
/** Años con las fechas variables (Carnaval, Patrimonio…) ya confirmadas. */
export declare function hasDatedEvents(year: number): boolean;
/** Todos los feriados y fechas del año, ordenados por fecha. */
export declare function uruguayCalendar(year: number): CalendarEvent[];
/** ¿El evento abarca ese día? */
export declare function eventCovers(event: CalendarEvent, date: string): boolean;
//# sourceMappingURL=calendar.d.ts.map