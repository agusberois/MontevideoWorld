"use client";

import { FormEvent, useEffect, useState, useSyncExternalStore } from "react";
import {
  Appearance,
  EYE_COLORS,
  FACIAL_HAIR,
  FACIAL_HAIR_LABELS,
  GLASSES,
  GLASSES_LABELS,
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
import { CitySession, describeJoinError, getServerUrl, joinCity } from "@/lib/network";
import { AvatarPreview } from "./AvatarPreview";
import { moduleClasses } from "@/lib/cx";
import styles from "./join.module.css";

const cx = moduleClasses(styles);

const noopSubscribe = () => () => {};

/** Último aspecto y nombre elegidos: se recuerdan en este navegador para la próxima vez. */
const APPEARANCE_STORAGE_KEY = "mw:appearance";
const NAME_STORAGE_KEY = "mw:name";

/** Aspecto fijo para el primer render (SSR); al montar se reemplaza por el guardado o uno al azar. */
const INITIAL_APPEARANCE: Appearance = {
  gender: "m",
  skin: 1,
  hairColor: 1,
  hairStyle: "short",
  eyeColor: 0,
  facialHair: "none",
  glasses: "none",
  color: PLAYER_COLORS[3],
};

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
      // warn y no error: el motivo ya se muestra en pantalla (en desarrollo, console.error abre el
      // cartel rojo de Next como si fuera un bug del código).
      console.warn("[Montevideo World] join failed", err);
      setError(describeJoinError(err));
      setConnecting(false);
    }
  }

  return (
    <main className={cx("join-screen")}>
      <div className={cx("join-card")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático chico, no necesita next/image */}
        <img className={cx("join-logo")} src="/mw-logo.svg" alt="" width={84} height={84} />
        <h1>Montevideo World</h1>
        <p>Armá tu personaje y aparecé en la Ciudad Vieja</p>

        <form onSubmit={handleSubmit}>
          <div className={cx("join-creator")}>
            <div className={cx("join-preview")}>
              <div key={rolls} className={cx(rolls > 0 ? "join-preview-avatar rolled" : "join-preview-avatar")}>
                <AvatarPreview appearance={appearance} />
              </div>
              <span className={cx("join-preview-name")} style={{ color: appearance.color }}>
                {sanitizeName(name) || "Tu nombre"}
              </span>
              <button type="button" className={cx("join-dice")} onClick={rollDice} title="Personaje al azar">
                <span aria-hidden="true">🎲</span> Al azar
              </button>
            </div>

            <div className={cx("join-options")}>
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
                <div className={cx("join-chips")}>
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
                <div className={cx("join-chips")}>
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
                <legend>Cara</legend>
                <Swatches colors={EYE_COLORS} selected={appearance.eyeColor} label="Color de ojos" onSelect={(eyeColor) => update({ eyeColor })} />
                <div className={cx("join-chips")} role="group" aria-label="Barba">
                  {FACIAL_HAIR.map((facialHair) => (
                    <button
                      key={facialHair}
                      type="button"
                      aria-pressed={appearance.facialHair === facialHair}
                      onClick={() => update({ facialHair })}
                    >
                      {FACIAL_HAIR_LABELS[facialHair]}
                    </button>
                  ))}
                </div>
                <div className={cx("join-chips")} role="group" aria-label="Lentes">
                  {GLASSES.map((glasses) => (
                    <button key={glasses} type="button" aria-pressed={appearance.glasses === glasses} onClick={() => update({ glasses })}>
                      {GLASSES_LABELS[glasses]}
                    </button>
                  ))}
                </div>
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

          <button type="submit" className={cx("join-submit")} disabled={connecting}>
            {connecting ? "Conectando…" : "Entrar"}
          </button>
        </form>
        {(error ?? notice) && <div className={cx("join-error")}>{error ?? notice}</div>}
        <div className={cx("join-server")}>Servidor: {serverUrl}</div>
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
    <div className={cx("join-swatches")} role="radiogroup" aria-label={label}>
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
