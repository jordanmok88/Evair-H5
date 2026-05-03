import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, SwitchCamera } from 'lucide-react';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
  /** Restrict symbologies (e.g. QR-only for link-eSIM flow). Default: ICCID_SCAN_FORMATS. */
  formatsToSupport?: Html5QrcodeSupportedFormats[];
  /** i18n key for header title. */
  titleKey?: string;
  /** i18n key for bottom hint. */
  hintKey?: string;
}

/**
 * Pull ICCID from linear barcode text, QR payload, or URL query (`?iccid=`).
 * Matches app routing: 15–22 ASCII alphanumerics after normalising separators.
 * GSMA LPA strings may embed an 18–22 digit ICCID substring — we try digit runs after `LPA:`.
 */
export function extractIccidFromScan(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const alnumOnly = (s: string) => s.replace(/[^0-9A-Za-z]/g, '');

  const inRange = (s: string): string | null => {
    const c = alnumOnly(s);
    if (c.length >= 15 && c.length <= 22) return c;
    return null;
  };

  if (/^LPA:/i.test(trimmed)) {
    const digitRuns = trimmed.match(/\d{18,22}/g);
    if (digitRuns) {
      for (const run of digitRuns) {
        const hit = inRange(run);
        if (hit) return hit;
      }
    }
  }

  const param = /[?&#]iccid=([0-9A-Za-z]+)/i.exec(trimmed)?.[1];
  if (param) {
    const hit = inRange(param);
    if (hit) return hit;
  }

  try {
    const u = new URL(trimmed, 'https://evairdigital.com');
    const q = u.searchParams.get('iccid');
    if (q) {
      const hit = inRange(q);
      if (hit) return hit;
    }
  } catch {
    /* not a navigable URL */
  }

  const compact = alnumOnly(trimmed);
  if (compact.length >= 15 && compact.length <= 22) {
    return compact;
  }
  if (compact.length < 15) {
    return null;
  }
  for (let len = 22; len >= 15; len--) {
    for (let i = 0; i + len <= compact.length; i++) {
      const slice = compact.slice(i, i + len);
      if (slice.length === len) return slice;
    }
  }
  return null;
}

/** Formats common on SIM / retail cards: Code 128/39/93, ITF, Codabar, plus 2D for box QRs. */
const ICCID_SCAN_FORMATS: Html5QrcodeSupportedFormats[] = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
];

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  open,
  onClose,
  onDetected,
  formatsToSupport = ICCID_SCAN_FORMATS,
  titleKey = 'barcode_scanner.title',
  hintKey = 'barcode_scanner.hint',
}) => {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const containerId = 'barcode-scanner-region';

  onDetectedRef.current = onDetected;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    setError(null);
    let cancelled = false;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode },
        {
          fps: 12,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const w = Math.min(Math.floor(viewfinderWidth * 0.94), 400);
            const h = Math.min(Math.floor(viewfinderHeight * 0.42), 260);
            return { width: w, height: Math.max(128, h) };
          },
          aspectRatio: 1.777778,
          formatsToSupport,
        },
        (decodedText) => {
          if (cancelled) return;
          const iccid = extractIccidFromScan(decodedText);
          if (iccid) {
            onDetectedRef.current(iccid);
            onCloseRef.current();
          }
        },
        () => {},
      )
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message.includes('Permission')
              ? t('barcode_scanner.permission_error')
              : t('barcode_scanner.camera_error'),
          );
        }
      });

    return () => {
      cancelled = true;
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          scanner.clear();
          scannerRef.current = null;
        });
    };
  }, [open, facingMode, formatsToSupport]);

  if (!open) return null;

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-safe">
        <button type="button" onClick={onClose} className="p-2 text-white/80 active:text-white">
          <X size={24} />
        </button>
        <span className="text-sm font-semibold text-white">{t(titleKey)}</span>
        <button type="button" onClick={toggleCamera} className="p-2 text-white/80 active:text-white">
          <SwitchCamera size={22} />
        </button>
      </div>

      {/* Camera view */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div id={containerId} className="h-full w-full" />

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-8 text-center">
            <Camera size={48} className="mb-4 text-white/40" />
            <p className="mb-4 text-sm text-white/80">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-brand-orange px-6 py-2.5 text-sm font-semibold text-white"
            >
              {t('barcode_scanner.close')}
            </button>
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="shrink-0 pb-safe pt-3 text-center">
        <p className="px-4 text-xs text-white/60">{t(hintKey)}</p>
      </div>
    </div>
  );
};

export default BarcodeScanner;
