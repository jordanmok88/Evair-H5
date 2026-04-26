/**
 * Activation Funnel API service.
 *
 * Wraps the new `/v1/app/*` endpoints the China team built for the
 * Amazon-insert activation flow. Two surfaces today:
 *
 *   1. `previewByIccid(iccid)` — public, no auth. Returns the bundled-plan
 *      preview + claim_state for the ICCID printed on the box.
 *   2. `bindSimViaActivation({...})` — auth required. Claims the SIM for
 *      the current logged-in user and optionally turns on auto-renew.
 *
 * The H5 client base URL already includes `/api/v1`, so endpoints in this
 * file use the `/app/...` prefix (NOT `/v1/app/...` — the `/v1` is folded
 * into `VITE_API_BASE_URL`). See `services/api/client.ts`.
 *
 * @see docs/ACTIVATION_FUNNEL.md §7 — API contract
 */

import { ApiError, get, post } from './client';

// ─── Endpoints ──────────────────────────────────────────────────────────

const ENDPOINTS = {
  PREVIEW: (iccid: string) => `/app/sims/preview/${encodeURIComponent(iccid)}`,
  BIND_SIM: '/app/users/bind-sim',
} as const;

// ─── Types ──────────────────────────────────────────────────────────────

/**
 * Possible claim states returned by the public preview endpoint.
 * `claimed_by_self` is computed client-side by comparing the response with
 * the logged-in user's SIM list — the server cannot distinguish without
 * authentication and so collapses it to `claimed_by_other`.
 */
export type ClaimState =
  | 'available'         // SIM is real and free to claim
  | 'claimed_by_other'  // already bound to *some* account
  | 'claimed_by_self'   // already bound to the current user (computed client-side)
  | 'pending_shipment'  // inventory row exists but no asset row yet
  | 'not_found';        // unknown ICCID — render error state

/**
 * Customer-friendly preview of the bundled plan that ships with the SIM.
 * Every field is nullable because Amazon batches occasionally lack a fully
 * resolved bundled package server-side; the page falls back to generic copy.
 */
export interface ActivationPreviewPackage {
  name: string | null;
  volumeGb: number | null;
  durationDays: number | null;
  bundledWithAmazon: boolean;
}

export interface ActivationPreviewData {
  iccid: string;
  /** Internal SIM id — pass through to bind-sim. */
  simId: number | null;
  claimState: Exclude<ClaimState, 'claimed_by_self'>;  // server-side states only
  package: ActivationPreviewPackage | null;
  renewPriceCents: number | null;
  renewCurrency: string | null;
  /**
   * Supplier package id to use when enabling auto-renew. The bundled
   * package doubles as the auto-renew package — same SKU, same supplier
   * — so we just echo this back to `bind-sim` instead of asking the
   * customer to choose one. Null when the bundled package can't be
   * resolved server-side; in that case the auto-renew checkbox should
   * stay disabled until the customer manages the SIM in `/app/my-sims`.
   */
  renewPackageId: string | null;
}

/**
 * Result of `previewByIccid` — discriminated union so callers can switch on
 * `kind` without parsing API error codes themselves.
 */
export type PreviewResult =
  | { kind: 'ok'; data: ActivationPreviewData }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

export interface BindSimRequest {
  simId: number;
  /** Optional — printed on the activation insert. Validated server-side
   *  against `SimAsset.matching_id`. Send when provided to harden bind. */
  activationCode?: string;
  /** When true, both `autoRenewPackageId` and `stripePaymentMethodId`
   *  must also be present (server enforces). */
  autoRenew?: boolean;
  autoRenewPackageId?: string;
  stripePaymentMethodId?: string;
}

export interface BindSimResponse {
  id: number;
  appUserId: number;
  simId: number;
  status: string;
  boundAt: string;
  sim?: {
    id: number;
    iccid: string;
    [key: string]: unknown;
  };
}

// ─── Service ────────────────────────────────────────────────────────────

export const activationService = {
  /**
   * Look up the bundled plan + claim state for an ICCID.
   *
   * Network errors propagate as ApiError; the `not_found` state is
   * returned as a discriminated `kind` instead of throwing so the page
   * can render its empty state without a try/catch.
   */
  async previewByIccid(iccid: string): Promise<PreviewResult> {
    try {
      const data = await get<ActivationPreviewData>(ENDPOINTS.PREVIEW(iccid), undefined, {
        skipAuth: true,
      });
      return { kind: 'ok', data };
    } catch (err) {
      if (err instanceof ApiError) {
        // Backend returns code: 'NOT_FOUND_001' (string) on missing
        // ICCID. The shared `ApiErrorCode` enum types this as numeric,
        // so we compare via String() to bypass the false-positive
        // overlap warning rather than widen the enum repo-wide.
        if (String(err.code) === 'NOT_FOUND_001' || err.httpStatus === 404) {
          return { kind: 'not_found' };
        }
        return { kind: 'error', message: err.message || 'Lookup failed' };
      }
      return { kind: 'error', message: 'Network error' };
    }
  },

  /**
   * Bind a SIM to the currently authenticated user.
   *
   * Caller is responsible for ensuring the user is logged in — this hits
   * the auth-required `/app/users/bind-sim` endpoint and will reject
   * with 401 otherwise (the request layer auto-retries after refresh,
   * then surfaces the error).
   */
  async bindSim(payload: BindSimRequest): Promise<BindSimResponse> {
    return post<BindSimResponse>(ENDPOINTS.BIND_SIM, payload);
  },
};
