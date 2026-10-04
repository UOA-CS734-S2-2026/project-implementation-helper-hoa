# CS734 project - Team Helper Hoa

Welcome to the project for COMPSCI 734 - Mobile, Web & Enterprise Computing. We look forward to seeing the amazing things you create this semester! This is your team's repository.

Your team members are:
- Nikithaa Ashwin (nsha312)
- Justin Averell (cdav583)
- Sudip Chowdhury (scho669)
- Renier Lategan (rlat953)
- Sri Gokul Prazath Sreedharen (gsri145)

You have complete control over how you run this repo. All your members will have admin access. The only thing setup by default is branch protections on `main`, requiring a PR with at least one code reviewer to modify `main` rather than direct pushes.

Please use good version control practices, such as feature branching, both to make it easier for markers to see your group's history and to lower the chances of you tripping over each other during development

![Team image](./team-image.jpg)

---

## Architecture

Helper Hoa is three tiers that each own their own configuration:

| Tier | Lives in | Port | Responsibility |
|---|---|---|---|
| Flutter app | `lib/` | — | UI for store staff, talks to both servers over HTTP |
| Express API | `server/` | 3000 | Auth, inventory, invoices, persistence to Firestore. Push notification sender |
| Python AI | `python/` | 8000 | FastAPI chat server + MCP server, calls the Express API |
| React admin panel | `web-admin/` | 5173 | Back-office desktop client (barcode scanner). Local dev tool — see below |

The app talks to both servers. The Python tier never touches Firestore itself — it
calls the Express API over HTTP, so all writes go through one place.

> The **full architecture**, with diagrams and the reasoning behind each design
> decision, is in **[architecture.md](architecture.md)**.

## Getting started

### Prerequisites

Node.js, Python 3.11+, Flutter, and a Firebase project you control.

### 1. Configuration

Configuration is split by tier, and each file is the single source for its own
tier. Copy both templates:

```powershell
Copy-Item .env.example .env
Copy-Item server\.env.example server\.env
```

- **`.env` (project root)** — `MCP_SECRET`, which both tiers need, plus everything
  Python reads: the UoA gateway key, the Llama Cloud key, and the port and base
  URL it uses to reach the Express API.
- **`server/.env`** — everything the Express server reads: `PORT`,
  `FIREBASE_WEB_API_KEY`, and optional seed-script overrides.

`MCP_SECRET` is the only genuinely shared value, and it is defined once, in the
root file. The server reads both files, so there is only ever one copy of it.

Precedence is **real environment > `server/.env` > root `.env`**, because the
server loads `server/.env` first and neither dotenv nor the OS overwrites a
variable that is already set. If you need a value to differ per machine, export
it in your shell rather than editing the file.

### 2. Firebase service account

The Admin SDK credential is a file, not an environment variable. In the Firebase
console go to **Project settings > Service accounts**, generate a private key,
and place the downloaded `service-account.json` in `server/`.
`server/src/config/firebase.ts` reads it from there, by a path resolved relative
to that file, so it is found no matter which directory you run a command from.

The project id comes from the service account itself. The configured Android
app and current backend use `helperhoa-5f706`; both must use the same project
for FCM delivery.

Both `service-account.json` and the `.env` files are git-ignored. The committed
`.env.example` files are the templates.

### 3. Seed the demo accounts

```powershell
cd server
npm run seed
```

This creates a Firebase Auth record for each of the three demo roles
(`admin@example.com`, `manager@example.com`, `cashier@example.com`, all with
password `password123`) and stores the matching role document in Firestore. The
app logs in with these. Override the defaults with `SEED_ADMIN_EMAIL` and
`SEED_USER_PASSWORD` in `server/.env`.

To mint a token by hand when testing with curl:

```powershell
cd server
npx tsx src/scripts/get-token.ts
```

### 4. Run the tiers

**Express API** — terminal 1:

```powershell
cd server
npm install
npm run dev
```

