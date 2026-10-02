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
| Express API | `server/` | 3000 | Auth, inventory, invoices, persistence to Firestore. Also hosts the MCP endpoint |
| Python AI | `python/` | 8000 | FastAPI chat server + MCP chatbot, calls the Express API |

The app talks to both servers. The Python tier never touches Firestore itself — it
calls the Express API over HTTP, so all writes go through one place.

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

The project id comes from the service account itself, so there is no project id
to configure. For this repo it is `helperhoa-cef06`.

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

## Documentation

| Document | Covers |
|---|---|
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Every screen in the app, for store staff |
| [python/py_readme.md](python/py_readme.md) | Python tier specifics: venv, the two processes, the chatbot |
| [server/src/server-logic.md](server/src/server-logic.md) | How the Express server is put together internally |
