/* eslint-disable @next/next/no-img-element -- capturas estáticas del juego, no necesitan next/image */
import { CITY_INFOS, ITEMS, MAX_PLAYERS_PER_ROOM } from "@montevideo-world/shared";

/** Los barrios que se muestran (la cárcel, no). */
const LANDING_CITIES = CITY_INFOS.filter((city) => !city.prison && !city.access);
import { PlayButton } from "./PlayButton";
import styles from "./Landing.module.css";

/** Captura de cada barrio (sacadas del juego, en `public/landing/`). */
const CITY_SHOTS: Record<string, string> = {
  "ciudad-vieja": "/landing/ciudad-vieja.webp",
  "tres-cruces": "/landing/tres-cruces.webp",
};

const FEATURES = [
  { icon: "🎣", title: "Tirá la línea en la escollera", text: "Arrimate a la Escollera Sarandí con tu caña. Con una más pro pican bichos más raros." },
  { icon: "🌭", title: "Vendé en el Centenario", text: "Sacá el carrito a la explanada del estadio. Día de clásico, los hinchas te pagan el doble." },
  { icon: "👕", title: "Pilchá a tu personaje", text: "Remeras, buzos, gorras y championes. Comprá en la ropería o quedate con lo que te regalan los hinchas." },
  { icon: "🛍️", title: "Comprá por mayor", text: "En el Barrio de los Judíos hay tiendas por todos lados: ropa más barata, moda coreana que no hay en otro lado y tortas fritas en la vereda." },
  { icon: "🤝", title: "Hacé negocio", text: "Cambiá cosas y plata con otros jugadores. El trato se cierra cuando los dos dicen que ta." },
  { icon: "🌴", title: "Ojo al piojo con el picudo rojo", text: "Sacudí una palmera y salen picudos. Te corren y te pican: dales una patada y cobrás." },
  { icon: "🚌", title: "Movete en bondi", text: "Sacá boletos STM en la agencia y tomate el bondi a otro barrio. La mochila se va con vos." },
  { icon: "🧉", title: "Comé, descansá y cuidate", text: "Tenés energía, hambre y salud. Un mate, una torta frita o un chivito, y si te picó el picudo, a la guardia del Sanatorio." },
  { icon: "🐕", title: "Adoptá una mascota", text: "Perro, gato o hasta un carpincho en la Veterinaria Sarandí. Ponele nombre y te sigue a todos lados." },
  { icon: "🔒", title: "Visitá el COMCAR", text: "Tomate el bondi y andá a verlos tras la reja a los que se portaron mal. Burlarse es gratis." },
];

const STEPS = [
  { title: "Entrá", text: "Desde el navegador, sin bajar nada. En el celu también anda." },
  { title: "Armá tu personaje", text: "Elegí nombre, piel, pelo y color, o tirá el dado y que sea lo que Dios quiera." },
  { title: "Caé en Montevideo", text: "Arrancás en la Plaza Independencia con $100 en el bolsillo y una caña básica." },
];

const CONTROLS = [
  { keys: "Clic / WASD", action: "caminar" },
  { keys: "F", action: "interactuar, pescar o vender" },
  { keys: "M", action: "barrios" },
  { keys: "I", action: "mochila" },
  { keys: "1–9", action: "barra rápida" },
];

/** Landing pública del juego (dominio principal). El juego está en `app.<dominio>`. */
export function Landing() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href="#inicio">
          <img src="/mw-logo.svg" alt="" width={36} height={36} />
          <span>Montevideo World</span>
        </a>
        <nav className={styles.nav} aria-label="Secciones">
          <a href="#que-hacer">Qué hacer</a>
          <a href="#barrios">Barrios</a>
          <a href="#como-jugar">Cómo jugar</a>
        </nav>
        <PlayButton className={`${styles.button} ${styles.buttonSmall}`}>Jugar</PlayButton>
      </header>

      <main>
        <section id="inicio" className={styles.hero}>
          <div className={styles.heroText}>
            <span className={styles.badge}>Gratis · en el navegador · recién salido del horno</span>
            <h1>
              Montevideo, en un <span className={styles.accent}>mundo online</span>
            </h1>
            <p>
              Pateá la Ciudad Vieja y Tres Cruces, tirá la línea en la escollera, vendé panchos en el Centenario y
              charlá con gurises y gurisas de todo el país. Todo en vista isométrica y en tiempo real.
            </p>
            <div className={styles.actions}>
              <PlayButton className={styles.button}>Jugar ahora</PlayButton>
              <a className={styles.buttonGhost} href="#que-hacer">
                ¿Qué se hace?
              </a>
            </div>
          </div>
          <figure className={styles.heroShot}>
            <img
              src="/landing/ciudad-vieja.webp"
              alt="Jugadores en la Plaza Independencia y pescando en la escollera, en la Ciudad Vieja"
              width={1600}
              height={900}
            />
          </figure>
        </section>

        <ul className={styles.stats} aria-label="El juego en números">
          <li>
            <strong>{LANDING_CITIES.length}</strong> barrios para patear
          </li>
          <li>
            <strong>{ITEMS.length}</strong> ítems entre ropa, peces y herramientas
          </li>
          <li>
            <strong>Día y noche</strong>: de la mañana al atardecer en la rambla
          </li>
          <li>
            <strong>Hasta {MAX_PLAYERS_PER_ROOM}</strong> vecinos por barrio
          </li>
        </ul>

        <section id="que-hacer" className={styles.section}>
          <h2>Qué podés hacer</h2>
          <p className={styles.lead}>Cada barrio tiene su changa. Vos elegís cómo hacerte unos pesos.</p>
          <ul className={styles.features}>
            {FEATURES.map((feature) => (
              <li key={feature.title} className={styles.card}>
                <span className={styles.icon} aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </li>
            ))}
          </ul>

          <div className={styles.highlight}>
            <img
              src="/landing/escollera.webp"
              alt="Jugadores pescando en la Escollera Sarandí, con la farola en la punta"
              width={1000}
              height={550}
              loading="lazy"
            />
            <div>
              <h3>La escollera, llena de pescadores</h3>
              <p>
                Del pejerrey a la corvina negra: cuanto mejor la caña, más chances de sacar algo raro, y a veces
                salen dos de una. Lo que pescás lo vendés en el Mercado del Puerto o te lo morfás para recuperar
                energía.
              </p>
            </div>
          </div>
        </section>

        <section id="barrios" className={styles.section}>
          <h2>Los barrios</h2>
          <p className={styles.lead}>Arrancás en la Ciudad Vieja. Con un boleto STM te tomás el bondi a otro barrio.</p>
          <ul className={styles.cities}>
            {LANDING_CITIES.map((city) => (
              <li key={city.id} className={styles.cityCard}>
                {CITY_SHOTS[city.id] && (
                  <img src={CITY_SHOTS[city.id]} alt={`Vista de ${city.name}`} width={1000} height={560} loading="lazy" />
                )}
                <div className={styles.cityBody}>
                  <h3>{city.name}</h3>
                  <p>{city.description}</p>
                  <ul className={styles.tags}>
                    {city.landmarks.slice(0, 4).map((landmark) => (
                      <li key={landmark.id}>{landmark.name}</li>
                    ))}
                  </ul>
                </div>
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
          <h2>¿Nos vemos en la plaza, bo?</h2>
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
