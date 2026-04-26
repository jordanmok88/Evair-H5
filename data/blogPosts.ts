/**
 * Blog post catalogue.
 *
 * Same content shape as help articles (re-using `ArticleBlock`) with
 * one extra: each post has an author + tag list for SEO + UI grouping.
 *
 * Editorial direction (Jordan):
 *   - Honest > clever. Compare-with-rivals posts must be fair to
 *     competitors, not slap-fights. We win by being right, not loud.
 *   - One main idea per post. If a post needs three subheadings to
 *     state its thesis, split it.
 *   - End every post with a soft CTA into the relevant Phase 2 page
 *     so readers can act immediately if they're ready.
 *
 * @see data/helpArticles.ts
 * @see views/BlogPage.tsx
 * @see docs/EVAIRSIM_ROADMAP_ZH.md §六 Phase 4 — 帮助中心+博客
 */

import type { ArticleBlock } from './helpArticles';

export type BlogTag =
    | 'travel-esim'
    | 'us-sim'
    | 'iot'
    | 'camera'
    | 'guides'
    | 'comparisons';

export interface BlogPost {
    slug: string;
    title: string;
    summary: string;
    /** Editorial author byline; can be a real person or "Evair Team". */
    author: string;
    /** ISO publish date. Used for sorting + visible "X days ago" line. */
    publishedAt: string;
    readMinutes: number;
    tags: BlogTag[];
    /** Optional single CTA link shown at the bottom of the post. */
    cta?: { label: string; href: string };
    body: ArticleBlock[];
}

export const BLOG_TAGS: { key: BlogTag; label: string }[] = [
    { key: 'travel-esim', label: 'Travel eSIM' },
    { key: 'us-sim', label: 'US SIM' },
    { key: 'iot', label: 'IoT' },
    { key: 'camera', label: 'Cameras' },
    { key: 'comparisons', label: 'Comparisons' },
    { key: 'guides', label: 'Guides' },
];

