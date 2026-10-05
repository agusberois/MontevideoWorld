"use client";

import { useMemo, useState } from "react";
import {
  CALENDAR_KIND_LABELS,
  CalendarEvent,
  MONTH_NAMES,
  WEEKDAY_SHORT,
  daysInMonth,
  eventCovers,
  hasDatedEvents,
  isoDate,
  todayInUruguay,
  uruguayCalendar,
  weekdayOf,
} from "@montevideo-world/shared";
import type { PanelProps } from "../../shell/panels";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./calendar.module.css";

const cx = moduleClasses(styles);

/** Clase del color de cada tipo (feriado no laborable, laborable, fecha especial). */
const KIND_CLASS: Record<CalendarEvent["kind"], string> = {
  holiday: "kind-holiday",
  workingHoliday: "kind-working",
  celebration: "kind-celebration",
};

/**
 * Calendario de Uruguay (tecla K): el mes con la fecha real de hoy (hora de Uruguay), los feriados
 * y las fechas especiales (`uruguayCalendar` de shared). Tocar un día muestra lo que pasa ese día;
 * abajo, todo lo del mes.
 */
export function CalendarPanel({ onClose }: PanelProps) {
  const today = useMemo(() => todayInUruguay(), []);
  const [todayYear, todayMonth] = today.split("-").map(Number);
  const [view, setView] = useState({ year: todayYear, month: todayMonth });
  const [selected, setSelected] = useState<string | null>(today);

  const { year, month } = view;
  const events = useMemo(() => uruguayCalendar(year), [year]);
  const monthStart = isoDate(year, month, 1);
  const monthEnd = isoDate(year, month, daysInMonth(year, month));
  const ofMonth = events.filter((event) => event.start <= monthEnd && (event.end ?? event.start) >= monthStart);
  const next = useMemo(() => nextEvent(today), [today]);
  const selectedEvents = selected ? ofMonth.filter((event) => eventCovers(event, selected)) : [];

  const go = (delta: number) => {
    const index = year * 12 + (month - 1) + delta;
    setView({ year: Math.floor(index / 12), month: (index % 12) + 1 });
    setSelected(null);
  };
  const goToday = () => {
    setView({ year: todayYear, month: todayMonth });
    setSelected(today);
  };

  // Celdas: huecos antes del 1 (la semana empieza el lunes) y después los días del mes.
  const blanks = weekdayOf(monthStart);
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => isoDate(year, month, i + 1));

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal calendar")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="calendar-title">
            <UiIcon name="calendar" size={18} />
            Calendario de Uruguay
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        {next && (
          <p className={cx("calendar-next")}>
            {next.daysLeft === 0 ? "Hoy: " : `Próximo, ${next.daysLeft === 1 ? "mañana" : `en ${next.daysLeft} días`}: `}
            <strong>{next.event.name}</strong> · {formatRange(next.event)}
          </p>
        )}

        <div className={cx("calendar-nav")}>
          <button type="button" onClick={() => go(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <strong>
            {MONTH_NAMES[month - 1]} {year}
          </strong>
          <button type="button" onClick={() => go(1)} aria-label="Mes siguiente">
            ›
          </button>
          <button type="button" className={cx("calendar-today")} onClick={goToday} disabled={year === todayYear && month === todayMonth && selected === today}>
            Hoy
          </button>
        </div>

        <div className={cx("calendar-grid")} role="grid" aria-label={`${MONTH_NAMES[month - 1]} de ${year}`}>
          {WEEKDAY_SHORT.map((weekday) => (
            <span key={weekday} className={cx("calendar-weekday")} role="columnheader">
              {weekday}
            </span>
          ))}
          {Array.from({ length: blanks }, (_, i) => (
            <span key={`blank-${i}`} aria-hidden="true" />
          ))}
          {days.map((date) => {
            const dayEvents = ofMonth.filter((event) => eventCovers(event, date));
            const kinds = [...new Set(dayEvents.map((event) => event.kind))];
            const holiday = kinds.includes("holiday") || kinds.includes("workingHoliday");
            return (
              <button
                key={date}
                type="button"
                role="gridcell"
                aria-selected={date === selected}
                aria-label={`${Number(date.slice(8))} de ${MONTH_NAMES[month - 1]}${dayEvents.length ? `: ${dayEvents.map((event) => event.name).join(", ")}` : ""}`}
                className={cx(`calendar-day${date === today ? " today" : ""}${date === selected ? " selected" : ""}${holiday ? " holiday" : ""}${weekdayOf(date) >= 5 ? " weekend" : ""}`)}
                onClick={() => setSelected(date)}
              >
                <span>{Number(date.slice(8))}</span>
                {kinds.length > 0 && (
                  <span className={cx("calendar-dots")} aria-hidden="true">
                    {kinds.map((kind) => (
                      <i key={kind} className={cx(KIND_CLASS[kind])} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <ul className={cx("calendar-legend")}>
          {(Object.keys(CALENDAR_KIND_LABELS) as Array<CalendarEvent["kind"]>).map((kind) => (
            <li key={kind}>
              <i className={cx(KIND_CLASS[kind])} aria-hidden="true" />
              {CALENDAR_KIND_LABELS[kind]}
            </li>
          ))}
        </ul>

        {selected && (
          <div className={cx("calendar-selected")}>
            <h3>{formatDay(selected)}</h3>
            {selectedEvents.length === 0 ? <p className={cx("calendar-empty")}>Un día común y corriente.</p> : <EventList events={selectedEvents} />}
          </div>
        )}

        <h3 className={cx("calendar-month-title")}>En {MONTH_NAMES[month - 1]}</h3>
        {ofMonth.length === 0 ? <p className={cx("calendar-empty")}>No hay feriados ni fechas especiales este mes.</p> : <EventList events={ofMonth} />}
        {!hasDatedEvents(year) && (
          <p className={cx("calendar-note")}>
            Las fechas de {year} del Desfile de Llamadas, el Desfile Inaugural del Carnaval, la Semana Criolla y el Día del Patrimonio todavía no
            están confirmadas.
          </p>
        )}

        <footer className={cx("key-hint")}>
          Apretá <kbd>K</kbd> o <kbd>Esc</kbd> para cerrar
        </footer>
      </section>
    </div>
  );
}

function EventList({ events }: { events: readonly CalendarEvent[] }) {
  return (
    <ul className={cx("calendar-events")}>
      {events.map((event) => (
        <li key={`${event.id}-${event.start}`}>
          <div className={cx("calendar-event-head")}>
            <i className={cx(KIND_CLASS[event.kind])} aria-hidden="true" />
            <strong>{event.name}</strong>
            <span className={cx("calendar-event-date")}>{formatRange(event)}</span>
          </div>
          <p>
            {event.description}
            {event.movedFrom && ` Se corre del ${formatDay(event.movedFrom)} (ley 16.805).`}
          </p>
          <small className={cx(KIND_CLASS[event.kind])}>{CALENDAR_KIND_LABELS[event.kind]}</small>
        </li>
      ))}
    </ul>
  );
}

const WEEKDAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** "lunes 12 de octubre". */
function formatDay(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${WEEKDAY_NAMES[weekdayOf(date)]} ${d} de ${MONTH_NAMES[m - 1]}`;
}

/** "12 de octubre", "6 y 7 de febrero" o "30 de marzo al 5 de abril". */
function formatRange(event: CalendarEvent): string {
  const [, m0, d0] = event.start.split("-").map(Number);
  if (!event.end) return `${d0} de ${MONTH_NAMES[m0 - 1]}`;
  const [, m1, d1] = event.end.split("-").map(Number);
  if (m0 === m1) return d1 === d0 + 1 ? `${d0} y ${d1} de ${MONTH_NAMES[m1 - 1]}` : `${d0} al ${d1} de ${MONTH_NAMES[m1 - 1]}`;
  return `${d0} de ${MONTH_NAMES[m0 - 1]} al ${d1} de ${MONTH_NAMES[m1 - 1]}`;
}

/** Lo próximo desde hoy (o lo que está pasando hoy), buscando también en el año que viene. */
function nextEvent(today: string): { event: CalendarEvent; daysLeft: number } | null {
  const year = Number(today.slice(0, 4));
  const upcoming = [...uruguayCalendar(year), ...uruguayCalendar(year + 1)].find((event) => (event.end ?? event.start) >= today);
  if (!upcoming) return null;
  const start = upcoming.start < today ? today : upcoming.start;
  const daysLeft = Math.round((Date.parse(start) - Date.parse(today)) / 86_400_000);
  return { event: upcoming, daysLeft };
}
