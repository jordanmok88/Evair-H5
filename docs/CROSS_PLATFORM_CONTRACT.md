# Evair Cross-Platform API Contract

**Status**: Living document. Last updated 2026-04-25.
**Owners**: H5 (Jordan), Flutter (China team), Laravel (China team).

---

## Why this doc exists

We have three clients hitting the same Laravel backend:

1. **Evair-H5** — React + Vite web app served from `evairdigital.com`.
   It's also what the Flutter WebView shell loads.
2. **EvairSIM-App** (Flutter, native) — `feature/evairsim-jordan` branch.
   Full Phase 2 native UI, Stripe PaymentSheet, live chat with Reverb.
3. **admin** — Vue 3 + Element Plus internal CS console.

Without a contract, the three clients quietly drift on response shapes,
channel names, and dedup keys, which is exactly the trap we hit in
April 2026 when:

- The H5 client only accepted `code: 0` for success while every new
  `/v1/app/*` endpoint returned `code: '200'` or `code: '201'`.
- The Flutter team built `(server_id, client_msg_id)` chat dedup with
  no equivalent on the H5 side.
- `MessageSent::broadcastWith()` shipped only the legacy `text` fields
  even though the model already stored `message_type`, `media_url`,
  and `metadata` for image / order-card / product-card messages.

This file is the single source of truth for everything that crosses the
client boundary. Editing here without a corresponding code change is a
contract bug; shipping a code change without editing here is also a
contract bug.

---

## 1. Response envelope

All Laravel JSON responses share this shape:

```json
{
  "code": <number | string>,
  "msg":  "<localized human message>",
  "data": <object | array | null>
}
```

### 1.1 Success codes

The backend uses **two** success conventions; both are valid:

| Convention | Where it's used | Example |
|---|---|---|
| Numeric `0` | Legacy `/v1/h5/*` and `/v1/h5/backstage/*` endpoints | `{"code": 0, ...}` |
| String `"200"` | Read endpoints on `/v1/app/*`, `/v1/admin/*`, `/v1/app/conversations/*` | `{"code": "200", ...}` |
| String `"201"` | Create endpoints on `/v1/app/*` (e.g. `bind-sim`, `sendMessage`) | `{"code": "201", ...}` |

Clients **must not** hard-code `code === 0` or `code === '200'`. Use a
shared helper:

- **H5**: `import { isSuccessApiCode } from '@/services/api/client'`
- **Flutter**: see `lib/core/network/response_envelope.dart`

The helper accepts `0`, `'0'`, `'200'`, `'201'` as success and treats
everything else as failure.

### 1.2 Error codes

All errors are **strings** with a stable namespaced prefix:

| Code | Meaning | HTTP |
|---|---|---|
| `AUTH_001` | Refresh token invalid / expired / account disabled | 401 |
| `BUSINESS_001` | Business-rule violation (SIM already bound, etc.) | 200 / 422 |
| `NOT_FOUND_001` | Resource not found | 404 / 200 |
| `RATE_LIMIT_001` | Too many requests | 429 |
| `VALIDATION_001` | Form validation failed | 422 |

The legacy `/v1/h5/*` tier also returns numeric codes (`1001`, `1021`,
`1022`, etc.) — see `services/api/types.ts` `ApiErrorCode` enum. New
work should always use the string convention.

`isAuthError()` on H5's `ApiError` accepts both conventions (`-3`,
`1021`, `1022`, `'AUTH_001'`).

### 1.3 Pagination

For list endpoints that paginate, the data object follows the shape:

```json
{
  "list": [...],
  "total": 1234,
  "page": 1,
  "size": 20
}
```

For chat history specifically (which scrolls upward), the chat
endpoints accept cursor-style `before_id` / `per_page` instead of
`page` / `size`:

```
GET /v1/app/conversations/{id}/messages?before_id=12345&per_page=30
```

