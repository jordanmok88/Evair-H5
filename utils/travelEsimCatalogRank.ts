/**
 * Default sort on `/travel-esim` catalogue grids: outbound interest for American
 * travellers (leisure + VFR), then alphabetical. USA is pinned first within
 * Americas only — other shelves use their own tiers.
 */

export type ShelfKey =
    | 'Americas'
    | 'Asia'
    | 'Europe'
    | 'Oceania'
    | 'Middle East'
    | 'Africa'
    | 'Other';

export interface ShelfSortableRow {
    code: string;
    name: string;
}

/** Americas after USA — ISO-3166 alpha-2 lower-case. No `us`; US is pinned separately. */
const AMERICAS_AFTER_US = [
    'mx',
    'ca',
    'pr',
    'vi',
    'gu',
    'mp',
    'do',
    'jm',
    'cu',
    'bs',
    'tc',
    'ky',
    'bb',
    'aw',
    'sx',
    'cw',
    'bq',
    'mf',
    'bm',
    'lc',
    'gd',
    'vc',
    'ag',
    'dm',
    'kn',
    'ms',
    'ai',
    'vg',
    'gp',
    'mq',
    'cr',
    'bz',
    'gt',
    'hn',
    'ni',
    'pa',
    'sv',
    'tt',
    'ht',
    'co',
    'ar',
    'pe',
    'cl',
    'br',
    'ec',
    'uy',
    'py',
    'bo',
    'gf',
    'fk',
    've',
];

const ASIA = [
    'jp',
    'kr',
    'th',
    'vn',
    'sg',
    'hk',
    'tw',
    'ph',
    'my',
    'id',
    'in',
    'cn',
    'mo',
    'np',
    'bd',
    'lk',
    'kh',
    'la',
    'bn',
    'mv',
    'bt',
    'mn',
    'kz',
    'uz',
    'ge',
    'am',
    'az',
    'pk',
    'af',
    'tl',
];

const EUROPE = [
    'gb',
    'fr',
    'it',
    'es',
    'de',
    'ie',
    'pt',
    'gr',
    'nl',
    'ch',
    'at',
    'is',
    'be',
    'pl',
    'cz',
    'hu',
    'hr',
    'se',
    'no',
    'dk',
    'fi',
    'ro',
    'bg',
    'rs',
    'sk',
    'si',
    'ee',
    'lv',
    'lt',
    'ua',
    'tr',
    'ru',
    'al',
    'ad',
    'ba',
    'by',
    'cy',
    'gi',
    'gg',
    'je',
    'li',
    'lu',
    'mk',
    'mt',
    'mc',
    'md',
    'me',
    'sm',
    'va',
    'xk',
    'fo',
];

const OCEANIA = ['au', 'nz', 'fj', 'pf', 'nc', 'vu', 'ws', 'sb', 'to', 'gu', 'pg'];

const MIDDLE_EAST = ['ae', 'il', 'sa', 'qa', 'bh', 'jo', 'lb', 'kw', 'om', 'ye', 'iq', 'ir', 'sy'];

const AFRICA = [
    'za',
    'eg',
    'ma',
    'ke',
    'tz',
    'gh',
    'ng',
    'na',
    'mu',
    'sc',
    'rw',
    'zm',
    'zw',
    'bw',
    'mz',
    'sn',
    'ci',
    'ug',
    'et',
];

const SHELF_PRIO: Partial<Record<ShelfKey, readonly string[]>> = {
    Americas: AMERICAS_AFTER_US,
    Asia: ASIA,
    Europe: EUROPE,
    Oceania: OCEANIA,
    'Middle East': MIDDLE_EAST,
    Africa: AFRICA,
};

function prioIndex(codeLower: string, list: readonly string[] | undefined): number {
    if (!list?.length) return 10_000;
    const i = list.indexOf(codeLower);
    return i === -1 ? 10_000 : i;
}

/**
 * Stable sort within one shelf bucket.
 */
export function sortRowsForShelf<T extends ShelfSortableRow>(shelf: string, rows: T[]): T[] {
    const list =
        SHELF_PRIO[shelf as ShelfKey];

    const copy = [...rows];

    copy.sort((a, b) => {
        let ka: number;
        let kb: number;

        if (shelf === 'Americas') {
            if (a.code === 'us') ka = -1;
            else if (list) ka = prioIndex(a.code, list);
            else ka = 9999;

            if (b.code === 'us') kb = -1;
            else if (list) kb = prioIndex(b.code, list);
            else kb = 9999;
        } else if (list) {
            ka = prioIndex(a.code, list);
            kb = prioIndex(b.code, list);
        } else {
            ka = 10_000;
            kb = 10_000;
        }

        if (ka !== kb) return ka - kb;
        return a.name.localeCompare(b.name, 'en');
    });

    return copy;
}
