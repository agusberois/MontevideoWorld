"use client";
/* eslint-disable @next/next/no-img-element -- capturas estáticas del juego, no necesitan next/image */

import { useEffect, useState } from "react";
import styles from "./Landing.module.css";

export interface HeroSlide {
  src: string;
  alt: string;
  /** El pie de la foto: qué lugar es ("Plaza Independencia, Ciudad Vieja"). */
  caption: string;
}

/** Cada cuánto pasa sola a la siguiente foto. */
const SLIDE_MS = 5000;

/**
 * Las fotos de la portada de la landing, una tras otra: pasan solas cada `SLIDE_MS` (salvo con el
 * mouse encima, el foco adentro o "reducir movimiento" activado), con flechas y puntos para elegir, y
 * el pie de cada una abajo. Todas las fotos están montadas y se cruzan con un fundido.
 */
export function HeroSlider({ slides }: { slides: readonly HeroSlide[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return;
    const timer = window.setTimeout(() => setCurrent((index) => (index + 1) % slides.length), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [current, paused, reducedMotion, slides.length]);

  const go = (index: number) => setCurrent((index + slides.length) % slides.length);

  return (
    <figure
      className={styles.heroShot}
      aria-roledescription="carrusel"
      aria-label="Fotos del juego"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={styles.slides}>
        {slides.map((slide, index) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            width={1600}
            height={790}
            className={index === current ? styles.slideActive : undefined}
            aria-hidden={index !== current}
            loading={index === 0 ? "eager" : "lazy"}
          />
        ))}
        <button type="button" className={`${styles.slideArrow} ${styles.slidePrev}`} onClick={() => go(current - 1)} aria-label="Foto anterior">
          ‹
        </button>
        <button type="button" className={`${styles.slideArrow} ${styles.slideNext}`} onClick={() => go(current + 1)} aria-label="Foto siguiente">
          ›
        </button>
      </div>
      <figcaption className={styles.slideCaption}>
        <span aria-live="polite">{slides[current].caption}</span>
        <span className={styles.slideDots}>
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              aria-label={`Ver: ${slide.caption}`}
              aria-current={index === current}
              className={index === current ? styles.slideDotActive : undefined}
              onClick={() => go(index)}
            />
          ))}
        </span>
      </figcaption>
    </figure>
  );
}