Returns messages with `id < before_id` ordered DESC by created_at,
limited to `per_page`. The legacy `since=<datetime>` parameter is also
accepted for the polling fallback (see §5.4).

---

## 2. Authentication

All authenticated endpoints expect:

```
Authorization: Bearer <sanctum_personal_access_token>
```

Tokens are issued by **either** of these endpoints — they share the
same `personal_access_tokens` and `user_tokens` tables:

| Endpoint | Tier | Issuer for |
|---|---|---|
| `POST /v1/h5/auth/login` | Legacy H5 | Web users via `evairdigital.com/login` |
| `POST /v1/app/auth/login` | App | Flutter native users |
| `POST /v1/h5/auth/register` | Legacy H5 | Web signup |

The token issued by either tier is accepted by any `auth:sanctum`
guarded route. Clients **may** treat tokens as opaque.

### 2.1 Refresh

Both tiers expose a refresh endpoint that writes to the same
`user_tokens` table with `TYPE_REFRESH`. They're effectively
interchangeable:

```
POST /v1/h5/auth/refresh        body: { "refresh_token": "..." }
POST /v1/app/auth/refresh       body: { "refresh_token": "..." }
```

**Canonical client behaviour**:

- Always call **`POST /v1/app/auth/refresh`**, regardless of which tier
  issued the original token. This is the endpoint the Flutter native
  app uses; we converge on one URL.
- Successful response (both tiers): `code: 200|0`, body
  `{ token, refresh_token, expires_in }`. The `token` field is also
  acceptable as `access_token` for forward-compat.
- Failed response (refresh token revoked / expired): `code: 'AUTH_001'`
  HTTP 401. Client **must** clear stored tokens and force re-login.
- Network failure (no response received): client **must not** clear
  tokens — this is a transient condition. Surface a "try again" state.

### 2.2 Single-flight refresh queue

When N concurrent requests all see HTTP 401 at the same time, only
**one** refresh call is allowed in flight. All other 401-victims await
the same in-flight refresh promise and retry once with the new token.

The H5 implementation lives in `services/api/client.ts`
(`isRefreshing` + `refreshPromise`). The Flutter implementation lives
in `lib/core/network/api_interceptor.dart` (`_isRefreshing` +
`_pendingRequests`). Both pass the equivalent test in
`services/api/client.test.ts > parallel 401s coalesce into one
refresh call`. If you fork the logic, copy the test.

### 2.3 Channel auth

Reverb private channels (chat) authenticate against the same Sanctum
token via `POST /broadcasting/auth`. Headers:

```
Authorization: Bearer <sanctum_token>
Content-Type:  application/x-www-form-urlencoded
```

Body: `socket_id=<id>&channel_name=private-conversation.<id>`.

Channel auth is wired with `guards: ['sanctum', 'h5', 'app']` in
`routes/channels.php` so any token type works.

---

## 3. Naming conventions

### 3.1 Request and response field naming

Laravel speaks `snake_case` over the wire. Both clients translate to
their respective idioms:

- **H5 (TypeScript)**: requests serialize `camelCase → snake_case` and
  responses deserialize `snake_case → camelCase` automatically via
  `services/api/client.ts` `toSnakeCase` / `toCamelCase`.
- **Flutter (Dart)**: explicit `@JsonKey` mappings on freezed models.

When this contract describes a payload field it uses **snake_case**
(the wire format).

### 3.2 Money

All monetary amounts are **integer cents** in the smallest unit of the
listed currency. `currency` is always present as an ISO 4217 code:

```json
{ "amount_cents": 999, "currency": "USD" }
```

The legacy package endpoints return `price` as a float in major units;
those will be migrated to `_cents` over time. Do not introduce new
float-money fields.

### 3.3 Times

All timestamps are ISO-8601 UTC with second precision:

```
2026-04-25 21:30:00
```

The `T` separator is **not** added by Laravel. Clients should accept
both `YYYY-MM-DD HH:mm:ss` and `YYYY-MM-DDTHH:mm:ssZ`.

