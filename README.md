OpenStream is a lightweight signup + invite flow for Jellyfin/Emby.

## What it does

- First run shows `/setup` to set **admin** and **guest** passwords.
- Guests can access:
	- `/signup` to submit a username + email
	- `/guide` for a step-by-step walkthrough
- OpenStream emails a unique link to `/set-password?token=...`.
- After the user sets a password, OpenStream provisions the user on Jellyfin/Emby (admin API key required).
- Admins configure SMTP + Jellyfin/Emby settings and see signups in `/admin`.

## Getting started

Run the development server:

```bash
npm run dev
```

Open http://localhost:3070.

## Docker (production)

Run:

```bash
docker compose up --build
```

This uses port `3070` and persists state to `./data/openstream.json`.

### Required admin configuration

- Configure SMTP and Jellyfin/Emby base URL + admin API key in `/admin/settings`.
- Set `OPENSTREAM_PUBLIC_BASE_URL` (used for the emailed invite link). In Docker this is set in `docker-compose.yml`.

## Notes

- OpenStream stores state in a local JSON file (path controlled by `OPENSTREAM_DATA_PATH`).
- For production, set `OPENSTREAM_SESSION_SECRET` so login sessions remain valid across restarts.
- This is an MVP; we can tighten validations, add resend/expire flows, and harden the Jellyfin/Emby API integration as we go.
