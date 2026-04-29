/**
 * Content for Phase 2 device-category SEO landing pages.
 *
 * Each category has a static content block so the page is fully
 * server-renderable (and therefore crawlable). Plans listed here are
 * the **public price tiers** Marketing wants to advertise — the
 * actual catalogue still lives in Laravel, and the CTA buttons funnel
 * users into the H5 app where they pick a real package.
 *
 * Brand principle (Jordan): **honest pricing = fewer refunds = more
 * profit**. Speed caps and throttling behaviour are stated up front,
 * not buried in fine print. Don't soften the speed numbers here.
 *
 * @see docs/EVAIRSIM_ROADMAP_ZH.md §四 Phase 2 — 设备分类落地页
 */

import type { LucideIcon } from 'lucide-react';
import {
    Smartphone,
    Tablet,
    Wifi,
    Camera,
    Compass,
    Shield,
    Watch,
    BookOpen,
    CreditCard,
    Radio,
    Map,
    DollarSign,
    Wrench,
} from 'lucide-react';
import type { DeviceCategory } from '../utils/routing';

export interface DevicePlan {
    /** Marketing label (e.g. "Starter"). */
    name: string;
    /** Monthly USD price as a string so Marketing can use "9.99" without rounding. */
    priceUsd: string;
    /** What the customer gets (data + speed). */
    summary: string;
    /** Flagship plans render with extra emphasis. */
    highlight?: boolean;
}

export interface DeviceFAQ {
    q: string;
    a: string;
}

/** One row in “Built for” grids (camera / IoT). Icons stay for SSR fallbacks and a11y. */
export interface DeviceCatalogItem {
    icon: LucideIcon;
    label: string;
    /** Premium stock product shot — shown instead of plain icon tiles on device landings only.
     * Prefer self-hosted **`/marketing/device-built-for/cell-NN.png`** (brand PNG photography for clarity). */
    productPhotoUrl?: string;
    productPhotoAlt?: string;
    /** Passed to `object-position` (e.g. `"72% 48%"`) so the hero subject stays centred in the crop when using wide shots in tall cards. */
    productPhotoObjectPosition?: string;
}

/**
 * US carrier price comparison (phone page only; estimates + disclaimers).
 * Keep ranges conservative — legal prefers footnotes to exact competitor quotes.
 */
export interface PhoneCarrierComparison {
    sectionId: string;
    headline: string;
    subhead: string;
    asOf: string;
    tableCaption: string;
    /** Evair + AT&T + Verizon only (no T‑Mobile column). */
    rows: { label: string; evair: string; att: string; verizon: string }[];
    /** Optional short follow-ups; keep empty for a minimal block. */
    takeaways: string[];
    methodNote: string;
}

export interface DeviceContent {
    category: DeviceCategory;
    /** Phone only: table comparing Evair to major US carriers (est.). */
    carrierComparison?: PhoneCarrierComparison;
    /** Bold hero verb-noun ("US 5G data for your mobile"). */
    heroTitle: string;
    /** One-sentence subhead — keep under 120 chars for above-the-fold. */
    heroSubtitle: string;
    /** Speed up-front so SEO + customer expectations align ("5G, up to 650 Mbps"). */
    speedHeadline: string;
    /** What happens after the high-speed allotment runs out. Be explicit. */
    throttleNote: string;
    /** Three short brand pillars under the hero. */
    pillars: { icon: LucideIcon; title: string; body: string }[];
    /** Devices the plan is built for (see `DeviceCatalogItem`). */
    devices: DeviceCatalogItem[];
    /** Up to 3 advertised plans. */
    plans: DevicePlan[];
    /** Short SEO FAQ — also kept as the questions support hears most. */
    faq: DeviceFAQ[];
    /** Where the primary CTA points (always inside the H5 app). */
    ctaHref: string;
    /** Verb on the primary CTA ("Get a phone plan"). */
    ctaLabel: string;
}

