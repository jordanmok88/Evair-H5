# Red Tea carrier snapshot (H5)

The shop reads `constants/carriersFromSupplier.generated.ts` at build time. Regenerate it from the live **eSIM Access** catalogue so plan cards show the same operator names Red Tea returns.

## One-time setup (local only)

At the repo root, create **`.env.redtea.pull`** (ignored by git as `.env.*`) **or** reuse the same variable names in a local env file:

```bash
# Option A — names used by this script
REDTEA_ACCESS_CODE=your_access_code
REDTEA_SECRET_KEY=your_secret

# Option B — same as .env.example / Vite (also accepted)
ESIM_ACCESS_CODE=your_access_code
ESIM_SECRET=your_secret
```

Use the same values as Laravel `suppliers.api_config` for ESIMACCESS (`access_code` / `secret_key`).

2. Run:

   ```bash
   npm run carriers:pull
   ```

3. Commit the updated **`constants/carriersFromSupplier.generated.ts`** and deploy H5.

**Priority at runtime**

1. `networkPartnerSummary` from your Laravel API (when synced)
2. `CARRIER_REDTEA_SNAPSHOT` (this file)
3. Hand-maintained `CARRIER_MAP` in `constants.ts`

The Flutter APP loads `/app` WebView — no Dart changes.
