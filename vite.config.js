import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
        cliente: './pages/cliente.html',
        comercio: './pages/comercio.html',
        repartidor: './pages/repartidor.html',
        dueno: './pages/dueno.html'
      }
    }
  },
  server: {
    port: 3000
  }
});