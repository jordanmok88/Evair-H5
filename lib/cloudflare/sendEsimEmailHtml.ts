export const SEND_ESIM_APP_ORIGIN = 'https://evairdigital.com';

const BRAND_ORANGE = '#FF6600';
const BRAND_DARK = '#0F172A';
const SUPPORT_EMAIL = 'support@evairdigital.com';

function escapeHtml(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface SendEsimEmailPayload {
  qrCodeUrl?: string;
  smdpAddress?: string;
  activationCode?: string;
  lpaString?: string;
  orderNo?: string;
  packageName?: string;
  iccid?: string;
}

export function buildSendEsimEmailHtml(p: SendEsimEmailPayload): string {
  const safePackage = escapeHtml(p.packageName);
  const safeOrder = escapeHtml(p.orderNo);
  const safeSmdp = escapeHtml(p.smdpAddress);
  const safeAc = escapeHtml(p.activationCode);
  const safeLpa = escapeHtml(p.lpaString);
  const safeIccid = escapeHtml(p.iccid);

  const manageHref = p.iccid
    ? `${SEND_ESIM_APP_ORIGIN}/app/my-sims?iccid=${encodeURIComponent(String(p.iccid))}`
    : `${SEND_ESIM_APP_ORIGIN}/app/my-sims`;

  const qrBlock = p.qrCodeUrl
    ? `<tr><td align="center" style="padding:0 24px 8px">
         <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:16px;display:inline-block">
           <img src="${escapeHtml(p.qrCodeUrl)}" alt="eSIM QR Code" width="240" height="240" style="display:block;border-radius:8px" />
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
          <img src="${SEND_ESIM_APP_ORIGIN}/evairsim-wordmark.png" alt="EvairSIM" height="36" style="display:block;height:36px;width:auto;max-width:200px" />
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
        <a href="${SEND_ESIM_APP_ORIGIN}" style="color:#94a3b8;text-decoration:none">evairdigital.com</a>
      </p>
    </td></tr>
  </table>
</body></html>`;
}
