/**
 * Authenticated SIM endpoints (`/v1/app/sims/...`).
 *
 * These are distinct from the legacy `/h5/...` recharge surfaces — the
 * `/v1/app` tier is the Activation Funnel's owned-SIM API: it gates by
 * SIM-asset ownership and exposes auto-renew state, eligible packages,
 * and other ROSCA-relevant fields the older H5 endpoints don't carry.
 *
 * Kept in its own module so it doesn't get tangled with the supplier-
 * specific recharge logic in `services/api/esim.ts`.
 *
 * @see Evair-Laravel/app/Http/Controllers/Api/App/SimController.php
 * @see docs/ACTIVATION_FUNNEL.md §7.3
 */

import { get, patch } from './client';

// ─── Types ──────────────────────────────────────────────────────────────

/**
 * Shape returned by `GET /v1/app/sims/{iccid}` and the auto-renew
 * toggle endpoint. Matches `App\Http\Resources\App\SimResource`.
 *
 * Only the fields the H5 currently consumes are typed; expand as
 * additional surfaces start using this service.
 */
export interface AppSimDetail {
    iccid: string;
    status: string;
    supplierType: string | null;
    packageName: string | null;
    countryCode: string | null;
    totalBytes: number;
    usedBytes: number;
    remainingBytes: number;
    usagePercent: number;
    activatedAt: string | null;
    expiredAt: string | null;
    autoRenew: boolean;
    autoRenewNextChargeAt: string | null;
    autoRenewDisabledReason: string | null;
}

export interface UpdateAutoRenewEnableRequest {
    autoRenew: true;
    autoRenewPackageId: string;
    stripePaymentMethodId: string;
}

export interface UpdateAutoRenewDisableRequest {
    autoRenew: false;
    /**
     * Free-form reason string. Defaults to `user_initiated` server-side
     * when omitted — pass an explicit value when offering the customer
     * a "switching plan" / "going abroad" picker.
     */
    reason?: string;
}

export type UpdateAutoRenewRequest =
    | UpdateAutoRenewEnableRequest
    | UpdateAutoRenewDisableRequest;

// ─── Endpoints ──────────────────────────────────────────────────────────

const ENDPOINTS = {
    SHOW: (iccid: string) => `/v1/app/sims/${encodeURIComponent(iccid)}`,
    AUTO_RENEW: (iccid: string) => `/v1/app/sims/${encodeURIComponent(iccid)}/auto-renew`,
} as const;

// ─── Service ────────────────────────────────────────────────────────────

export const appSimService = {
    /**
     * Fetch the full owned-SIM detail. Backend gates by ownership — a
     * 403 here means the authed user doesn't own the SIM.
     */
    async getSim(iccid: string): Promise<AppSimDetail> {
        return get<AppSimDetail>(ENDPOINTS.SHOW(iccid));
    },

    /**
     * Toggle auto-renew. The backend dispatches `AutoRenewCancelledMail`
     * on disable (no email on enable — the activation/renewal mailers
     * cover that flow). Returns the freshly-resolved SIM state so the
     * caller can update local UI without a follow-up GET.
     */
    async updateAutoRenew(
        iccid: string,
        payload: UpdateAutoRenewRequest,
    ): Promise<AppSimDetail> {
        return patch<AppSimDetail>(ENDPOINTS.AUTO_RENEW(iccid), payload);
    },
};
