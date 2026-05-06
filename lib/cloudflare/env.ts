/** Bindings surfaced to Pages Functions (`context.env`). Mirror Netlify dashboard env names. */

export interface CfEnv {
  ALLOWED_ORIGINS?: string;
  ESIM_ACCESS_CODE?: string;
  ESIM_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_KEY?: string;
  QR_SCAN_REDIRECT_URL?: string;
  RATE_LIMIT_STRIPE_MAX?: string;
  RATE_LIMIT_STRIPE_WINDOW_MS?: string;
  RATE_LIMIT_EMAIL_MAX?: string;
  RATE_LIMIT_EMAIL_WINDOW_MS?: string;
  RATE_LIMIT_ESIM_MAX?: string;
  RATE_LIMIT_ESIM_WINDOW_MS?: string;
  RATE_LIMIT_TRACK_MAX?: string;
  RATE_LIMIT_TRACK_WINDOW_MS?: string;
  RATE_LIMIT_VERIFY_MAX?: string;
  RATE_LIMIT_VERIFY_WINDOW_MS?: string;
}
