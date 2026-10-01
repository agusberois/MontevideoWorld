"use client";

import { FormEvent, useState } from "react";
import { NAME_MAX_LENGTH, sanitizeName } from "@montevideo-world/shared";
import { CitySession, SERVER_URL, joinCity } from "@/lib/network";

interface JoinScreenProps {
  onJoined: (session: CitySession) => void;
  notice: string | null;
}

export function JoinScreen({ onJoined, notice }: JoinScreenProps) {
  const [name, setName] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (connecting) return;

    setConnecting(true);
    setError(null);
    try {
      onJoined(await joinCity(sanitizeName(name)));
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
        <img className="join-logo" src="/mw-logo.svg" alt="" width={112} height={112} />
        <h1>Montevideo World</h1>
        <p>Elegí un nombre y aparecé en la Ciudad Vieja</p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={name}
            maxLength={NAME_MAX_LENGTH}
            placeholder="Tu nombre"
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" disabled={connecting}>
            {connecting ? "Conectando…" : "Entrar"}
          </button>
        </form>
        {(error ?? notice) && <div className="join-error">{error ?? notice}</div>}
        <div className="join-server">Servidor: {SERVER_URL}</div>
      </div>
    </main>
  );
}
