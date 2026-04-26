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

export interface DeviceContent {
    category: DeviceCategory;
    /** Bold hero verb-noun ("Mobile data for your phone"). */
    heroTitle: string;
    /** One-sentence subhead — keep under 120 chars for above-the-fold. */
    heroSubtitle: string;
    /** Speed up-front so SEO + customer expectations align ("5G, up to 650 Mbps"). */
    speedHeadline: string;
    /** What happens after the high-speed allotment runs out. Be explicit. */
    throttleNote: string;
    /** Three short brand pillars under the hero. */
    pillars: { icon: LucideIcon; title: string; body: string }[];
    /** Devices the plan is built for. */
    devices: { icon: LucideIcon; label: string }[];
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
        heroTitle: 'US 5G data for your phone, tablet, or hotspot',
        heroSubtitle:
            'Real 5G on AT&T, Verizon, and T-Mobile. Bring your iPhone, Android, iPad, or pocket Wi-Fi — plug-and-use in minutes, no contract. Data-only.',
        speedHeadline: '5G, up to 200 Mbps',
        throttleNote:
            'First 5 GB at top 5G speeds. After that you stay connected at lower speed for the remainder of the cycle — fast enough for maps, messaging, and standard-def video. We never cut you off.',
        pillars: [
            {
                icon: Wifi,
                title: 'Real 5G coverage',
                body: 'AT&T, Verizon, and T-Mobile via PCCW. Same towers as the big carriers, no APN workaround.',
            },
            {
                icon: Smartphone,
                title: 'Plug & use',
                body: 'Drop the SIM into any unlocked phone, tablet, or hotspot. APN auto-configures on first boot — no setup screens.',
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
            { icon: Wifi, label: 'Pocket Wi-Fi / hotspot' },
        ],
        plans: [
            {
                name: 'Starter',
                priceUsd: '9.99',
                summary: '3 GB high-speed + unlimited 10 Mbps',
            },
            {
                name: 'Everyday',
                priceUsd: '19.99',
                summary: '9 GB high-speed + unlimited 10 Mbps',
                highlight: true,
            },
            {
                name: 'Power',
                priceUsd: '29.99',
                summary: '20 GB high-speed + unlimited 10 Mbps',
            },
        ],
        faq: [
            {
                q: 'Will my iPhone or Android work?',
                a: 'Yes — any unlocked phone from the last 5 years that supports US 5G/LTE bands (AT&T, Verizon, T-Mobile). Carrier-locked phones need to be unlocked first.',
            },
            {
                q: 'Does this include voice, SMS, or a US phone number?',
                a: 'No. EvairSIM is a data-only service — there is no US phone number, no voice calls, and no SMS over the cellular network. For calls and messaging, use WhatsApp, FaceTime, iMessage, Google Voice, or any other VoIP app over data or Wi-Fi. This is what keeps the price at $9.99/mo.',
            },
            {
                q: 'What happens after I use my high-speed data?',
                a: 'You stay online — speeds drop for the rest of the cycle but you can still load maps, send messages, and stream standard-def video. We never cut you off.',
            },
            {
                q: 'Can I use my phone as a hotspot?',
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
            { icon: Camera, label: 'Security cameras' },
            { icon: Camera, label: 'Trail / hunting cameras' },
            { icon: Shield, label: 'Outdoor monitors' },
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
                a: 'Yes. We verify each camera model on the T-Mobile bands. Pop the SIM in, the camera connects, no APN setup — our PCCW SIMs auto-configure.',
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
                body: 'PCCW MVNO on T-Mobile towers. Auto-APN means most devices connect on first boot.',
            },
        ],
        devices: [
            { icon: Map, label: 'GPS trackers' },
            { icon: Watch, label: 'Smartwatches' },
            { icon: BookOpen, label: 'E-readers (Kindle, Boox)' },
            { icon: Radio, label: 'Walkie-talkies' },
            { icon: CreditCard, label: 'POS terminals' },
            { icon: Wrench, label: 'Robotic mowers' },
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
