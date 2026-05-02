#!/usr/bin/env node
/**
 * Sanity-check dist/sitemap.xml after `npm run build`.
 */
import fs from 'fs';
import path from 'path';

const xmlPath = path.join(process.cwd(), 'dist', 'sitemap.xml');

if (!fs.existsSync(xmlPath)) {
    console.error('Missing dist/sitemap.xml — run `npm run build` first.');
    process.exit(1);
}

const xml = fs.readFileSync(xmlPath, 'utf8');
const expectations = [
    ['help article-ish', '/help/'],
    ['blog-ish', '/blog/'],
    ['travel-esim-ish', '/travel-esim/'],
];

let failed = false;
for (const [label, frag] of expectations) {
    if (!xml.includes(frag)) {
        console.error(`sitemap verify: missing ${label} (${frag})`);
        failed = true;
    }
}

if (failed) process.exit(1);
console.log('sitemap verify: OK (help / blog / travel-esim prefixes present)');
process.exit(0);
