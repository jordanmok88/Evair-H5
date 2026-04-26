/**
 * Referrals API client (Phase 5).
 *
 * Thin wrapper around `/v1/app/referrals/*` and `/v1/app/credits/me`.
 * The endpoints are covered by the contract in
 * `docs/CROSS_PLATFORM_CONTRACT.md` so the same service can be reused
 * by the future Flutter native app.
 */

import { get, post } from './client';

export interface ReferralRedemptionDto {
    id: number;
    status: 'pending' | 'awarded' | 'void';
    awarded_at: string | null;
    reward_cents: number;
    created_at: string | null;
}

export interface ReferralMeDto {
    code: string;
    share_url: string;
    share_message: string;
    total_redemptions: number;
    total_credit_cents: number;
    credit_balance_cents: number;
    redemptions: ReferralRedemptionDto[];
    rewards: { referrer_cents: number; referee_cents: number };
}

export interface CreditLedgerEntry {
    id: number;
    delta_cents: number;
    reason: string;
    notes: string | null;
    created_at: string;
}

export interface CreditMeDto {
    balance_cents: number;
    currency: string;
    ledger: CreditLedgerEntry[];
}

export const referralService = {
    /** Get-or-create the current user's referral code + summary. */
    async getMe(): Promise<ReferralMeDto> {
        return get<ReferralMeDto>('/app/referrals/me');
    },

    /**
     * Apply a friend's referral code. Returns the redemption status,
     * or throws an `ApiError` with code `REFERRAL_INVALID` if the
     * code is bad / self-referral / already redeemed.
     */
    async redeem(code: string): Promise<{ status: string; created_at: string | null }> {
        return post('/app/referrals/redeem', { code: code.trim().toUpperCase() });
    },

    /** Credit balance + ledger for the credits panel. */
    async getCredits(): Promise<CreditMeDto> {
        return get<CreditMeDto>('/app/credits/me');
    },
};

export default referralService;
