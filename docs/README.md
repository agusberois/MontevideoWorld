# Docs

Documentación de trabajo del proyecto, en archivos Markdown (`.md`).

| Carpeta | Qué va |
| --- | --- |
| [`pending/`](./pending) | Lo que todavía no está hecho: propuestas, análisis, planes, features o refactors por hacer. |
| [`finished/`](./finished) | Lo que ya se implementó. Cuando algo de `pending/` se termina, se mueve acá (`git mv`) y se anota qué se hizo. |

## Convenciones

- Un tema por archivo, en kebab-case: `viaje-entre-barrios.md`, `refactor-app-store.md`.
- Arriba de cada archivo: título, fecha (`AAAA-MM-DD`) y un resumen de dos o tres líneas.
- Al pasar un doc a `finished/`, sumar al final una sección **Resultado** con la fecha de cierre, qué
  se hizo y qué quedó afuera o cambió respecto del plan.
- La documentación técnica viva de la arquitectura sigue en [`CLAUDE.md`](../CLAUDE.md); acá van los
  planes y el historial de decisiones.
