// Generates raster favicon assets from public/favicon.svg:
//   - PNG sizes (16/32/48/180/512) + apple-touch-icon.png
//   - a multi-size favicon.ico (16/32/48, PNG-compressed, Vista+ style)
// Run with:  npm run icons   (or: node scripts/generate-icons.mjs)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');
const svg = readFileSync(join(publicDir, 'favicon.svg'));

const render = (size) => sharp(svg).resize(size, size).png();

// 1) Standalone PNGs
const pngs = {
  'favicon-16.png': 16,
  'favicon-32.png': 32,
  'favicon-48.png': 48,
  'apple-touch-icon.png': 180,
  'favicon-512.png': 512,
};
for (const [name, size] of Object.entries(pngs)) {
  await render(size).toFile(join(publicDir, name));
  console.log('  wrote', `${name} (${size}x${size})`);
}

// 2) Pack a multi-size .ico (each image stored as PNG inside the ICO container)
const icoSizes = [16, 32, 48];
const images = await Promise.all(icoSizes.map(async (s) => ({ size: s, data: await render(s).toBuffer() })));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: 1 = icon
header.writeUInt16LE(images.length, 4); // count

const entries = Buffer.alloc(images.length * 16);
let offset = 6 + entries.length;
images.forEach((img, i) => {
  const e = i * 16;
  entries.writeUInt8(img.size >= 256 ? 0 : img.size, e + 0); // width
  entries.writeUInt8(img.size >= 256 ? 0 : img.size, e + 1); // height
  entries.writeUInt8(0, e + 2); // color palette entries
  entries.writeUInt8(0, e + 3); // reserved
  entries.writeUInt16LE(1, e + 4); // color planes
  entries.writeUInt16LE(32, e + 6); // bits per pixel
  entries.writeUInt32LE(img.data.length, e + 8); // image byte size
  entries.writeUInt32LE(offset, e + 12); // image data offset
  offset += img.data.length;
});

const ico = Buffer.concat([header, entries, ...images.map((i) => i.data)]);
writeFileSync(join(publicDir, 'favicon.ico'), ico);
console.log(`  wrote favicon.ico (${icoSizes.join(' / ')})`);
console.log('Done.');
