import { resolveCors, jsonHeaders } from './cors.mjs';
import { rateLimitExceeded, sendEmailLimits } from './rate-limit.mjs';

const BRAND_ORANGE = '#FF6600';
const BRAND_DARK = '#0F172A';
const SUPPORT_EMAIL = 'support@evairdigital.com';
const APP_ORIGIN = 'https://evairdigital.com';

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml({ qrCodeUrl, smdpAddress, activationCode, lpaString, orderNo, packageName, iccid }) {
  const safePackage = escapeHtml(packageName);
  const safeOrder = escapeHtml(orderNo);
  const safeSmdp = escapeHtml(smdpAddress);
  const safeAc = escapeHtml(activationCode);
  const safeLpa = escapeHtml(lpaString);
  const safeIccid = escapeHtml(iccid);

  const manageHref = iccid
    ? `${APP_ORIGIN}/app/my-sims?iccid=${encodeURIComponent(iccid)}`
    : `${APP_ORIGIN}/app/my-sims`;

  const qrBlock = qrCodeUrl
    ? `<tr><td align="center" style="padding:0 24px 8px">
         <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;display:inline-block">
           <img src="${escapeHtml(qrCodeUrl)}" alt="eSIM QR Code" width="240" height="240" style="display:block;border-radius:8px" />
         </div>
       </td></tr>
       <tr><td align="center" style="padding:0 24px 16px">
         <p style="font-size:13px;color:#64748b;margin:0;line-height:1.5;max-width:360px">
           Open Camera on iPhone (or Settings &rarr; Network on Android) and point at this QR code to install your eSIM.
         </p>
       </td></tr>`
    : `<tr><td align="center" style="padding:0 24px 16px">
         <p style="font-size:13px;color:#64748b;margin:0">
           Use the manual install codes below.
         </p>
       </td></tr>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your EvairSIM eSIM is ready</title></head>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND_DARK}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(15,23,42,0.06)">

        <tr><td align="center" style="padding:32px 24px 16px">
          <img src="${APP_ORIGIN}/evairsim-wordmark.png" alt="EvairSIM" height="36" style="display:block;height:36px;width:auto;max-width:200px" />
        </td></tr>

        <tr><td align="center" style="padding:0 24px 4px">
          <h1 style="font-size:22px;font-weight:800;color:${BRAND_DARK};margin:0;letter-spacing:-0.01em">Your eSIM is ready to install</h1>
        </td></tr>

        <tr><td align="center" style="padding:8px 24px 20px">
          <p style="font-size:14px;color:#64748b;margin:0;line-height:1.6">
            ${safePackage ? `Plan: <strong style="color:${BRAND_DARK}">${safePackage}</strong>` : ''}
            ${safePackage && safeOrder ? '<br/>' : ''}
            ${safeOrder ? `Order reference: <strong style="color:${BRAND_DARK}">${safeOrder}</strong>` : ''}
          </p>
        </td></tr>

        ${qrBlock}

        <tr><td style="padding:0 24px 12px">
          <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin:24px 0 12px">Manual install codes</h2>
        </td></tr>

        <tr><td style="padding:0 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:12px">
            <tr><td style="padding:14px 16px">
              <div style="font-size:11px;text-transform:uppercase;font-weight:700;color:#94a3b8;letter-spacing:0.05em;margin-bottom:4px">SM-DP+ Address</div>
              <div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:14px;color:${BRAND_DARK};word-break:break-all">${safeSmdp || '&mdash;'}</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 24px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:12px">
            <tr><td style="padding:14px 16px">
              <div style="font-size:11px;text-transform:uppercase;font-weight:700;color:#94a3b8;letter-spacing:0.05em;margin-bottom:4px">Activation Code</div>
              <div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:14px;color:${BRAND_DARK};word-break:break-all">${safeAc || '&mdash;'}</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 24px 8px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px">
            <tr><td style="padding:14px 16px">
              <div style="font-size:11px;text-transform:uppercase;font-weight:700;color:#94a3b8;letter-spacing:0.05em;margin-bottom:4px">Full LPA String</div>
              <div style="font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:13px;color:${BRAND_DARK};word-break:break-all">${safeLpa || '&mdash;'}</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 24px 8px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;margin-bottom:8px">
            <tr><td style="padding:16px">
              <p style="font-size:13px;font-weight:700;color:${BRAND_DARK};margin:0 0 10px">How to install</p>
              <p style="font-size:13px;color:#475569;line-height:1.7;margin:0">
                <strong>iPhone (XS or newer):</strong> Settings &rarr; Cellular &rarr; Add eSIM &rarr; Use QR Code &rarr; scan the QR above.<br/>
                <strong>Android (Pixel 3+, Galaxy S20+, recent OnePlus / Xiaomi):</strong> Settings &rarr; Network &amp; Internet &rarr; SIMs &rarr; Add eSIM &rarr; scan the QR above.<br/>
                <strong>If scanning doesn't work:</strong> tap "Enter Details Manually" and paste the SM-DP+ Address and Activation Code from this email.
              </p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:8px 24px 4px">
          <p style="font-size:13px;color:#475569;line-height:1.7;margin:0">
            <strong style="color:${BRAND_DARK}">Tip:</strong> Install the eSIM <em>before</em> you fly while you have Wi-Fi.
            It only activates the first time it uses data abroad &mdash; your validity countdown won't start until then.
          </p>
        </td></tr>

        <tr><td align="center" style="padding:24px 24px 8px">
          <a href="${manageHref}" style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:12px;font-size:14px">
            Manage your eSIM &rarr;
          </a>
        </td></tr>

        ${safeIccid ? `<tr><td align="center" style="padding:0 24px 24px">
          <p style="font-size:11px;color:#94a3b8;margin:0">
            ICCID: <span style="font-family:monospace">${safeIccid}</span>
          </p>
        </td></tr>` : ''}

        <tr><td style="padding:0 24px 24px">
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0" />
        </td></tr>

        <tr><td align="center" style="padding:0 24px 24px">
          <p style="font-size:12px;color:#94a3b8;margin:0;line-height:1.6">
            Need help? Email
            <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_ORANGE};text-decoration:none">${SUPPORT_EMAIL}</a>
            and quote your order reference. We typically reply within a few hours.
          </p>
        </td></tr>

      </table>

      <p style="text-align:center;font-size:11px;color:#94a3b8;margin:16px 0 0">
        &copy; ${new Date().getFullYear()} EvairSIM &middot;
        <a href="${APP_ORIGIN}" style="color:#94a3b8;text-decoration:none">evairdigital.com</a>
      </p>
    </td></tr>
  </table>
</body></html>`;
}

