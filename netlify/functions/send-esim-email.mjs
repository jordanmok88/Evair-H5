function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function buildHtml({ qrCodeUrl, smdpAddress, activationCode, lpaString, orderNo, packageName }) {
  const qrBlock = qrCodeUrl
    ? `<div style="text-align:center;margin:24px 0">
         <img src="${qrCodeUrl}" alt="eSIM QR Code" width="200" height="200" style="border-radius:12px;border:1px solid #e2e8f0" />
       </div>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:16px;padding:32px 24px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">

      <div style="text-align:center;margin-bottom:24px">
        <img src="https://evair-h5.netlify.app/evairsim-logo-v2.png" alt="EvairSIM" width="220" style="display:block;margin:0 auto;max-width:220px;height:auto" />
      </div>

      <h1 style="font-size:20px;font-weight:700;color:#1a1a1a;text-align:center;margin:0 0 8px">Your eSIM is Ready!</h1>
      <p style="font-size:14px;color:#64748b;text-align:center;margin:0 0 24px;line-height:1.5">
        ${packageName ? `Plan: <strong>${packageName}</strong><br/>` : ''}
        ${orderNo ? `Order: <strong>${orderNo}</strong>` : ''}
      </p>

      ${qrBlock}

      <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e2e8f0">
        <p style="font-size:11px;text-transform:uppercase;font-weight:700;color:#94a3b8;letter-spacing:0.5px;margin:0 0 6px">SM-DP+ Address</p>
        <p style="font-size:14px;color:#1a1a1a;font-family:monospace;word-break:break-all;margin:0">${smdpAddress || '—'}</p>
      </div>

      <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e2e8f0">
        <p style="font-size:11px;text-transform:uppercase;font-weight:700;color:#94a3b8;letter-spacing:0.5px;margin:0 0 6px">Activation Code</p>
        <p style="font-size:14px;color:#1a1a1a;font-family:monospace;word-break:break-all;margin:0">${activationCode || '—'}</p>
      </div>

      <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:24px;border:1px solid #e2e8f0">
        <p style="font-size:11px;text-transform:uppercase;font-weight:700;color:#94a3b8;letter-spacing:0.5px;margin:0 0 6px">Full LPA String</p>
        <p style="font-size:13px;color:#1a1a1a;font-family:monospace;word-break:break-all;margin:0">${lpaString || '—'}</p>
      </div>

      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:16px;margin-bottom:8px">
        <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin:0 0 8px">How to install your eSIM:</p>
        <p style="font-size:12px;color:#64748b;line-height:1.6;margin:0">
          <strong>iPhone:</strong> Settings → Cellular → Add eSIM → Use QR Code → Scan the QR code above.<br/><br/>
          <strong>Android:</strong> Settings → Network → SIM → Add eSIM → Scan QR code.<br/><br/>
          <strong>Manual:</strong> If scanning doesn't work, enter the SM-DP+ Address and Activation Code manually.
        </p>
      </div>

    </div>
    <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">
      © ${new Date().getFullYear()} EvairSIM · <a href="https://evairdigital.com" style="color:#FF6600;text-decoration:none">evairdigital.com</a>
    </p>
  </div>
</body></html>`;
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Email service not configured' }) };
  }

  try {
    const { email, qrCodeUrl, smdpAddress, activationCode, lpaString, orderNo, packageName } = JSON.parse(event.body || '{}');

    if (!email) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Email is required' }) };
    }

    const html = buildHtml({ qrCodeUrl, smdpAddress, activationCode, lpaString, orderNo, packageName });

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
      return { statusCode: res.status, headers: corsHeaders(), body: JSON.stringify({ error: result.message || 'Email send failed' }) };
    }

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ success: true, id: result.id }) };
  } catch (err) {
    console.error('send-esim-email error:', err);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message || 'Internal error' }) };
  }
}
