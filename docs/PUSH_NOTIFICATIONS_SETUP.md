# Push Notifications — Credentials & Setup Guide

Step-by-step for wiring up the credentials the push-notification code
needs to actually deliver messages. The code itself (Laravel backend,
Flutter shell, H5 glue) is already in place — this guide covers only
the parts that live outside the repo: Firebase Cloud Messaging, Apple
Developer Portal, and Android's `google-services.json`.

> **Time budget:** ~45–60 min the first time, assuming you already have
> admin access to both the Apple Developer account and the Google
> account you want to host the Firebase project under.

---

## 0. Before you start

You'll need:

- Admin access to an Apple Developer account with the `com.evairsim.app`
  bundle ID (or whatever you chose — check `ios/Runner.xcodeproj/`).
- A Google account with permission to create a new Firebase project (or
  access to an existing EvairSIM project).
- A Mac with Xcode ≥ 15 (for uploading the APNs auth key).

The end deliverables of this guide are three files + one env var:

| File / var | Where it goes | Purpose |
|---|---|---|
| `GoogleService-Info.plist` | `EvairSIM-App/ios/Runner/` | Firebase config for iOS |
| `google-services.json` | `EvairSIM-App/android/app/` | Firebase config for Android |
| `firebase-adminsdk-*.json` | `Evair-Laravel/storage/app/firebase/` | Server-side FCM sender |
| `FIREBASE_CREDENTIALS=...` | `Evair-Laravel/.env` | Path to the JSON above |

None of these should be committed to git. The relevant `.gitignore`
entries are already in place.

---

## 1. Create / open the Firebase project

1. Go to <https://console.firebase.google.com>.
2. Click **Add project** → name it `EvairSIM` → disable Google Analytics
   for now (we can enable it later for campaign tracking, but it's not
   required for FCM).
3. Wait for project creation to finish, then open the project dashboard.

---

## 2. Register the iOS app

1. Project dashboard → **Add app** → iOS.
2. **Apple bundle ID:** paste your bundle ID exactly as it appears in
   Xcode (`Runner → Signing & Capabilities → Bundle Identifier`).
   Typical: `com.evairsim.app`. Case matters.
3. **App nickname:** `EvairSIM iOS`.
4. **App Store ID:** leave blank for now.
5. Click **Register app**.
6. **Download `GoogleService-Info.plist`** → save it at
   `EvairSIM-App/ios/Runner/GoogleService-Info.plist`.
7. Open Xcode: `open EvairSIM-App/ios/Runner.xcworkspace`.
8. In the Project Navigator, drag `GoogleService-Info.plist` into the
   `Runner` group. In the dialog:
   - **Destination:** "Copy items if needed" → checked
   - **Added to targets:** only `Runner` (not `RunnerTests`)
9. Skip the rest of the Firebase wizard's steps ("Add Firebase SDK",
   "Add initialization code") — those are handled by the
   `firebase_core` Flutter plugin we already wired in.

---

## 3. Upload the APNs authentication key

FCM needs a way to talk to Apple's APNs on our behalf. The modern way
is an **APNs auth key** (`.p8` file) — cleaner than the old
certificates because it doesn't expire.

### 3a. Create the key in Apple Developer Portal

1. Go to <https://developer.apple.com/account> → **Certificates,
   Identifiers & Profiles** → **Keys** → **+**.
2. **Key Name:** `EvairSIM Push Key` (anything descriptive).
3. Check **Apple Push Notifications service (APNs)**. Optional: also
   check **Configure** and scope to the `com.evairsim.app` app ID.
4. Click **Continue** → **Register** → **Download**.
5. Save the `.p8` file somewhere safe — **Apple only lets you download
   it once**. If you lose it you have to revoke and recreate.
6. Note down:
   - **Key ID** (shown on the key detail page, 10 characters, e.g. `ABC1234567`).
   - **Team ID** (top-right of the Apple Developer portal, 10 characters).

### 3b. Upload the key to Firebase

1. Firebase Console → **Project settings** (gear icon) → **Cloud
   Messaging** tab.
