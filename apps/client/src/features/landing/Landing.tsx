/* eslint-disable @next/next/no-img-element -- capturas estáticas del juego, no necesitan next/image */
import { CITY_INFOS } from "@montevideo-world/shared";
import { HeroSlider, type HeroSlide } from "./HeroSlider";
import { PlayButton } from "./PlayButton";
import styles from "./Landing.module.css";

/**
 * Landing pública del juego (dominio principal). El juego está en `app.<dominio>`. Los barrios y sus
 * tiendas salen de `@montevideo-world/shared`, así la página no queda vieja cuando cambia el juego.
 * Sin precios, niveles, números ni comparaciones: la landing cuenta qué se hace, no cuánto rinde.
 */

/** Los barrios que se muestran (la cárcel, las salas con puerta y los ocultos, no). */
const LANDING_CITIES = CITY_INFOS.filter((city) => !city.prison && !city.access && !city.hidden);

/** Las fotos de la portada (capturas del juego), con el pie de cada una. */
const HERO_SLIDES: readonly HeroSlide[] = [
  {
    src: "/landing/ciudad-vieja.webp",
    alt: "Jugadores charlando en la Plaza Independencia, junto al Monumento a Artigas y el Palacio Salvo",
    caption: "Plaza Independencia, Ciudad Vieja",
  },
  {
    src: "/landing/centro.webp",
    alt: "18 de Julio con el London París, el Edificio Rex y la Plaza Cagancha",
    caption: "18 de Julio y el London París, Centro",
  },
  {
    src: "/landing/musica.webp",
    alt: "Músicos con guitarra, bandoneón y tambor tocando sobre 18 de Julio",
    caption: "Músicos en 18 de Julio, Centro",
  },
  {
    src: "/landing/escollera.webp",
    alt: "Jugadores pescando en la Escollera Sarandí, con la farola en la punta",
    caption: "Escollera Sarandí, Ciudad Vieja",
  },
];

/** Captura de cada barrio (sacadas del juego, en `public/landing/`). Sin captura, va la ilustración. */
const CITY_SHOTS: Record<string, string> = {
  "ciudad-vieja": "/landing/ciudad-vieja.webp",
  centro: "/landing/centro.webp",
};

/** Lo que tiene cada barrio para hacer, en una línea (para la tarjeta del barrio). */
const CITY_HIGHLIGHTS: Record<string, string[]> = {
  "ciudad-vieja": ["🎣 Pesca en dos escolleras", "🎰 Casino Victoria Plaza", "🚌 Agencia STM", "🐕 Veterinaria"],
  centro: ["🎵 Tocar en 18 de Julio", "🛍️ Tiendas por toda la avenida", "☕ Café Facal", "🏛️ Palacios art déco"],
};

/** Las dos changas. */
const JOBS = [
  {
    id: "pesca",
    icon: "🎣",
    place: "Ciudad Vieja · Escollera Sarandí",
    title: "Tirá la línea",
    text: "Parate en la escollera con tu caña y esperá que pique: pejerreyes, corvinas, lenguados y más. Lo que sacás lo vendés en el Mercado del Puerto o te lo morfás.",
    tools: "Varios tipos de cañas",
    image: "/landing/escollera.webp",
    imageAlt: "Jugadores pescando en la Escollera Sarandí, con la farola en la punta",
  },
  {
    id: "musica",
    icon: "🎵",
    place: "Centro · 18 de Julio y sus plazas",
    title: "Tocá en la calle",
    text: "Sacá el instrumento en la avenida, en la Plaza Fabini o en la Cagancha. La gente se arrima a escucharte y, si le gusta, aplaude y te tira unas monedas en el estuche. Si tus amigos se quedan a escuchar o tocan con vos, se arma la comparsa.",
    tools: "Varios instrumentos",
    image: "/landing/musica.webp",
    imageAlt: "Músicos con guitarra, bandoneón y tambor sobre 18 de Julio, frente al London París y la Plaza Cagancha",
  },
] as const;

