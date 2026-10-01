# Comandos de chat y cajas sorpresa

**Fecha:** 2026-10-01

**Resumen:** sistema de comandos de chat (`/algo`) preparado para crecer, con permisos por rol
(usuario / admin). Primer comando: `/box`, que le da al admin cajas sorpresa; al abrirlas dan un pez
al azar con distintas probabilidades. Las cajas se pueden pasar a usuarios normales por intercambio.

## Resultado

**Cerrado:** 2026-10-01

- Catálogo compartido en `packages/shared/src/commands.ts` y un handler por archivo en
  `apps/server/src/commands/`. Un `Record<CommandName, …>` obliga a que cada comando tenga handler.
- `/post` pasó al registro nuevo. Se sumó `/help`, que lista sólo lo que cada uno puede usar.
- Probabilidades de la caja sorpresa: pejerrey 25 %, lisa 20 %, bagre 15 %, burriqueta 12 %,
  pescadilla 9 %, corvina blanca 8 %, brótola 6 %, lenguado 4 %, corvina negra 1 %.
  Verificado con 100.000 sorteos.
- Abrir: clic en la caja o arrastrarla fuera del panel de la mochila. Si el premio no entra, la caja
  no se abre.
- Probado de punta a punta: permisos, cantidades inválidas, comando inexistente, intercambio de
  cajas admin → usuario y apertura por el usuario.

**Quedó afuera:** autocompletado de comandos en el input del chat (el catálogo ya está en shared
para hacerlo) y soltar la caja directamente sobre el mapa con la mochila cerrada.
