import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    sourcemap: false, // Save CPU — no sourcemaps in local dev (weak laptop)
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        checkout: resolve(__dirname, 'checkout.html'),
        success: resolve(__dirname, 'success.html'),
        legal: resolve(__dirname, 'legal.html'),
        socialCard: resolve(__dirname, 'social-card.html'),
        demoInstantFeedback: resolve(__dirname, 'demo-instant-feedback.html'),
        diagnosticPromo: resolve(__dirname, 'diagnostic-promo.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Sourcemaps disabled in dev mode to save resources on weak laptop
    // No custom HMR overrides — Vite defaults work correctly for local dev.
    // clientPort:443 / wss was only needed for a TLS reverse-proxy setup
    // and was causing HMR to fail on plain HTTP localhost.
  },
});