---

## 4. Live chat — REST contract

### 4.1 Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/app/conversations` | Create or fetch the user's active conversation |
| `POST` | `/v1/app/conversations/{id}/messages` | Send a message |
| `GET` | `/v1/app/conversations/{id}/messages` | List messages (history + polling) |
| `POST` | `/v1/app/chat/upload` | Upload an image and get back a public URL |

### 4.2 Sending a message

```
POST /v1/app/conversations/{id}/messages
{
  "content":        "<text body, required for text/order/product>",
  "message_type":   "text" | "image" | "order" | "product",
  "media_url":      "<https url, required for image>",
  "metadata":       { ... },          // structured payload, see §5
  "sender_name":    "Jordan",         // optional; admin may override
  "client_msg_id":  "<idempotency key, max 64 chars>"
}
```

`client_msg_id` is the **client-generated** dedup key (UUID v4 is
fine). It survives the round trip back through the WebSocket broadcast,
which lets the sender match optimistic local renders against the
server-confirmed message instead of double-rendering.

### 4.3 Listing messages

```
GET /v1/app/conversations/{id}/messages
        ?before_id=<int>     // optional, fetch older
        &per_page=<int>      // default 30, max 100
        &since=<datetime>    // optional polling fallback
```

History is returned in DESC order by `created_at`. Clients should
display ASC.

### 4.4 Image upload

```
POST /v1/app/chat/upload
Content-Type: multipart/form-data

file: <image binary, ≤ 5 MB, image/jpeg|image/png|image/webp>
```

Response:

```json
{
  "code": "200",
  "msg":  "上传成功",
  "data": { "url": "https://...", "path": "<storage path>" }
}
```

Flow: client uploads → receives URL → calls send-message with
`message_type: "image"`, `media_url: <url>`. The image is **not**
attached to the message in one shot.

---

## 5. Live chat — WebSocket contract

### 5.1 Reverb endpoint

```
ws://localhost:8080            (dev)
wss://ws.evairdigital.com:443  (prod)
```

Both clients use Pusher protocol via:

- **H5**: `laravel-echo` + `pusher-js` (npm)
- **Flutter**: `laravel_echo_null` + `pusher_client_socket`

### 5.2 Channel

```
private-conversation.{conversation_id}
```

Subscription requires Bearer token via `/broadcasting/auth` (see §2.3).
Admins can subscribe to any conversation; H5 / Flutter users can only
subscribe to conversations where `user_id = auth()->id()`.

### 5.3 Event

```
event:    "message.sent"
channel:  private-conversation.{conversation_id}
```

Payload (mirrors `ChatMessageResource` — same keys appear from REST):

```json
{
  "id":              12345,
  "conversation_id": 67,
  "sender":          "customer" | "agent" | "ai",
  "sender_name":     "Jordan",
  "content":         "Hello",
  "english_content": "Hello",        // server-side translation, may be null
  "client_msg_id":   "<echo of sender's idempotency key>",
  "is_read":         false,
  "message_type":    "text" | "image" | "order" | "product",
  "media_url":       null | "https://cdn.example.com/uploads/2026/04/abc.jpg",
  "metadata":        null | { ... },  // see §6 for shape per message_type
  "sender_admin":    null | { "id": 1, "username": "alice", "avatar": "..." },
  "created_at":      "2026-04-25 21:30:00"
}
```

### 5.4 Polling fallback

When the WebSocket is unhealthy (auth fails, disconnect won't recover,
mobile network blocks WS), the client **must** fall back to polling:

```
GET /v1/app/conversations/{id}/messages?since=<last_received_created_at>
```

at 5-second intervals until the WS recovers. New messages from polling
are dedup'd against WS messages by `id` (preferred) or `client_msg_id`
(when `id` is not yet known on the sender side, see §5.6).

### 5.5 Optimistic send and dedup

Sender's flow:

