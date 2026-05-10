/**
 * Rasterizes public/logo-profile.svg to square PNG/JPEG files for social networks.
 * TikTok, Instagram, X, and YouTube require square JPG/PNG — not SVG or wide banners.
 *
 * Run: npm run export-social-pfp
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'logo-profile.svg');
const svg = readFileSync(svgPath);

const exports_ = [
  ['social-profile-1080.png', 1080, 'png'],
  ['social-profile-1080.jpg', 1080, 'jpeg'],
  ['social-profile-400.png', 400, 'png'],
  ['social-profile-400.jpg', 400, 'jpeg'],
];

for (const [filename, size, fmt] of exports_) {
  let pipeline = sharp(svg).resize(size, size, { fit: 'fill' });
  if (fmt === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else {
    pipeline = pipeline.jpeg({ quality: 92, mozjpeg: true });
  }
  await pipeline.toFile(join(root, 'public', filename));
  console.log('Wrote public/' + filename);
}
