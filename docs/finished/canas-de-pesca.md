# Cañas de pesca y tienda Pesca Sarandí

**Fecha:** 2026-10-01

**Resumen:** para pescar hace falta una caña. Todo jugador arranca con la caña básica en la mochila
y puede comprar mejores en **Pesca Sarandí**, la tienda nueva frente a la Escollera Sarandí. Las
mejores cañas hacen más probables los peces raros, que no pique nada menos seguido, que piquen
antes y a veces sacan dos peces de una.

## Resultado

**Cerrado:** 2026-10-01

| Caña | Precio | Peces raros* | Corvina negra | Que no pique | Doble (cuando pica) | Espera |
| --- | --- | --- | --- | --- | --- | --- |
| Básica | $30 (inicial) | 4 % | 1,3 % | 20 % | — | normal |
| Fibra | $150 | 6,6 % | 2,5 % | 15 % | 5 % | −10 % |
| Carbono | $450 | 9,9 % | 4,1 % | 10 % | 12 % | −20 % |
| Profesional | $1.200 | 15,3 % | 7 % | 6 % | 25 % | −30 % |

\* Lenguado o corvina negra (dificultad ≥ 4). Verificado con 200.000 tiradas por caña.

- Se pesca siempre con la mejor caña de la mochila (cartel "En uso"); no hace falta equiparla.
- La caña básica da exactamente las mismas probabilidades que la pesca anterior.
- Las probabilidades se calculan en `shared` (`fishing.ts`): la tienda muestra lo mismo que sortea el server.
- Los demás ven la caña del color de la que estás usando.
- La tienda compra cañas usadas a la mitad. Las cañas se pueden intercambiar.
- Probado en el juego con Playwright: tienda, mochila y una pesca completa.

**Quedó afuera:** desgaste o rotura de cañas, elegir a mano con qué caña pescar y que la caña se
vea en la mano del avatar cuando no está pescando.
