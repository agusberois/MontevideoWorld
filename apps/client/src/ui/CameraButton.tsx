"use client";

import { useEffect, useState } from "react";
import { eventBus } from "@/lib/eventBus";
import { UiIcon } from "./UiIcon";
import { moduleClasses } from "@/lib/cx";
import styles from "./CameraButton.module.css";

const cx = moduleClasses(styles);

/**
 * Botón "Centrar personaje": si perdiste de vista a tu personaje (moviste la cámara), la lleva
 * hasta él y lo marca con anillos ("acá estás"). Se resalta cuando la cámara está libre, o sea,
 * cuando no te está siguiendo. En escritorio también con Espacio. La cámara la maneja la escena
 * (`CameraControl`); esto sólo le manda la orden.
 */
export function CameraButton() {
  // Arranca con lo que quedó guardado (la escena lo confirma con `camera:free` al crearse).
  const [free, setFree] = useState(() => {
    try {
      return window.localStorage.getItem("mw:camera") === "free";
    } catch {
      return false;
    }
  });

  useEffect(() => eventBus.on("camera:free", setFree), []);

  return (
    <button
      type="button"
      className={cx(`camera-button${free ? " free" : ""}`)}
      onClick={() => eventBus.emit("camera:command", "center")}
      title={
        free
          ? "La cámara no te está siguiendo: tocá para volver a tu personaje"
          : "Mostrar dónde está tu personaje"
      }
      aria-label="Centrar personaje"
    >
      <UiIcon name="crosshair" />
      <span className={cx("camera-button-label")}>Centrar personaje</span>
      <kbd>Espacio</kbd>
    </button>
  );
}
