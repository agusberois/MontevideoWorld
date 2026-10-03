"use client";

import { useEffect, useState } from "react";
import { LOW_HEALTH, MAX_HEALTH, Shop, ShopResultMessage, formatMoney, hospitalPrice } from "@montevideo-world/shared";
import { eventBus } from "@/lib/eventBus";
import { useGame } from "@/lib/gameStore";
import { CityRoom, sendHospitalHeal } from "@/lib/network";
import { UiIcon } from "../../ui/UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./health.module.css";

const cx = moduleClasses(styles);

interface HospitalPanelProps {
  room: CityRoom;
  shop: Shop;
  onClose: () => void;
}

/**
 * Guardia del sanatorio (tienda con `hospital`): tu salud y la consulta que te deja en 100
 * (`hospitalPrice`: $1 por punto que falta, mínimo $10). Es una intención: el server valida
 * (cercanía, plata) y responde con `shop:result`.
 */
export function HospitalPanel({ room, shop, onClose }: HospitalPanelProps) {
  const money = useGame((state) => state.money);
  const health = useGame((state) => state.health);
  const [result, setResult] = useState<ShopResultMessage | null>(null);

  useEffect(() => eventBus.on("shop:result", setResult), []);

  const current = health ?? MAX_HEALTH;
  const healthy = current >= MAX_HEALTH;
  const price = hospitalPrice(current);
  const affordable = money !== null && money >= price;

  return (
    <div className={cx("modal-backdrop")} onClick={onClose}>
      <section
        className={cx("modal shop hospital")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hospital-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="hospital-title">
            <UiIcon name="heart" size={18} />
            {shop.name}
          </h2>
          <span className={cx("shop-money")} title="Tu dinero">
            <UiIcon name="moneyBag" size={14} className={cx("hud-money-icon")} />
            {money === null ? "$…" : formatMoney(money)}
          </span>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </header>

        {result && <p className={cx(`shop-result ${result.ok ? "ok" : "error"}`)}>{result.text}</p>}

        <div className={cx("hospital-body")}>
          <p className={cx(`hospital-health${current < LOW_HEALTH ? " low" : ""}`)}>
            <UiIcon name="heart" size={22} />
            Tu salud: <strong>{health === null ? "…" : current}</strong> / {MAX_HEALTH}
          </p>
          {healthy ? (
            <p className={cx("shop-hint")}>Estás sano: no hace falta la consulta.</p>
          ) : (
            <button
              type="button"
              className={cx("hospital-heal")}
              disabled={!affordable}
              title={affordable ? undefined : "No te alcanza la plata"}
              onClick={() => {
                setResult(null);
                sendHospitalHeal(room, shop.id);
              }}
            >
              Atenderme · salud al 100 por {formatMoney(price)}
            </button>
          )}
        </div>

        <footer>
          La consulta cuesta $1 por cada punto de salud que te falta (mínimo $10). Gratis, la salud vuelve sola de a poco
          con la panza llena y descansando.{" "}
          <span className={cx("key-hint")}>
            Apretá <kbd>Esc</kbd> para cerrar
          </span>
        </footer>
      </section>
    </div>
  );
}
