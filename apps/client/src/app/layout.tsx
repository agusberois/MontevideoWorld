import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Montevideo World",
  description: "MMORPG web isométrico — v1 prueba de concepto",
  // Un solo archivo de logo (public/mw-logo.svg) para favicon, pantalla de ingreso y cartel en el juego.
  icons: { icon: [{ url: "/mw-logo.svg", type: "image/svg+xml" }] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Es un juego: el pellizco hace zoom en el mapa (Phaser), no en la página.
  maximumScale: 1,
  userScalable: false,
  // Pantalla completa también bajo el notch; los bordes se respetan con env(safe-area-inset-*).
  viewportFit: "cover",
  // El teclado del celular tapa la página en vez de achicarla (así el canvas no se redimensiona al
  // escribir); el chat se corre arriba del teclado con `--keyboard-inset` (lib/viewport.ts).
  interactiveWidget: "overlays-content",
  themeColor: "#12151f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      {/* Extensiones del navegador (p. ej. ColorZilla) le agregan atributos al body: no es un error nuestro. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
