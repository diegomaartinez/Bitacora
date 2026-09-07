import { defineConfig } from 'vite';

export default defineConfig({
  // Base relativa: hace que el build funcione tanto en la raiz de un dominio
  // propio como en una "project page" de GitHub Pages (https://usuario.github.io/repo/).
  base: './',
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});
