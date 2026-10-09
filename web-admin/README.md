# Helper Hoa Admin Web Client

The local React development server acts as a small **auth gateway** in front of the admin API. On startup it signs in through the API with the seeded admin credentials from the repository-root `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), keeps the resulting Firebase **ID token** and refresh token in the Node process, and refreshes the token before it expires. The browser only ever holds a short-lived HttpOnly session cookie; no token is embedded in the React bundle or returned to browser JavaScript.

## Configure and run

1. Ensure `server/.env` has `FIREBASE_WEB_API_KEY`, and that the repository root has `service-account.json`. The backend needs both.
2. Seed the demo admin so it can sign in:

   ```sh
   cd server
   npm run seed
   ```

   The gateway defaults to `admin@example.com` / `password123`; override it with `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the **repository-root** `.env`. Do not commit that file.
3. Run the API in one terminal:

   ```sh
   cd server
   npm run dev
   ```

4. Run the web client in another terminal:

   ```sh
   cd web-admin
   npm install
   npm run dev
   ```

5. Open the local URL printed by Vite, usually `http://localhost:5173`, then select **Sign in with admin token**.

If the API is not running yet, sign-in reports it and retries; start the server and sign in again. A missing or wrong credential is reported the same way so it can be fixed in `.env` without inspecting the network tab.

## Checks

```sh
npm run lint
npm run test
npm run build
```

The gateway is for local development only. Keep Vite bound to localhost; do not expose it to a network or deploy it as production authentication. A deployed client needs a real sign-in flow with a server-side session/token exchange.
