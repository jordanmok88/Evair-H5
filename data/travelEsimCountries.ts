/**
 * Travel eSIM country catalogue for SEO landing pages.
 *
 * Each entry powers a static-renderable `/travel-esim/{iso2}` page
 * that targets searches like "japan esim" or "france esim card".
 * Live pricing still comes from the Red Tea catalogue once the
 * customer enters the H5 app (`/app/travel-esim/{iso2}`); the
 * `priceFromUsd` here is a "from $X" marketing anchor, not the
 * authoritative price.
 *
 * Selection logic: top 20 destinations US outbound travellers visit
 * (per US DOC 2024 outbound stats) — covers ~90% of search intent
 * without forcing us to maintain 200 pages on day one. We can grow
 * this list as Search Console shows demand.
 */

export interface TravelCountry {
    /** ISO 3166-1 alpha-2, lowercased — used as the URL slug. */
    code: string;
    /** Marketing display name (en). */
    name: string;
    /** Region grouping for the catalogue index. */
    region: 'Asia' | 'Europe' | 'Americas' | 'Oceania' | 'Africa' | 'Middle East';
    /** Local networks the eSIM connects to (informational only). */
    carriers: string[];
    /** "From $X.XX" anchor for the hero. Update if Red Tea pricing changes. */
    priceFromUsd: string;
    /** One-sentence SEO blurb shown above the fold. */
    blurb: string;
}