export default async (req) => {
  const { allowOrigin, rejectCrossOriginBrowser } = resolveCors(req);
  const headers = jsonHeaders(allowOrigin);

  if (req.method === 'OPTIONS') {
    if (rejectCrossOriginBrowser) {
      return new Response(null, { status: 403, headers });
    }
    return new Response(null, { status: 204, headers });
  }

  if (rejectCrossOriginBrowser) {
    return new Response(JSON.stringify({ error: 'Forbidden origin' }), { status: 403, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  }

  if (rateLimitExceeded(req, sendEmailLimits())) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers,
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500,
      headers,
    });
  }

  try {
    // `iccid` was added when the desktop checkout shipped — it lets the
    // "Manage your eSIM" CTA in the email deep-link straight to the
    // customer's SIM in /app/my-sims. Mobile ShopView doesn't send it
    // yet but the field is optional, so old payloads keep working.
    const { email, qrCodeUrl, smdpAddress, activationCode, lpaString, orderNo, packageName, iccid } =
      await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers,
      });
    }

    const html = buildHtml({ qrCodeUrl, smdpAddress, activationCode, lpaString, orderNo, packageName, iccid });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'EvairSIM <onboarding@resend.dev>',
        to: [email],
        subject: `Your eSIM is ready${packageName ? ` — ${packageName}` : ''}`,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('Resend error:', result);
      return new Response(JSON.stringify({ error: result.message || 'Email send failed' }), {
        status: res.status,
        headers,
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('send-esim-email error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers,
    });
  }
};
