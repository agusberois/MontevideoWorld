"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import {
  Appearance,
  GENDERS,
  GENDER_LABELS,
  HAIR_COLORS,
  HAIR_STYLES,
  HAIR_STYLE_LABELS,
  NAME_MAX_LENGTH,
  PLAYER_COLORS,
  SKIN_TONES,
  randomAppearance,
  sanitizeAppearance,
  sanitizeName,
} from "@montevideo-world/shared";
import { CitySession, getServerUrl, joinCity } from "@/lib/network";
import { AvatarPreview } from "./AvatarPreview";

const noopSubscribe = () => () => {};

/** Último aspecto y nombre elegidos: se recuerdan en este navegador para la próxima vez. */
const APPEARANCE_STORAGE_KEY = "mw:appearance";
const NAME_STORAGE_KEY = "mw:name";

/** Aspecto fijo para el primer render (SSR); al montar se reemplaza por el guardado o uno al azar. */
const INITIAL_APPEARANCE: Appearance = { gender: "m", skin: 1, hairColor: 1, hairStyle: "short", color: PLAYER_COLORS[3] };

function loadAppearance(): Appearance {
  try {
    const saved = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    return (saved && sanitizeAppearance(JSON.parse(saved))) || randomAppearance();
  } catch {
    return randomAppearance();
  }
}

function loadName(): string {
  try {
    return sanitizeName(window.localStorage.getItem(NAME_STORAGE_KEY) ?? "");
  } catch {
    return "";
  }
}

function saveCharacter(name: string, appearance: Appearance) {
  try {
    window.localStorage.setItem(NAME_STORAGE_KEY, name);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): sólo no se recuerda.
  }
}

interface JoinScreenProps {
  onJoined: (session: CitySession) => void;
  notice: string | null;
}

export function JoinScreen({ onJoined, notice }: JoinScreenProps) {
  const [name, setName] = useState("");
  const [appearance, setAppearance] = useState<Appearance>(INITIAL_APPEARANCE);
  /** Cambia en cada tirada del dado para reiniciar la animación. */
  const [rolls, setRolls] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // La URL depende de window.location: en SSR queda vacía para no romper la hidratación.
  const serverUrl = useSyncExternalStore(noopSubscribe, getServerUrl, () => "");

  // Se lee al montar (no en el render) para que SSR y cliente arranquen iguales.
  useEffect(() => {
    setAppearance(loadAppearance());
    setName(loadName());
  }, []);

  const update = (change: Partial<Appearance>) => setAppearance((current) => ({ ...current, ...change }));

  function rollDice() {
    setAppearance(randomAppearance());
    setRolls((count) => count + 1);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (connecting) return;

    setConnecting(true);
    setError(null);
    saveCharacter(sanitizeName(name), appearance);
    try {
      onJoined(await joinCity(sanitizeName(name), appearance));
    } catch (err) {
      console.error("[Montevideo World] join failed", err);
      setError("No se pudo conectar al servidor. ¿Está corriendo?");
      setConnecting(false);
    }
  }

  return (
    <main className="join-screen">
      <div className="join-card">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático chico, no necesita next/image */}
        <img className="join-logo" src="/mw-logo.svg" alt="" width={84} height={84} />
        <h1>Montevideo World</h1>
        <p>Armá tu personaje y aparecé en la Ciudad Vieja</p>

        <form onSubmit={handleSubmit}>
          <div className="join-creator">
            <div className="join-preview">
              <div key={rolls} className={rolls > 0 ? "join-preview-avatar rolled" : "join-preview-avatar"}>
                <AvatarPreview appearance={appearance} />
              </div>
              <span className="join-preview-name" style={{ color: appearance.color }}>
                {sanitizeName(name) || "Tu nombre"}
              </span>
              <button type="button" className="join-dice" onClick={rollDice} title="Personaje al azar">
                <span aria-hidden="true">🎲</span> Al azar
              </button>
            </div>

            <div className="join-options">
              <input
                autoFocus
                value={name}
                maxLength={NAME_MAX_LENGTH}
                placeholder="Tu nombre"
                aria-label="Tu nombre"
                onChange={(event) => setName(event.target.value)}
              />

              <fieldset>
                <legend>Sexo</legend>
                <div className="join-chips">
                  {GENDERS.map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      aria-pressed={appearance.gender === gender}
                      onClick={() => update({ gender })}
                    >
                      {GENDER_LABELS[gender]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Piel</legend>
                <Swatches colors={SKIN_TONES} selected={appearance.skin} label="Tono de piel" onSelect={(skin) => update({ skin })} />
              </fieldset>

              <fieldset>
                <legend>Pelo</legend>
                <div className="join-chips">
                  {HAIR_STYLES.map((hairStyle) => (
                    <button
                      key={hairStyle}
                      type="button"
                      aria-pressed={appearance.hairStyle === hairStyle}
                      onClick={() => update({ hairStyle })}
                    >
                      {HAIR_STYLE_LABELS[hairStyle]}
                    </button>
                  ))}
                </div>
                <Swatches
                  colors={HAIR_COLORS}
                  selected={appearance.hairColor}
                  label="Color de pelo"
                  onSelect={(hairColor) => update({ hairColor })}
                />
              </fieldset>

              <fieldset>
                <legend>Color</legend>
                <Swatches
                  colors={PLAYER_COLORS}
                  selected={PLAYER_COLORS.indexOf(appearance.color as (typeof PLAYER_COLORS)[number])}
                  label="Tu color"
                  onSelect={(index) => update({ color: PLAYER_COLORS[index] })}
                />
              </fieldset>
            </div>
          </div>

          <button type="submit" className="join-submit" disabled={connecting}>
            {connecting ? "Conectando…" : "Entrar"}
          </button>
        </form>
        {(error ?? notice) && <div className="join-error">{error ?? notice}</div>}
        <div className="join-server">Servidor: {serverUrl}</div>
      </div>
    </main>
  );
}

interface SwatchesProps {
  colors: readonly string[];
  selected: number;
  label: string;
  onSelect: (index: number) => void;
}

function Swatches({ colors, selected, label, onSelect }: SwatchesProps) {
  return (
    <div className="join-swatches" role="radiogroup" aria-label={label}>
      {colors.map((color, index) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={index === selected}
          aria-label={`${label} ${index + 1}`}
          style={{ background: color }}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  );
}