export const TRAVEL_COUNTRIES: TravelCountry[] = [
    // Asia
    {
        code: 'jp',
        name: 'Japan',
        region: 'Asia',
        carriers: ['NTT DOCOMO', 'SoftBank', 'KDDI'],
        priceFromUsd: '4.99',
        blurb:
            'Stay connected the moment you land at Narita or Haneda. Works with all unlocked iPhones and Androids, no SIM swap.',
    },
    {
        code: 'kr',
        name: 'South Korea',
        region: 'Asia',
        carriers: ['KT', 'SK Telecom', 'LG U+'],
        priceFromUsd: '5.99',
        blurb:
            'Korea-wide 5G eSIM. Unlimited data plans available — perfect for KakaoMap, Naver, and live translation apps.',
    },
    {
        code: 'th',
        name: 'Thailand',
        region: 'Asia',
        carriers: ['AIS', 'TrueMove H', 'dtac'],
        priceFromUsd: '3.99',
        blurb:
            'High-speed 4G/5G across Bangkok, Phuket, Chiang Mai. Activates automatically on landing.',
    },
    {
        code: 'sg',
        name: 'Singapore',
        region: 'Asia',
        carriers: ['Singtel', 'StarHub', 'M1'],
        priceFromUsd: '3.99',
        blurb:
            'Tiny country, fastest mobile networks in the world. Great for short layovers and full-week trips.',
    },
    {
        code: 'hk',
        name: 'Hong Kong',
        region: 'Asia',
        carriers: ['CSL', '3HK', 'SmarTone'],
        priceFromUsd: '3.49',
        blurb:
            'Works the second your plane lands at HKIA. Perfect for cross-border trips into Shenzhen too.',
    },
    {
        code: 'tw',
        name: 'Taiwan',
        region: 'Asia',
        carriers: ['Chunghwa', 'Taiwan Mobile', 'FarEasTone'],
        priceFromUsd: '3.99',
        blurb:
            'Island-wide 5G eSIM. Pop-up activation in seconds — no kiosk visit required.',
    },
    {
        code: 'cn',
        name: 'China',
        region: 'Asia',
        carriers: ['China Unicom', 'China Mobile (roaming)'],
        priceFromUsd: '6.99',
        blurb:
            'Routes via Hong Kong / Singapore — bypasses the Great Firewall for Google, WhatsApp, Instagram, and Gmail without a separate VPN.',
    },
    {
        code: 'vn',
        name: 'Vietnam',
        region: 'Asia',
        carriers: ['Viettel', 'Vinaphone', 'MobiFone'],
        priceFromUsd: '4.49',
        blurb:
            'Coverage from Hanoi to Ho Chi Minh, including Phú Quốc and Da Nang.',
    },

    // Europe
    {
        code: 'gb',
        name: 'United Kingdom',
        region: 'Europe',
        carriers: ['EE', 'Vodafone', 'O2', 'Three'],
        priceFromUsd: '4.99',
        blurb:
            'UK-wide 4G/5G. Same eSIM works across England, Scotland, Wales, and Northern Ireland.',
    },
    {
        code: 'fr',
        name: 'France',
        region: 'Europe',
        carriers: ['Orange', 'SFR', 'Bouygues'],
        priceFromUsd: '4.49',
        blurb:
            'Stay online from Paris to Provence. Roams across the EU at no extra cost.',
    },
    {
        code: 'it',
        name: 'Italy',
        region: 'Europe',
        carriers: ['TIM', 'Vodafone', 'WindTre'],
        priceFromUsd: '4.49',
        blurb:
            'Rome, Florence, Venice, Amalfi — full peninsula coverage and EU-wide roaming included.',
    },
    {
        code: 'es',
        name: 'Spain',
        region: 'Europe',
        carriers: ['Movistar', 'Vodafone', 'Orange'],
        priceFromUsd: '4.49',
        blurb:
            'Madrid, Barcelona, the Balearics — full mainland and island coverage.',
    },
    {
        code: 'de',
        name: 'Germany',
        region: 'Europe',
        carriers: ['Deutsche Telekom', 'Vodafone', 'O2'],
        priceFromUsd: '4.99',
        blurb:
            'Reliable 5G across all major cities. Includes EU-wide roaming for day trips into Austria or France.',
    },
    {
        code: 'ch',
        name: 'Switzerland',
        region: 'Europe',
        carriers: ['Swisscom', 'Sunrise', 'Salt'],
        priceFromUsd: '7.99',
        blurb:
            'Premium Alpine coverage. Ideal for ski trips and mountain hikes.',
    },
    {
        code: 'gr',
        name: 'Greece',
        region: 'Europe',
        carriers: ['Cosmote', 'Vodafone', 'Wind'],
        priceFromUsd: '4.49',
        blurb:
            'Athens, Santorini, Mykonos, Crete — island-hopping ready.',
    },
    {
        code: 'nl',
        name: 'Netherlands',
        region: 'Europe',
        carriers: ['KPN', 'T-Mobile', 'Vodafone'],
        priceFromUsd: '4.49',
        blurb:
            'Amsterdam to Rotterdam, full country 5G + EU roaming.',
    },

    // Americas
    {
        code: 'mx',
        name: 'Mexico',
        region: 'Americas',
        carriers: ['Telcel', 'AT&T Mexico', 'Movistar'],
        priceFromUsd: '3.99',
        blurb:
            'Cancún, CDMX, Tulum, Cabo. Works as soon as you cross the border or land.',
    },
    {
        code: 'ca',
        name: 'Canada',
        region: 'Americas',
        carriers: ['Rogers', 'Bell', 'Telus'],
        priceFromUsd: '4.99',
        blurb:
            'Toronto, Vancouver, Banff. Full country coverage for road trips and ski seasons.',
    },

    // Oceania
    {
        code: 'au',
        name: 'Australia',
        region: 'Oceania',
        carriers: ['Telstra', 'Optus', 'Vodafone'],
        priceFromUsd: '5.99',
        blurb:
            'Sydney, Melbourne, Cairns, Perth. The eSIM works coast to coast.',
    },
    {
        code: 'nz',
        name: 'New Zealand',
        region: 'Oceania',
        carriers: ['Spark', 'Vodafone', '2degrees'],
        priceFromUsd: '5.99',
        blurb:
            'North and South Island coverage — including national-park dead zones where you actually need it.',
    },

    // Middle East
    {
        code: 'ae',
        name: 'UAE',
        region: 'Middle East',
        carriers: ['Etisalat', 'du'],
        priceFromUsd: '4.99',
        blurb:
            'Dubai and Abu Dhabi 5G. Activates the moment you connect to airport Wi-Fi.',
    },
];

export function findCountry(code: string): TravelCountry | undefined {
    const lower = code.toLowerCase();
    return TRAVEL_COUNTRIES.find(c => c.code === lower);
}

export function flagEmoji(iso2: string): string {
    return iso2
        .toUpperCase()
        .split('')
        .map(c => String.fromCodePoint(127397 + c.charCodeAt(0)))
        .join('');
}

export function groupByRegion(): Record<string, TravelCountry[]> {
    const out: Record<string, TravelCountry[]> = {};
    for (const c of TRAVEL_COUNTRIES) {
        (out[c.region] ??= []).push(c);
    }
    return out;
}
