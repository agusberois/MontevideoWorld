"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  BARRA_COLORS,
  BARRA_FOUND_COST,
  BARRA_MAX_MEMBERS,
  BARRA_NAME_MAX,
  BARRA_TAG_MAX,
  BarraColorId,
  BarraResultMessage,
  Shop,
  barraColorHex,
  barraNameProblem,
  barraTagProblem,
  formatMoney,
  normalizeBarraName,
  normalizeBarraTag,
  readableOn,
} from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { openPanel, useGame } from "@/lib/gameStore";
import { CityRoom, requestBarra, sendBarraCreate } from "@/lib/network";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./barras.module.css";

const cx = moduleClasses(styles);

interface BarraRegistryProps {
  room: CityRoom;
  shop: Shop;
  onClose: () => void;
}

/**
 * Registro de Barras (tienda con `registry`): el formulario para fundar una barra (nombre, sigla y dos
 * colores, con la vista previa de cómo se ve sobre el avatar). Las mismas reglas que valida el server
 * (`barras.ts` de shared); el server cobra `BARRA_FOUND_COST` y responde con `barra:result`.
 */
export function BarraRegistry({ room, shop, onClose }: BarraRegistryProps) {
  const money = useGame((state) => state.money);
  const barra = useGame((state) => state.barra);
  const selfName = useGame((state) => state.players.find((player) => player.isSelf)?.name ?? "Tu nombre");
  const selfColor = useGame((state) => state.players.find((player) => player.isSelf)?.color ?? "#ffffff");
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [colors, setColors] = useState<[BarraColorId, BarraColorId]>(["celeste", "blanco"]);
  const [result, setResult] = useState<BarraResultMessage | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => requestBarra(room), [room]);
  useEffect(
    () =>
      eventBus.on("barra:result", (message) => {
        setResult(message);
        setPending(false);
      }),
    [],
  );

  const cleanName = normalizeBarraName(name);
  const cleanTag = normalizeBarraTag(tag);
  const nameProblem = barraNameProblem(cleanName);
  const tagProblem = barraTagProblem(cleanTag);
  const problem = nameProblem ?? tagProblem;
  const affordable = money !== null && money >= BARRA_FOUND_COST;
  const [first, second] = colors.map(barraColorHex);
  const colorName = (id: BarraColorId) => BARRA_COLORS.find((color) => color.id === id)?.name ?? id;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (problem || !affordable || pending) return;
    setPending(true);
    sendBarraCreate(room, { name: cleanName, tag: cleanTag, colors });
  };

  const pick = (index: 0 | 1, id: BarraColorId) => setColors((current) => (index === 0 ? [id, current[1]] : [current[0], id]));
  const swap = () => setColors(([a, b]) => [b, a]);
  const shuffle = () => {
    const ids = BARRA_COLORS.map((color) => color.id);
    const a = ids[Math.floor(Math.random() * ids.length)];
    const rest = ids.filter((id) => id !== a);
    setColors([a, rest[Math.floor(Math.random() * rest.length)]]);
  };

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal barra-panel registry")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="registry-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="registry-title">
            <UiIcon name="flag" size={18} />
            {shop.name}
          </h2>
          <span className={cx("shop-money")} title="Tu dinero">
            <UiIcon name="moneyBag" size={14} />
            {money === null ? "$…" : formatMoney(money)}
          </span>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className={cx("registry-body")}>
          {result && <p className={cx(`barra-result ${result.ok ? "ok" : "error"}`)}>{result.ok ? "🎉 " : ""}{result.text}</p>}

          {barra ? (
            <div className={cx("registry-member")}>
              <Flag first={barraColorHex(barra.colors[0])} second={barraColorHex(barra.colors[1])} tag={barra.tag} name={barra.name} />
              <p>
                {result?.ok ? "¡Quedó anotada en el libro del barrio! Invitá gente haciendo clic sobre otros jugadores." : "Ya sos de esta barra. Para fundar otra, primero tenés que irte."}
              </p>
              <button type="button" className={cx("primary")} onClick={() => openPanel("barra")}>
                Ver mi barra
              </button>
            </div>
          ) : (
            <form className={cx("barra-form")} onSubmit={submit}>
              <Flag first={first} second={second} tag={cleanTag || "SIGLA"} name={cleanName || "Tu barra"} placeholder={!cleanName && !cleanTag} />
              <div className={cx("registry-nameplate")} aria-label="Así se ve sobre tu avatar">
                <span className={cx("barra-preview-tag")} style={{ background: first, color: readableOn(first), borderColor: second }}>
                  {cleanTag || "SIGLA"}
                </span>
                <span style={{ color: selfColor }}>{selfName}</span>
                <small>así te van a ver</small>
              </div>

              <p className={cx("barra-intro")}>
                Anotá tu barra en el libro del barrio: un nombre, una sigla que va al lado del nombre de cada integrante y dos
                colores, como la camiseta de un club de barrio.
              </p>

              <div className={cx("registry-step")}>
                <span className={cx("registry-number")}>1</span>
                <label>
                  <span className={cx("registry-label")}>
                    Nombre <small>{cleanName.length}/{BARRA_NAME_MAX}</small>
                  </span>
                  <input
                    value={name}
                    maxLength={BARRA_NAME_MAX}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="La Barra del Pancho"
                    aria-invalid={Boolean(name && nameProblem)}
                  />
                  {name && nameProblem && <small className={cx("registry-error")}>{nameProblem}</small>}
                </label>
              </div>

              <div className={cx("registry-step")}>
                <span className={cx("registry-number")}>2</span>
                <label>
                  <span className={cx("registry-label")}>
                    Sigla <small>{cleanTag.length}/{BARRA_TAG_MAX} · letras o números</small>
                  </span>
                  <input
                    className={cx("registry-tag-input")}
                    value={tag}
                    maxLength={BARRA_TAG_MAX + 2}
                    onChange={(event) => setTag(normalizeBarraTag(event.target.value).slice(0, BARRA_TAG_MAX))}
                    placeholder="LBDP"
                    aria-invalid={Boolean(tag && tagProblem)}
                  />
                  {tag && tagProblem && <small className={cx("registry-error")}>{tagProblem}</small>}
                </label>
              </div>

              <div className={cx("registry-step")}>
                <span className={cx("registry-number")}>3</span>
                <div className={cx("registry-colors")}>
                  <span className={cx("registry-label")}>
                    Colores
                    <span className={cx("registry-color-tools")}>
                      <button type="button" onClick={swap} title="Dar vuelta los colores">
                        ⇄ Invertir
                      </button>
                      <button type="button" onClick={shuffle} title="Elegir dos colores al azar">
                        🎲 Al azar
                      </button>
                    </span>
                  </span>
                  {([0, 1] as const).map((index) => (
                    <fieldset key={index} className={cx("barra-colors")}>
                      <legend>
                        {index === 0 ? "Principal" : "Segundo"}: <strong>{colorName(colors[index])}</strong>
                      </legend>
                      {BARRA_COLORS.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          title={color.name}
                          aria-label={color.name}
                          aria-pressed={colors[index] === color.id}
                          style={{ background: color.hex, color: readableOn(color.hex) }}
                          onClick={() => pick(index, color.id)}
                        >
                          {colors[index] === color.id ? "✓" : ""}
                        </button>
                      ))}
                    </fieldset>
                  ))}
                </div>
              </div>

              <ul className={cx("registry-perks")}>
                <li>👥 Hasta {BARRA_MAX_MEMBERS} integrantes</li>
                <li>💬 Chat propio con /barra</li>
                <li>🏷️ La sigla sobre cada nombre</li>
              </ul>

              <div className={cx("registry-cost")}>
                <span>
                  Fundarla sale <strong>{formatMoney(BARRA_FOUND_COST)}</strong>
                </span>
                {money !== null && (
                  <span className={cx(affordable ? "ok" : "short")}>
                    {affordable ? `Te quedan ${formatMoney(money - BARRA_FOUND_COST)}` : `Te faltan ${formatMoney(BARRA_FOUND_COST - money)}`}
                  </span>
                )}
              </div>
              <button
                type="submit"
                className={cx("primary registry-submit")}
                style={!problem && affordable ? { background: `linear-gradient(135deg, ${first}, ${second})`, color: readableOn(first) } : undefined}
                disabled={Boolean(problem) || !affordable || pending}
              >
                {pending ? "Anotando…" : affordable ? `🚩 Fundar la barra · ${formatMoney(BARRA_FOUND_COST)}` : `Te faltan ${formatMoney(BARRA_FOUND_COST - (money ?? 0))}`}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

/** La bandera de la barra flameando: los dos colores en franjas, con la sigla y el nombre. */
function Flag({ first, second, tag, name, placeholder = false }: { first: string; second: string; tag: string; name: string; placeholder?: boolean }) {
  return (
    <div className={cx(`registry-flag${placeholder ? " placeholder" : ""}`)} aria-hidden="true">
      <span className={cx("registry-pole")} />
      <div className={cx("registry-cloth")} style={{ background: `repeating-linear-gradient(135deg, ${first} 0 22px, ${second} 22px 44px)` }}>
        <span className={cx("registry-flag-tag")} style={{ background: first, color: readableOn(first), borderColor: second }}>
          {tag}
        </span>
        <span className={cx("registry-flag-name")}>{name}</span>
      </div>
    </div>
  );
}
