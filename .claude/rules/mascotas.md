---
paths:
  - "packages/shared/src/pets.ts"
  - "apps/client/src/game/objects/Pet.ts"
  - "apps/client/src/features/pets/PetShop.tsx"
---

# Mascotas

Mascotas. La **Veterinaria Sarandí** (Ciudad Vieja, 46,22, sobre la peatonal; `building: "pets"`)
es una tienda con `Shop.pets` (ids de `PETS`): `ShopPanel` abre `PetShop` en vez de Comprar /
Vender. `pet:adopt { shopId, petId, name }` (pegado a la tienda, sin mascota, con plata: cobra
`price`), `pet:rename { shopId, name }` y `pet:release { shopId }` (sin devolución). Una por
jugador. Sólo viaja en el Schema `Player.pet` / `Player.petName` (y en el guardado,
`PlayerRecord.pet`): cada cliente dibuja la mascota (`game/objects/Pet.ts`) siguiendo el
recorrido del avatar un tile atrás (anota sus posiciones), con el nombre arriba; quieta mueve la
cola. Si el dueño salta lejos (viaje, `/trace`), aparece a su lado. El nombre pasa por
`sanitizePetName` (hasta `PET_NAME_MAX_LENGTH`).
