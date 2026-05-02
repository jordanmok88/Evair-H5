/**
 * One-shot: POST Red Tea `/package/list` (BASE), aggregate `operatorList` per single-ISO rows,
 * write `constants/carriersFromSupplier.generated.ts`.
 *
 * Credentials: env vars, `.env`, or `.env.redtea.pull` (gitignored as `.env.*`).
 *
 * Secrets never ship in the bundle — only the generated map is imported by the app.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const OUT_FILE = path.join(PROJECT_ROOT, 'constants', 'carriersFromSupplier.generated.ts');
const ENV_DOT = path.join(PROJECT_ROOT, '.env');
const ENV_PULL = path.join(PROJECT_ROOT, '.env.redtea.pull');

function loadDotEnvManual(filePath, { force = false } = {}) {
    try {
        if (!fs.existsSync(filePath)) return;
        const text = fs.readFileSync(filePath, 'utf8');
        for (const line of text.split('\n')) {
            const t = line.trim();
            if (!t || t.startsWith('#')) continue;
            const eq = t.indexOf('=');
            if (eq < 1) continue;
            const k = t.slice(0, eq).trim();
            let v = t.slice(eq + 1).trim();
            if (
                (v.startsWith('"') && v.endsWith('"')) ||
                (v.startsWith("'") && v.endsWith("'"))
            ) {
                v = v.slice(1, -1);
            }
            if (force || !process.env[k]) process.env[k] = v;
        }
    } catch {
        /* ignore */
    }
}

loadDotEnvManual(ENV_DOT);
loadDotEnvManual(ENV_PULL, { force: true });

const BASE_URL = (process.env.REDTEA_BASE_URL || 'https://api.esimaccess.com/api/v1/open').replace(/\/+$/, '');
const ACCESS = process.env.REDTEA_ACCESS_CODE || process.env.ESIM_ACCESS_CODE || '';
const SECRET = process.env.REDTEA_SECRET_KEY || process.env.ESIM_SECRET || '';

function iso2FromLocationField(loc) {
    if (typeof loc !== 'string') return [];
    return loc
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((code) => /^[A-Z]{2}$/.test(code));
}

function formatOperatorRow(row) {
    if (!row || typeof row !== 'object') return '';
    const op =
        typeof row.operatorName === 'string' ? row.operatorName.trim() : '';
    if (op) {
        const nt =
            typeof row.networkType === 'string' ? row.networkType.trim() : '';
        if (nt && !op.toLowerCase().includes(nt.toLowerCase())) return `${op} ${nt}`;
        return op;
    }
    const fallbacks = [
        'locationName',
        'name',
        'operator',
        'network',
        'networkType',
        'carrier',
    ];
    for (const k of fallbacks) {
        if (typeof row[k] === 'string' && row[k].trim()) return row[k].trim();
    }
    return '';
}

function operatorLineFromPackage(pkg) {
    const list =
        pkg?.operatorList ?? pkg?.operator_list ?? pkg?.operators ?? null;
    if (Array.isArray(list) && list.length) {
        const parts = [];
        for (const item of list) {
            const s = formatOperatorRow(item);
            if (s) parts.push(s);
        }
        if (parts.length) return [...new Set(parts)].join(' / ');
    }
    if (typeof pkg?.network === 'string' && pkg.network.trim()) return pkg.network.trim();
    if (typeof pkg?.networkOperators === 'string' && pkg.networkOperators.trim())
        return pkg.networkOperators.trim();
    return '';
}

function normalizePackageList(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'object') return Object.values(raw);
    return [];
}

function signBody(bodyStr) {
    const timestamp = String(Date.now());
    const requestId = crypto.randomUUID();
    const signStr = timestamp + requestId + ACCESS + bodyStr;
    const signature = crypto.createHmac('sha256', SECRET).update(signStr).digest('hex');
    return {
        timestamp,
        requestId,
        signature,
    };
}

async function main() {
    if (!ACCESS || !SECRET) {
        console.error(
            'Missing Red Tea credentials.\n' +
                'Set REDTEA_ACCESS_CODE + REDTEA_SECRET_KEY (or ESIM_ACCESS_CODE + ESIM_SECRET)\n' +
                `in the environment, in .env, or in ${path.relative(PROJECT_ROOT, ENV_PULL)} — see scripts/README-redtea-carriers.md.`,
        );
        process.exit(1);
    }

    const bodyObj = { type: 'BASE' };
    const requestBody = JSON.stringify(bodyObj);
    const { timestamp, requestId, signature } = signBody(requestBody);

    const url = `${BASE_URL}/package/list`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'RT-Timestamp': timestamp,
            'RT-RequestID': requestId,
            'RT-AccessCode': ACCESS,
            'RT-Signature': signature,
            'User-Agent': 'EvairH5-carriers-pull/1.0',
        },
        body: requestBody,
        signal: AbortSignal.timeout(180_000),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        console.error('HTTP', res.status, json);
        process.exit(1);
    }

    const err = json.errorCode;
    if (err != null && err !== '0' && err !== 0) {
        console.error('Red Tea errorCode:', err, json.errorMsg || '');
        process.exit(1);
    }
    if (json.success === false) {
        console.error('success=false', json);
        process.exit(1);
    }

    const obj = json.obj || {};
    const packages = normalizePackageList(obj.packageList);

    /** @type {Record<string, { carrier: string, network: string, _len: number }>} */
    const best = {};

    for (const pkg of packages) {
        const loc =
            typeof pkg.location === 'string'
                ? pkg.location
                : typeof pkg.locationCode === 'string'
                  ? pkg.locationCode
                  : '';
        const isos = iso2FromLocationField(loc);
        if (isos.length !== 1) continue;

        const iso = isos[0];
        const carrierLine = operatorLineFromPackage(pkg);
        if (!carrierLine) continue;

        const network =
            typeof pkg.speed === 'string' && pkg.speed.trim()
                ? pkg.speed.trim()
                : '4G/5G';

        const prev = best[iso];
        if (!prev || carrierLine.length > prev._len) {
            best[iso] = { carrier: carrierLine, network, _len: carrierLine.length };
        }
    }

    const ts = new Date().toISOString();
    const sortedKeys = Object.keys(best).sort();
    const out = {};
    for (const k of sortedKeys) {
        const { carrier, network } = best[k];
        out[k] = { carrier, network };
    }

    const body = `/**
 * Parsed operator / network hints from Red Tea \`POST …/package/list\` (single-country BASE rows).
 *
 * **Do not edit by hand.** Regenerate:
 * \`npm run carriers:pull\`
 *
 * Shipped bundles never contain API secrets — only this derived map.
 */

export type RetailCarrierHint = {
    carrier: string;
    network: string;
};

export const CARRIER_REDTEA_SNAPSHOT_GENERATED_AT_ISO: string = ${JSON.stringify(ts)};

export const CARRIER_REDTEA_SNAPSHOT: Record<string, RetailCarrierHint> = ${JSON.stringify(out, null, 4)};
`;

    fs.writeFileSync(OUT_FILE, body, 'utf8');
    console.log(
        `Wrote ${OUT_FILE} (${sortedKeys.length} ISO rows from ${packages.length} packages).`,
    );
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
