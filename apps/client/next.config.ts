import path from "node:path";
import type { NextConfig } from "next";

const monorepoRoot = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sólo afecta a `next dev`: deja entrar desde cualquier IPv4 (otras compus de la red local).
  // Temporal: restringirlo cuando no haga falta probar desde otros equipos.
  allowedDevOrigins: ["*.*.*.*"],
  outputFileTracingRoot: monorepoRoot,
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
