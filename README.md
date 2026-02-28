OpenStream is a lightweight signup + invite flow for Jellyfin/Emby.

## What it does

- First run shows `/setup` to set **admin** and **guest** passwords.
- Guests can access:
	- `/signup` to submit a username + email
	- `/guide` for a step-by-step walkthrough
- OpenStream emails a unique link to `/set-password?token=...`.
- After the user sets a password, OpenStream provisions the user on Jellyfin/Emby (admin API key required).
- Admins configure SMTP + Jellyfin/Emby settings and see signups in `/admin`.

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

### Required admin configuration

- Optional: set `NEXT_PUBLIC_OPENSTREAM_POSTER_MARQUEE_SECONDS` to control the poster carousel speed (default: `55`). Restart the app/container after changing it.
- OpenStream stores state in a local JSON file (path controlled by `OPENSTREAM_DATA_PATH`).
- Set `OPENSTREAM_PUBLIC_BASE_URL` to the URL users use to access OpenStream (used for invite links).
	- Examples: `http://192.168.1.167:3070` (LAN) or `https://openstream.example.com` (reverse proxy)
- For production, set `OPENSTREAM_SESSION_SECRET` (for Compose, put it in `.env`) so login sessions remain valid across container recreates.
- This is an MVP; we can tighten validations, add resend/expire flows, and harden the Jellyfin/Emby API integration as we go.

### Troubleshooting

- Check runtime status: `/api/health`
- Confirm which build is running: `/api/version`
