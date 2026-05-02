/**
 * LegalPage — renders Terms, Privacy, and Refund policy at
 * `/legal/{terms|privacy|refund}`.
 *
 * Why a single component: all three documents share identical chrome
 * (header, footer, prose typography, "last updated" stamp) and the
 * routing table already enforces the slug union — so a switch on slug
 * keeps the surface area small and lets us promote any of them to a
 * dedicated component later without disturbing the others.
 *
 * Content stance: the body text is a deliberately conservative starting
 * point that satisfies (a) Stripe live-mode link requirements and (b)
 * California / EU baseline disclosure expectations. The legal team
 * should replace each section with their final wording before we
 * advertise the URLs externally — every section ends with a contact
 * line so a confused user always has somewhere to go.
 *
 * Refund slug specifically defers to `/help/refund-policy`, which we
 * already maintain as the single source of truth for refund mechanics
 * — the page links there prominently and only summarises the policy
 * to keep both surfaces from drifting.
 */

import React from 'react';
import SiteHeader from '../components/marketing/SiteHeader';
import SiteFooter from '../components/marketing/SiteFooter';
import { CUSTOMER_SERVICE_EMAIL } from '../constants';
import type { LegalSlug } from '../utils/routing';
import { applyPageSeo } from '../utils/seoHead';

const LAST_UPDATED = 'April 25, 2026';

interface LegalPageProps {
    slug: LegalSlug;
}

const LegalPage: React.FC<LegalPageProps> = ({ slug }) => {
    const meta = META[slug];

    React.useEffect(() => {
        applyPageSeo({
            path: `/legal/${slug}`,
            title: `${meta.title} — Evair`,
            description: meta.description,
        });
    }, [meta.description, meta.title, slug]);

    return (
        <div className="min-h-screen bg-white text-slate-800">
            <SiteHeader />
            <main className="max-w-3xl mx-auto px-4 md:px-8 py-10 md:py-16">
                <header className="mb-8">
                    <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
                        Legal
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                        {meta.title}
                    </h1>
                    <p className="text-sm text-slate-500">
                        Last updated: {LAST_UPDATED}
                    </p>
                </header>

                <article className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-orange-600">
                    {slug === 'terms' && <TermsBody />}
                    {slug === 'privacy' && <PrivacyBody />}
                    {slug === 'refund' && <RefundBody />}
                </article>

                <footer className="mt-12 pt-8 border-t border-slate-200 text-sm text-slate-500">
                    Questions? Email{' '}
                    <a
                        href={`mailto:${CUSTOMER_SERVICE_EMAIL}`}
                        className="text-orange-600 hover:underline"
                    >
                        {CUSTOMER_SERVICE_EMAIL}
                    </a>{' '}
                    and a real human will get back to you within one business day.
                </footer>
            </main>
            <SiteFooter />
        </div>
    );
};

const META: Record<LegalSlug, { title: string; description: string }> = {
    terms: {
        title: 'Terms of Service',
        description: 'Terms governing EvairSIM eSIM and US physical SIM data services, accounts, billing, and acceptable use.',
    },
    privacy: {
        title: 'Privacy Policy',
        description: 'How Evair Digital collects, uses, and protects personal data when you use evairdigital.com and the Evair app.',
    },
    refund: {
        title: 'Refund Policy',
        description: 'Summary of refund eligibility for EvairSIM purchases, with a link to the detailed help-centre policy.',
    },
};

// ─────────────────────────────────────────────────────────────────────
// Body components — kept local to this file because they're the only
// place this content lives. Promote to /data when we want to translate.
// ─────────────────────────────────────────────────────────────────────

