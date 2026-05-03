import { createContext, useContext } from 'react';

/** True when Profile is opened from the marketing-site account drawer (`MarketingProfileDrawer`). */
export const ProfileMarketingDrawerContext = createContext(false);

export function useMarketingProfileDrawer(): boolean {
  return useContext(ProfileMarketingDrawerContext);
}

/** Outer horizontal padding for profile sub-screens (edge-to-edge on small viewports in marketing drawer). */
export function useMarketingProfileBodyPad(): string {
  return useMarketingProfileDrawer() ? 'max-md:px-0 md:px-5' : 'px-5';
}

/** Sticky headers — keep slight inset for safe area / taps. */
export function useMarketingProfileHeaderPad(): string {
  return useMarketingProfileDrawer() ? 'max-md:px-3 md:px-4' : 'px-4';
}

/** Main profile menu + help — matches previous `px-4` rhythm. */
export function useMarketingProfileMainMenuPad(): string {
  return useMarketingProfileDrawer() ? 'max-md:px-0 md:px-4' : 'px-4';
}