export const DEVICE_CONTENT: Record<DeviceCategory, DeviceContent> = {
    phone: {
        category: 'phone',
        carrierComparison: {
            sectionId: 'carrier-comparison',
            headline: 'Honest pricing vs. full-service carriers',
            subhead:
                'US mobile and tablet data on AT&T and Verizon only. Data layer only — no talk, text, or U.S. number — lower monthly outlay than a typical full-service line.',
            asOf: 'April 2026 · Before taxes & fees',
            tableCaption: 'Quick read — Evair (data) vs. retail plans (illustrative est.)',
            rows: [
                {
                    label: 'Typical monthly, 1 line (est.)',
                    evair: '$16.99–$49.99 data-only (see plan cards below)',
                    att: '≈ $50–$75 (talk + data)',
                    verizon: '≈ $55–$80 (talk + data)',
                },
                {
                    label: 'US mobile number, talk & text',
                    evair: 'Not included (VoIP & Wi‑Fi calling OK)',
                    att: 'Included on smartphone lines',
                    verizon: 'Included on smartphone lines',
                },
                {
                    label: 'After your high-speed GB',
                    evair: 'Unlimited at 256 Kbps (stated in app)',
                    att: 'Varies; “unlimited” + deprioritization per plan',
                    verizon: 'Varies; “unlimited” + deprioritization per plan',
                },
            ],
            takeaways: [],
            methodNote:
                'AT&T and Verizon est. = typical published smartphone-line ranges before add-ons; your checkout may differ. Confirm on att.com and verizon.com. Evair prices match the tiers in the app.',
        },
        heroTitle: 'US 5G data for your mobile, tablet, or hotspot',
        heroSubtitle:
            'Real 5G on AT&T and Verizon. Plug-and-use in minutes, no contract. Data-only.',
        speedHeadline: '5G, up to 200 Mbps',
        throttleNote:
            'You get a set amount of 5G/LTE at full speed, then unlimited data at 256 Kbps for the rest of the cycle — we never hard-cut you off. Exact GB per plan is in the app.',
        pillars: [
            {
                icon: Wifi,
                title: 'Real 5G coverage',
                body: 'AT&T and Verizon on our US network — same air interface as the big brands, with auto-APN. No T-Mobile profile on this product line.',
            },
            {
                icon: Smartphone,
                title: 'Plug & use',
                body: 'Drop the SIM into any unlocked mobile, tablet, or hotspot. APN auto-configures on first boot — no setup screens.',
            },
            {
                icon: Shield,
                title: 'No contract',
                body: 'Pay monthly. Cancel anytime in the app. No SSN, no credit check, no shutoff fees.',
            },
        ],
        devices: [
            { icon: Smartphone, label: 'iPhone & Android' },
            { icon: Tablet, label: 'iPad & Android tablet' },
            { icon: Wifi, label: 'Pocket Wi‑Fi / hotspot' },
        ],
        plans: [
            {
                name: 'Starter',
                priceUsd: '16.99',
                summary: '5 GB high-speed + unlimited 256 Kbps (AT&T & Verizon)',
            },
            {
                name: 'Everyday',
                priceUsd: '29.99',
                summary: '10 GB high-speed + unlimited 256 Kbps (AT&T & Verizon)',
                highlight: true,
            },
            {
                name: 'Power',
                priceUsd: '49.99',
                summary: '20 GB high-speed + unlimited 256 Kbps (AT&T & Verizon)',
            },
        ],
        faq: [
            {
                q: 'Will my iPhone or Android work?',
                a: 'Yes — on unlocked phones with AT&T- or Verizon-compatible US bands. Carrier-locked phones need to be unlocked first.',
            },
            {
                q: 'Does this include voice, SMS, or a US phone number?',
                a: 'No. This is a data-only service. Use Wi‑Fi calling, FaceTime, WhatsApp, Google Voice, and other apps over the data connection. No US cellular number is included — that is why monthly prices stay low.',
            },
            {
                q: 'What happens after I use my high-speed data?',
                a: 'You keep unlimited data at 256 Kbps until the next billing cycle — enough for light maps and messaging, not for HD video. We do not hard-cut you off.',
            },
            {
                q: 'Can I use my mobile as a hotspot?',
                a: 'Yes. Tethering is included on all plans, capped to your remaining high-speed allotment.',
            },
        ],
        ctaHref: '/app',
        ctaLabel: 'Get a data plan',
    },

    camera: {
        category: 'camera',
        heroTitle: 'A SIM built for security & trail cameras',
        heroSubtitle:
            'Low-cost monthly data for cellular cameras. Engineered for stable uploads, not high-res streaming.',
        speedHeadline: 'Up to 1.5 Mbps',
        throttleNote:
            'Speed is intentionally capped at 1.5 Mbps to keep the price low. That handles motion-triggered photo and SD video uploads to apps like Reolink, SPYPOINT, and Tactacam — but it is not designed for live 4K streaming.',
        pillars: [
            {
                icon: Camera,
                title: 'Tested with the camera you use',
                body: 'Reolink, SPYPOINT, Tactacam, Moultrie, Wyze cellular — verified to upload reliably.',
            },
            {
                icon: DollarSign,
                title: 'Fraction of the cost',
                body: 'Why pay $29/mo for unlimited speed you do not need? Built for the camera workload.',
            },
            {
                icon: Shield,
                title: 'No throttle surprises',
                body: 'The speed cap is the same for the whole month. No "first 5 GB then dial-up" trick.',
            },
        ],
        devices: [
            {
                icon: Camera,
                label: 'Security cameras',
                productPhotoUrl: '/marketing/device-built-for/cell-07.png',
                productPhotoAlt:
                    'White dome security camera mounted under exterior eaves with wireless antenna',
                productPhotoObjectPosition: '76% 48%',
            },
            {
                icon: Camera,
                label: 'Trail / hunting cameras',
                productPhotoUrl: '/marketing/device-built-for/cell-08.png',
                productPhotoAlt:
                    'Camouflaged trail camera mounted on a tree trunk in a forest setting',
                productPhotoObjectPosition: '52% 48%',
            },
            {
                icon: Shield,
                label: 'Outdoor monitors',
                productPhotoUrl: '/marketing/device-built-for/cell-09.png',
                productPhotoAlt:
                    'Field IoT telemetry box on a pole with solar panel displaying soil moisture and connectivity status',
                productPhotoObjectPosition: '68% 46%',
            },
        ],
        plans: [
            {
                name: 'Cam Light',
                priceUsd: '4.99',
                summary: '500 MB / month at 1.5 Mbps',
            },
            {
                name: 'Cam Standard',
                priceUsd: '8.99',
                summary: '2 GB / month at 1.5 Mbps',
                highlight: true,
            },
            {
                name: 'Cam Pro',
                priceUsd: '14.99',
                summary: '5 GB / month at 1.5 Mbps',
            },
        ],
        faq: [
            {
                q: 'Will it work with my SPYPOINT / Reolink / Tactacam camera?',
                a: 'Yes. We verify each camera model on the T-Mobile bands. Pop the SIM in, the camera connects, no APN setup — Evair SIMs auto-configure.',
            },
            {
                q: 'Why is the speed capped at 1.5 Mbps?',
                a: 'Cameras upload short photo and clip files — they do not need 5G. Capping the speed lets us sell the plan for $4.99 instead of $30. If you need higher upload speeds, look at our phone plans instead.',
            },
            {
                q: 'What if my camera stops uploading?',
                a: 'Check the data balance in the app. If you are within your monthly cap and still see issues, our 24/7 support can run a remote diagnostic on the SIM.',
            },
            {
                q: 'Is there a contract?',
                a: 'No. Pay monthly, cancel any time. Auto-renew is opt-in (not opt-out).',
            },
        ],
        ctaHref: '/app',
        ctaLabel: 'Get a camera SIM',
    },

    iot: {
        category: 'iot',
        heroTitle: 'Low-bandwidth SIMs for IoT & smart devices',
        heroSubtitle:
            'GPS trackers, smartwatches, e-readers, walkie-talkies, mowers, POS terminals — devices that need to be online but not fast.',
        speedHeadline: 'Up to 500 Kbps',
        throttleNote:
            'Tuned for tiny periodic uploads (location pings, sensor data, transactions). Not suitable for streaming or browsing — for that, use our phone plans.',
        pillars: [
            {
                icon: Compass,
                title: 'Built for telemetry',
                body: 'Designed for devices that talk in kilobytes, not gigabytes. Battery-friendly.',
            },
            {
                icon: DollarSign,
                title: 'Pennies per device',
                body: 'Run a fleet of trackers without burning your budget on per-device unlimited plans.',
            },
            {
                icon: Shield,
                title: 'US coverage, no APN',
                body: 'US coverage on major T-Mobile towers. Auto-APN means most devices connect on first boot.',
            },
        ],
        devices: [
            {
                icon: Map,
                label: 'GPS trackers',
                productPhotoUrl: '/marketing/device-built-for/cell-01.png',
                productPhotoAlt:
                    'Golden retriever on lawn wearing a collar with a rectangular GPS collar module',
                productPhotoObjectPosition: '44% 46%',
            },
            {
                icon: Watch,
                label: 'Smartwatches',
                productPhotoUrl: '/marketing/device-built-for/cell-02.png',
                productPhotoAlt: 'Wrist wearing a smartwatch displaying a navigation map outdoors',
                productPhotoObjectPosition: '50% 48%',
            },
            {
                icon: BookOpen,
                label: 'E-readers (Kindle, Boox)',
                productPhotoUrl: '/marketing/device-built-for/cell-03.png',
                productPhotoAlt:
                    'Hands holding an e-ink tablet reader showing a book page indoors',
                productPhotoObjectPosition: '50% 48%',
            },
            {
                icon: Radio,
                label: 'Walkie-talkies',
                productPhotoUrl: '/marketing/device-built-for/cell-04.png',
                productPhotoAlt:
                    'Rugged LTE handheld radio with display and antenna held on a construction site',
                productPhotoObjectPosition: '50% 46%',
            },
            {
                icon: CreditCard,
                label: 'POS terminals',
                productPhotoUrl: '/marketing/device-built-for/cell-05.png',
                productPhotoAlt:
                    'Handheld touchscreen POS terminal showing a successful payment in a café',
                productPhotoObjectPosition: '50% 48%',
            },
            {
                icon: Wrench,
                label: 'Robotic mowers',
                productPhotoUrl: '/marketing/device-built-for/cell-06.png',
                productPhotoAlt: 'Robotic lawn mower trimming a manicured backyard lawn',
                productPhotoObjectPosition: '50% 50%',
            },
        ],
        plans: [
            {
                name: 'IoT Mini',
                priceUsd: '2.99',
                summary: '100 MB / month at 500 Kbps',
            },
            {
                name: 'IoT Standard',
                priceUsd: '4.99',
                summary: '500 MB / month at 500 Kbps',
                highlight: true,
            },
            {
                name: 'IoT Fleet',
                priceUsd: '9.99',
                summary: '2 GB / month at 500 Kbps',
            },
        ],
        faq: [
            {
                q: 'Will my GPS tracker / smartwatch work?',
                a: 'If it accepts a standard SIM card and supports a US T-Mobile band, yes. Most modern IoT and wearable devices do. APN auto-configures on first power-on.',
            },
            {
                q: 'Why is the speed capped at 500 Kbps?',
                a: 'IoT devices send tiny periodic packets. Capping the speed keeps the price below $5/mo. If you need browsing or streaming, our phone or camera plans are a better fit.',
            },
            {
                q: 'Can I manage a fleet of SIMs?',
                a: 'Yes. Bulk activation and per-SIM dashboards are included. Email service@evairdigital.com for fleet pricing above 50 SIMs.',
            },
            {
                q: 'Is there a contract?',
                a: 'No. Pay monthly, cancel any time. Auto-renew is opt-in (not opt-out).',
            },
        ],
        ctaHref: '/app',
        ctaLabel: 'Get an IoT SIM',
    },
};
