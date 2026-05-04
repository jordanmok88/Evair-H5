import React from 'react';
import { useTranslation } from 'react-i18next';

/** Public asset — retail sleeve / carrier graphic (matches physical ship insert). */
const ICCID_GUIDE_IMG = '/marketing/evairsim-physical-card-iccid-guide.png';

export interface SimCardIccidHintProps {
  /** Merged onto the outer wrapper (crop + optional rounding). */
  className?: string;
  /**
   * Caps image height — use on bind SCAN so ICCID field + CTA fit one mobile viewport without scrolling.
   */
  compact?: boolean;
}

/**
 * Where to find ICCID/EID — production packaging art (barcode + SIM punch-out graphic).
 */
const SimCardIccidHint: React.FC<SimCardIccidHintProps> = ({ className = '', compact = false }) => {
  const { t } = useTranslation();
  const imgClass = compact
    ? 'block max-h-[min(26dvh,220px)] sm:max-h-[min(28dvh,240px)] w-full object-contain object-center bg-transparent'
    : 'block h-auto w-full object-contain object-center bg-white';
  return (
    <div
      className={`overflow-hidden rounded-xl bg-transparent ${compact ? 'flex justify-center' : ''} ${className}`.trim()}
    >
      <img
        src={ICCID_GUIDE_IMG}
        alt={t('sim_setup.iccid_packaging_hint_alt')}
        width={1024}
        height={768}
        className={imgClass}
        decoding="async"
        fetchPriority={compact ? 'high' : 'low'}
      />
    </div>
  );
};

export default SimCardIccidHint;