1. Generate `client_msg_id` (UUID v4).
2. Append a local message with `status = sending` to the visible list,
   keyed by `client_msg_id`.
3. `POST /conversations/{id}/messages` with `client_msg_id`.
4. On HTTP 201, replace the local entry with the server response,
   matched by `client_msg_id`. Status is now `sent`.
5. When the WS broadcast arrives for the same message, dedup by
   server `id`; if `id` is already present, drop the duplicate.

Receiver's flow:

1. WS broadcast arrives → check if a message with this `id` is already
   in the list (handles WS-then-REST race).
2. If not, append.
3. If `client_msg_id` matches an existing local optimistic message,
   reconcile by replacing the local entry with the broadcast payload.

The dedup key is **`(id, client_msg_id)`** as a tuple. Either alone
matching is enough to dedup.

---

## 6. Message types and metadata payloads

`message_type` must be one of these four values (server-validated):

### 6.1 `text`

```json
{
  "message_type": "text",
  "content":      "Hello!",
  "media_url":    null,
  "metadata":     null
}
```

### 6.2 `image`

```json
{
  "message_type": "image",
  "content":      "",
  "media_url":    "https://cdn.example.com/uploads/2026/04/abc.jpg",
  "metadata":     { "width": 1280, "height": 960, "size_bytes": 234567 }
}
```

`metadata` is optional but recommended for proper aspect-ratio
rendering before the image loads.

### 6.3 `order` (recharge-record card)

```json
{
  "message_type": "order",
  "content":      "Order #20260420-12345",
  "media_url":    null,
  "metadata": {
    "order_no":     "20260420-12345",
    "package_name": "US 10GB / 30 Day",
    "status":       "Completed",
    "amount_cents": 999,
    "currency":     "USD"
  }
}
```

### 6.4 `product` (package card)

```json
{
  "message_type": "product",
  "content":      "Recommended: US 10GB / 30 Day",
  "media_url":    null,
  "metadata": {
    "package_code":     "US-10GB-30D",
    "name":             "US 10GB / 30 Day",
    "price_cents":      999,
    "currency":         "USD",
    "location":         "US",
    "duration_days":    30,
    "data_volume_gb":   10
  }
}
```

Both clients render order / product cards as tap-able UI affordances —
tapping an order card navigates to the order detail page; tapping a
product card opens the buy / top-up flow with that package preselected.

---

## 7. Versioning policy

This document is loosely versioned by section. When a contract field
changes:

1. **Backwards-compatible additions** (new optional field, new event,
   new error code) — bump the section's "Last changed" tag and ship.
   No client coordination needed.
2. **Breaking changes** (renamed field, dropped event, new required
   field) — open an issue tagged `cross-platform-contract`, get
   sign-off from H5 + Flutter owners, ship Laravel + clients in the
   same release window.
3. **Bug fixes** that change observable behaviour count as breaking.

When in doubt, copy the field rather than mutate it.

---

## Appendix — Source references

| Concern | File |
|---|---|
| H5 success-code helper | `services/api/client.ts` (`isSuccessApiCode`) |
| H5 single-flight refresh | `services/api/client.ts` (`refreshAccessToken`) |
| H5 contract tests | `services/api/client.test.ts` |
| Flutter token-refresh interceptor | `lib/core/network/api_interceptor.dart` |
| Flutter Echo service | `lib/core/services/echo_service.dart` |
| Laravel chat REST | `app/Http/Controllers/Api/App/ConversationController.php` |
| Laravel chat upload | `app/Http/Controllers/Api/App/ChatController.php` |
| Laravel chat broadcast | `app/Events/Chat/MessageSent.php` |
| Laravel chat resource | `app/Http/Resources/App/ChatMessageResource.php` |
| Laravel channel auth | `routes/channels.php` |
| Laravel send-message validation | `app/Http/Requests/App/ConversationSendMessageRequest.php` |
| Reverb config | `config/reverb.php` |