**Python AI** — terminal 2 (create the venv once):

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r python\requirements.txt
```

Then, in terminals 3 and 4:

```powershell
.\.venv\Scripts\Activate.ps1
python python\mcp_chatbot.py
```

```powershell
.\.venv\Scripts\Activate.ps1
python python\chatbot_server.py
```

The chatbot has no credentials of its own and there is no `TOKEN` to configure.
The Express server forwards the signed-in user's Firebase ID token to
`POST /chat`, and `chatbot_server.py` passes it to `mcp_chatbot.py` through the
subprocess environment. Requests without one are rejected with 401.

**Flutter app** — terminal 5:

```powershell
flutter run
```

The app resolves its backend host per platform (`lib/config/api_config.dart`):
`10.0.2.2` on the Android emulator, `localhost` on web, desktop, and the iOS
simulator. On a physical device, point it at your machine's LAN address.

## Testing

The fast suites are deterministic and do not require Firebase or a running API:

```sh
flutter test
(cd server && npm test)
(cd web-admin && npm test)
(cd python && python -m unittest discover -s tests)
```

Flutter widget tests also check mobile tap targets, text contrast, and accessible
labels. Run Flutter analysis, backend type checking, and the admin lint/build
checks with `flutter analyze`, `cd server && npm run typecheck`, and
`cd web-admin && npm run lint && npm run build`, respectively. Device-level
journeys involving native permissions or camera access require a configured
emulator/device and are kept separate from the fast test suites.

## Documentation

### Android inventory push notifications (FCM)

All signed-in staff (admins, managers, and cashiers) receive stock and expiry
notifications. The Express API observes Firestore product changes and also scans
every minute so expiry alerts arrive even when no inventory is edited and the
phone app is closed. It uses the same rules as the Home inventory alerts:

- Low stock: at or below the product's positive reorder point.
- Very low stock: at or below 50% of the reorder point; zero stock is urgent.
- Expiring soon: a positive-quantity batch expires within seven days.
- Urgent expiry: within two days, or already expired.
- Discontinued products and depleted batches do not generate expiry alerts.

Delivery history is persisted per phone in the server-only `pushDevices`
Firestore collection. A phone receives currently active alerts on registration,
then only on a stock/expiry threshold transition or a change in the nearest
expiring batch date. Resolving and later re-entering an alert condition generates
a new notification. Quantity changes within the same threshold do not spam
staff. Failed sends retry on the next scan; uninstalled/invalid tokens are
removed. A crash between FCM acceptance and saving delivery history can cause a
duplicate (at-least-once delivery).

**Setup**

1. In Firebase Console, use project `helperhoa-5f706`. The Android registration
   must have package `com.example.project_implementation_helper_hoa`. Its
   downloaded config lives at `android/app/google-services.json`. This is a
   client config, **not** the private `server/service-account.json`; never put
   the service-account key in the Flutter assets or Android app.
2. Enable the **Firebase Cloud Messaging API (V1)** in that project. The backend
   service account needs permission to send FCM messages (for example Firebase
   Cloud Messaging API Admin), in addition to its existing Firestore access.
3. Keep `pushDevices` inaccessible to direct client Firestore reads/writes.
   Registration and removal go through authenticated API endpoints; the Admin
   SDK bypasses Firestore client rules. This app does not need direct Firestore
   access.
4. Fully rebuild and reinstall the Android app after adding plugins or replacing
   the Firebase config (`flutter run`; hot reload is not enough). Use a physical
   Android phone or an emulator with Google Play services. Point the app's API
   configuration at a backend it can reach.
5. Sign in and grant notification permission. **Settings > Push notifications**
   displays registration errors/permission status and persists the on/off choice.
   Turning it off or signing out unregisters the phone and invalidates its FCM
   token; signing in again registers a fresh token. Foreground alerts appear as
   an in-app banner; tapping a system notification opens Home inventory alerts.

**Keep the sender running:** run one always-on Express API process, or dedicate
one API instance to this sender. Do not horizontally scale the current embedded
worker: delivery history is persistent, but multiple workers can send the same
alert concurrently. If the laptop/server sleeps or the API stops, new alerts
cannot be detected until it resumes. There is no phone-side polling requirement
and no Cloud Functions deployment in this implementation.

**Phone verification**

1. Sign in, allow notifications, and check Settings says alerts are enabled.
2. Background the app or swipe it out of Recents (do **not** force-stop it).
3. Sell stock so it crosses the reorder point; expect a notification after the
   Firestore update. Further sales within the same threshold should not resend.
4. Set an in-stock batch expiry within seven days; expect an expiry notification.
   An expiry threshold reached solely by the passage of time is detected within
   a minute while the server is running.
5. Tap the notification to open Home, then test sign-out and the Settings toggle.
6. Restart the API and confirm unchanged alerts are not resent.

FCM/system delivery depends on connectivity, permission, Google Play services,
and device battery policies; high priority is requested but immediate delivery
is not guaranteed. Android force-stop blocks delivery until the app is opened.
This repository has no iOS target, so iPhone/APNs and web push are not enabled.

### Documentation map

Every topic, where it is explained, and the code that implements it.

| Looking for | Read | Implemented in |
|---|---|---|
| **System architecture**, tiers, data model, request flows, and *why* each decision was made | [architecture.md](architecture.md) | — |
| How the Express server is layered internally | [server/src/server-logic.md](server/src/server-logic.md) | `server/src/` |
| Python tier: venv, the two processes, chatbot, the 14 MCP tools | [python/py_readme.md](python/py_readme.md) | `python/` |
| Every app screen, written for store staff | [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | `lib/features/` |
| **Deploying** to Render, environment config, Firebase project setup | [docs/HOSTING.md](docs/HOSTING.md) | `render.yaml`, `server/Dockerfile` |
| **Testing the running system**, live API + device walkthrough | [live_testing.md](live_testing.md) | — |
| **Web admin panel**: how the dev server authenticates it, what it can reach | [architecture.md §4](architecture.md#4-how-the-web-client-shapes-the-backend) | `web-admin/vite.config.ts` |
| **Roles and token handling**: mobile sign-in vs the browser cookie session | [architecture.md §10](architecture.md#10-identity-roles-and-tokens) | `server/src/middlewares/auth.ts` |
| **Push notifications**: registration, trigger, dedupe, setup, verification | [README — FCM setup](#android-inventory-push-notifications-fcm) · [architecture.md §11](architecture.md#11-notifications) | `server/src/services/push-notification.service.ts` |
| **Camera**: invoice capture and barcode scanning, and the rejected OCR path | [architecture.md §16](architecture.md#16-mobile-and-device-capabilities) | `lib/features/snap_page.dart`, `web-admin/src/ScannerDialog.tsx` |
| **Backend security**: auth, authorisation, secrets, CORS, known gaps | [architecture.md §12](architecture.md#12-security) | `server/src/server.ts`, `server/src/config/` |
| **Invoice approval**: the three-tier scan → edit → approve flow | [architecture.md §7.4](architecture.md#74-invoice-approval-the-three-tier-flow) | `lib/features/invoice_review_page.dart` |
| **Known limitations** (undeployed Python tier, panel not deployable, mobile Sell screen) | [architecture.md §19](architecture.md#19-known-limitations) | — |
