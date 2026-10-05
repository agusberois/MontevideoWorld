---
paths:
  - "packages/shared/src/calendar.ts"
  - "apps/client/src/features/calendar/**"
---

# Calendario de Uruguay

Panel **Calendario** (tecla **K**, botón del HUD; `CalendarPanel`): el mes de la fecha **real** de
hoy en Uruguay (`todayInUruguay`, zona `America/Montevideo`; no es la hora del juego), con flechas
para cambiar de mes, "Hoy", tocar un día para ver qué pasa y la lista del mes. Arriba, lo próximo
que viene. Todo sale de `uruguayCalendar(year)` (shared, sin efectos), con tres tipos:
feriado **no laborable** (1/1, 1/5, 18/7, 25/8, 25/12), feriado **laborable** y **fecha especial**.

- Fijos por ley (16.805, redacción 17.414). El 19/4, el 18/5 y el 12/10 se corren (`movedToMonday`:
  martes o miércoles → lunes anterior; jueves o viernes → lunes siguiente) y llevan `movedFrom`.
- Carnaval (lunes y martes, Pascua −48/−47) y Turismo (lunes a domingo de Pascua) salen de
  `easterSunday`. Día de la Madre (2.º domingo de mayo) y del Padre (2.º domingo de julio), calculados.
- Lo que cambia cada año (Desfile Inaugural, Llamadas, Semana Criolla, Día del Patrimonio) va en
  `DATED_EVENTS` **sólo con fechas oficiales confirmadas** (Intendencia de Montevideo, MEC). Un año sin
  entrada no los muestra y el panel avisa que no están confirmadas. Hoy está cargado 2026: para 2027,
  sumar las fechas cuando se anuncien.
