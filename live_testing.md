# Live Testing Guide

Test plan for the deployed Helper Hoa application. Everything described here
has been verified against the running service.

---

## 1. What is deployed

| Tier | Status | Where |
|------|--------|-------|
| Express API (`server/`) | **Live** | `https://helperhoa-server.onrender.com` |
| Flutter app (Android) | Built, installable | `build/app/outputs/flutter-apk/app-debug.apk` |
| Python chatbot + scanner | **Not deployed** | See [section 7](#7-not-deployed-chatbot-and-invoice-scanner) |

---

## 2. Access

**Base URL**

```bash
U=https://helperhoa-server.onrender.com
```

**Test accounts** — all three use the password `password123`

| Email | Role |
|-------|------|
| `admin@example.com` | admin |
| `manager@example.com` | manager |
| `cashier@example.com` | cashier |

---

## 3. Before you start

**The service sleeps.** Render's free tier shuts down after 15 minutes without
inbound traffic, and the first request afterwards takes roughly a minute to wake.
Send one request before you begin so you are not reading timeouts as faults:

```bash
curl -s $U/api/ai/health
```

**One known fault.** `/inventory-alerts` currently returns **HTTP 500** because
its Firestore query needs a composite index that has not been deployed. See
[section 6](#6-known-issues). A second defect on `POST /products/:id/batches` is
also outstanding.

---

## 4. API tests

All commands below were run against the live service; the status codes are the
observed results, not expectations.

### 4.1 Availability

```bash
curl -s -w " <- %{http_code}\n" $U/api/ai/health
```

`{"status":"ok","ai":"route"} <- 200`

Confirms the process is up. This route is static and never touches Firestore, so
it proves nothing about the database.

### 4.2 Authentication is enforced

```bash
curl -s -o /dev/null -w "%{http_code}\n" $U/products
```

`401`

**401 rather than 500 is the pass condition.** It proves the server started, the
Firestore client initialised against your secret file, and auth middleware is
live. A 500 means the service account could not be read.

### 4.3 Log in

```bash
curl -s -X POST $U/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

`200`, returns `idToken`, `refreshToken`, `expiresIn`. **Save the token** for the
next steps:

```bash
TOKEN=<paste idToken>
```

Requests use `Authorization: Bearer $TOKEN`.

### 4.4 Read data

```bash
curl -s -H "Authorization: Bearer $TOKEN" $U/products          # 13 items
curl -s -H "Authorization: Bearer $TOKEN" $U/products/alerts   # alert array
curl -s -H "Authorization: Bearer $TOKEN" $U/invoices          # invoice array
curl -s -H "Authorization: Bearer $TOKEN" $U/admin/dashboard   # counts
curl -s -H "Authorization: Bearer $TOKEN" $U/admin/vendors     # 4 vendors
curl -s -H "Authorization: Bearer $TOKEN" $U/admin/sales       # 2 sales
```

`/admin/dashboard` returns:

```json
{"productCount":13,"userCount":3,"vendorCount":4,"salesCount":2,
 "revenue":19,"lowStockCount":7}
```

A 401 here means the token expired. Firebase ID tokens last one hour; call
`POST /auth/refresh` with the refresh token to get a new one.

### 4.5 Role-based access control

Read access, observed live. This is the clearest thing to demonstrate:

| Request | admin | manager | cashier |
|---------|-------|---------|---------|
| `GET /products` | 200 | 200 | 200 |
| `GET /admin/dashboard` | 200 | **403** | **403** |
| `GET /inventory-alerts` | 500 | 500 | 500 |

Cashier and manager can read stock but are refused administrative routes.
`/admin/*` applies `requireRole(['admin'])` to the whole router, while
`/products` reads allow all three roles.

Write access. Observed with an empty `{}` body, which the write routes accept up
to their own validation:

| Request | manager | cashier |
|---------|---------|---------|
| `POST /products` | **403** | **403** |
| `POST /products/:id/batches` | 500 — see [6.2](#62-post-productsidbatches-returns-500) | **403** |
| `POST /api/invoices` | 400 — role passed, body rejected | **403** |

**403 is the pass condition** for a denied role: the request is refused before
any write is attempted. A 400 from `/api/invoices` is also correct behaviour —
the manager cleared the role check and was then rejected for an empty payload.
Admin is permitted all three by `requireRole`.

### 4.6 Endpoint reference

| Method | Path | Roles |
|--------|------|-------|
| GET | `/api/ai/health` | public |
| POST | `/auth/login` | public |
| POST | `/auth/refresh` | public |
| GET | `/auth/me` | any |
| GET | `/products`, `/products/:id`, `/products/sku/:sku`, `/products/alerts` | admin, manager, cashier |
| POST | `/products/:id/sell` | admin, manager, cashier |
| POST | `/products/:id/batches` | admin, manager |
| POST, PATCH, DELETE | `/products`, `/products/:id` | admin |
| GET | `/inventory-alerts` | admin, manager, cashier |
| GET | `/invoices` | admin, manager |
| POST | `/invoices` | admin, manager |
| GET, POST | `/admin/dashboard`, `/admin/products`, `/admin/users`, `/admin/vendors`, `/admin/sales` | admin |
| PATCH, DELETE | `/admin/*/:id` | admin |
| POST | `/api/invoices` | admin, manager |
| PUT, DELETE | `/push/devices` | admin, manager, cashier |
| POST | `/api/ai/chat` | any — **fails, see section 7** |

---

## 5. App tests

### 5.1 Run with the console visible

Use `flutter run`, not a prebuilt APK. An installed debug APK writes no Dart logs,
so failures are invisible:

```bash
flutter run --dart-define=EXPRESS_BASE_URL=https://helperhoa-server.onrender.com
```

Without the override the app targets `10.0.2.2:3000` and cannot reach the
deployment. Leave `PYTHON_BASE_URL` unset.

### 5.2 Screen checklist

| Screen | Expected | Tests |
|--------|----------|-------|
| Sign in | Email, password, Gmail, Apple | — |
| `/` Home | renders after login | token attached to requests |
| `/stock` | product list | `GET /products` |
| `/inventory` | 13 items, low-stock badges | `GET /products/alerts` |
| `/sell` | sale completes | `POST /products/:id/sell` |
| `/inventory` after sale | stock decrements | Firestore write |
| `/snap` | **error message** | Python not deployed — see section 7 |
| `/ask-hoa` | **error message** | Python not deployed — see section 7 |
| `/profile` | shows `admin@example.com` | `GET /auth/me` |
| `/settings` | push notification toggle | FCM registration |

The two failures are correct behaviour, not defects. Both surfaces report a
specific, non-generic reason, which is worth showing.

### 5.3 Push notifications

Requires a device or an emulator running a Google Play image. Registration
returns **409** if the app's Firebase project differs from the server's; both
are currently `helperhoa-5f706`, so 204 is expected.

---

## 6. Known issues

Two faults were found while writing this guide. Both are reachable from the
public API. Neither is a deployment misconfiguration.

### 6.1 `/inventory-alerts` returns 500

**Symptom.** `GET /inventory-alerts` returns, for every role:

```
FAILED_PRECONDITION: The query requires an index.
```

**Cause.** `InventoryAlertService.getAlerts()` requests
`store.products({ activeOnly: true })`. That adds
`where('status', '==', 'active')` to a query already ordered by `name`, and
Firestore requires a composite index for a filter combined with an ordering. The
code notes this at `server/src/store/store-firestore.ts:46`.

`GET /products` is unaffected because it omits `activeOnly`, so it never builds
the compound query. This is why one route fails and the other does not.

**Fix.** `firestore.indexes.json` has been added with the three indexes the
query can produce (by `status`, by `category`, and by both), referenced from
`firebase.json`. Deploy once:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:indexes
```

Alternatively create the `status` + `name` ascending index by hand in
Firestore console > Indexes. Building an index takes a minute or two; until it
exists this route keeps returning 500.

### 6.2 `POST /products/:id/batches` returns 500

**Symptom.** A permitted caller (admin or manager) posting a body without a
numeric `quantity` receives:

```
Value for argument "FieldValue.increment()" is not a valid number.
```

**Cause.** `server/src/routes/products.routes.ts:82` forwards `req.body`
straight to `service.receiveInventory()` with no validation, unlike `/sell` and
`/api/invoices`, which check their payloads first. A missing quantity reaches
`FieldValue.increment(undefined)` at
`server/src/store/store-firestore.ts:238` and throws.

**Impact.** Malformed input returns 500 where 400 is correct. The request is
rejected either way and no partial write occurs, so it is a correctness and
error-reporting defect rather than a data-loss one. Cashiers are unaffected —
they are refused with 403 before the body is read.

**Fix.** Validate the batch payload in the route, rejecting a non-numeric or
missing `quantity` with 400 before calling the service.

---

## 7. Not deployed: chatbot and invoice scanner

The `Ask Hoa` chatbot and the `Snap` invoice scanner are **fully implemented**
and run locally. They are absent from the deployment for hosting reasons only.
Both surface a specific error rather than failing opaquely:

- `Ask Hoa` — `AI service is unreachable at http://localhost:8000. Is the Python chatbot server running?`
- `Snap` — `Could not reach the scanner at http://localhost:8000. Is the Python server running?`

### Why they are not deployed

**1. The free tier cannot hold the Python process.**
`python/chatbot_server.py` needs roughly 2–3 GB for langchain, langgraph,
fastmcp and llama-cloud. Render's free plan provides 512 MB RAM and 0.1 CPU. The
process would be killed on load, so the only viable option is a paid instance of
about 2 GB, which requires a payment method. The deployment was kept on the free
tier deliberately.

**2. The chatbot reads back from the Express API, creating a circular
dependency.** Its MCP tools fetch products and inventory through
`MCP_API_BASE_URL`, which defaults to `http://localhost:3000`
(`python/chatbot_server.py:89`). With Express on Render, that default points at
the chatbot's own machine, so every tool call would fail even once the process
started. It must be repointed at the hosted URL.

**3. Two sleeping services compound.** Express already costs about a minute to
wake. Adding a second service that also sleeps after 15 idle minutes means the
first user action waits through two cold starts.

**4. A local tunnel was rejected as unreliable.** Exposing the laptop through
ngrok or Cloudflare gives an address that **changes on every restart**, which
would mean editing `PYTHON_AI_URL` on Render and redeploying before every
demonstration, and breaks whenever the machine sleeps or loses network. Not a
sound basis for a graded demonstration.

**5. The LLM credentials are deliberately not in the deployment.**
`UOA_API_KEY` and `LLAMA_CLOUD_API_KEY` are held locally and were never
committed or added to the shared Render service. Without them `/chat` and
`/scan/invoice` return HTTP 503 `LLM not configured` wherever they run.

### To test these features

They require the Python tier running locally with valid credentials:

```bash
cd python
pip install -r requirements.txt
export UOA_API_KEY=...
export LLAMA_CLOUD_API_KEY=...
python chatbot_server.py
```

Then build the app against both tiers:

```bash
flutter run \
  --dart-define=EXPRESS_BASE_URL=https://helperhoa-server.onrender.com \
  --dart-define=PYTHON_BASE_URL=http://10.0.2.2:8000
```

For a deployed chatbot, host the Python tier on a paid instance (about 2 GB),
set `PYTHON_AI_URL` on Render to its URL, and set `MCP_API_BASE_URL` to the
deployed Express URL so its tools can read data.

> **If you need the chatbot or the invoice scanner tested as part of your
> assessment, contact me at gsri145@aucklanduni.ac.nz** to arrange access, since
> it depends on local credentials and hardware that are not part of the public
> deployment.

---

## 8. Regression suites

```bash
cd server && npm test     # 32 passing
flutter test
```

`flutter test` has three pre-existing failures in the invoice-review widget
tests. They are unrelated to deployment — that suite exercises local widget
rendering and never reaches the network.

---

## 9. Quick check

Everything that matters, in four commands:

```bash
U=https://helperhoa-server.onrender.com
curl -s -o /dev/null -w "health  %{http_code}\n" $U/api/ai/health          # 200
curl -s -o /dev/null -w "anon    %{http_code}\n" $U/products              # 401
T=$(curl -s -X POST $U/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['idToken'])")
curl -s -o /dev/null -w "auth    %{http_code}\n" -H "Authorization: Bearer $T" $U/products  # 200
curl -s -H "Authorization: Bearer $T" $U/admin/dashboard                  # counts
```

Expected: `200`, `401`, `200`, then the dashboard counts. Anything else means
the deployment changed — check the Render log before assuming a code fault.