import { redirect } from 'next/navigation';
import { randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import styles from '../ui.module.css';
import { readState } from '@/lib/store';
import { clearSession, getSession } from '@/lib/session';
import { getRequestOrigin } from '@/lib/request';
import PosterCarousel from '@/components/PosterCarousel';
import ServerLibraryPicker from '@/components/ServerLibraryPicker';

export default async function SignupPage({ searchParams }) {
  const state = readState();
  if (!state.setup?.complete) redirect('/setup');

  const session = await getSession();
  if (!session) {
    return (
      <div className={styles.container}>
        <h1 className={styles.h1}>Login required</h1>
        <p className={styles.p}>Please log in to continue.</p>
        <p className={styles.p}>
          <a className={styles.a} href="/login">Go to login</a>
        </p>
      </div>
    );
  }

  const sp = await Promise.resolve(searchParams);
  const sent = String(sp?.sent || '') === '1';

  const enabledServers = (Array.isArray(state.servers) ? state.servers : []).filter((s) => s.enabled);
  const seerrUrl = String(state.seerr?.url || '').trim();
  const aboutText = String(state.about?.text || '').trim();
  const signupServers = enabledServers.map((s) => {
    const libs = Array.isArray(s.libraries) ? s.libraries : [];
    const offeredIds = Array.isArray(s.offeredLibraryIds) ? s.offeredLibraryIds : null;
    const offeredSet = offeredIds ? new Set(offeredIds.map(String)) : null;
    const offeredLibraries = offeredSet ? libs.filter((l) => offeredSet.has(String(l.id))) : libs;
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      libraries: offeredLibraries,
    };
  });

  const marqueeSecondsRaw = Number(process.env.NEXT_PUBLIC_OPENSTREAM_POSTER_MARQUEE_SECONDS ?? 55);
  const marqueeSeconds = Number.isFinite(marqueeSecondsRaw) && marqueeSecondsRaw > 0 ? marqueeSecondsRaw : 55;

  const stepHeaderBackgrounds = [
    'var(--stepHeaderBg1)',
    'var(--stepHeaderBg2)',
    'var(--stepHeaderBg3)',
    'var(--stepHeaderBg4)',
    'var(--stepHeaderBg5)',
  ];
  const stepBorder = 'rgba(127,127,127,0.45)';

  const step1Bg = stepHeaderBackgrounds[randomInt(stepHeaderBackgrounds.length)];
  const step2Bg = stepHeaderBackgrounds[randomInt(stepHeaderBackgrounds.length)];
  const step3Bg = stepHeaderBackgrounds[randomInt(stepHeaderBackgrounds.length)];
  const step4Bg = stepHeaderBackgrounds[randomInt(stepHeaderBackgrounds.length)];
  const step5Bg = stepHeaderBackgrounds[randomInt(stepHeaderBackgrounds.length)];
  const step6Bg = stepHeaderBackgrounds[randomInt(stepHeaderBackgrounds.length)];
  const stepBodyBg = 'rgba(127,127,127,0.06)';

  async function signupAction(formData) {
    'use server';
    const username = String(formData.get('username') || '');
    const email = String(formData.get('email') || '');
    const serverId = String(formData.get('serverId') || '');
    const requestedLibraryIds = formData.getAll('requestedLibraryId').map((x) => String(x));

    const cookieHeader = (await cookies())
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');

    const origin = await getRequestOrigin();
    const res = await fetch(`${origin}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({ username, email, serverId, requestedLibraryIds }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Signup failed');
    }

    redirect('/signup?sent=1');
  }

  return (
    <div className={styles.container}>
      {sent ? (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Request sent">
          <div className={styles.modal}>
            <h2 className={styles.h2} style={{ marginTop: 0 }}>Request sent</h2>
            <p className={styles.p}>
              Check your email for a unique link. Open it to set your password and finish creating your account.
            </p>
            <p className={styles.p}>
              After that, open Jellyfin/Emby and sign in with the username you requested and the password you set.
            </p>
            <div className={styles.modalActions}>
              <a className={styles.a} href="/signup">Close</a>
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.row}>
        <h1 className={styles.h1}>Welcome to Jellyfin</h1>
        <form action={async () => {
          'use server';
          await clearSession();
          redirect('/login');
        }}>
          <button className={styles.linkButton} type="submit">Logout</button>
        </form>
      </div>

      <p className={styles.p}>
        You’re joining a private Jellyfin server. Use the steps below to request access and get connected on your device.
      </p>

      <PosterCarousel durationSeconds={marqueeSeconds} />

      <details className={styles.stepDetails} open={sent}>
        <summary
          className={styles.stepSummary}
          style={{
            '--stepHeaderBg': step1Bg,
            '--stepHeaderBorder': stepBorder,
            '--stepBodyBg': stepBodyBg,
          }}
        >
          Step 1: Request Access
        </summary>
        <div className={styles.stepBody}>
          <div className={styles.stepInner}>
            <p className={styles.p}>Enter a username and email. We’ll email you a unique link to finish creating your account.</p>
            {sent ? (
              <p className={styles.p}><strong>Sent.</strong> Check your email for the link.</p>
            ) : null}

            {enabledServers.length === 0 ? (
              <p className={styles.p}><strong>No servers are enabled yet.</strong> Ask an admin to enable a server in /admin/settings.</p>
            ) : null}

            <form className={`${styles.form} ${styles.narrowForm}`} action={signupAction}>
              <label className={styles.label}>
                Username
                <input
                  className={styles.input}
                  name="username"
                  autoComplete="username"
                  placeholder="yourname"
                  required
                />
              </label>

              <label className={styles.label}>
                Email
                <input
                  className={styles.input}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </label>

              <ServerLibraryPicker servers={signupServers} />

              <button className={styles.button} type="submit" disabled={enabledServers.length === 0}>Send me the link</button>
            </form>

            <p className={styles.p}><a className={styles.a} href="/guide">Step-by-step guide</a></p>
          </div>
        </div>
      </details>

      <details className={styles.stepDetails}>
        <summary
          className={styles.stepSummary}
          style={{
            '--stepHeaderBg': step2Bg,
            '--stepHeaderBorder': stepBorder,
            '--stepBodyBg': stepBodyBg,
          }}
        >
          Step 2: Get Apps
        </summary>
        <div className={styles.stepBody}>
          <div className={styles.stepInner}>
            <p className={styles.p}>Install the app (or use the web player) on the device you’ll watch on.</p>

            <p className={styles.p}><strong>Jellyfin</strong></p>
            <p className={styles.p}>
              <a className={styles.a} href="https://jellyfin.org/clients/" target="_blank" rel="noreferrer">
                Jellyfin clients (official links)
              </a>
            </p>

            <p className={styles.p}><strong>Roku</strong>: Home → Streaming Channels → search “Jellyfin” → Add Channel → Open.</p>
            <p className={styles.p}><strong>Fire TV / Fire Stick</strong>: Find → Search → “Jellyfin” → Download/Get → Open.</p>

            <p className={styles.p}>
              More info: <a className={styles.a} href="https://github.com/jellyfin/jellyfin-roku" target="_blank" rel="noreferrer">Roku</a> ·{' '}
              <a className={styles.a} href="https://github.com/jellyfin/jellyfin-androidtv" target="_blank" rel="noreferrer">Fire TV/Android TV</a>
            </p>

            <p className={styles.p}><strong>Emby</strong></p>
            <p className={styles.p}>
              <a className={styles.a} href="https://emby.media/support/articles/Home.html" target="_blank" rel="noreferrer">
                Emby apps (official links)
              </a>
            </p>

            <p className={styles.p}><strong>Roku</strong>: Streaming Store → search “Emby” → Add channel → Open.</p>
            <p className={styles.p}><strong>Fire TV / Fire Stick</strong>: Find → Search → “Emby” → Download/Get → Open.</p>
          </div>
        </div>
      </details>

      <details className={styles.stepDetails}>
        <summary
          className={styles.stepSummary}
          style={{
            '--stepHeaderBg': step3Bg,
            '--stepHeaderBorder': stepBorder,
            '--stepBodyBg': stepBodyBg,
          }}
        >
          Step 3: Connection
        </summary>
        <div className={styles.stepBody}>
          <div className={styles.stepInner}>
            <p className={styles.p}>
              Open your Jellyfin app (or web player), add a server, and enter the Connection URL below.
            </p>

            {enabledServers.length === 0 ? (
              <p className={styles.p}><strong>No servers are enabled yet.</strong> Ask an admin to enable a server in /admin/settings.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Server</th>
                      <th>Connection URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enabledServers.map((s) => (
                      <tr key={s.id}>
                        <td>{s.name} ({s.type})</td>
                        <td>{s.connectionUrl || s.baseUrl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className={styles.p}>
              You’ll sign in using the username you requested and the password you set from the emailed link.
            </p>
          </div>
        </div>
      </details>

      <details className={styles.stepDetails}>
        <summary
          className={styles.stepSummary}
          style={{
            '--stepHeaderBg': step4Bg,
            '--stepHeaderBorder': stepBorder,
            '--stepBodyBg': stepBodyBg,
          }}
        >
          Step 4: Configuration
        </summary>
        <div className={styles.stepBody}>
          <div className={styles.stepInner}>
            <p className={styles.p}>
              A couple quick settings make the experience feel a lot better. Most Jellyfin/Emby apps have these under
              <strong> App Settings</strong>.
            </p>

            <ol className={styles.ol}>
              <li>
                <strong>Favorites</strong>: when you find something you like, mark it as a favorite (⭐/❤) so it shows up
                faster later.
              </li>
              <li>
                <strong>Home screen</strong>: pin your favorite libraries/sections so they’re right on the first page.
              </li>
              <li>
                <strong>Subtitles & audio</strong>: set your preferred subtitle/audio language so new episodes “just work.”
              </li>
              <li>
                <strong>Playback quality</strong>: if you get buffering, lower the app’s max streaming bitrate (or leave it
                on Auto when available).
              </li>
            </ol>

            <p className={styles.p}>
              Note: some settings may be controlled by the server admin.
            </p>

            <p className={styles.p}>
              Official docs: {' '}
              <a className={styles.a} href="https://jellyfin.org/clients/" target="_blank" rel="noreferrer">Jellyfin clients</a>
              {' · '}
              <a className={styles.a} href="https://jellyfin.org/docs/general/server/users/" target="_blank" rel="noreferrer">Jellyfin users</a>
              {' · '}
              <a className={styles.a} href="https://emby.media/support/articles/Home.html" target="_blank" rel="noreferrer">Emby docs home</a>
              {' · '}
              <a className={styles.a} href="https://emby.media/support/articles/Transcoding.html" target="_blank" rel="noreferrer">Emby playback/transcoding</a>
              {' · '}
              <a className={styles.a} href="https://emby.media/support/articles/Users.html" target="_blank" rel="noreferrer">Emby users</a>
            </p>
          </div>
        </div>
      </details>

      <details className={styles.stepDetails}>
        <summary
          className={styles.stepSummary}
          style={{
            '--stepHeaderBg': step5Bg,
            '--stepHeaderBorder': stepBorder,
            '--stepBodyBg': stepBodyBg,
          }}
        >
          Step 5: Requests
        </summary>
        <div className={styles.stepBody}>
          <div className={styles.stepInner}>
            <p className={styles.p}>
              Want something added? Use our Requests app to request movies and shows.
            </p>

            {seerrUrl ? (
              <>
                <p className={styles.p}>
                  <a className={styles.a} href={seerrUrl} target="_blank" rel="noreferrer">Open Requests</a>
                  <br />
                  Log in using your Jellyfin/Emby username and password.
                  <br />
                  If something isn’t working, you can report it here too.
                </p>
              </>
            ) : (
              <p className={styles.p}><em>Requests isn’t set up yet.</em> Ask an admin to add it in /admin/settings.</p>
            )}
          </div>
        </div>
      </details>

      <details className={styles.stepDetails}>
        <summary
          className={styles.stepSummary}
          style={{
            '--stepHeaderBg': step6Bg,
            '--stepHeaderBorder': stepBorder,
            '--stepBodyBg': stepBodyBg,
          }}
        >
          Step 6: About
        </summary>
        <div className={styles.stepBody}>
          <div className={styles.stepInner}>
            {aboutText ? (
              <p className={`${styles.p} ${styles.preWrap}`}>{aboutText}</p>
            ) : (
              <p className={styles.p}>
                <em>About info hasn’t been added yet.</em> Ask an admin to set it in /admin/settings.
              </p>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
