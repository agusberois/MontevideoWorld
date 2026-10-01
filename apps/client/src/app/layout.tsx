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
  themeColor: "#12151f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
