import React from 'react';
import { useTranslation } from 'react-i18next';

/** Public asset — retail sleeve / carrier graphic (matches physical ship insert). */
const ICCID_GUIDE_IMG = '/marketing/evairsim-physical-card-iccid-guide.png';

export interface SimCardIccidHintProps {
  /** Merged onto the outer wrapper (crop + optional rounding). */
  className?: string;
  /**
   * Caps image height — e.g. top-up idle list (stay readable without dominating).
   */
  compact?: boolean;
  /**
   * Fill parent flex area: `max-h-full max-w-full` centered — use inside `flex-1 min-h-0` on bind SCAN.
   */
  fill?: boolean;
}

/**
 * Where to find ICCID/EID — production packaging art (barcode + SIM punch-out graphic).
 */
const SimCardIccidHint: React.FC<SimCardIccidHintProps> = ({
  className = '',
  compact = false,
  fill = false,
}) => {
  const { t } = useTranslation();
  let imgClass: string;
  if (fill) {
    imgClass = 'block max-h-full max-w-full object-contain object-center bg-transparent';
  } else if (compact) {
    imgClass =
      'block max-h-[min(26dvh,220px)] sm:max-h-[min(28dvh,240px)] w-full object-contain object-center bg-transparent';
  } else {
    imgClass = 'block h-auto w-full object-contain object-center bg-white';
  }
  const wrapClass = fill
    ? `flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden rounded-lg bg-transparent`
    : `overflow-hidden rounded-xl bg-transparent ${compact ? 'flex justify-center' : ''} ${className}`.trim();
  return (
    <div className={fill ? `${wrapClass} ${className}`.trim() : wrapClass}>
      <img
        src={ICCID_GUIDE_IMG}
        alt={t('sim_setup.iccid_packaging_hint_alt')}
        width={1024}
        height={768}
        className={imgClass}
        decoding="async"
        fetchPriority={compact || fill ? 'high' : 'low'}
      />
    </div>
  );
};

export default SimCardIccidHint;
