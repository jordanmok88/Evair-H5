/**
 * Drop one-time eSIM install secrets from a supplier query/usage payload.
 *
 * `/esim/query` is proxied without auth so the shop can read balances.
 * The same body includes the LPA string (`ac`) and QR URL. Those are
 * enough to install a profile once; the shop usage/status UI does not
 * read them from this proxy.
 */

const SECRET_KEYS = new Set([
  'ac',
  'qrcodeurl',
  'shorturl',
  'activationcode',
  'matchingid',
  'smdpaddress',
  'lpastring',
]);

function normalizeKey(key) {
  return key.replace(/_/g, '').toLowerCase();
}

export function redactSupplierProfileSecrets(value) {
  if (Array.isArray(value)) {
    return value.map((item) => redactSupplierProfileSecrets(item));
  }
  if (!value || typeof value !== 'object') return value;

  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEYS.has(normalizeKey(key))) continue;
    out[key] = redactSupplierProfileSecrets(child);
  }
  return out;
}
