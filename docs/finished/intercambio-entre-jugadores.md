# Intercambio entre jugadores

**Fecha:** 2026-10-01

**Resumen:** clic sobre otro jugador abre un menú con **Saludar** e **Intercambiar**. El intercambio
abre un modal donde cada uno ofrece ítems de su mochila y plata; se hace cuando los dos aceptan.

## Resultado

**Cerrado:** 2026-10-01

- Server autoritativo: `TradeManager` (`apps/server/src/trades.ts`) separado de `CityRoom`.
- Cambiar una oferta anula las dos aceptaciones (evita cambiar la oferta a último momento).
- `executeTrade` simula con copias de las mochilas antes de aplicar: si algo no cierra (falta un
  ítem, no hay lugar, tope de plata) no se toca nada y se avisa a los dos.
- Lo puesto no se intercambia (igual que en las tiendas). Máximo `TRADE_MAX_ITEMS` ítems distintos.
- Probado con un script de casos límite y una prueba de punta a punta con dos clientes Colyseus.

**Quedó afuera:** distancia mínima entre los jugadores (se puede intercambiar desde cualquier lugar
del barrio) y animación de saludo en el avatar (el saludo sale como mensaje de chat).
