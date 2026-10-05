"use client";

import { useState } from "react";
import { CitySession, describeJoinError, joinCity } from "@/lib/network";
import { Character, MAX_CHARACTERS, selectCharacter } from "@/lib/characters";
import { AvatarPreview } from "./AvatarPreview";
import { moduleClasses } from "@/lib/cx";
import styles from "./join.module.css";

const cx = moduleClasses(styles);

interface CharacterSelectProps {
  characters: readonly Character[];
  onJoined: (session: CitySession) => void;
  onCreate: () => void;
  notice: string | null;
}

/**
 * Elegir con qué personaje jugar (los guardados en este navegador, cada uno con su progreso), o crear
 * uno nuevo. Se muestra después de iniciar sesión si ya hay alguno.
 */
export function CharacterSelect({ characters, onJoined, onCreate, notice }: CharacterSelectProps) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function play(character: Character) {
    if (connecting) return;
    setConnecting(character.key);
    setError(null);
    selectCharacter(character);
    try {
      onJoined(await joinCity(character.name, character.appearance));
    } catch (err) {
      console.warn("[Montevideo World] join failed", err);
      setError(describeJoinError(err));
      setConnecting(null);
    }
  }

  return (
    <main className={cx("join-screen")}>
      <div className={cx("join-card")}>
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático chico, no necesita next/image */}
        <img className={cx("join-logo")} src="/mw-logo.svg" alt="" width={84} height={84} />
        <h1>Montevideo World</h1>
        <p>Elegí tu personaje</p>
        {notice && <p className={cx("join-error")}>{notice}</p>}
        <ul className={cx("character-list")}>
          {characters.map((character) => (
            <li key={character.key}>
              <button type="button" className={cx("character-card")} disabled={connecting !== null} onClick={() => void play(character)}>
                <AvatarPreview appearance={character.appearance} size={96} />
                <strong style={{ color: character.appearance.color }}>{character.name}</strong>
                <span>{connecting === character.key ? "Entrando…" : "Jugar"}</span>
              </button>
            </li>
          ))}
        </ul>
        {error && <p className={cx("join-error")}>{error}</p>}
        {characters.length < MAX_CHARACTERS && (
          <button type="button" className={cx("join-back")} disabled={connecting !== null} onClick={onCreate}>
            ＋ Crear un personaje nuevo
          </button>
        )}
      </div>
    </main>
  );
}
