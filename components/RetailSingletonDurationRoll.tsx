/**
 * When every validity tier has exactly one plan, fuse those tiers into one
 * responsive row / strip: duration label stacked above each card (marketing +
 * shop country detail).
 */

import React from 'react';
import type { EsimValidityBucket } from '../utils/travelEsimPlanBuckets';

export interface RetailSingletonDurationRollProps {
    /** Always length ≥ 1 here; callers skip when empty */
    buckets: EsimValidityBucket[];
    ariaLabel: string;
    renderColumnHeader: (bucket: EsimValidityBucket) => React.ReactNode;
    renderCard: (bucket: EsimValidityBucket) => React.ReactNode;
}

const scrollbar =
    'md:[scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300';

const RetailSingletonDurationRoll: React.FC<RetailSingletonDurationRollProps> = ({
    buckets,
    ariaLabel,
    renderColumnHeader,
    renderCard,
}) => {
    if (buckets.length === 0) return null;

    const n = buckets.length;
    const wideStrip = n >= 4;

    return (
        <section className="w-full" aria-label={ariaLabel}>
            <div
                className={
                    wideStrip
                        ? `flex flex-col gap-10 md:flex-row md:flex-nowrap md:items-stretch md:gap-5 md:overflow-x-auto md:pb-2 ${scrollbar}`
                        : `grid grid-cols-1 gap-10 md:gap-5 md:items-stretch ${
                              n === 2 ? 'md:grid-cols-2' : n === 3 ? 'md:grid-cols-3' : 'md:grid-cols-1'
                          }`
                }
            >
                {buckets.map(bucket => (
                    <div
                        key={`singleton-${bucket.durationUnit}-${bucket.duration}`}
                        className={
                            wideStrip
                                ? 'flex w-full shrink-0 flex-col gap-2 md:w-[min(20rem,max(260px,calc(100%/3)))]'
                                : 'flex min-w-0 flex-col gap-2'
                        }
                    >
                        {renderColumnHeader(bucket)}
                        <div className="flex flex-1 flex-col [&>*]:min-h-0 [&>*]:flex-1">
                            {renderCard(bucket)}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default RetailSingletonDurationRoll;
