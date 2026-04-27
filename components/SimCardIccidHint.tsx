import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** Demo digits only — visual hint where ICCID appears on the physical card; not a live scan target. */
const DEMO_ICCID = '9852240810733410542';

/**
 * Simplified “card back” illustration for Add SIM: orange band + wordmark, white field + barcode row + label.
 * Replaces a busy raster asset (warnings, QR, chip art) with a clean educational layout.
 */
const SimCardIccidHint: React.FC = () => {
  const { t } = useTranslation();
  const { viewWidth, bars } = useMemo(() => makeBarcodePattern(DEMO_ICCID), []);
  const height = 44;

  return (
    <div
      className="rounded-2xl border border-orange-200/90 overflow-hidden bg-white shadow-sm"
      role="img"
      aria-label={t('sim_setup.bind_scan_desc')}
    >
      <div
        className="h-12 sm:h-14 flex items-center justify-end px-3 sm:px-4"
        style={{ background: 'linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)' }}
      >
        <img
          src="/evairsim-wordmark.png"
          alt="EvairSIM"
          width={896}
          height={228}
          className="h-6 sm:h-7 w-auto max-w-[min(200px,58%)] object-contain object-right brightness-0 invert opacity-[0.98]"
        />
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5 flex flex-col items-center bg-white">
        <div className="w-full max-w-sm mx-auto h-10 sm:h-11 mb-2.5" aria-hidden>
          <svg
            viewBox={`0 0 ${viewWidth} ${height}`}
            className="w-full h-10 sm:h-11"
            preserveAspectRatio="xMidYMid meet"
          >
            {bars.map((b, i) => (
              <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#0f172a" />
            ))}
          </svg>
        </div>
        <p className="font-mono text-[12px] sm:text-[13px] tracking-wider text-slate-800 text-center leading-snug break-all">
          {DEMO_ICCID}
        </p>
        <p className="text-xs sm:text-sm text-brand-orange font-semibold mt-2">{t('sim_setup.this_is_iccid')}</p>
      </div>
    </div>
  );
};

export default SimCardIccidHint;

/**
 * Deterministic decorative 1D bar pattern (not GS1 / not scannable — illustration only).
 */
function makeBarcodePattern(seed: string): { viewWidth: number; bars: { x: number; w: number }[] } {
  const bars: { x: number; w: number }[] = [];
  const viewWidth = 220;
  let x = 0;
  for (let i = 0; i < 200 && x < viewWidth - 2; i++) {
    const n = seed.charCodeAt(i % seed.length) * (i + 3) + i;
    const w = 1 + (n % 3);
    if ((n >> 2) & 1) {
      bars.push({ x, w: Math.min(3, w) });
    }
    x += w;
  }
  return { viewWidth, bars };
}
