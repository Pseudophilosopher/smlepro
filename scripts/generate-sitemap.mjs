/**
 * Writes dist/sitemap.xml after Vite build. Static hosting is more reliable for
 * Google Search Console than a Cloud Function rewrite (fewer timeouts / edge cases).
 */
import { existsSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');
const outPath = resolve(distDir, 'sitemap.xml');

if (!existsSync(distDir)) {
  console.error('generate-sitemap: dist/ missing — run `vite build` first.');
  process.exit(1);
}

const origin = 'https://smlepro.web.app';
const lastmod = new Date().toISOString().slice(0, 10);

// All routes for the SMLE Pro SPA (keep in sync with vite.config.js rollupOptions.input)
const routes = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/checkout.html', changefreq: 'monthly', priority: '0.6' },
  { path: '/success.html', changefreq: 'monthly', priority: '0.3' },
  { path: '/legal.html', changefreq: 'monthly', priority: '0.3' },
  { path: '/social-card.html', changefreq: 'monthly', priority: '0.3' },
  { path: '/demo-instant-feedback.html', changefreq: 'monthly', priority: '0.5' },
  { path: '/diagnostic-promo.html', changefreq: 'monthly', priority: '0.5' },
  { path: '/sitemap.html', changefreq: 'monthly', priority: '0.5' },
  { path: '/llms.txt', changefreq: 'monthly', priority: '0.4' },
];

const urls = routes.map(route => `  <url>
    <loc>${origin}${route.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n');

const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

writeFileSync(outPath, body, 'utf8');
console.log('generate-sitemap: wrote', outPath);