const TermsBody: React.FC = () => (
    <>
        <p>
            These Terms of Service ("Terms") govern your use of Evair
            Digital, Inc.'s eSIM and physical SIM services, including the
            evairdigital.com website, the Evair mobile app, and any data
            plan you purchase through us (together, the "Service"). By
            creating an account, activating a SIM, or making a purchase,
            you agree to be bound by these Terms.
        </p>

        <h2>1. Eligibility</h2>
        <p>
            You must be at least 18 years old (or the age of majority in
            your jurisdiction) and able to form a binding contract. You
            agree to provide accurate account information and keep it
            current.
        </p>

        <h2>2. Service description</h2>
        <p>
            Evair resells mobile data services from upstream carriers and
            aggregators. Coverage, speeds, and supported networks vary by
            destination and device — the catalogue page for each plan
            lists the carriers we route through at the time of purchase.
            We do not guarantee availability of any specific carrier or
            speed tier, and supported networks may change as upstream
            agreements change.
        </p>

        <h2>3. Auto-renewal</h2>
        <p>
            Some plans renew automatically. You can turn auto-renewal on
            or off at any time from <a href="/app#profile">your account</a>.
            When auto-renewal is on, we will (a) email you a confirmation
            with a one-click cancel link within 24 hours of activation,
            (b) email you again before each renewal charge, and (c) only
            charge the amount disclosed at the time you opted in. You may
            cancel at any time before the renewal posts to receive no
            further charges.
        </p>

        <h2>4. Acceptable use</h2>
        <p>
            You agree not to use the Service for unlawful activity,
            spam, harassment, or in violation of any carrier's
            acceptable-use policy. We may suspend or terminate access if
            we detect activity that materially harms our network or
            other customers. Where lawful, we will give you notice and a
            chance to cure before suspension.
        </p>

        <h2>5. Payment and pricing</h2>
        <p>
            Prices are listed in US dollars and exclude any local tax
            unless stated otherwise. We process payments through Stripe;
            by paying, you also accept Stripe's terms for payment
            processing.
        </p>

        <h2>6. Refunds</h2>
        <p>
            See the dedicated <a href="/legal/refund">Refund Policy</a> for
            when refunds apply and how to request one.
        </p>

        <h2>7. Disclaimers</h2>
        <p>
            The Service is provided on an "as is" and "as available"
            basis. To the maximum extent allowed by law, Evair disclaims
            all warranties, express or implied, including merchantability,
            fitness for a particular purpose, and non-infringement.
        </p>

        <h2>8. Limitation of liability</h2>
        <p>
            To the maximum extent allowed by law, Evair's total liability
            for any claim arising out of or relating to the Service is
            limited to the amount you paid us in the 12 months preceding
            the event giving rise to the claim. We are not liable for
            indirect or consequential damages.
        </p>

        <h2>9. Changes</h2>
        <p>
            We may update these Terms from time to time. Material changes
            will be communicated by email or in-app notice at least 30
            days before they take effect. Continued use of the Service
            after the effective date constitutes acceptance.
        </p>

        <h2>10. Governing law</h2>
        <p>
            These Terms are governed by the laws of the State of
            California, without regard to its conflict of laws principles.
            Any dispute will be brought in state or federal courts located
            in San Francisco County, California.
        </p>
    </>
);

