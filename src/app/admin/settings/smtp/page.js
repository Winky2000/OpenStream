import styles from '../../../ui.module.css';
import { readState } from '@/lib/store';
import { saveSmtpAction, testSmtpAction } from '../actions';

export default async function SmtpSettingsPage({ searchParams }) {
  const state = readState();
  const smtp = state.smtp || {};

  const smtpTestStatus = String(searchParams?.smtpTest || '');
  const smtpTestErrRaw = String(searchParams?.smtpTestErr || '');
  let smtpTestErr = '';
  try {
    smtpTestErr = smtpTestErrRaw ? decodeURIComponent(smtpTestErrRaw) : '';
  } catch {
    smtpTestErr = smtpTestErrRaw;
  }

  return (
    <div className={styles.block}>
      <form className={styles.form} action={saveSmtpAction}>
        <h2 className={styles.h2}>SMTP</h2>
        {smtpTestStatus === 'sent' ? (
          <p className={styles.p}><strong>Test email sent.</strong> If you don’t see it, check spam/junk.</p>
        ) : smtpTestStatus === 'failed' ? (
          <p className={styles.p}>
            <strong>Test email failed.</strong>{' '}
            {smtpTestErr ? (
              <>Reason: <span className={styles.muted}>{smtpTestErr}</span></>
            ) : (
              <>Check your SMTP settings and server logs.</>
            )}
          </p>
        ) : null}
        <label className={styles.label}>Host<input className={styles.input} name="smtpHost" placeholder="smtp.gmail.com" defaultValue={smtp.host || ''} /></label>
        <label className={styles.label}>Port<input className={styles.input} name="smtpPort" type="number" placeholder="587" defaultValue={smtp.port || 587} /></label>
        <label className={styles.checkbox}><input type="checkbox" name="smtpSecure" defaultChecked={Boolean(smtp.secure)} /> Use TLS (secure)</label>
        <label className={styles.label}>User<input className={styles.input} name="smtpUser" placeholder="username@example.com" defaultValue={smtp.user || ''} /></label>
        <label className={styles.label}>Pass (leave blank to keep existing)<input className={styles.input} name="smtpPass" type="password" placeholder="(app password / SMTP password)" /></label>
        <label className={styles.label}>From<input className={styles.input} name="smtpFrom" placeholder="OpenStream <no-reply@example.com>" defaultValue={smtp.from || ''} /></label>

        <button className={styles.button} type="submit">Save</button>
      </form>

      <form className={styles.form} action={testSmtpAction}>
        <h3 className={styles.h3}>SMTP test</h3>
        <p className={styles.p}>Send a test email using the saved SMTP settings above.</p>
        <label className={styles.label}>
          Send test to
          <input className={styles.input} name="smtpTestTo" placeholder="you@example.com" />
        </label>
        <button className={styles.button} type="submit">Send test email</button>
      </form>
    </div>
  );
}
