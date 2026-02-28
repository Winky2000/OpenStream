'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from '../ui.module.css';

function errorMessageForKey(key) {
  const errorKey = String(key || '');
  if (errorKey === 'invalid') return 'Invalid password.';
  if (errorKey === 'rate') return 'Too many attempts. Please wait and try again.';
  if (errorKey === 'unexpected') return 'Login failed. Please try again.';
  return '';
}

export default function LoginFormClient({ initialErrorKey = '' }) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(() => errorMessageForKey(initialErrorKey));

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/whoami', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const role = data?.session?.role;
        if (role === 'admin' || role === 'guest') {
          window.location.replace('/');
        }
      } catch {
        // ignore
      }
    })();

    return () => ctrl.abort();
  }, []);

  const canSubmit = useMemo(() => password.trim().length > 0 && !submitting, [password, submitting]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
        cache: 'no-store',
      });

      if (res.ok) {
        window.location.assign('/');
        return;
      }

      if (res.status === 401) {
        setError('Invalid password.');
        return;
      }

      if (res.status === 429) {
        setError('Too many attempts. Please wait and try again.');
        return;
      }

      const text = await res.text().catch(() => '');
      setError(text || 'Login failed. Please try again.');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <noscript>
        <form className={styles.form} method="post" action="/api/login-form">
          <label className={styles.label}>
            Password
            <input className={styles.input} type="password" name="password" required />
          </label>
          <button className={styles.button} type="submit">Login</button>
        </form>
      </noscript>

      {error ? (
        <div className={styles.block} role="alert">
          <p className={styles.p} style={{ margin: 0 }}>
            <strong>{error}</strong>
          </p>
        </div>
      ) : null}

      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.label}>
          Password
          <input
            className={styles.input}
            type="password"
            name="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button className={styles.button} type="submit" disabled={!canSubmit}>
          {submitting ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </>
  );
}
