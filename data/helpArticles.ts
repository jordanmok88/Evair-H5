/**
 * Help center article catalogue.
 *
 * Each article is a static content block — no API, no auth, no
 * markdown parser. The shape is intentionally minimal so the renderer
 * stays readable: an array of "blocks" (paragraph, heading, list,
 * callout). If we ever want richer formatting we swap in a markdown
 * library; the current shape covers 95% of support content.
 *
 * Slug rules: lowercase, hyphenated, stable. Slugs become URLs and
 * are used in support tickets, so don't rename without a redirect.
 *
 * Categories drive the help center index grouping. Keep the category
 * list small — too many groups defeats the point of the index.
 *
 * @see views/HelpCenterPage.tsx
 * @see docs/EVAIRSIM_ROADMAP_ZH.md §六 Phase 4 — 帮助中心+博客
 */

export type ArticleBlock =
    | { type: 'p'; text: string }
    | { type: 'h2'; text: string }
    | { type: 'h3'; text: string }
    | { type: 'ul'; items: string[] }
    | { type: 'ol'; items: string[] }
    | { type: 'note'; tone: 'info' | 'warn' | 'tip'; text: string };

export type HelpCategory =
    | 'getting-started'
    | 'esim'
    | 'physical-sim'
    | 'billing'
    | 'troubleshooting';

export interface HelpArticle {
    slug: string;
    title: string;
    /** SEO meta description, also shown as the index card preview. */
    summary: string;
    category: HelpCategory;
    /** Read time in minutes — humans like this number. */
    readMinutes: number;
    /** Last-edited ISO date for the "Updated" line at the top. */
    updatedAt: string;
    body: ArticleBlock[];
}

export const HELP_CATEGORIES: { key: HelpCategory; title: string; blurb: string }[] = [
    {
        key: 'getting-started',
        title: 'Getting started',
        blurb: 'New to Evair? Start here.',
    },
    {
        key: 'esim',
        title: 'Travel eSIMs',
        blurb: 'Install, activate, and use your eSIM in 200+ countries.',
    },
    {
        key: 'physical-sim',
        title: 'US physical SIMs',
        blurb: 'Setup, APN, hotspot, and data plan management.',
    },
    {
        key: 'billing',
        title: 'Billing & subscriptions',
        blurb: 'Refunds, auto-renew, payment methods, receipts.',
    },
    {
        key: 'troubleshooting',
        title: 'Troubleshooting',
        blurb: 'Slow data, no signal, activation issues.',
    },
];

