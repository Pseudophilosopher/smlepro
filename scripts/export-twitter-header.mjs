/**
 * Renders public/twitter-header-banner.svg to PNG (1500x500) for X/Twitter header upload.
 * Run: npm run export-twitter-header
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, '..', 'public', 'twitter-header-banner.svg');
const svg = readFileSync(svgPath);
const buf = await sharp(svg).png({ compressionLevel: 9 }).toBuffer();
const outPath = join(__dirname, '..', 'public', 'twitter-header-banner.png');
await sharp(buf).toFile(outPath);
const m = await sharp(buf).metadata();
console.log('Wrote public/twitter-header-banner.png', m.width, 'x', m.height, `(${(buf.length / 1024).toFixed(1)} KB)`);
