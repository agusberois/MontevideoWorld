"use client";

import { useEffect, useState } from "react";
import { PET_NAME_MAX_LENGTH, PetDefinition, Shop, ShopResultMessage, formatMoney, getPet, sanitizePetName } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { CityRoom, sendPetAdopt, sendPetRelease, sendPetRename } from "@/lib/network";
import { UiIcon } from "./UiIcon";

interface PetShopProps {
  room: CityRoom;
  shop: Shop;
  onClose: () => void;
}

/**
 * Veterinaria (tienda con `pets`): elegís una mascota, le ponés nombre y la adoptás; te sigue a
 * todos lados con su nombre arriba. Con una ya adoptada, acá se le cambia el nombre o te despedís
 * (una por persona). Son intenciones: el server valida y responde con `shop:result`.
 */
export function PetShop({ room, shop, onClose }: PetShopProps) {
  const money = useGame((state) => state.money);
  const pet = useGame((state) => state.pet);
  const pets = (shop.pets ?? []).map(getPet).filter((candidate) => candidate !== undefined);
  const [selected, setSelected] = useState<string>(pets[0]?.id ?? "");
  const [name, setName] = useState("");
  const [result, setResult] = useState<ShopResultMessage | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);

  useEffect(() => eventBus.on("shop:result", setResult), []);
  // Al adoptar o renombrar, el campo arranca con el nombre que tiene.
  useEffect(() => setName(pet?.name ?? ""), [pet?.name]);

  const chosen = pets.find((candidate) => candidate.id === selected);
  const cleanName = sanitizePetName(name);
  const current = pet ? getPet(pet.id) : undefined;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal shop pet-shop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-shop-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="pet-shop-title">
            <UiIcon name="shop" size={18} />
            {shop.name}
          </h2>
          <span className="shop-money" title="Tu dinero">
            <UiIcon name="moneyBag" size={14} className="hud-money-icon" />
            {money === null ? "$…" : formatMoney(money)}
          </span>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        {result && <p className={`shop-result ${result.ok ? "ok" : "error"}`}>{result.text}</p>}

        {pet && current ? (
          <div className="pet-current">
            <PetIcon pet={current} size={56} />
            <div>
              <p>
                Tu mascota: <strong>{pet.name}</strong> <small>({current.name.toLowerCase()})</small>
              </p>
              <form
                className="pet-name-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setResult(null);
                  if (cleanName && cleanName !== pet.name) sendPetRename(room, shop.id, cleanName);
                }}
              >
                <input
                  value={name}
                  maxLength={PET_NAME_MAX_LENGTH}
                  onChange={(event) => setName(event.target.value)}
                  aria-label="Nuevo nombre"
                />
                <button type="submit" disabled={!cleanName || cleanName === pet.name}>
                  Cambiar nombre
                </button>
              </form>
              {confirmRelease ? (
                <p className="pet-release">
                  ¿Seguro? {pet.name} se queda en la veterinaria y no te devuelven la plata.{" "}
                  <button
                    type="button"
                    className="pet-release-yes"
                    onClick={() => {
                      setResult(null);
                      setConfirmRelease(false);
                      sendPetRelease(room, shop.id);
                    }}
                  >
                    Sí, despedirme
                  </button>{" "}
                  <button type="button" onClick={() => setConfirmRelease(false)}>
                    No
                  </button>
                </p>
              ) : (
                <button type="button" className="pet-release-toggle" onClick={() => setConfirmRelease(true)}>
                  Despedirme de {pet.name}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <ul className="shop-list pet-list" role="radiogroup" aria-label="Mascotas para adoptar">
              {pets.map((candidate) => (
                <li key={candidate.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={candidate.id === selected}
                    className="pet-option"
                    onClick={() => setSelected(candidate.id)}
                  >
                    <PetIcon pet={candidate} size={40} />
                    <span className="shop-item-name">
                      {candidate.name}
                      <span className="shop-perks">{candidate.description}</span>
                    </span>
                    <span className="shop-price">{formatMoney(candidate.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
            {chosen && (
              <form
                className="pet-name-form pet-adopt"
                onSubmit={(event) => {
                  event.preventDefault();
                  setResult(null);
                  if (cleanName) sendPetAdopt(room, shop.id, chosen.id, cleanName);
                }}
              >
                <input
                  value={name}
                  maxLength={PET_NAME_MAX_LENGTH}
                  placeholder={`Nombre para tu ${chosen.name.toLowerCase()}`}
                  onChange={(event) => setName(event.target.value)}
                  aria-label="Nombre de la mascota"
                />
                <button
                  type="submit"
                  disabled={!cleanName || money === null || money < chosen.price}
                  title={money !== null && money < chosen.price ? "No te alcanza la plata" : undefined}
                >
                  Adoptar por {formatMoney(chosen.price)}
                </button>
              </form>
            )}
          </>
        )}

        <footer>
          Una mascota por persona: te sigue a todos lados y todos ven su nombre.{" "}
          <span className="key-hint">
            Apretá <kbd>Esc</kbd> para cerrar
          </span>
        </footer>
      </section>
    </div>
  );
}

/** Dibujo chico de la mascota (de perfil, como en el juego) con sus colores. */
export function PetIcon({ pet, size }: { pet: PetDefinition; size: number }) {
  const { color, accent } = pet;
  return (
    <svg viewBox="-20 -34 52 40" width={size} height={(size * 40) / 52} aria-hidden="true" className="pet-icon">
      {pet.kind === "capybara" ? (
        <>
          {[-8, 9, -5, 12].map((x) => (
            <rect key={x} x={x - 2} y={-6} width={4} height={6} rx={1.5} fill={accent} />
          ))}
          <ellipse cx={0} cy={-13} rx={17} ry={9} fill={color} />
          <rect x={10} y={-24} width={15} height={13} rx={5} fill={color} />
          <rect x={20} y={-20} width={6} height={8} rx={3} fill={accent} />
          <circle cx={12} cy={-24} r={2.2} fill={accent} />
          <circle cx={17} cy={-20} r={1.3} fill="#1b1414" />
        </>
      ) : pet.kind === "cat" ? (
        <>
          <path d="M-10 -13 L-15 -17 L-16 -25 L-13 -30" stroke={color} strokeWidth={3} fill="none" />
          {[-6, 8, -3, 11].map((x) => (
            <rect key={x} x={x - 1.5} y={-8} width={3} height={8} rx={1.5} fill={color} />
          ))}
          <ellipse cx={1} cy={-12} rx={12} ry={5.5} fill={color} />
          <circle cx={13} cy={-19} r={6} fill={color} />
          <path d="M8.5 -22 L11 -29 L13 -23 Z M13 -23 L16 -29 L17.5 -21 Z" fill={color} />
          {[-6, -1, 4].map((x) => (
            <rect key={x} x={x} y={-17} width={2} height={6} fill={accent} />
          ))}
          <circle cx={16} cy={-20} r={1.1} fill="#1b1414" />
        </>
      ) : (
        <>
          <line x1={-11} y1={-17} x2={-18} y2={-24} stroke={color} strokeWidth={3} />
          {[-7, 8, -4, 11].map((x) => (
            <rect key={x} x={x - 2} y={-9} width={4} height={9} rx={1.5} fill={color} />
          ))}
          <ellipse cx={1} cy={-14} rx={13} ry={6.5} fill={color} />
          <circle cx={14} cy={-22} r={7} fill={color} />
          <rect x={17} y={-22} width={8} height={6} rx={2} fill={color} />
          <ellipse cx={10} cy={-21} rx={2.5} ry={5} fill={accent} />
          <ellipse cx={-4} cy={-16} rx={4} ry={3} fill={accent} />
          <circle cx={24.5} cy={-20.5} r={1.6} fill="#1b1414" />
          <circle cx={16.5} cy={-24} r={1.2} fill="#1b1414" />
        </>
      )}
    </svg>
  );
}
