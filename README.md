OpenStream is a lightweight signup + invite flow for Jellyfin/Emby.

## What it does

- First run shows `/setup` to set **admin** and **guest** passwords.
- Guests can access:
	- `/signup` to submit a username + email
	- `/guide` for a step-by-step walkthrough
- OpenStream emails a unique link to `/set-password?token=...`.
- After the user sets a password, OpenStream provisions the user on Jellyfin/Emby (admin API key required).
- Admins configure SMTP + Jellyfin/Emby settings and see signups in `/admin`.

## Pages and roles

- `/setup`: first-run setup (sets admin + guest passwords).
- `/login`: login page (admin or guest).
- `/signup`: request access (requires you to be logged in).
- `/set-password?token=...`: invite link landing page; user sets their password and provisioning runs.
- `/admin`: signups dashboard (admin only).
- `/admin/settings`: configure servers, SMTP, libraries, base URL, requests integration, and view audit log (admin only).

## Requests app (Seerr)

OpenStream can optionally link to your Requests app during signup and (best-effort) create/import the provisioned user into Seerr.

- Configure this in **Admin settings → Requests (Jellyseerr/Overseerr)**.
- If you provide an API key, OpenStream will attempt to import the new user into Seerr after provisioning.
- **Set Seerr local password during provisioning**:
	- Enabled: OpenStream will attempt to set a Seerr local-user password using the password the user just chose on the invite page (the password is not stored by OpenStream).
	- Disabled: OpenStream will create the Seerr user without a password so Seerr can email the user a set-password link.

Notes:
- Requests user import only applies to **Jellyfin** provisioning.
- Seerr integration is best-effort: provisioning succeeds even if the Seerr call fails.

## Getting started

Run the development server:

```bash
npm run dev
```

Open http://localhost:3070.

## Docker (production)

1) Create a `.env` (recommended)

OpenStream uses a session cookie for login. For production, you should set a stable `OPENSTREAM_SESSION_SECRET` so sessions remain valid across container recreates.

If you do not set `OPENSTREAM_SESSION_SECRET`, OpenStream will generate one and store it on disk under your data directory (so it stays stable as long as the volume persists), but explicitly setting it is still recommended.

- Copy the example file: `.env.example` → `.env`
- Generate a secret (PowerShell):
	- `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
	- Set it in `.env` as `OPENSTREAM_SESSION_SECRET=...`

2) Run:

```bash
docker compose pull
docker compose up -d
```

This will pull the published image from GHCR (default tag: `latest`).

This uses port `3070` and persists state to `./data/openstream.json`.

OpenStream keeps a small rolling set of backups of the state file on each write:

- `openstream.json.bak1` … `openstream.json.bak5`

An append-only audit log is stored in the state file and viewable in **Admin settings → Audit**.

### Configuration checklist (admin)

In **/admin/settings**, configure:

- **Base URL**: set the public URL users use to access OpenStream.
	- This is used to generate invite links.
	- Example: `https://openstream.example.com` (reverse proxy) or `http://192.168.1.167:3070` (LAN).
- **SMTP**: required to send invite emails.
	- If SMTP is missing, the `/signup` request will be rejected.
- **Servers**: add at least one Jellyfin/Emby server.
	- Required: server base URL and an admin API key.
	- Optional: “Connection URL” shown to users (often your public hostname).
- **Libraries** (optional): choose which libraries are offered during signup.
- **Requests (Jellyseerr/Overseerr)** (optional): configure Seerr integration (see below).

### Environment variables

- `OPENSTREAM_DATA_PATH` (default is `data/openstream.json` in the container)
	- Where OpenStream stores persistent state.
- `OPENSTREAM_PUBLIC_BASE_URL`
	- Public URL used for invite links.
- `OPENSTREAM_SESSION_SECRET`
	- Strong random secret used to sign the session cookie.
- `OPENSTREAM_DEBUG_ENDPOINTS=1` (optional)
	- Enables debug endpoints (disabled by default in production).
- `NEXT_PUBLIC_OPENSTREAM_POSTER_MARQUEE_SECONDS=55` (optional)
	- Poster carousel speed (seconds per full loop).

### Reverse proxy notes

- Ensure your proxy forwards `X-Forwarded-Proto` (OpenStream uses it to decide whether to set `Secure` cookies).
- Avoid caching dynamic pages.
	- OpenStream sets `Cache-Control: private, no-store` and `Vary: Cookie` on user-facing pages, but some proxy/CDN setups can still override this.
- If you publish OpenStream on the internet, firewall the container so only the reverse proxy can reach it.
	- Rate limiting is IP-based and uses forwarded IP headers (normal behind a proxy), which should not be trusted from arbitrary clients.

### Built-in endpoints

- `GET /api/health`: runtime/config status.
- `GET /api/version`: version info.
	- These endpoints intentionally return limited session-secret diagnostics unless `OPENSTREAM_DEBUG_ENDPOINTS=1` is enabled.

### Troubleshooting

- Check runtime status: `/api/health`
- Confirm which build is running: `/api/version`

Optional debug endpoints (disabled in production by default):

- Enable with `OPENSTREAM_DEBUG_ENDPOINTS=1`
- Debug routes:
	- `/api/whoami`
	- `/login/debug`
	- `/signup/debug`
	- `/admin/debug`
	- `/api/login` (GET only; POST is always available)
