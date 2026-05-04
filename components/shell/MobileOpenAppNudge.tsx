import React from 'react';
import { OpenAppHeaderButton } from '@/components/marketing/OpenAppHeaderButton';
import { runningInsideNativeApp } from '@/utils/testMode';

/**
 * Full “OPEN APP” pill for mobile web only (hidden in Flutter WebView and on `md+`).
 * Pairs with icon-only live chat in app shell headers.
 */
export default function MobileOpenAppNudge() {
    if (runningInsideNativeApp()) return null;
    return (
        <OpenAppHeaderButton
            href="/app"
            className="shrink-0 !px-2.5 text-[10px] sm:!px-3 sm:!text-[11px] md:hidden"
        />
    );
}
