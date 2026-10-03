// PM2: `pm2 start deploy/ecosystem.config.cjs` desde la raíz del monorepo.
module.exports = {
  apps: [
    {
      name: "montevideo-world-server",
      cwd: __dirname + "/../apps/server",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 2567,
        HOST: "127.0.0.1",
        // CORS_ORIGIN va en apps/server/.env del VPS (los dominios del juego): lo que se ponga acá
        // pisa al .env.
      },
    },
  ],
};
