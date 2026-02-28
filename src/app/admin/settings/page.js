import { redirect } from 'next/navigation';
import styles from '../../ui.module.css';
import { readState } from '@/lib/store';
import { getSession } from '@/lib/session';
import { getRequestOrigin } from '@/lib/request';

export default function AdminSettingsPage() {
  const state = readState();
  if (!state.setup?.complete) redirect('/setup');

  const session = getSession();
  if (!session) redirect('/login');
  if (session.role !== 'admin') redirect('/signup');

  const smtp = state.smtp || {};
  const jellyfin = state.servers?.jellyfin || {};
  const emby = state.servers?.emby || {};

  async function saveAction(formData) {
    'use server';
    const body = {
      smtp: {
        host: String(formData.get('smtpHost') || ''),
        port: Number(formData.get('smtpPort') || 587),
        secure: String(formData.get('smtpSecure') || '') === 'on',
        user: String(formData.get('smtpUser') || ''),
        pass: String(formData.get('smtpPass') || ''),
        from: String(formData.get('smtpFrom') || ''),
      },
      servers: {
        jellyfin: {
          baseUrl: String(formData.get('jellyfinBaseUrl') || ''),
          apiKey: String(formData.get('jellyfinApiKey') || ''),
        },
        emby: {
          baseUrl: String(formData.get('embyBaseUrl') || ''),
          apiKey: String(formData.get('embyApiKey') || ''),
        },
      },
    };

    const origin = getRequestOrigin();
    const res = await fetch(`${origin}/api/admin/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Save failed');
    }

    redirect('/admin');
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.h1}>Admin settings</h1>

      <form className={styles.form} action={saveAction}>
        <h2 className={styles.h2}>SMTP</h2>
        <label className={styles.label}>Host<input className={styles.input} name="smtpHost" defaultValue={smtp.host || ''} /></label>
        <label className={styles.label}>Port<input className={styles.input} name="smtpPort" type="number" defaultValue={smtp.port || 587} /></label>
        <label className={styles.checkbox}><input type="checkbox" name="smtpSecure" defaultChecked={Boolean(smtp.secure)} /> Use TLS (secure)</label>
        <label className={styles.label}>User<input className={styles.input} name="smtpUser" defaultValue={smtp.user || ''} /></label>
        <label className={styles.label}>Pass (leave blank to keep existing)<input className={styles.input} name="smtpPass" type="password" /></label>
        <label className={styles.label}>From<input className={styles.input} name="smtpFrom" placeholder="OpenStream <no-reply@example.com>" defaultValue={smtp.from || ''} /></label>

        <h2 className={styles.h2}>Jellyfin</h2>
        <label className={styles.label}>Base URL<input className={styles.input} name="jellyfinBaseUrl" placeholder="https://jellyfin.example.com" defaultValue={jellyfin.baseUrl || ''} /></label>
        <label className={styles.label}>Admin API key<input className={styles.input} name="jellyfinApiKey" type="password" defaultValue={jellyfin.apiKey || ''} /></label>

        <h2 className={styles.h2}>Emby</h2>
        <label className={styles.label}>Base URL<input className={styles.input} name="embyBaseUrl" placeholder="https://emby.example.com" defaultValue={emby.baseUrl || ''} /></label>
        <label className={styles.label}>Admin API key<input className={styles.input} name="embyApiKey" type="password" defaultValue={emby.apiKey || ''} /></label>

        <button className={styles.button} type="submit">Save</button>
      </form>

      <p className={styles.p}><a className={styles.a} href="/admin">Back</a></p>
    </div>
  );
}
