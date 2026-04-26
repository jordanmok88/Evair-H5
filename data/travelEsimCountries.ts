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
 * Selection logic: top US outbound destinations (per US DOC 2024
 * outbound stats) plus the most-searched eSIM keywords from
 * Ahrefs — covers ~95% of search intent. The full RedTea/Maya
 * catalogue is 200+ countries; this file is the curated subset
 * we author static SEO landing pages for. The `groupByRegion`
 * helper powers the catalogue index at `/travel-esim`, where
 * each region shows its first ~6 entries with a "See all in
 * {region}" toggle to expand inline (no H5 redirect — see
 * `views/TravelEsimPage.tsx#CatalogueIndexView`).
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
    {
        code: 'id',
        name: 'Indonesia',
        region: 'Asia',
        carriers: ['Telkomsel', 'Indosat', 'XL Axiata'],
        priceFromUsd: '4.99',
        blurb:
            'Bali, Jakarta, Lombok, Yogyakarta — full archipelago coverage with native 4G/5G.',
    },
    {
        code: 'my',
        name: 'Malaysia',
        region: 'Asia',
        carriers: ['Maxis', 'Celcom', 'Digi'],
        priceFromUsd: '3.99',
        blurb:
            'Kuala Lumpur, Penang, Langkawi, Borneo. Activates the second you land at KLIA.',
    },
    {
        code: 'ph',
        name: 'Philippines',
        region: 'Asia',
        carriers: ['Globe Telecom', 'Smart', 'DITO'],
        priceFromUsd: '4.49',
        blurb:
            'Manila, Cebu, Boracay, Palawan. Island-hopping ready with reliable 4G across the major destinations.',
    },
    {
        code: 'in',
        name: 'India',
        region: 'Asia',
        carriers: ['Jio', 'Airtel', 'Vi'],
        priceFromUsd: '5.49',
        blurb:
            'Delhi, Mumbai, Bangalore, Goa. Skip the local KYC queue — eSIM activates instantly without paperwork.',
    },
    {
        code: 'kh',
        name: 'Cambodia',
        region: 'Asia',
        carriers: ['Smart Axiata', 'Cellcard', 'Metfone'],
        priceFromUsd: '4.49',
        blurb:
            'Siem Reap, Phnom Penh, the Angkor temples — solid 4G across the country.',
    },
    {
        code: 'mo',
        name: 'Macau',
        region: 'Asia',
        carriers: ['CTM', '3 Macau', 'SmarTone'],
        priceFromUsd: '3.99',
        blurb:
            'Casino-floor 5G plus seamless cross-border roaming into Hong Kong and Zhuhai.',
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
    {
        code: 'ie',
        name: 'Ireland',
        region: 'Europe',
        carriers: ['Vodafone', 'Three', 'Eir'],
        priceFromUsd: '4.99',
        blurb:
            'Dublin, Cork, Galway, the Wild Atlantic Way. EU-wide roaming included.',
    },
    {
        code: 'pt',
        name: 'Portugal',
        region: 'Europe',
        carriers: ['MEO', 'Vodafone Portugal', 'NOS'],
        priceFromUsd: '4.49',
        blurb:
            'Lisbon, Porto, the Algarve, Madeira. Mainland and island coverage with EU roaming.',
    },
    {
        code: 'be',
        name: 'Belgium',
        region: 'Europe',
        carriers: ['Proximus', 'Orange', 'BASE'],
        priceFromUsd: '4.49',
        blurb:
            'Brussels, Bruges, Antwerp. Roams seamlessly across the rest of the EU.',
    },
    {
        code: 'at',
        name: 'Austria',
        region: 'Europe',
        carriers: ['A1', 'Magenta', 'Drei'],
        priceFromUsd: '4.99',
        blurb:
            'Vienna, Salzburg, Innsbruck and the Tyrol. Strong Alpine coverage for ski season.',
    },
    {
        code: 'no',
        name: 'Norway',
        region: 'Europe',
        carriers: ['Telenor', 'Telia', 'Ice'],
        priceFromUsd: '5.99',
        blurb:
            'Oslo, Bergen, the fjords, Lofoten. Coverage even where the Northern Lights actually live.',
    },
    {
        code: 'se',
        name: 'Sweden',
        region: 'Europe',
        carriers: ['Telia', 'Tele2', 'Telenor'],
        priceFromUsd: '4.99',
        blurb:
            'Stockholm, Gothenburg, Lapland. EU-wide roaming bundled in.',
    },
    {
        code: 'dk',
        name: 'Denmark',
        region: 'Europe',
        carriers: ['TDC', 'Telenor', 'Telia'],
        priceFromUsd: '4.99',
        blurb:
            'Copenhagen, Aarhus, the Faroes-bound ferries. EU roaming standard.',
    },
    {
        code: 'fi',
        name: 'Finland',
        region: 'Europe',
        carriers: ['Elisa', 'Telia', 'DNA'],
        priceFromUsd: '4.99',
        blurb:
            'Helsinki and Lapland — including most of the aurora-zone resorts.',
    },
    {
        code: 'cz',
        name: 'Czechia',
        region: 'Europe',
        carriers: ['T-Mobile CZ', 'O2', 'Vodafone'],
        priceFromUsd: '4.49',
        blurb:
            'Prague, Brno, Český Krumlov. Central Europe road-trip ready.',
    },
    {
        code: 'pl',
        name: 'Poland',
        region: 'Europe',
        carriers: ['Orange', 'Play', 'T-Mobile', 'Plus'],
        priceFromUsd: '4.49',
        blurb:
            'Warsaw, Kraków, Gdańsk. Strong 5G and EU-wide roaming.',
    },
    {
        code: 'tr',
        name: 'Türkiye',
        region: 'Europe',
        carriers: ['Turkcell', 'Vodafone TR', 'Türk Telekom'],
        priceFromUsd: '4.99',
        blurb:
            'Istanbul, Cappadocia, Antalya. Skip the local IMEI registration tax — eSIM bypasses it for short trips.',
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
    {
        code: 'br',
        name: 'Brazil',
        region: 'Americas',
        carriers: ['Vivo', 'Claro', 'TIM'],
        priceFromUsd: '5.99',
        blurb:
            'Rio, São Paulo, Salvador, the Amazon. 4G/5G across every state capital.',
    },
    {
        code: 'ar',
        name: 'Argentina',
        region: 'Americas',
        carriers: ['Movistar', 'Claro', 'Personal'],
        priceFromUsd: '5.49',
        blurb:
            'Buenos Aires, Patagonia, Mendoza. No more swapping for a local SIM at Ezeiza.',
    },
    {
        code: 'cl',
        name: 'Chile',
        region: 'Americas',
        carriers: ['Entel', 'Movistar', 'WOM'],
        priceFromUsd: '5.99',
        blurb:
            'Santiago, Atacama, Patagonia. Strong coverage even on the Carretera Austral.',
    },
    {
        code: 'co',
        name: 'Colombia',
        region: 'Americas',
        carriers: ['Claro', 'Movistar', 'Tigo'],
        priceFromUsd: '4.99',
        blurb:
            'Bogotá, Medellín, Cartagena. Reliable 4G across the major cities and Caribbean coast.',
    },
    {
        code: 'pe',
        name: 'Peru',
        region: 'Americas',
        carriers: ['Claro', 'Movistar', 'Entel'],
        priceFromUsd: '5.49',
        blurb:
            'Lima, Cusco, Machu Picchu. Coverage holds up in the Sacred Valley.',
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
    {
        code: 'sa',
        name: 'Saudi Arabia',
        region: 'Middle East',
        carriers: ['STC', 'Mobily', 'Zain'],
        priceFromUsd: '6.99',
        blurb:
            'Riyadh, Jeddah, AlUla. Skip the in-person SIM registration — eSIM is travel-permit ready.',
    },
    {
        code: 'qa',
        name: 'Qatar',
        region: 'Middle East',
        carriers: ['Ooredoo', 'Vodafone Qatar'],
        priceFromUsd: '5.99',
        blurb:
            'Doha 5G across the corniche, West Bay, and Hamad International.',
    },
    {
        code: 'il',
        name: 'Israel',
        region: 'Middle East',
        carriers: ['Cellcom', 'Pelephone', 'Partner'],
        priceFromUsd: '5.99',
        blurb:
            'Tel Aviv, Jerusalem, the Dead Sea. Activate before you land — no kiosk visit at Ben Gurion.',
    },

    // Africa
    {
        code: 'za',
        name: 'South Africa',
        region: 'Africa',
        carriers: ['Vodacom', 'MTN', 'Cell C'],
        priceFromUsd: '5.99',
        blurb:
            'Cape Town, Johannesburg, the Garden Route, Kruger. Skip the RICA paperwork.',
    },
    {
        code: 'eg',
        name: 'Egypt',
        region: 'Africa',
        carriers: ['Vodafone Egypt', 'Orange', 'Etisalat'],
        priceFromUsd: '5.99',
        blurb:
            'Cairo, Luxor, the Red Sea, Sharm El-Sheikh. 4G across the tourist corridor.',
    },
    {
        code: 'ma',
        name: 'Morocco',
        region: 'Africa',
        carriers: ['Maroc Telecom', 'Orange', 'Inwi'],
        priceFromUsd: '5.99',
        blurb:
            'Marrakech, Casablanca, Fes, the Atlas Mountains. Coverage holds up in the souks.',
    },
    {
        code: 'ke',
        name: 'Kenya',
        region: 'Africa',
        carriers: ['Safaricom', 'Airtel', 'Telkom'],
        priceFromUsd: '6.99',
        blurb:
            'Nairobi, the Maasai Mara, the coast. Reliable 4G even on safari.',
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