const PrivacyBody: React.FC = () => (
    <>
        <p>
            This Privacy Policy describes how Evair Digital, Inc.
            ("Evair", "we", "us") collects, uses, and shares information
            when you use our website, mobile app, and data services
            (together, the "Service").
        </p>

        <h2>1. What we collect</h2>
        <ul>
            <li>
                <strong>Account information</strong> — your email, name,
                password hash, and phone number if you provide one.
            </li>
            <li>
                <strong>Order information</strong> — ICCIDs, plan
                selections, billing address, and the last 4 digits of the
                card you paid with (we do not store full card numbers;
                Stripe holds those).
            </li>
            <li>
                <strong>Usage information</strong> — data consumption per
                SIM, time of activation, device model where the SIM is
                installed (when reported by the upstream carrier), and
                support conversations.
            </li>
            <li>
                <strong>Technical information</strong> — IP address,
                browser type, device identifiers, and log data we collect
                automatically when you use the Service.
            </li>
        </ul>

        <h2>2. How we use it</h2>
        <p>
            We use this information to provision your SIM, process
            payments, prevent fraud, provide support, send service
            announcements (always with an unsubscribe link for marketing),
            and improve the Service. We do not sell your personal
            information.
        </p>

        <h2>3. Sharing</h2>
        <p>
            We share information with: (a) upstream carriers and
            aggregators required to provision and bill your SIM, (b)
            payment processors (Stripe), (c) service providers we hire to
            help operate the Service (email delivery, error monitoring,
            analytics), and (d) law enforcement when legally required.
            Service providers are contractually limited to using your
            information only to perform their service for us.
        </p>

        <h2>4. Your rights</h2>
        <p>
            Depending on where you live, you may have rights to access,
            correct, export, or delete your information; to opt out of
            certain processing; and to lodge a complaint with a privacy
            regulator. Email{' '}
            <a href={`mailto:${CUSTOMER_SERVICE_EMAIL}`}>{CUSTOMER_SERVICE_EMAIL}</a> with
            your request and we will respond within 30 days.
        </p>

        <h2>5. California residents (CCPA / CPRA)</h2>
        <p>
            We do not sell or share your personal information for
            cross-context behavioural advertising. You can request a
            disclosure of the categories of personal information we have
            collected about you in the past 12 months and request
            deletion subject to the exceptions in California law.
        </p>

        <h2>6. Children</h2>
        <p>
            The Service is not directed to children under 13. We do not
            knowingly collect information from children under 13.
        </p>

        <h2>7. Retention</h2>
        <p>
            We retain account and order records for as long as necessary
            to provide the Service and to meet our tax, accounting, and
            anti-fraud obligations — typically 7 years after the last
            interaction. You can request earlier deletion subject to
            those obligations.
        </p>

        <h2>8. Changes</h2>
        <p>
            We will post any changes to this policy here and update the
            "Last updated" date. Material changes will additionally be
            sent by email or in-app notice.
        </p>
    </>
);

const RefundBody: React.FC = () => (
    <>
        <p>
            We want you to be happy with your eSIM or SIM purchase. The
            short version: if you have not yet activated your plan, you
            can request a full refund within 14 days of purchase. After
            activation, refunds are case-by-case based on what was
            consumed and whether the issue is on our side or the carrier's.
        </p>

        <h2>Full refund — eligible cases</h2>
        <ul>
            <li>You have not yet activated the eSIM/SIM, and the order is less than 14 days old.</li>
            <li>We provisioned the wrong plan, country, or duration.</li>
            <li>The destination network is unavailable for an extended period due to an outage on our side.</li>
        </ul>

        <h2>Partial refund or credit — typical cases</h2>
        <ul>
            <li>You activated the plan but the connection failed because of a device/setting issue we could have flagged earlier.</li>
            <li>The plan worked but you used materially less than expected and contacted us within 7 days of activation.</li>
        </ul>

        <h2>Not eligible</h2>
        <ul>
            <li>The plan was used as expected.</li>
            <li>The issue is local coverage in a remote area where the underlying carrier doesn't have service.</li>
            <li>The request comes more than 30 days after activation.</li>
        </ul>

        <h2>How to request</h2>
        <ol>
            <li>Open the app → Profile → Support → Request a refund. <em>Or</em> email <a href={`mailto:${CUSTOMER_SERVICE_EMAIL}`}>{CUSTOMER_SERVICE_EMAIL}</a> with your order ID.</li>
            <li>You'll get a decision within 2 business days.</li>
            <li>Approved refunds land back on the original card in 5–10 business days.</li>
        </ol>

        <p>
            For the deeper version (with plain-English examples and
            screenshots) see the help-center article:{' '}
            <a href="/help/refund-policy">Refund policy and how to request a refund</a>.
        </p>
    </>
);

export default LegalPage;
