// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const BASE = '/wiki';

/**
 * Solo in sviluppo: http://localhost:4321/ porta a http://localhost:4321/wiki/
 * (il sito vive sotto /wiki come su GitHub Pages; senza questo la radice risponde 404).
 * @returns {import('astro').AstroIntegration}
 */
function reindirizzaRadice() {
  return {
    name: 'reindirizza-radice',
    hooks: {
      'astro:server:setup': ({ server }) => {
        /** @type {import('vite').Connect.NextHandleFunction} */
        const reindirizza = (req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            res.writeHead(302, { Location: `${BASE}/` });
            res.end();
            return;
          }
          next();
        };
        // In testa alla catena, prima che il server tolga /wiki dall'indirizzo richiesto.
        server.httpServer?.once('listening', () => {
          server.middlewares.stack.unshift({ route: '', handle: reindirizza });
        });
      },
    },
  };
}

// Sito di progetto su GitHub Pages: https://breakpointcontractorsunit.github.io/wiki/
// https://astro.build/config
export default defineConfig({
  site: 'https://breakpointcontractorsunit.github.io',
  base: BASE,
  // Genera onboarding.html (non onboarding/index.html): i link già condivisi continuano a funzionare.
  build: { format: 'file' },
  // Il valore predefinito di Astro 7 ('jsx') elimina gli a capo tra una parola e un tag (<a>, <strong>, <mark>…)
  // e le incolla: "vedi\n<a>Regolamento</a>" diventerebbe "vediRegolamento". Con true gli spazi si comportano
  // come in un normale file HTML, così i testi si possono mandare a capo liberamente.
  compressHTML: true,
  integrations: [react(), reindirizzaRadice()],
  vite: { plugins: [tailwindcss()] },
});
