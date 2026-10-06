"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  BARRA_COLORS,
  BARRA_FOUND_COST,
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
  const problem = barraNameProblem(cleanName) ?? barraTagProblem(cleanTag);
  const affordable = money !== null && money >= BARRA_FOUND_COST;
  const [first, second] = colors.map(barraColorHex);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (problem || !affordable || pending) return;
    setPending(true);
    sendBarraCreate(room, { name: cleanName, tag: cleanTag, colors });
  };

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal barra-panel")}
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

        {result && <p className={cx(`barra-result ${result.ok ? "ok" : "error"}`)}>{result.text}</p>}

        {barra ? (
          <div className={cx("barra-empty")}>
            <p>
              Ya sos de <strong>[{barra.tag}] {barra.name}</strong>. Para fundar otra, primero tenés que irte.
            </p>
            <button type="button" className={cx("primary")} onClick={() => openPanel("barra")}>
              Ver mi barra
            </button>
          </div>
        ) : (
          <form className={cx("barra-form")} onSubmit={submit}>
            <p className={cx("barra-intro")}>
              Anotá tu barra: un nombre, una sigla que va al lado del nombre de cada integrante y dos colores, como la
              camiseta de un club de barrio. Fundarla sale <strong>{formatMoney(BARRA_FOUND_COST)}</strong>.
            </p>
            <label>
              Nombre
              <input value={name} maxLength={BARRA_NAME_MAX} onChange={(event) => setName(event.target.value)} placeholder="La Barra del Pancho" />
            </label>
            <label>
              Sigla
              <input
                value={tag}
                maxLength={BARRA_TAG_MAX + 2}
                onChange={(event) => setTag(normalizeBarraTag(event.target.value).slice(0, BARRA_TAG_MAX))}
                placeholder="LBDP"
              />
            </label>
            {([0, 1] as const).map((index) => (
              <fieldset key={index} className={cx("barra-colors")}>
                <legend>{index === 0 ? "Color principal" : "Segundo color"}</legend>
                {BARRA_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    title={color.name}
                    aria-label={color.name}
                    aria-pressed={colors[index] === color.id}
                    style={{ background: color.hex }}
                    onClick={() => setColors((current) => (index === 0 ? [color.id, current[1]] : [current[0], color.id]))}
                  />
                ))}
              </fieldset>
            ))}
            <div className={cx("barra-preview")} aria-label="Así se ve sobre tu avatar">
              <span className={cx("barra-preview-tag")} style={{ background: first, borderColor: second }}>
                {cleanTag || "SIGLA"}
              </span>
              <span>Tu nombre</span>
            </div>
            {cleanName && cleanTag && problem && <p className={cx("barra-result error")}>{problem}</p>}
            <button type="submit" className={cx("primary")} disabled={Boolean(problem) || !affordable || pending}>
              {affordable ? `Fundar la barra · ${formatMoney(BARRA_FOUND_COST)}` : `Te faltan ${formatMoney(BARRA_FOUND_COST - (money ?? 0))}`}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