const MORE = [
  { icon: "👕", title: "Pilchá a tu personaje", text: "Remeras, buzos, boinas y championes. Ropería, zapatería, sombrerería y la línea de vestir de London París." },
  { icon: "🤝", title: "Hacé negocio", text: "Cambiá cosas con otros jugadores y regateá en las tiendas." },
  { icon: "🌴", title: "Ojo al piojo con el picudo rojo", text: "Sacudí una palmera y salen picudos. Te corren y te pican: dales una patada." },
  { icon: "🧉", title: "Comé, descansá y cuidate", text: "Energía, hambre y salud. Un mate, una torta frita o un chivito en el Facal; si te picó el picudo, a la farmacia." },
  { icon: "🐕", title: "Adoptá una mascota", text: "Perro, gato o hasta un carpincho en la Veterinaria Sarandí. Ponele nombre y te sigue a todos lados." },
  { icon: "🎰", title: "Probá suerte", text: "Tragamonedas, ruleta y blackjack en el Casino Victoria Plaza." },
  { icon: "👏", title: "Saludá como se debe", text: "Gestos para todo: aplaudir, tomar mate, tocar el tamboril, gritar un gol o chocar los cinco con otro jugador." },
  { icon: "🔒", title: "Visitá el COMCAR", text: "Tomate el bondi y andá a verlos tras la reja a los que se portaron mal. Burlarse es gratis." },
];

const STEPS = [
  { title: "Entrá", text: "Desde el navegador, sin bajar nada. En el celu también anda." },
  { title: "Armá tu personaje", text: "Elegí nombre, piel, pelo y color, o tirá el dado y que sea lo que Dios quiera." },
  { title: "Caé en la Plaza Independencia", text: "Con unos pesos en el bolsillo y una caña. La guía te lleva de la mano los primeros pasos." },
];

const CONTROLS = [
  { keys: "Clic / WASD", action: "caminar" },
  { keys: "F", action: "interactuar, pescar o tocar" },
  { keys: "I", action: "mochila" },
  { keys: "E", action: "gestos" },
  { keys: "M", action: "barrios" },
  { keys: "K", action: "calendario" },
  { keys: "Tab", action: "jugadores" },
  { keys: "1–9", action: "barra rápida" },
];

