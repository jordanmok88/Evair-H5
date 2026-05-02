/**
 * Fetches GET /api/v1/app/packages/locations and writes
 * data/catalogLocationFacetsEmbed.ts (camelCase snapshot for offline/embed fallback).
 *
 * Usage:
 *   node scripts/generate-embed-catalog-facets.mjs
 * Optional:
 *   CATALOG_EMBED_SOURCE=https://evair.zhhwxt.cn/api/v1/app/packages/locations
 */
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data/catalogLocationFacetsEmbed.ts');

const DEFAULT_URL = 'https://evair.zhhwxt.cn/api/v1/app/packages/locations';
const SOURCE = process.env.CATALOG_EMBED_SOURCE || DEFAULT_URL;

const MIN_SINGLES = 120;

function snakeToCamelKey(key) {
  return key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
}

function keysToCamel(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(keysToCamel);
  if (typeof obj === 'object' && obj.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[snakeToCamelKey(k)] = keysToCamel(v);
    }
    return out;
  }
  return obj;
}

function isSuccessCode(code) {
  if (code === 0 || code === '0') return true;
  if (code === '200' || code === '201') return true;
  return false;
}

async function main() {
  const res = await fetch(SOURCE, { headers: { Accept: 'application/json' } });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error('[catalog:embed] Invalid JSON:', text.slice(0, 240));
    process.exit(1);
  }
  if (!isSuccessCode(body.code)) {
    console.error('[catalog:embed] Unexpected code:', body.code, body.msg);
    process.exit(1);
  }
  const data = keysToCamel(body.data);
  const singles = data.singleCountries || [];
  const multis = data.multiCountries || [];
  if (singles.length < MIN_SINGLES) {
    console.error(
      `[catalog:embed] Too few single countries (${singles.length}); expected >= ${MIN_SINGLES}`,
    );
    process.exit(1);
  }

  const header = `/**
 * Built-in catalogue location facets snapshot (${singles.length} countries + ${multis.length} multi regions).
 *
 * WHY: Ensures Shop + /travel-esim never collapse to the small static SEO subset when the API
 * is flaky. Regenerate after major catalogue expansion:
 *
 *   npm run catalog:embed-facets
 *
 * Generated: ${new Date().toISOString()}
 * Source: ${SOURCE.replace(/\\/g, '/')}
 */

import type { PackageLocationsResponse } from '../services/api/types';

`;

  const footer = `\nexport const EMBEDDED_MIN_SINGLE_COUNTRY_FACETS = ${MIN_SINGLES} as const;
`;

  const serialized = JSON.stringify(data, null, 2);
  writeFileSync(
    OUT,
    `${header}export const EMBEDDED_CATALOG_LOCATION_FACETS_SNAPSHOT: PackageLocationsResponse = ${serialized};${footer}\n`,
    'utf8',
  );

  console.log(
    `[catalog:embed] Wrote ${OUT} (${singles.length} single + ${multis.length} multi)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