export const HELP_ARTICLES: HelpArticle[] = [
    // ─── Getting started ────────────────────────────────────────────
    {
        slug: 'what-is-an-esim',
        title: 'What is an eSIM and how does it work?',
        summary:
            'eSIMs are SIM cards built into your mobile — no plastic card, no swap. Here is what changes (and what does not).',
        category: 'getting-started',
        readMinutes: 3,
        updatedAt: '2026-04-25',
        body: [
            {
                type: 'p',
                text: 'An eSIM is a digital SIM card built into your mobile, tablet, or smartwatch. Instead of inserting a physical card, you scan a QR code and your device downloads a "profile" that connects you to the carrier.',
            },
            { type: 'h2', text: 'What changes' },
            {
                type: 'ul',
                items: [
                    'No physical SIM to lose, snap, or swap.',
                    'You can install plans for multiple countries on the same mobile and switch in Settings without rebooting.',
                    'Activation takes about a minute — install at home over Wi-Fi, connect when you land.',
                    'Your existing SIM (US line, work line) stays put and keeps receiving texts.',
                ],
            },
            { type: 'h2', text: 'What stays the same' },
            {
                type: 'ul',
                items: [
                    'Your mobile needs to be unlocked — same as a physical SIM swap.',
                    'You still pay for data; the eSIM just delivers the connection.',
                    'You can still call and text on your primary line while the eSIM handles data abroad.',
                ],
            },
            {
                type: 'note',
                tone: 'info',
                text: 'Most US iPhones from XS (2018) onwards and most Pixel/Galaxy phones from 2020 onwards support eSIM. Check your mobile settings under "Cellular" or "SIM manager" — if you see "Add eSIM", you are good to go.',
            },
        ],
    },

    // ─── eSIM ───────────────────────────────────────────────────────
    {
        slug: 'install-esim-iphone',
        title: 'Install your Evair eSIM on iPhone',
        summary:
            'Step-by-step instructions to install your eSIM on iPhone XS and newer. Takes about a minute.',
        category: 'esim',
        readMinutes: 3,
        updatedAt: '2026-04-25',
        body: [
            {
                type: 'p',
                text: 'After purchasing your Evair eSIM, you will receive a QR code in the app and by email. Install it before you travel — your mobile needs Wi-Fi to download the profile, and you do not want to be standing in an airport with no signal trying to scan a QR code.',
            },
            { type: 'h2', text: 'Step-by-step' },
            {
                type: 'ol',
                items: [
                    'Open Settings → Cellular → Add eSIM.',
                    'Tap "Use QR Code" and point your iPhone\'s camera at the QR from your Evair confirmation.',
                    'Tap "Continue" when the carrier name appears.',
                    'Label your line (e.g. "Japan") so you can tell it apart from your primary US line.',
                    'Choose which line to use for data when you are abroad — pick the new Evair eSIM.',
                    'Turn on "Allow Cellular Data Switching" if you want iMessage on your US number while data routes through Evair.',
                ],
            },
            {
                type: 'note',
                tone: 'tip',
                text: 'You can install the eSIM right now and turn on "Use this line for data" only when you land. The profile sits there ready to go — Evair only starts billing the days when the line is active.',
            },
            { type: 'h2', text: 'If the QR code does not scan' },
            {
                type: 'p',
                text: 'In Settings → Cellular → Add eSIM, tap "Enter Details Manually". Open the activation email or the app, copy the SM-DP+ address and activation code, and paste them in. Same result as scanning.',
            },
        ],
    },
    {
        slug: 'install-esim-android',
        title: 'Install your Evair eSIM on Android',
        summary:
            'Pixel, Galaxy, and most modern Android phones from 2020 onwards support eSIM. Here is the install flow.',
        category: 'esim',
        readMinutes: 3,
        updatedAt: '2026-04-25',
        body: [
            {
                type: 'p',
                text: 'Android eSIM setup is similar to iPhone but the menu names vary slightly between manufacturers. The instructions below cover Pixel and Samsung Galaxy — for other Android brands look for "SIM manager" or "Mobile networks" in Settings.',
            },
            { type: 'h2', text: 'Pixel (and stock Android)' },
            {
                type: 'ol',
                items: [
                    'Open Settings → Network & Internet → SIMs.',
                    'Tap "Download a SIM instead?" or the "+" button.',
                    'Scan the QR from your Evair confirmation.',
                    'Tap "Activate" when the carrier appears.',
                ],
            },
            { type: 'h2', text: 'Samsung Galaxy' },
            {
                type: 'ol',
                items: [
                    'Open Settings → Connections → SIM manager.',
                    'Tap "Add eSIM" → "Scan QR code from service provider".',
                    'Point the camera at the QR from Evair.',
                    'Tap "Add" when prompted, then "Activate".',
                ],
            },
            {
                type: 'note',
                tone: 'warn',
                text: 'Some carrier-locked Android phones (especially older Verizon devices) ship with eSIM disabled. If "Add eSIM" is greyed out, your mobile needs to be unlocked first — contact the original carrier.',
            },
        ],
    },

    // ─── Physical SIM ───────────────────────────────────────────────
    {
        slug: 'activate-physical-sim',
        title: 'Activate your Evair physical SIM',
        summary:
            'Got an Evair SIM card from Amazon? Here is how to activate it in 60 seconds.',
        category: 'physical-sim',
        readMinutes: 2,
        updatedAt: '2026-04-25',
        body: [
            {
                type: 'p',
                text: 'Your Evair physical SIM ships pre-activated by the factory — you only need to bind it to your account so we know who it belongs to.',
            },
            { type: 'h2', text: 'Three steps' },
            {
                type: 'ol',
                items: [
                    'Visit the activation link printed on the box, or scan the QR code on the back of the package.',
                    'Sign in or create an account.',
                    'Confirm the ICCID (printed on the SIM card) and pick your plan. Done.',
                ],
            },
            {
                type: 'p',
                text: 'You can insert the SIM card into your mobile before, during, or after activation. The plan starts the first time data flows through the SIM, so a few hours of shipping or activation delay does not eat into your monthly allotment.',
            },
            {
                type: 'note',
                tone: 'info',
                text: 'No APN setup needed. Evair physical SIMs auto-configure on first connection — just pop the SIM in and wait 30 seconds.',
            },
        ],
    },
    {
        slug: 'apn-configuration',
        title: 'APN configuration (only if auto-APN fails)',
        summary:
            'Evair SIMs auto-configure their APN. If yours did not, here are the manual settings.',
        category: 'physical-sim',
        readMinutes: 2,
        updatedAt: '2026-04-25',
        body: [
            {
                type: 'p',
                text: 'In 99% of cases you do not need to set an APN — the Evair SIM tells your mobile what to use automatically. If after 5 minutes you still cannot get data, set the APN manually.',
            },
            { type: 'h2', text: 'iPhone' },
            {
                type: 'ol',
                items: [
                    'Settings → Cellular → Cellular Data Network.',
                    'Under "Cellular Data", set APN to fast.t-mobile.com.',
                    'Leave Username and Password blank.',
                    'Restart your mobile.',
                ],
            },
            { type: 'h2', text: 'Android' },
            {
                type: 'ol',
                items: [
                    'Settings → Network & Internet → SIMs → Access Point Names.',
                    'Tap "+" or "Add new APN".',
                    'Name: Evair. APN: fast.t-mobile.com. Leave everything else blank.',
                    'Save, then select Evair as the active APN.',
                ],
            },
            {
                type: 'note',
                tone: 'tip',
                text: 'Still no signal after restarting? Open a chat with us in the app — we can run a remote diagnostic on the SIM to see if it is provisioned correctly on the network side.',
            },
        ],
    },

    // ─── Billing ────────────────────────────────────────────────────
    {
        slug: 'cancel-auto-renew',
        title: 'How to cancel auto-renew',
        summary:
            'Auto-renew is opt-in and you can turn it off any time, in the app or by emailing support. Required by California SB-313.',
        category: 'billing',
        readMinutes: 2,
        updatedAt: '2026-04-25',
        body: [
            {
                type: 'p',
                text: 'Evair takes auto-renew compliance seriously. We do not enroll you without an explicit checkbox at purchase, we send a renewal reminder 3-7 days before each charge, and we let you cancel any time without penalty.',
            },
            { type: 'h2', text: 'Cancel in the app' },
            {
                type: 'ol',
                items: [
                    'Open the Evair app and go to "My SIMs".',
                    'Tap the SIM you want to manage.',
                    'Toggle "Auto-renew" to OFF.',
                    'You will keep your current plan until the end of the paid period — no proration, no clawback.',
                ],
            },
            { type: 'h2', text: 'Cancel by email' },
            {
                type: 'p',
                text: 'Email service@evairdigital.com from the address on your account, with the subject "Cancel auto-renew" and your ICCID in the body. We action these within 24 hours and reply with confirmation.',
            },
            {
                type: 'note',
                tone: 'info',
                text: 'California SB-313 requires us to make cancellation as easy as enrollment. If you ever feel like the cancel flow is harder than signing up, please tell us — that is a bug, not by design.',
            },
        ],
    },
    {
        slug: 'refund-policy',
        title: 'Refund policy and how to request a refund',
        summary:
            'When refunds apply, how to request one, and what to expect on timing.',
        category: 'billing',
        readMinutes: 3,
        updatedAt: '2026-04-25',
        body: [
            { type: 'h2', text: 'When you can get a full refund' },
            {
                type: 'ul',
                items: [
                    'Within 7 days of purchase if no data has been used (eSIM not installed, or installed but never connected).',
                    'If activation fails on our side and we cannot recover the SIM within 48 hours.',
                    'If our coverage in your destination country is materially worse than what we advertised on the country page.',
                ],
            },
            { type: 'h2', text: 'When we can offer a partial refund or credit' },
            {
                type: 'ul',
                items: [
                    'You used some data but the rest of the plan is no longer needed (e.g. trip cut short).',
                    'Auto-renew charged you within 24 hours of you turning it off — even if technically post-charge, we credit it.',
                ],
            },
            { type: 'h2', text: 'How to request' },
            {
                type: 'ol',
                items: [
                    'Open the app → Profile → Support → Request a refund.',
                    'Pick the order, select a reason, and add any context.',
                    'You get a decision within 2 business days; refunds land back on the original card in 5-10 business days.',
                ],
            },
            {
                type: 'note',
                tone: 'tip',
                text: 'Tip: if you are not sure whether your situation qualifies, just open a chat. We honor the spirit of the policy, not the letter — being good to customers is cheaper than fighting chargebacks.',
            },
        ],
    },

    // ─── Troubleshooting ────────────────────────────────────────────
    {
        slug: 'why-is-my-data-slow',
        title: 'Why is my data slow?',
        summary:
            'Three things cause "slow data": you hit your high-speed cap, you are on the wrong network, or your device is rate-limiting in the background.',
        category: 'troubleshooting',
        readMinutes: 3,
        updatedAt: '2026-04-25',
        body: [
            { type: 'h2', text: '1. You used your high-speed allotment' },
            {
                type: 'p',
                text: 'Most Evair plans are "high speed up to X GB, then slower for the rest of the month". That is not a bug — it is what keeps the price low and predictable. Open the app and check your data balance: if you used your high-speed cap, the slowdown is by design.',
            },
            {
                type: 'p',
                text: 'On mobile plans you stay at 10 Mbps after the cap (HD video and maps still work). On camera plans the speed cap is the same all month at 1.5 Mbps. On IoT plans it is 500 Kbps.',
            },
            { type: 'h2', text: '2. You are connected to the wrong network' },
            {
                type: 'p',
                text: 'Sometimes your mobile sticks to a slower 4G tower when 5G is available, or roams onto a partner network with worse coverage. Toggle Airplane Mode for 10 seconds — your mobile re-scans for the best tower.',
            },
            { type: 'h2', text: '3. Background app eating bandwidth' },
            {
                type: 'p',
                text: 'iCloud Photos uploading 4K video, a Steam download, or a podcast pre-fetching the next episode can saturate your connection. Settings → Cellular Data → check which apps used the most data this month.',
            },
            {
                type: 'note',
                tone: 'warn',
                text: 'Still slow after all three? Open a chat — we can run a remote speed test on the SIM and tell you whether the bottleneck is on our side or the local network.',
            },
        ],
    },
    {
        slug: 'no-signal-troubleshooting',
        title: 'No signal — what to try first',
        summary:
            'Six steps to fix a SIM that is not connecting, in order from quickest to slowest.',
        category: 'troubleshooting',
        readMinutes: 2,
        updatedAt: '2026-04-25',
        body: [
            {
                type: 'p',
                text: 'Try these in order — each takes less than a minute. Stop when you get signal back.',
            },
            {
                type: 'ol',
                items: [
                    'Toggle Airplane Mode for 10 seconds.',
                    'Restart the device (not just lock and unlock).',
                    'Check that the Evair line is selected for cellular data: Settings → Cellular → Cellular Data → pick the Evair line.',
                    'For physical SIMs: pop the SIM out, blow on the contacts, put it back.',
                    'For eSIMs: turn the line off and back on in Settings.',
                    'Open a chat with us — we can verify the SIM is provisioned correctly on the network side. Most "no signal" tickets are resolved in under 5 minutes.',
                ],
            },
        ],
    },
    {
        slug: 'top-up-data',
        title: 'Top up data on an existing SIM',
        summary:
            'Add more high-speed data to an SIM you already own — no need to buy a new one.',
        category: 'esim',
        readMinutes: 1,
        updatedAt: '2026-04-25',
        body: [
            {
                type: 'p',
                text: 'If you are about to hit your monthly cap or you want extra data for a busy week, top up — it is faster than buying a fresh SIM and your number / settings stay the same.',
            },
            {
                type: 'ol',
                items: [
                    'Open the app → My SIMs → tap the SIM you want to top up.',
                    'Tap "Top up" and pick a top-up package (1 GB / 5 GB / 10 GB are most common).',
                    'Pay — the new data is available within 30 seconds.',
                ],
            },
            {
                type: 'note',
                tone: 'tip',
                text: 'You can also reach the top-up flow directly via /top-up?iccid=YOUR_ICCID — handy if you want to share a link with a teammate to top up a fleet SIM.',
            },
        ],
    },
];

export function findArticle(slug: string): HelpArticle | undefined {
    return HELP_ARTICLES.find(a => a.slug === slug);
}

export function articlesByCategory(): Record<HelpCategory, HelpArticle[]> {
    const out = {
        'getting-started': [] as HelpArticle[],
        esim: [] as HelpArticle[],
        'physical-sim': [] as HelpArticle[],
        billing: [] as HelpArticle[],
        troubleshooting: [] as HelpArticle[],
    };
    for (const a of HELP_ARTICLES) out[a.category].push(a);
    return out;
}