2. Under **Apple app configuration**, find your iOS app.
3. **APNs authentication key** → **Upload**.
4. Paste:
   - The `.p8` file
   - Key ID from step 3a
   - Team ID from step 3a
5. Click **Upload**.

### 3c. Enable Push Notifications capability in Xcode

1. Open Xcode → `Runner` target → **Signing & Capabilities**.
2. Click **+ Capability** → add **Push Notifications**.
3. Also add **Background Modes** → check **Remote notifications**.
4. Xcode will create / update `ios/Runner/Runner.entitlements`. We
   already committed a starter version with `aps-environment` set to
   `development` — for App Store / TestFlight builds Xcode will flip
   this to `production` automatically.

---

## 4. Register the Android app

1. Firebase Console → **Project overview** → **Add app** → Android.
2. **Android package name:** must match
   `EvairSIM-App/android/app/build.gradle.kts` → `applicationId`.
   Typical: `com.evairsim.app`.
3. **App nickname:** `EvairSIM Android`.
4. **SHA-1:** optional for FCM itself. Required if you ever enable
   Google Sign-In or Dynamic Links. You can add it later via
   `./gradlew signingReport` from `EvairSIM-App/android/`.
5. **Download `google-services.json`** → save at
   `EvairSIM-App/android/app/google-services.json`.
6. Skip the rest of the wizard — the Gradle plugin is already wired
   in `android/settings.gradle.kts` and `android/app/build.gradle.kts`.

---

## 5. Create the Admin SDK service account (Laravel side)

Laravel sends pushes via the FCM HTTP v1 API, which requires OAuth2
credentials, not just a server key. That's what this step sets up.

1. Firebase Console → **Project settings** → **Service accounts** tab.
2. Under **Firebase Admin SDK**, click **Generate new private key** →
   **Generate key**. A JSON file downloads — name it
   `firebase-adminsdk.json`.
3. Create the target folder:
   ```bash
   mkdir -p Evair-Laravel/storage/app/firebase
   ```
4. Move the file:
   ```bash
   mv ~/Downloads/<that-file>.json \
      Evair-Laravel/storage/app/firebase/firebase-adminsdk.json
   chmod 600 Evair-Laravel/storage/app/firebase/firebase-adminsdk.json
   ```
5. Add the path to `.env` (create if missing):
   ```ini
   FIREBASE_CREDENTIALS=storage/app/firebase/firebase-adminsdk.json
   ```
   The existing `config/push.php` and `app/Services/PushService.php`
   expect this exact env var.

> **Important:** this JSON is the server's root key for sending push.
> Treat it like a database password. Never commit, never email, never
> paste in chat logs.

---

## 6. Install dependencies

### Laravel

```bash
cd Evair-Laravel
composer install       # picks up kreait/firebase-php ^7.17
php artisan migrate    # creates push_tokens + user_push_preferences
php artisan config:clear
```

### Flutter

```bash
cd EvairSIM-App
flutter pub get        # picks up firebase_core + firebase_messaging + flutter_local_notifications
cd ios && pod install && cd ..
```

If `pod install` complains about an outdated `platform :ios` in
`ios/Podfile`, bump it to at least `13.0` — the modern `firebase_*`
pods require iOS 13.

### H5

No new deps. The H5 side uses only the existing fetch client.

---

## 7. Smoke test — send your first push

### 7a. Get a device token

Run the app on a **real device** (push doesn't fire on the iOS
simulator or Android emulator without a `google-play-services` image).

```bash
cd EvairSIM-App
flutter run --release -d <your-device-id>
```

Log in inside the app. You should see `[evair-bridge]` lines in the
device logs; the interesting one is `[push] token acquired: <token>`.

Copy the token. (If you don't see it, temporarily add a `print()` in
`lib/core/push/push_notification_service.dart` → `requestPermissionAndGetToken`.)

### 7b. Trigger a test send from Firebase Console

1. Firebase Console → **Engage** → **Messaging** → **New campaign** →
   **Notification**.
