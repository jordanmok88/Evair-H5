const API_BASE = 'https://api.17track.net/track/v2.2';

function apiHeaders(apiKey) {
  return { '17token': apiKey, 'Content-Type': 'application/json' };
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function isNonLatin(text) {
  return /[^\u0000-\u024F\u1E00-\u1EFF]/.test(text);
}

function parseEvent(evt) {
  const timeIso = evt.time_iso || '';
  let date = '';
  let time = '';
  if (timeIso) {
    const d = new Date(timeIso);
    date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } else if (evt.time_raw?.date) {
    date = evt.time_raw.date;
    time = evt.time_raw.time || '';
  }

  const location = evt.location
    || [evt.address?.city, evt.address?.state, evt.address?.country].filter(Boolean).join(', ')
    || '';

  let label = evt.description || evt.stage || 'Update';
  if (evt.description_translation?.description) {
    label = evt.description_translation.description;
  }

  return { label, date, time, location };
}

function mapStatus(status) {
  const map = {
    NotFound: 'PROCESSING',
    InfoReceived: 'PROCESSING',
    InTransit: 'IN_TRANSIT',
    Expired: 'IN_TRANSIT',
    AvailableForPickup: 'OUT_FOR_DELIVERY',
    OutForDelivery: 'OUT_FOR_DELIVERY',
    DeliveryFailure: 'IN_TRANSIT',
    Delivered: 'DELIVERED',
    Exception: 'IN_TRANSIT',
  };
  return map[status] || 'IN_TRANSIT';
}

function cleanCarrierName(provider) {
  const name = provider?.name || 'Unknown Carrier';
  const alias = provider?.alias || '';
  if (alias && !isNonLatin(alias)) return alias;
  return name;
}

function deduplicateEvents(events) {
  const seen = new Set();
  return events.filter(evt => {
    const key = `${evt.date}|${evt.time}|${evt.label.slice(0, 40)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildResult(accepted, lang) {
  const info = accepted.track_info;
  const latestStatus = info?.latest_status?.status || 'NotFound';

  const providers = info?.tracking?.providers || [];
  const allEvents = [];
  let carrierName = 'Unknown Carrier';

  for (const p of providers) {
    if (p.provider?.name) carrierName = cleanCarrierName(p.provider);
    for (const evt of (p.events || [])) {
      const parsed = parseEvent(evt);
      if (isNonLatin(parsed.label) && evt.stage) {
        parsed.label = evt.stage.replace(/([A-Z])/g, ' $1').trim();
      }
      if (isNonLatin(parsed.location)) {
        parsed.location = '';
      }
      allEvents.push(parsed);
    }
  }

  const dedupedEvents = deduplicateEvents(allEvents);

  const estFrom = info?.time_metrics?.estimated_delivery_date?.from;
  const estTo = info?.time_metrics?.estimated_delivery_date?.to;
  let estimatedDelivery = 'Pending';
  if (latestStatus === 'Delivered') {
    estimatedDelivery = 'Delivered';
  } else if (estFrom) {
    estimatedDelivery = new Date(estFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (estTo && estTo !== estFrom) {
      estimatedDelivery += ' – ' + new Date(estTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  return {
    trackingNumber: accepted.number,
    carrier: carrierName,
    status: mapStatus(latestStatus),
    estimatedDelivery,
    events: dedupedEvents,
    origin: info?.shipping_info?.shipper_address?.country || '',
    destination: info?.shipping_info?.recipient_address?.country || '',
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function map17trackLang(lang) {
  const langMap = {
    en: 'en', es: 'es', zh: 'zh-cn',
    fr: 'fr', de: 'de', ja: 'ja', ko: 'ko',
    pt: 'pt', ru: 'ru', ar: 'ar', it: 'it',
  };
  return langMap[lang] || 'en';
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders() });
  }

  const apiKey = process.env.TRACK17_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Tracking API key not configured' }), { status: 500, headers: corsHeaders() });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: corsHeaders() });
  }

  const { trackingNumber, lang } = body;
  if (!trackingNumber) {
    return new Response(JSON.stringify({ error: 'trackingNumber is required' }), { status: 400, headers: corsHeaders() });
  }

  const trackLang = map17trackLang(lang || 'en');
  const payload = [{ number: trackingNumber }];

  try {
    const infoRes = await fetch(`${API_BASE}/gettrackinfo`, {
      method: 'POST',
      headers: apiHeaders(apiKey),
      body: JSON.stringify(payload),
    });
    const infoData = await infoRes.json();

    if (infoData.code === 0) {
      const accepted = infoData.data?.accepted?.[0];
      if (accepted) {
        const providers = accepted.track_info?.tracking?.providers || [];
        const hasEvents = providers.some(p => (p.events || []).length > 0);

        if (hasEvents) {
          return new Response(JSON.stringify(buildResult(accepted, trackLang)), { status: 200, headers: corsHeaders() });
        }
      }
    }

    const regPayload = [{ number: trackingNumber, lang: trackLang }];
    const regRes = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: apiHeaders(apiKey),
      body: JSON.stringify(regPayload),
    });
    const regData = await regRes.json();

    const wasAccepted = regData.data?.accepted?.length > 0;
    const alreadyRegistered = regData.data?.rejected?.some(r => r.error?.code === -18019901);

    if (!wasAccepted && !alreadyRegistered) {
      const rejectMsg = regData.data?.rejected?.[0]?.error?.message || 'Carrier not detected';
      return new Response(JSON.stringify({ error: rejectMsg }), { status: 404, headers: corsHeaders() });
    }

    if (wasAccepted) {
      await sleep(3000);
    }

    const retryRes = await fetch(`${API_BASE}/gettrackinfo`, {
      method: 'POST',
      headers: apiHeaders(apiKey),
      body: JSON.stringify(payload),
    });
    const retryData = await retryRes.json();

    if (retryData.code === 0 && retryData.data?.accepted?.[0]) {
      return new Response(JSON.stringify(buildResult(retryData.data.accepted[0], trackLang)), { status: 200, headers: corsHeaders() });
    }

    return new Response(JSON.stringify({
      error: 'Tracking number registered but data not yet available. Please try again in a few minutes.',
    }), { status: 202, headers: corsHeaders() });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch tracking data', detail: err.message }), {
      status: 502,
      headers: corsHeaders(),
    });
  }
};
