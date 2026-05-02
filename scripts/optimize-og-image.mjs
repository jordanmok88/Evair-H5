#!/usr/bin/env node
/**
 * OG social card — resize to 1200×630 and JPEG (&lt;~250 KB for crawlers).
 * Source artwork: `public/og-image.png`. Output: `public/og-image.jpg`.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function main() {
  const inputPath = path.join(process.cwd(), 'public', 'og-image.png');
  const outPath = path.join(process.cwd(), 'public', 'og-image.jpg');

  await sharp(inputPath)
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(outPath);

  const kb = fs.statSync(outPath).size / 1024;
  console.log(`Written ${outPath} (${kb.toFixed(1)} KB)`);
  if (kb > 260) console.warn('Consider lowering JPEG quality — target &lt; 250 KB.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