2. Fill in title / body, then → **Send test message**.
3. Paste the token from step 7a → **Test**.
4. Within ~10 seconds the notification should appear on the device.
   Tap it → the app should open and navigate (if `data.deepLink` was
   set) to the given screen via the bridge.

### 7c. Trigger a test send from Laravel

In `tinker`:

```bash
cd Evair-Laravel
php artisan tinker
```

```php
$user = \App\Models\AppUser::first();
app(\App\Services\PushService::class)->sendToUser($user, [
    'title' => 'Hello from Laravel',
    'body'  => 'Push pipeline works end-to-end.',
    'data'  => ['deepLink' => '/mysims'],
    'category' => 'transactional',
]);
```

You should get a response summarising successes / failures. Any
`UNREGISTERED` or `INVALID_ARGUMENT` errors will auto-prune the token
row — that's intentional.

---

## 8. Production checklist

Before shipping real pushes to real users:

- [ ] Replace the dev `aps-environment` in `Runner.entitlements` is
      handled automatically when you archive a release build — **don't
      hard-code it to `production`** or debug builds will break.
- [ ] In Firebase Console → **Project settings** → **Cloud Messaging**,
      confirm **Apple APNs Authentication Key** section shows a green
      checkmark (not a warning).
- [ ] Set `FIREBASE_CREDENTIALS` on the production Laravel server too
      (via the `.env` on prod, NOT committed).
- [ ] Review `app/Listeners/Push/SendPaymentSucceededPush.php` — copy
      the pattern to also hook `OrderConfirmed` and `EsimDelivered`
      when you're ready to send those.
- [ ] Decide on Android notification icon (currently uses app icon).
      Add a monochrome white silhouette at
      `android/app/src/main/res/drawable/ic_stat_notify.png` and wire it
      in `PushNotificationService.createChannel` if you want the proper
      Material notification look.
- [ ] Wire the marketing opt-out toggle in `ProfileView.tsx` once the
      rest of the pipeline is confirmed working. The API is already
      there: `GET/PATCH /api/v1/h5/push/preferences`.

---

## Troubleshooting

**"No push arrived on iOS"**
- You're on the simulator. Switch to a real device.
- APNs key not uploaded — re-check Firebase Console → Cloud Messaging.
- App was killed too long ago and the token rotated. Log in again to
  re-register the new token.

**"No push arrived on Android"**
- `google-services.json` not at `android/app/google-services.json`.
- App targets Android 13+ and user denied notification permission.
  The service re-requests politely via `requestPermission()` on each
  login — but once denied hard, the user has to toggle it back in
  system Settings.

**Laravel: `kreait\Firebase\Exception\AuthException`**
- `FIREBASE_CREDENTIALS` path is wrong or file unreadable.
- Service account key has been revoked in Google Cloud Console. Regen
  a new one (step 5).

**"Push works in dev but not TestFlight / App Store"**
- APNs environment mismatch. TestFlight / App Store builds use the
  `production` APNs environment; development builds use `development`.
  Both are handled by the same upload key, so it's almost always a
  Firebase project issue: check you registered the *same* bundle ID
  for both.

---

## Where the code lives

For future reference:

- **Laravel**
  - `config/push.php` — Firebase credential path + defaults
  - `app/Services/PushService.php` — FCM sender with token pruning
  - `app/Http/Controllers/Api/H5/PushController.php` — register / prefs
  - `app/Listeners/Push/SendPaymentSucceededPush.php` — usage example
- **Flutter**
  - `lib/core/push/push_notification_service.dart` — singleton
  - `lib/core/bridge/native_bridge.dart` — JS bridge methods
  - `ios/Runner/Info.plist` — APNs background mode
  - `ios/Runner/Runner.entitlements` — `aps-environment`
- **H5**
  - `services/pushService.ts` — `initPush`, `unregisterPush`,
    `onPushReceived`, `onPushOpened`, `getPreferences`, `updatePreferences`
  - `App.tsx` — calls `initPush()` after login success