export const BLOG_POSTS: BlogPost[] = [
    {
        slug: 'best-travel-esim-japan-2026',
        title: 'The best travel eSIM for Japan in 2026',
        summary:
            'Honest breakdown of every option for staying connected in Japan — from Pocket Wi-Fi rentals to Airalo to Evair. Spoiler: pick whichever is cheapest for your length of stay.',
        author: 'Evair Team',
        publishedAt: '2026-04-25',
        readMinutes: 6,
        tags: ['travel-esim', 'guides', 'comparisons'],
        cta: { label: 'See Japan eSIM plans', href: '/travel-esim/jp' },
        body: [
            {
                type: 'p',
                text: 'Japan is the single most-searched destination for travel eSIMs out of the US, and for good reason — there is no roaming agreement that makes a US carrier plan affordable, and the country runs on data (Google Maps, Suica top-ups in Wallet, translation apps). Here is the honest breakdown of every option, what it costs, and which one to pick.',
            },
            { type: 'h2', text: 'Option 1: Pocket Wi-Fi rental at the airport' },
            {
                type: 'p',
                text: 'You rent a small Wi-Fi router at Narita / Haneda for ~¥800-1,200 per day, share it across your group. Pros: works on any device. Cons: you carry a second device that needs charging, you queue at airport pickup and drop-off, and per-day pricing makes long trips expensive ($60+ for a week).',
            },
            { type: 'h2', text: 'Option 2: Airalo eSIM' },
            {
                type: 'p',
                text: 'Around $4.50/GB on the entry plans. Solid product, well-known brand, supports a wide catalogue of countries. Their Japan plans run on SoftBank — coverage is excellent in cities, weaker in rural Hokkaido.',
            },
            { type: 'h2', text: 'Option 3: Evair Japan eSIM' },
            {
                type: 'p',
                text: 'From $4.99 for 1 GB / 7 days, scaling to ~$2/GB on the larger packs. Connects to NTT DOCOMO, SoftBank, or KDDI depending on which has the strongest signal where you are — meaningful in rural areas. The same Evair app that holds your eSIMs also holds your US SIM if you have one, so you have one place for everything.',
            },
            { type: 'h2', text: 'Option 4: T-Mobile Magenta international roaming' },
            {
                type: 'p',
                text: 'Free, but capped at 256 Kbps — barely usable for maps, useless for anything else. Fine if you genuinely just need iMessage and email. Skip if you plan to use Google Maps.',
            },
            { type: 'h2', text: 'How to choose' },
            {
                type: 'ul',
                items: [
                    'Less than 3 days, single traveller: any eSIM is fine — you cannot meaningfully save money below the $5 floor.',
                    '4-10 days, single traveller: Evair or Airalo. Evair is cheaper per GB at the 5 GB tier.',
                    'Group of 3+: Pocket Wi-Fi rental can win if you really share the device.',
                    'Rural travel (Hokkaido, Kyushu countryside): pick a plan that uses NTT DOCOMO — it has the deepest rural coverage. Evair routes to whichever is strongest at your location.',
                    'Frequent traveller: pick the eSIM with the catalogue that covers your other countries — switching apps every trip is annoying.',
                ],
            },
            {
                type: 'note',
                tone: 'tip',
                text: 'Whichever you pick, install the eSIM at home over Wi-Fi before you fly. The QR code only works once — getting locked out at Narita customs because your phone cannot reach the activation server is an avoidable kind of suffering.',
            },
        ],
    },

    {
        slug: 'iphone-international-travel-setup',
        title: 'How to set up your iPhone for international travel',
        summary:
            'A practical 10-minute checklist before you fly: eSIM install, US line settings, iMessage, banking apps, and emergency contacts.',
        author: 'Evair Team',
        publishedAt: '2026-04-23',
        readMinutes: 5,
        tags: ['travel-esim', 'guides'],
        cta: { label: 'Browse travel eSIMs', href: '/travel-esim' },
        body: [
            {
                type: 'p',
                text: 'You can do this in the 10 minutes after you finish packing. Skipping any of it usually means a frustrating first hour after you land.',
            },
            { type: 'h2', text: 'Before you leave' },
            {
                type: 'ol',
                items: [
                    'Buy and install your travel eSIM. Settings → Cellular → Add eSIM. Label the line with the country name so you can find it.',
                    'In Settings → Cellular → Cellular Data, leave your US line selected for now. Switch to the travel eSIM after you land.',
                    'Turn ON "Allow Cellular Data Switching". This lets iMessage stay on your US number while data flows over the travel eSIM — texts from family still come to your normal number.',
                    'Turn OFF "Data Roaming" on your US line. This prevents your US carrier from charging you when the travel eSIM is the active line.',
                    'Open Wallet and verify your travel cards are loaded. Apple Pay works in most major countries; cash withdrawal fees are usually higher than Apple Pay swipe fees.',
                    'Download offline Google Maps for your destination — useful if you arrive before your eSIM finishes activating.',
                ],
            },
            { type: 'h2', text: 'When you land' },
            {
                type: 'ol',
                items: [
                    'Disconnect from airport Wi-Fi (it usually fights with your cellular activation).',
                    'Settings → Cellular → Cellular Data → switch to your travel eSIM line.',
                    'Wait 30 seconds. You should see a carrier name appear in the status bar.',
                    'Open a maps app to confirm data is flowing.',
                ],
            },
            { type: 'h2', text: 'Banking and 2FA' },
            {
                type: 'p',
                text: 'US banks send 2FA codes by SMS to your US number. As long as your US line still receives texts (which it will, with the setup above), you can keep banking from abroad. If your bank uses an authenticator app, even better — set that up before you fly.',
            },
            {
                type: 'note',
                tone: 'warn',
                text: 'Some US banks (Chase, Bank of America) flag foreign IP addresses as fraud. If you can, log into your accounts before you fly and add your travel dates / destinations to reduce the chance of a freeze.',
            },
        ],
    },

    {
        slug: 'sim-card-vs-esim-explained',
        title: 'SIM card vs eSIM: what is the difference?',
        summary:
            'A 4-minute explainer covering what changes, what does not, and which one to pick if you have the choice.',
        author: 'Evair Team',
        publishedAt: '2026-04-20',
        readMinutes: 4,
        tags: ['us-sim', 'travel-esim', 'guides'],
        body: [
            {
                type: 'p',
                text: 'Both connect your phone to a carrier. The difference is whether the SIM is a piece of plastic you insert, or a profile your phone downloads.',
            },
            { type: 'h2', text: 'What is a physical SIM?' },
            {
                type: 'p',
                text: 'A small plastic card with a chip. You insert it into the SIM tray on the side of your phone. It stores the credentials that tell the network "this phone belongs to this account". To switch carriers, you swap cards.',
            },
            { type: 'h2', text: 'What is an eSIM?' },
            {
                type: 'p',
                text: 'A SIM that lives in software. Your phone downloads a "profile" from the carrier (via QR code) and that profile does the same job as the plastic card. To switch carriers, you add a new profile in Settings.',
            },
            { type: 'h2', text: 'Which should you pick?' },
            {
                type: 'ul',
                items: [
                    'Travelling internationally: eSIM. You can hold profiles for 5+ countries and switch on the fly. No SIM-tray fumbling at the airport.',
                    'Long-term US data plan: either works. Physical SIM is easier if you swap phones often (just move the card). eSIM is easier if you carry one phone for a long time.',
                    'IoT / camera / GPS device: physical SIM. Most embedded devices do not yet support eSIM.',
                    'Older phone (pre-2018): physical SIM only — your phone almost certainly does not support eSIM.',
                ],
            },
            {
                type: 'note',
                tone: 'info',
                text: 'eSIM-only devices are starting to appear (US iPhone 14 onwards). If you have one of these, you literally cannot use a physical SIM, even if you wanted to.',
            },
        ],
    },

    {
        slug: 'why-cameras-burn-data',
        title: 'Why your security camera burns through data (and how to stop it)',
        summary:
            'Trail cams and cellular security cameras can blow through 5 GB in a weekend. Here is why, and four settings that fix it.',
        author: 'Evair Team',
        publishedAt: '2026-04-18',
        readMinutes: 5,
        tags: ['camera', 'iot', 'guides'],
        cta: { label: 'See camera SIM plans', href: '/sim/camera' },
        body: [
            {
                type: 'p',
                text: 'A trail cam should comfortably run on 1-2 GB per month. If yours is hitting 5 GB and the bill is climbing, one of four things is going wrong. All of them are fixable in the camera settings — you do not need a bigger plan.',
            },
            { type: 'h2', text: '1. Sending full-resolution video instead of thumbnails' },
            {
                type: 'p',
                text: 'Most trail cams default to "thumbnail upload" (a single 100 KB still per detection) and let you pull the full clip on demand. If yours is set to "video on detection", every motion event uploads 5-15 MB. Switch to thumbnail-only and you are usually back under 1 GB per month.',
            },
            { type: 'h2', text: '2. Camera placement triggering false detections' },
            {
                type: 'p',
                text: 'A camera pointed at a road, a tree branch in the wind, or a sun-warmed surface that cools at night will trigger on noise. Each false trigger uploads. Move the camera, narrow the detection zone, or raise the sensitivity threshold.',
            },
            { type: 'h2', text: '3. "Always-on cellular" instead of "wake on motion"' },
            {
                type: 'p',
                text: 'Some cameras keep the cellular radio awake constantly so they respond instantly. The radio itself uses data even with no events (~50 MB/day in keep-alives). Switch to "wake on motion" and the camera only powers up when needed.',
            },
            { type: 'h2', text: '4. Firmware updates over cellular' },
            {
                type: 'p',
                text: 'Some camera apps push firmware updates over the cellular link by default. A single update can be 50-200 MB. Disable cellular updates in the app — manually update over Wi-Fi when you next visit the camera.',
            },
            {
                type: 'note',
                tone: 'tip',
                text: 'After tuning the four settings above, give it a week of normal use, then compare against the previous month in your Evair app. Most users drop their data use by 60-80% without losing a single real detection.',
            },
        ],
    },

    {
        slug: 'understanding-mobile-speed-caps',
        title: 'Why mobile plans have speed caps (and how to read them honestly)',
        summary:
            'Every cellular plan has a speed cap somewhere. Here is what the numbers mean, what to actually expect, and how to spot dishonest marketing.',
        author: 'Evair Team',
        publishedAt: '2026-04-15',
        readMinutes: 5,
        tags: ['guides'],
        body: [
            {
                type: 'p',
                text: 'You will see numbers like "5G up to 650 Mbps", "10 Mbps after 9 GB", "1.5 Mbps cap". Three different plans can describe themselves in three different ways while delivering nearly identical experiences. Here is how to read past the marketing.',
            },
            { type: 'h2', text: 'What a speed cap actually limits' },
            {
                type: 'p',
                text: 'Cellular networks have shared capacity at every tower. If carriers let every customer use 5G at full speed all the time, the towers would saturate and nobody would get a good experience. So every plan, including "unlimited", has some throttle that kicks in.',
            },
            { type: 'h2', text: 'What each number means in practice' },
            {
                type: 'ul',
                items: [
                    '5 Mbps — comfortable for browsing, social, email, music, HD video on a phone screen. Most people cannot tell the difference between 5 Mbps and 50 Mbps for daily use.',
                    '10 Mbps — adds 4K video on phone, fast app downloads, smooth video calls.',
                    '1.5 Mbps — works for maps, messaging, and voice calls. Streaming starts to buffer above 480p. Fine for cameras and IoT, frustrating for browsing.',
                    '500 Kbps — telemetry, GPS pings, transactions. Not browsing-grade.',
                    '256 Kbps — barely usable. T-Mobile international "free" data caps here; this is the "honest" version of "unlimited free roaming".',
                ],
            },
            { type: 'h2', text: 'Honest vs dishonest speed claims' },
            {
                type: 'p',
                text: 'Honest: "5G up to 650 Mbps. After 9 GB, you stay connected at 10 Mbps for the rest of the month." That tells you exactly what to expect.',
            },
            {
                type: 'p',
                text: 'Dishonest: "Unlimited high-speed data!" with the throttle policy buried on page 17 of the terms. The throttle exists; they just hope you do not find it before you complain.',
            },
            {
                type: 'note',
                tone: 'info',
                text: 'Our brand principle: every Evair plan states the cap above the fold, in the same font size as the headline price. If you ever see us bury a speed cap, that is a bug — please tell us.',
            },
        ],
    },
];

export function findPost(slug: string): BlogPost | undefined {
    return BLOG_POSTS.find(p => p.slug === slug);
}

/**
 * Posts sorted newest first. Memoised at module scope since the array
 * is static and sorting on every render would be wasteful.
 */
export const POSTS_NEWEST_FIRST: BlogPost[] = [...BLOG_POSTS].sort(
    (a, b) => b.publishedAt.localeCompare(a.publishedAt),
);
