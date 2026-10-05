import { CartItem, RodItem } from "./items";
/**
 * Clima de Montevideo: global para todo el server como la hora (todos los barrios tienen el mismo).
 * Lo decide el server (`weather.ts` del server: cada clima dura unas horas del juego y después
 * sortea otro) y cada sala lo copia a `GameState.weather`. Cambia un poco la pesca, la venta y el
 * hambre; acá están los efectos, así el server sortea y el cliente avisa con los mismos números.
 */
export declare const WEATHER_IDS: readonly ["clear", "rain", "pampero", "heat"];
export type WeatherId = (typeof WEATHER_IDS)[number];
export interface Weather {
    id: WeatherId;
    name: string;
    /** Mensaje del chat cuando empieza (en todos los barrios). */
    announce: string;
    /** Qué cambia, en una frase corta, para los paneles de pesca y venta (vacío = nada). */
    fishingHint: string;
    vendingHint: string;
    /** Peso al sortear el próximo clima (nunca se repite el mismo seguido). */
    weight: number;
    /** Cuánto dura, en horas del juego (se sortea entre las dos). */
    hours: [number, number];
    /** Pesca: multiplica la espera y la probabilidad de que no pique nada. */
    fishWaitFactor: number;
    fishNothingFactor: number;
    /** Venta: multiplica la espera y la probabilidad de que nadie compre (con lluvia hay menos gente). */
    vendWaitFactor: number;
    vendNoSaleFactor: number;
    /** Hambre: multiplica lo que baja solo con el tiempo (no lo de caminar ni trabajar). */
    hungerFactor: number;
}
export declare const WEATHERS: Record<WeatherId, Weather>;
/** Con calor, los carritos de bebida fría: casi siempre alguien compra y paga más. */
export declare const HEAT_COLD_CARTS: readonly string[];
export declare const HEAT_COLD_NO_SALE_FACTOR = 0.5;
export declare const HEAT_COLD_SALE_MULTIPLIER = 1.5;
export declare function isWeatherId(value: unknown): value is WeatherId;
export declare function getWeather(id: string): Weather;
/** La caña como rinde con este clima (espera y "no pica nada"); lo demás, igual. */
export declare function rodInWeather(rod: RodItem, weather: Weather): RodItem;
/** El carrito como rinde con este clima (espera, "nadie compra" y, con calor, el precio de lo frío). */
export declare function cartInWeather(cart: CartItem, weather: Weather): CartItem;
/**
 * Si el admin fuerza el clima (`GameState.weatherMode`): "auto" lo sortea solo; un `WeatherId` lo
 * deja fijo hasta que se vuelva a "auto".
 */
export type WeatherMode = "auto" | WeatherId;
export declare function isWeatherMode(value: unknown): value is WeatherMode;
//# sourceMappingURL=weather.d.ts.map