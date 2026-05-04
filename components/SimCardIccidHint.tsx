import React from 'react';
import { useTranslation } from 'react-i18next';

/** Public asset — retail sleeve / carrier graphic (matches physical ship insert). */
const ICCID_GUIDE_IMG = '/marketing/evairsim-physical-card-iccid-guide.png';

export interface SimCardIccidHintProps {
  /** Merged onto the bordered frame (`rounded-2xl` wrapper). */
  className?: string;
}

/**
 * Where to find ICCID/EID — production packaging art (barcode + SIM punch-out graphic).
 */
const SimCardIccidHint: React.FC<SimCardIccidHintProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`rounded-2xl border border-orange-200/90 overflow-hidden bg-white shadow-sm ${className}`.trim()}
    >
      <img
        src={ICCID_GUIDE_IMG}
        alt={t('sim_setup.iccid_packaging_hint_alt')}
        width={1024}
        height={768}
        className="block h-auto w-full object-contain object-center bg-white"
        decoding="async"
        fetchPriority="low"
      />
    </div>
  );
};

export default SimCardIccidHint;