export function Landing() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#inicio">
          <img src="/mw-logo.svg" alt="" width={36} height={36} />
          <span>Montevideo World</span>
        </a>
        <nav className={styles.nav} aria-label="Secciones">
          <a href="#changas">Changas</a>
          <a href="#barrios">Barrios</a>
          <a href="#mas">Qué más</a>
          <a href="#como-jugar">Cómo jugar</a>
        </nav>
        <PlayButton className={`${styles.button} ${styles.buttonSmall}`}>Jugar</PlayButton>
      </header>

      <main>
        <section id="inicio" className={styles.hero}>
          <div className={styles.heroText}>
            <span className={styles.badge}>Gratis · en el navegador · en plena obra</span>
            <h1>
              Montevideo, en un <span className={styles.accent}>mundo online</span>
            </h1>
            <p>
              Arrancás en la Plaza Independencia, pescás en la escollera y, si seguís por 18 de Julio, pasás el arco y
              estás en el Centro: tiendas, palacios y gente tocando en la calle. Todo en vista isométrica, en tiempo real y
              con vecinos de todo el país.
            </p>
            <div className={styles.actions}>
              <PlayButton className={styles.button}>Jugar ahora</PlayButton>
              <a className={styles.buttonGhost} href="#changas">
                ¿Qué se hace?
              </a>
            </div>
          </div>
          <HeroSlider slides={HERO_SLIDES} />
        </section>

        <ul className={styles.stats} aria-label="El juego de un vistazo">
          <li>
            <strong>🚶 A pie</strong> de la Ciudad Vieja al Centro por 18 de Julio
          </li>
          <li>
            <strong>🛍️ Tiendas</strong> por todos lados
          </li>
          <li>
            <strong>🌦️ Clima y hora</strong> que cambian solos
          </li>
          <li>
            <strong>👥 En vivo</strong> con vecinos de todo el país
          </li>
        </ul>

        <section id="changas" className={styles.section}>
          <h2>Las changas</h2>
          <p className={styles.lead}>Cada barrio tiene la suya. Comprate la herramienta, gastala laburando y cuando se rompa, otra mejor.</p>
          <div className={styles.jobs}>
            {JOBS.map((job) => (
              <article key={job.id} className={styles.job}>
                <img src={job.image} alt={job.imageAlt} width={1600} height={790} loading="lazy" />
                <div className={styles.jobBody}>
                  <span className={styles.place}>
                    {job.icon} {job.place}
                  </span>
                  <h3>{job.title}</h3>
                  <p>{job.text}</p>
                  <p className={styles.tools}>{job.tools}</p>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.weather}>
            <span aria-hidden="true">🌦️</span>
            <div>
              <h3>El clima cuenta</h3>
              <p>Sol, lluvia, pampero o el calor de enero: el día cambia cómo se dan la pesca y la música.</p>
            </div>
          </div>
        </section>

        <section id="barrios" className={styles.section}>
          <h2>Los barrios</h2>
          <p className={styles.lead}>
            Arrancás en la Ciudad Vieja. Seguí caminando por 18 de Julio, pasá el arco y estás en el Centro: sin boleto.
          </p>
          <ol className={styles.route}>
            {LANDING_CITIES.map((city, index) => (
              <li key={city.id} className={styles.cityCard}>
                {CITY_SHOTS[city.id] ? (
                  <img src={CITY_SHOTS[city.id]} alt={`Vista de ${city.name}`} width={1600} height={790} loading="lazy" />
                ) : (
                  <div className={styles.skyline} aria-hidden="true">
                    {[58, 82, 46, 96, 64, 70, 40, 88, 52].map((height, i) => (
                      <span key={i} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                )}
                <div className={styles.cityBody}>
                  <span className={styles.place}>{index === 0 ? "Acá arrancás" : "Por 18 de Julio, caminando"}</span>
                  <h3>{city.name}</h3>
                  <p>{city.description}</p>
                  <ul className={styles.highlights}>
                    {(CITY_HIGHLIGHTS[city.id] ?? []).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <ul className={styles.tags}>
                    {[...new Set(city.landmarks.map((landmark) => landmark.name))].slice(0, 8).map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                  <p className={styles.shopCount}>
                    🛍️ {city.shops.map((shop) => shop.name).join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className={styles.soon}>🚧 Más barrios en camino. El mapa crece de a poco.</p>
        </section>

        <section id="mas" className={styles.section}>
          <h2>Y además</h2>
          <p className={styles.lead}>Para cuando te cansás de laburar.</p>
          <ul className={styles.features}>
            {MORE.map((feature) => (
              <li key={feature.title} className={styles.card}>
                <span className={styles.icon} aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="como-jugar" className={styles.section}>
          <h2>Cómo jugar</h2>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title} className={styles.card}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
          <ul className={styles.controls} aria-label="Controles">
            {CONTROLS.map((control) => (
              <li key={control.keys}>
                <kbd>{control.keys}</kbd> {control.action}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.cta}>
          <img src="/mw-logo.svg" alt="" width={72} height={72} />
          <h2>¿Nos vemos en 18 de Julio, bo?</h2>
          <p>Entrá, armá tu personaje y saludá al primero que veas. Mate no incluido.</p>
          <PlayButton className={styles.button}>Jugar ahora</PlayButton>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>Montevideo World · hecho en Uruguay 🇺🇾</span>
        <span>Prueba de concepto: el juego está en obra y puede cambiar.</span>
      </footer>
    </div>
  );
}
