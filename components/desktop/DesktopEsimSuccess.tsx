/**
 * DesktopEsimSuccess — full-page success view rendered after Stripe
 * redirects back to `/travel-esim/{country}` and `useEsimCheckoutFlow`
 * has provisioned the eSIM.
 *
 * Shows:
 *   - Big confirmation header with order ref + plan summary.
 *   - QR code (large) so the customer can scan straight from the
 *     monitor with their phone — desktop UX expects this.
 *   - Copy buttons for SM-DP+ Address, Activation Code, and full
 *     LPA string (desktop customers paste, they don't tap).
 *   - "Download QR" button — saves the QR PNG to disk in case the
 *     email is delayed or filtered.
 *   - "Email sent to {email}" affordance when the side-effect call
 *     to /api/send-esim-email succeeded.
 *   - CTA into the H5 app to manage the eSIM going forward.
 *
 * Stays mounted as long as the parent renders it; the parent reads
 * `flow.phase === 'success'` from `useEsimCheckoutFlow`.
 */

import React, { useState } from 'react';
import {
    CheckCircle2,
    Copy,
    Check,
    Download,
    Mail,
    ArrowRight,
    QrCode,
    Smartphone,
} from 'lucide-react';
import type { EsimOrderResult } from '../../types';
import type { PendingEsimOrder } from '../../hooks/useEsimCheckoutFlow';

interface DesktopEsimSuccessProps {
    result: EsimOrderResult;
    pending: PendingEsimOrder | null;
    emailSent: boolean;
}

const DesktopEsimSuccess: React.FC<DesktopEsimSuccessProps> = ({
    result,
    pending,
    emailSent,
}) => {
    const [copied, setCopied] = useState<string | null>(null);

    const copy = (value: string, key: string) => {
        navigator.clipboard.writeText(value).then(() => {
            setCopied(key);
            window.setTimeout(() => setCopied(c => (c === key ? null : c)), 2000);
        }).catch(() => { /* ignore */ });
    };

    const downloadQr = async () => {
        if (!result.qrCodeUrl) return;
        try {
            const res = await fetch(result.qrCodeUrl);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `evairsim-${result.orderNo || 'esim'}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error('[DesktopEsimSuccess] QR download failed', err);
            }
        }
    };

    return (
        <section className="px-4 md:px-8 py-12 md:py-20 max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="inline-flex w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-4">
                    <CheckCircle2 size={36} className="text-emerald-500" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
                    Your eSIM is ready
                </h1>
                <p className="text-slate-600 max-w-xl mx-auto">
                    {pending?.packageName ?? 'Your travel eSIM'} is provisioned and waiting to install.
                    {result.orderNo && (
                        <> Order reference <span className="font-semibold">{result.orderNo}</span>.</>
                    )}
                </p>
                {emailSent && pending?.email && (
                    <div className="inline-flex items-center gap-2 mt-4 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium">
                        <Mail size={14} />
                        Confirmation sent to {pending.email}
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
                {/* QR pane */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col items-center text-center">
                    <h2 className="text-lg font-bold text-slate-900 mb-1">Scan to install</h2>
                    <p className="text-sm text-slate-500 mb-5 max-w-[260px]">
                        Open Camera (iPhone) or Settings → Network on Android and point at the QR.
                    </p>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-5">
                        {result.qrCodeUrl ? (
                            <img
                                src={result.qrCodeUrl}
                                alt="QR code to install this eSIM — scan with your phone camera"
                                width={240}
                                height={240}
                                className="w-60 h-60 rounded-xl object-contain"
                            />
                        ) : (
                            <div className="w-60 h-60 rounded-xl bg-slate-900 flex items-center justify-center">
                                <QrCode size={64} className="text-white/40" />
                            </div>
                        )}
                    </div>
                    {result.qrCodeUrl && (
                        <button
                            type="button"
                            onClick={downloadQr}
                            className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800"
                        >
                            <Download size={16} />
                            Download QR
                        </button>
                    )}
                </div>

                {/* Manual install pane */}
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
                    <h2 className="text-lg font-bold text-slate-900 mb-1">
                        Or enter the codes manually
                    </h2>
                    <p className="text-sm text-slate-500 mb-5">
                        Use these on iPhone (Settings → Cellular → Add eSIM → Enter Details Manually)
                        or on Android (Settings → Network → SIM → Add eSIM → Need Help).
                    </p>

                    <CopyRow
                        label="SM-DP+ Address"
                        value={result.smdpAddress}
                        copied={copied === 'smdp'}
                        onCopy={() => copy(result.smdpAddress, 'smdp')}
                    />
                    <CopyRow
                        label="Activation Code"
                        value={result.activationCode}
                        copied={copied === 'ac'}
                        onCopy={() => copy(result.activationCode, 'ac')}
                    />
                    <CopyRow
                        label="Full LPA String"
                        value={result.lpaString}
                        copied={copied === 'lpa'}
                        onCopy={() => copy(result.lpaString, 'lpa')}
                        mono
                    />

                    {result.iccid && (
                        <p className="text-xs text-slate-400 mt-4">
                            ICCID: <span className="font-mono">{result.iccid}</span>
                        </p>
                    )}
                </div>
            </div>

            {/* What next */}
            <div className="mt-10 grid md:grid-cols-2 gap-4">
                <NextCard
                    icon={<Smartphone size={20} className="text-orange-500" />}
                    title="Install before you fly"
                    body="Connect to Wi-Fi and install the eSIM now. It only activates on first data use abroad — your validity countdown won't start until then."
                />
                <NextCard
                    icon={<ArrowRight size={20} className="text-orange-500" />}
                    title="Manage in the app"
                    body="Track usage, top up, or buy another country's plan from your dashboard."
                    cta={{
                        label: 'Open my dashboard',
                        href: result.iccid
                            ? `/app/my-sims?iccid=${encodeURIComponent(result.iccid)}`
                            : '/app/my-sims',
                    }}
                />
            </div>
        </section>
    );
};

const CopyRow: React.FC<{
    label: string;
    value: string;
    copied: boolean;
    onCopy: () => void;
    mono?: boolean;
}> = ({ label, value, copied, onCopy, mono }) => (
    <div
        className={`rounded-xl p-4 mb-3 border transition-colors ${
            copied
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-slate-50 border-slate-100 hover:border-slate-200'
        }`}
    >
        <p className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
            {label}
        </p>
        <button
            type="button"
            onClick={onCopy}
            className="w-full flex items-center justify-between gap-3 text-left"
        >
            <code
                className={`text-slate-900 ${mono ? 'font-mono text-sm' : 'font-mono text-sm'} break-all`}
            >
                {value || '—'}
            </code>
            <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold">
                {copied ? (
                    <>
                        <Check size={14} className="text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                    </>
                ) : (
                    <>
                        <Copy size={14} className="text-orange-600" />
                        <span className="text-orange-600">Copy</span>
                    </>
                )}
            </span>
        </button>
    </div>
);

const NextCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    body: string;
    cta?: { label: string; href: string };
}> = ({ icon, title, body, cta }) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
            {icon}
        </div>
        <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-3">{body}</p>
        {cta && (
            <a
                href={cta.href}
                className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:underline"
            >
                {cta.label} <ArrowRight size={14} />
            </a>
        )}
    </div>
);

export default DesktopEsimSuccess;
